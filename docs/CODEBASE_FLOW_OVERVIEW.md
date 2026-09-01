# Smart Civic Platform — Codebase Flow Overview

> This document describes the code as inspected on 2026-08-20. It focuses on the currently mounted Express routes and the React client that calls them. It is an implementation map, not a product specification.

## 1. What this system is

Smart Civic Platform is a role-based civic grievance platform. Citizens register, complete their profile/KYC, and submit location- and category-based complaints. The backend routes each complaint to a municipal department, supports teams and cross-department work, tracks SLA deadlines, and exposes role-specific operational dashboards. Superadmins provision municipalities and manage system-wide access.

```text
React/Vite frontend (port 8080)
  ├─ browser routing + role guards
  ├─ Axios client with Bearer token and 401 refresh retry
  └─ API modules / page-level fetch calls
             │ HTTP JSON
             ▼
Express/TypeScript backend (default port 3000)
  ├─ security middleware, validation, role/scope/KYC guards
  ├─ auth, citizen, municipality, department, staff, notification modules
  └─ service/repository/controller layers
             │ Supabase client (primarily service-role server client)
             ▼
Supabase
  ├─ Auth users and JWT verification
  ├─ PostgreSQL civic-domain schema
  └─ Storage buckets for identity and complaint media
```

The primary schema is `supabase/Supabase_Schema.sql`. The backend's `supabaseAdmin` client deliberately uses the Supabase service-role key and bypasses RLS, so endpoint authorization and tenant-scoping middleware are a critical security boundary.

## 2. Application entry points and configuration

| Area | Entry point | Behavior |
| --- | --- | --- |
| Frontend | `Smart_Civic_Platform_Frontend/src/main.tsx` | Starts React in `BrowserRouter`. |
| Frontend application | `src/App.tsx` | Wraps application routing in the notification polling provider. |
| Frontend routing | `src/routes/AppRoutes.tsx` | Defines public pages and role-specific protected pages. |
| Frontend HTTP | `src/api/client.ts` | Uses `VITE_API_BASE_URL`, otherwise `http://localhost:3000/api`; attaches `access_token`; retries one 401 after `/auth/refresh`. |
| Backend | `Smart_Civic_Platform_Backend/src/index.ts` | Configures Express, CORS, Helmet, 5 MB request limits, global rate limit, Swagger, route mounts, and error handling. |
| Data layer | `src/config/supabase.ts` | Creates anon, service-role, and per-user Supabase client helpers. |

The Vite development server is configured for port `8080`. Backend CORS permits local ports `3000`, `5173`, and `8080` with credentials. Swagger is served at `http://localhost:3000/api/docs`, with its OpenAPI JSON at `/api/docs/swagger.json`. The health endpoint is `/health`.

## 3. Frontend navigation and access control

Public routes are the landing page, login, registration, forced password change, and KYC page. The protected application is grouped by the five roles defined in the backend:

| Role | Main frontend area | Main responsibility |
| --- | --- | --- |
| `citizen` | `/citizen/*` | Register/update profile, submit and track complaints, receive notifications. |
| `staff` | `/staff/*` | Currently a placeholder dashboard plus notifications; backend supports assignment work. |
| `department_head` | `/department_head/*` | Department dashboard, queue, staff and team management. |
| `municipality_head` | `/municipality_head/*` | Municipality operations, departments/staff, cross-department teams, complaint intervention, KYC. |
| `superadmin` | `/superadmin/*` | System analytics, municipalities, users, audit log, system settings UI. |

`ProtectedRoute.tsx` redirects unauthenticated users to `/login`, non-citizen forced-password-reset users to `/change-password`, and municipal/department/staff users without completed identity data to `/kyc`. If a logged-in user opens another role's route, the guard redirects them to their own dashboard.

`AuthContext` persists a profile and access token in `localStorage`. The Axios interceptor separately stores and rotates `refresh_token` during a 401 refresh. Notification polling runs every 30 seconds while the tab is visible and reads the latest ten notifications plus unread count.

## 4. Authentication and onboarding flow

```text
Citizen self-registration ─► POST /api/auth/register
                                     │
                             Supabase Auth + profiles/citizens records
                                     │
Email/password login ──────► POST /api/auth/login
                                     │
                       access token + refresh token + profile
                                     │
                  React stores session and redirects by role

Expired access token ──────► Axios POST /api/auth/refresh
                                     │
                          retry original request once
```

Other auth endpoints include SMS OTP dispatch/verification and mobile OTP login, logout, `GET /auth/me`, password change, and password-reset email initiation. Backend route middleware checks bearer authentication before protected endpoints; role-specific routers then check role, account status, municipal/department context, password-reset state, and where required KYC.

For invited administrative users, the backend has an authenticated four-step onboarding API:

1. `POST /api/onboarding/step1` — credentials/MFA setup.
2. `POST /api/onboarding/step2` — personal and employment details.
3. `POST /api/onboarding/step3` — identity document details.
4. `POST /api/onboarding/step4` — completes onboarding and activates the profile.

Identity document and profile-photo uploads are provided by `PUT /api/profile/identity` and `PUT /api/profile/picture`.

## 5. Core complaint lifecycle

The citizen complaint flow is implemented in `modules/citizen/services/citizen.service.ts` and is the most complete end-to-end business flow.

```text
Citizen submits complaint
  │ POST /api/citizen/complaints
  ├─ enforce unverified-citizen limit: at most 3 pending complaints
  ├─ resolve selected/current location to municipality + ward
  ├─ map category to a department in that municipality
  │    └─ direct category department → matching department category → first department fallback
  ├─ generate tracking ID and calculate SLA due time
  │    └─ urgent/high 24h; medium/default 72h; low 120h
  ├─ create complaint record
  │    └─ pending, or cross_dept_pending if a supporting department is selected
  ├─ optionally create complaint collaboration record
  └─ notify the lead department

Department head triage
  ├─ read department queue
  ├─ change state / assign to a team
  ├─ optionally request inter-department collaboration or sign off
  └─ manage staff who can perform assignments

Staff execution
  ├─ acknowledge / accept / start / complete assignment
  └─ transfer work or return it to the department head

SLA monitoring
  ├─ overdue assigned complaint → Level 1 warning
  └─ unresolved overdue complaint → Level 2 escalation to municipality head

Citizen follow-up
  ├─ view complaint, public updates, and audit-derived history
  ├─ add public notes or media
  ├─ rate a resolved complaint
  └─ reopen a resolved/closed complaint (allowed by endpoint; validation states 7 days/max 2)
```

Complaint-related data is represented by `complaints`, `complaint_categories`, `complaint_updates`, `complaint_assignments`, `complaint_handoffs`, `complaint_collaborations`, `complaint_sign_offs`, `sla_events`, `feedback`, and `media`. The schema includes operational statuses and SLA/audit columns; actual permitted transitions should be treated as the controller/service behavior rather than inferred solely from the enum.

## 6. Backend API map

All paths below are relative to `/api` unless noted. Authentication refers to bearer JWT authentication; a role label means the router also checks the role/context.

| Area | Key endpoints | Access / purpose |
| --- | --- | --- |
| Health/docs | `GET /health`; `GET /docs`; `GET /docs/swagger.json` | Runtime health and API documentation. |
| Public | `/public/provinces`, `/districts`, `/municipalities`, `/wards`; `/public/complaints/track/:trackingId`; invite validate/accept | Public reference data, tracking, and invite acceptance. |
| Auth | register, login, send/verify OTP, mobile login, refresh, logout, me, change-password, forgot-password | Registration and session lifecycle. |
| Citizen | reference locations/categories; dashboard; `/complaints` CRUD-style citizen actions; address, identity, profile | Public reference endpoints plus authenticated `citizen` operations. |
| Generic complaints | `/complaints/submit`, `/my-history`, `/categories` | Authenticated legacy/parallel complaint surface. |
| Onboarding/profile | onboarding status + steps 1–4; profile identity/picture | Authenticated setup and uploads. |
| Superadmin | analytics, reference locations, municipality provision/detail/update/delete/KYC, user role/status/create, audit logs | Authenticated active `superadmin`. |
| Municipality | profile/KYC, analytics, departments, staff, complaints/escalations/intervention, citizen-KYC review, cross-department teams | Authenticated municipality head in its resolved municipality. |
| Department | dashboard/profile/logo/queue, collaboration/signoff, CSV export, internal teams, complaint state, staff roster/provisioning | Authenticated department head in its resolved department. |
| Staff | own profile, department, teams/schedule/queue, acknowledge/accept/start/complete/transfer/return assignments | Authenticated staff with valid staff context and KYC. |
| Notifications | list/inbound queue/unread count/read/read-all/broadcast | Authenticated user, with sending controlled in the notification module. |

## 7. Municipality and organization setup flow

```text
Superadmin provisions municipality and municipality head
  └─ /api/superadmin/municipalities/provision
       │
Municipality head completes profile/KYC
  └─ /api/municipality/profile, reviewed by superadmin KYC endpoint
       │
Municipality head creates departments and department heads
  └─ /api/municipality/departments
       │
Department head completes onboarding/KYC, creates staff and teams
  └─ /api/department/staff/* and /api/department/teams/*
       │
Teams receive routed or manually assigned complaints
```

Municipalities and departments are tenant boundaries. The respective middleware resolves the caller's profile and rejects incompatible role/scope; the route parameter variants such as `/municipality/:municipalityId/...` exist alongside context-resolved forms such as `/municipality/departments`.

## 8. Notifications, audit, and scheduled behavior

The frontend notification provider uses polling, not a Supabase realtime subscription. The backend notification routes expose inbox retrieval, unread count, individual/all read operations, and broadcast. The database also models recipient read state, delivery logs, notification preferences, templates, and push tokens.

The system records auditable actions in `audit_logs`; citizen complaint history reads complaint audit records. Superadmin has an audit-log endpoint. The repository contains services for scheduling, audit, broadcast, email/SMS, auto-close, handoff, lifecycle, exports, performance, and collaboration. The clearly wired complaint-submission path invokes routing, tracking ID, SLA, collaboration, storage, and notification services. Scheduled execution wiring should be verified separately before relying on SLA checks or automatic closure in production.

## 9. Client/server contract observations

The following are useful integration findings from comparing the frontend API modules with the Express route mounts. They are not changes made by this document.

| Observation | Effect |
| --- | --- |
| `public.api.ts` defines `/public/stats` and `/public/announcements`, but the inspected public router does not expose them. | Calls will return the backend 404 response unless another deployment route exists. |
| `onboarding.api.ts` sends `POST /onboarding/submit`; the router exposes only `/step1` through `/step4`. | The helper is stale/incomplete for the current onboarding router. |
| `complaints.api.ts` includes generic `/complaints/:id`, status, assignment, and comments methods, but the mounted generic complaints router has only `submit`, `my-history`, and `categories`. | Those generic helper methods do not map to current routes; citizen functions should use `/citizen/complaints/*`, department functions use `/department/*`, etc. |
| `superadmin.api.ts` exposes feature-flag endpoints that are not in the inspected superadmin router. | Feature flag UI/API calls will 404. |
| `notificationsApi.markAllAsRead()` currently fetches unread notifications and issues one per-item read request, even though backend also provides `PATCH /notifications/read-all`. | Functional but less efficient; it does not use the server-side bulk endpoint. |
| Login and logout in `AuthContext`/`Login.tsx` use the literal `http://localhost:3000` rather than the configured Axios base URL. | A non-local deployment can split the auth path from the configured API host. |
| The login context stores only the access token; refresh-token storage occurs in the Axios refresh lifecycle. | Initial login must ensure the refresh token from the login response is persisted, or automatic refresh cannot work after the first 401. |
| Staff frontend routing currently has a dashboard placeholder, although the backend provides assignment workflow endpoints. | Backend staff functionality is ahead of that UI screen. |

## 10. Files to start with for future work

| Goal | Read these files first |
| --- | --- |
| Add/change a browser page | `Frontend/src/routes/AppRoutes.tsx`, relevant `pages/`, matching API module, and type file. |
| Add/change an endpoint | Backend `src/index.ts`, target module's route/controller/service/repository files, validation, then frontend wrapper. |
| Change authorization | `middleware/authenticate.ts`, `authorize.ts`, `forcePasswordReset.ts`, `requireKyc.ts`, and module-specific context middleware. |
| Change complaint processing | Citizen service, `routing-engine.service.ts`, `sla-monitor.service.ts`, lifecycle/collaboration services, and database complaint tables. |
| Change schema/storage | `supabase/Supabase_Schema.sql`, `supabase/migrations/`, `storage-setup.sql`, and `src/types/database.type.ts`. |

## 11. Recommended maintenance rule

Treat the route files as the source of truth for callable API paths. Whenever an endpoint is added, renamed, or removed, update its frontend API wrapper, TypeScript types, Swagger annotation, and any page-level direct `fetch` call in the same change. This prevents the parallel/legacy endpoint drift visible in the current codebase.
