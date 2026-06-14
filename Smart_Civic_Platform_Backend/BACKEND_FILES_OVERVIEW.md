# Smart Civic Platform — Backend Files Overview

> **Last updated:** 2026-06-14  
> **Stack:** Node.js · Express · TypeScript · Supabase (Postgres + Auth) · Zod · Nodemailer

---

## Table of Contents

1. [Role System](#1-role-system)
2. [How Each Role Is Created](#2-how-each-role-is-created)
3. [Role-Based Access Control (RBAC) Matrix](#3-role-based-access-control-rbac-matrix)
4. [Authentication & Authorization Flow](#4-authentication--authorization-flow)
5. [Root Files & Folders](#5-root-files--folders)
6. [Source Code (`src/`) — File-by-File Reference](#6-source-code-src--file-by-file-reference)

---

## 1. Role System

The platform defines **five user roles** in a strict hierarchy from lowest to highest privilege:

| # | Role                 | DB Value            | Description                                              |
|---|----------------------|---------------------|----------------------------------------------------------|
| 1 | **Citizen**          | `citizen`           | Public end-user who files complaints and gives feedback   |
| 2 | **Staff**            | `staff`             | Field worker assigned to teams under a department         |
| 3 | **Department Head**  | `department_head`   | Manages a single department within a municipality         |
| 4 | **Municipality Head**| `municipality_head` | Oversees an entire municipality and its departments       |
| 5 | **Superadmin**       | `superadmin`        | Platform-wide administrator with unrestricted access      |

These roles are defined in:
- **TypeScript enum:** `src/types/database.type.ts` → `UserRole`
- **Runtime constants:** `src/app.ts` → `ROLES` object and `ROLE_HIERARCHY` array

---

## 2. How Each Role Is Created

### 2.1 Citizen (Self-Registration)

| Aspect        | Details                                                      |
|---------------|--------------------------------------------------------------|
| **Endpoint**  | `POST /api/auth/register`                                    |
| **Auth**      | None required (public)                                       |
| **Flow**      | 1. User submits `first_name`, `last_name`, `email`, `password` (+ optional `phone`, `full_address`) |
|               | 2. Zod `registerSchema` validates input — role field is **not accepted** (hardcoded to `citizen`) |
|               | 3. `registerService()` calls `supabaseAdmin.auth.admin.createUser()` with `user_metadata.role = "citizen"` |
|               | 4. A Supabase **database trigger** (`handle_new_user`) fires on `auth.users` insert and auto-creates a row in `profiles` table with the role from metadata |
|               | 5. If `phone` or `full_address` is provided, the service updates `profiles.phone` and `citizens.home_address` |
| **Key files** | `src/modules/auth/routes/auth.routes.ts`, `src/modules/auth/services/auth.service.ts`, `src/validation/auth.validation.ts` |

### 2.2 Staff (Direct API Creation)

| Aspect        | Details                                                      |
|---------------|--------------------------------------------------------------|
| **Endpoint A** | `POST /api/municipality/users/create`                       |
| **Created by** | `municipality_head`                                         |
| **Endpoint B** | `POST /api/department/staff/create`                         |
| **Created by** | `department_head`                                           |
| **Flow**       | 1. Admin provides `email`, `password`, `full_name`, `role: "staff"`, `department_id` (+ optional `phone`) |
|                | 2. Zod `createUserSchema` / `createStaffSchema` validates input |
|                | 3. `createUserService()` checks email uniqueness, creates auth user via `supabaseAdmin.auth.admin.createUser()` with role/municipality/department in `user_metadata` |
|                | 4. The DB trigger (`handle_new_user`) auto-creates the `profiles` and `staff` rows |
|                | 5. Profile is updated with `force_password_reset: true` and `created_by` |
|                | 6. Staff table is updated with `onboarded_at` timestamp |
|                | 7. Returns the new user's profile — the user must change password on first login |
| **Key files**  | `src/modules/auth/services/auth.service.ts` (`createUserService`), `src/modules/municipality/controller/municipality.controller.ts`, `src/modules/department/controller/department.controller.ts` |

### 2.3 Department Head (Direct API Creation)

| Aspect        | Details                                                      |
|---------------|--------------------------------------------------------------|
| **Endpoint**  | `POST /api/municipality/users/create`                        |
| **Created by** | `municipality_head`                                         |
| **Payload**   | `role: "department_head"`, `department_id` (required)        |
| **Flow**      | Same as Staff (see §2.2) — municipality_id is auto-filled from the municipality head's context |
| **Key files** | Same as Staff                                                 |

### 2.4 Municipality Head (Direct API Creation)

| Aspect        | Details                                                      |
|---------------|--------------------------------------------------------------|
| **Endpoint**  | `POST /api/superadmin/users/create`                          |
| **Created by** | `superadmin`                                                |
| **Payload**   | `role: "municipality_head"`, `municipality_id` (required)    |
| **Flow**      | Same as Staff (see §2.2) — superadmin provides the municipality_id explicitly |
| **Key files** | `src/modules/superadmin/controller/superadmin.controller.ts`, `src/modules/auth/services/auth.service.ts` |

### 2.5 Superadmin (Manual / Role Assignment)

| Aspect        | Details                                                      |
|---------------|--------------------------------------------------------------|
| **Method 1**  | **Manual via Supabase Dashboard:** Create a user in Supabase Auth, then set `role = 'superadmin'` directly in the `profiles` table via the Table Editor |
| **Method 2**  | **Role elevation API:** An existing superadmin calls `PATCH /api/superadmin/users/assign-role` with `{ targetUserId, newRole: "superadmin" }` |
| **Method 3**  | **Check script:** Run `npx tsx scripts/check-superadmin.ts` to verify if any superadmin exists; the script prints creation instructions if none are found |
| **Key files** | `scripts/check-superadmin.ts`, `src/modules/superadmin/routes/superadmin.routes.ts`, `src/modules/superadmin/middleware/superadmin.repository.ts` (calls `admin_set_user_role` RPC) |

---

## 3. Role-Based Access Control (RBAC) Matrix

### 3.1 Public Endpoints (No Auth Required)

| Method | Endpoint                                             | Purpose                       |
|--------|------------------------------------------------------|-------------------------------|
| POST   | `/api/auth/register`                                 | Citizen self-registration     |
| POST   | `/api/auth/login`                                    | Login (all roles)             |
| POST   | `/api/auth/refresh`                                  | Refresh access token          |
| POST   | `/api/auth/forgot-password`                          | Request password reset        |
| GET    | `/api/citizen/municipalities`                        | List active municipalities    |
| GET    | `/api/citizen/municipalities/:id/categories`         | List complaint categories     |
| GET    | `/health`                                            | Health check                  |

### 3.2 Authenticated (Any Role)

| Method | Endpoint                                   | Purpose                              |
|--------|--------------------------------------------|--------------------------------------|
| GET    | `/api/auth/me`                             | Get current user profile             |
| POST   | `/api/auth/logout`                         | Logout (revoke refresh token)        |

### 3.3 Citizen-Only Endpoints

> **Guard:** `authenticate` → `authorize("citizen")`

| Method | Endpoint                                   | Purpose                                   |
|--------|--------------------------------------------|--------------------------------------------|
| POST   | `/api/citizen/complaints`                  | Submit a new complaint                     |
| GET    | `/api/citizen/complaints`                  | List my complaints (with optional status filter) |
| GET    | `/api/citizen/complaints/:id`              | Get complaint detail                       |
| GET    | `/api/citizen/complaints/:id/history`      | Get complaint audit history                |
| POST   | `/api/citizen/complaints/:id/feedback`     | Submit rating/feedback for resolved complaint |

### 3.4 Staff-Only Endpoints

> **Guard:** `requireAuth` → `verifyStaffContext` (checks `role === "staff"`, account `active`, and resolves `staffId` + `departmentId` from DB)

| Method | Endpoint                               | Purpose                                       |
|--------|-----------------------------------------|------------------------------------------------|
| GET    | `/api/staff/my-assignments`            | List teams/assignments I belong to             |
| GET    | `/api/staff/department-queue`          | View unresolved complaints in my department    |

### 3.5 Department Head-Only Endpoints

> **Guard:** `requireAuth` → `verifyDepartmentHeadContext` (checks `role === "department_head"`, account `active`, and resolves `departmentId` from `departments.head_profile_id`)

| Method | Endpoint                                             | Purpose                                     |
|--------|------------------------------------------------------|---------------------------------------------|
| POST   | `/api/department/teams/create`                       | Create a response team for a complaint      |
| POST   | `/api/department/teams/assign-member`                | Add a staff member to a team                |
| PATCH  | `/api/department/complaints/:complaintId/state`      | Transition complaint status (`ongoing` / `resolved` / `rejected`) |
| GET    | `/api/department/staff-roster`                       | List all staff in this department            |
| POST   | `/api/department/staff/create`                       | **Create a staff user account**              |

### 3.6 Municipality Head-Only Endpoints

> **Guard:** `requireAuth` → `verifyMunicipalityHeadContext` (checks `role === "municipality_head"`, account `active`, and resolves `municipalityId` from `municipalities.head_profile_id`)

| Method | Endpoint                                      | Purpose                                       |
|--------|-----------------------------------------------|------------------------------------------------|
| GET    | `/api/municipality/analytics`                 | Dashboard metrics (complaint counts, resolution rate) |
| POST   | `/api/municipality/departments/create`        | Provision a new department                     |
| POST   | `/api/municipality/staff/onboard`             | Onboard staff to a department                  |
| GET    | `/api/municipality/complaints`                | List all complaints in this municipality       |
| POST   | `/api/municipality/users/create`              | **Create department_head or staff user**       |

### 3.7 Superadmin-Only Endpoints

> **Guard:** `requireAuth` → `requireSuperadminGuard` (checks `role === "superadmin"`, account `active` via profiles table query)

| Method | Endpoint                                        | Purpose                                                |
|--------|-------------------------------------------------|--------------------------------------------------------|
| GET    | `/api/superadmin/analytics`                     | System-wide macro metrics (total municipalities, staff, complaints) |
| POST   | `/api/superadmin/municipalities/provision`       | Register a new municipality + its head profile         |
| PATCH  | `/api/superadmin/users/assign-role`              | Change any user's role (calls `admin_set_user_role` RPC) |
| PATCH  | `/api/superadmin/users/manage-status`            | Suspend / reactivate any user account                  |
| GET    | `/api/superadmin/audit-logs`                     | Query the immutable system audit trail (paginated)     |
| POST   | `/api/superadmin/users/create`                   | **Create a municipality_head user account**            |

### 3.8 Shared Authenticated Endpoints (Complaints & Notifications)

> **Guard:** `requireAuth` only (any authenticated user)

| Method | Endpoint                                        | Purpose                                   |
|--------|-------------------------------------------------|-------------------------------------------|
| POST   | `/api/complaints/submit`                        | Submit a complaint (citizen-oriented)     |
| GET    | `/api/complaints/my-history`                    | Get my complaint history                  |
| GET    | `/api/complaints/categories`                    | List complaint categories                 |
| POST   | `/api/notifications/broadcast`                  | Send a notification                       |
| GET    | `/api/notifications/inbound-queue`              | Fetch my notifications                    |
| PATCH  | `/api/notifications/:notificationId/acknowledge`| Mark notification as read                 |

### 3.10 Scope Guards (Cross-Cutting)

In addition to role-based guards, two **scope guards** enforce data isolation:

| Guard                   | Logic                                                                 |
|-------------------------|-----------------------------------------------------------------------|
| `belongsToMunicipality` | Blocks access if the user's `municipality_id` doesn't match the target. **Superadmin bypasses.** |
| `belongsToDepartment`   | Blocks access if the user's `department_id` doesn't match the target. **Superadmin and Municipality Head bypass.** |

---

## 4. Authentication & Authorization Flow

```
Request
  │
  ▼
┌─────────────────────────────────────────────────┐
│  1. Extract Bearer token from Authorization hdr │
└──────────────────────┬──────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│  2. Validate token via Supabase Auth (getUser)  │
│     → Reject if invalid/expired (401)           │
└──────────────────────┬──────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│  3. Fetch profile from `profiles` table         │
│     → Check account_status ≠ "suspended" (403)  │
│     → Attach user context to req.user           │
└──────────────────────┬──────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│  4. Role Guard (authorize / module middleware)  │
│     → Compare req.user.role against allowed     │
│     → Reject if mismatch (403)                  │
└──────────────────────┬──────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│  5. Scope Guard (optional)                      │
│     → belongsToMunicipality / belongsToDepartmt │
│     → Superadmin bypasses                       │
└──────────────────────┬──────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│  6. Force Password Reset check (if applicable)  │
│     → Block all routes except reset endpoints   │
└──────────────────────┬──────────────────────────┘
                       │
                       ▼
                  Controller
```

**Two authentication patterns coexist:**

| Pattern | Used By | Implementation |
|---------|---------|----------------|
| **Shared middleware** (`src/middleware/authenticate.ts` + `authorize.ts`) | Auth routes, Citizen routes | Reusable `authenticate` and `authorize(…roles)` functions |
| **Module-local middleware** (inline `requireAuth` + role-specific guard) | Superadmin, Municipality, Department, Staff, Complaints, Notifications | Each module defines its own `requireAuth` closure that receives the Supabase client |

---

## 5. Root Files & Folders

| File / Folder      | Description                                                         |
|--------------------|---------------------------------------------------------------------|
| `.env`             | Environment variables: Supabase URL/keys, SMTP config, `CLIENT_URL`, `PORT` |
| `.vscode/`         | VS Code workspace settings                                         |
| `AGENT.md`         | Agent context file for AI coding assistants                         |
| `CLAUDE.md`        | Agent context file (Claude-specific)                                |
| `.windsurfrules`   | Agent context file (Windsurf-specific)                              |
| `.mcp.json`        | MCP server configuration                                           |
| `package.json`     | Dependencies, scripts (`dev`, `build`, `start`)                     |
| `tsconfig.json`    | TypeScript compiler options (target ES2020, module NodeNext)        |
| `yarn.lock`        | Locked dependency versions                                         |
| `dist/`            | Compiled JavaScript output                                         |
| `node_modules/`    | Installed npm packages                                              |
| `data/`            | Data files or SQL scripts                                           |
| `projects/`        | Project-related resources                                           |
| `scripts/`         | Admin maintenance scripts (see §5.1)                                |

### 5.1 Scripts (`scripts/`)

| File                   | Purpose                                                            |
|------------------------|--------------------------------------------------------------------|
| `check-superadmin.ts`  | Checks if any superadmin exists in the database; prints creation instructions if none found. Run: `npx tsx scripts/check-superadmin.ts` |
| `purge-user.ts`        | Hard-deletes a stuck user from Supabase Auth + soft-deletes from profiles/staff. Run: `npx tsx scripts/purge-user.ts <email>` |

---

## 6. Source Code (`src/`) — File-by-File Reference

### 6.1 Entry Points

| File          | Purpose                                                            |
|---------------|--------------------------------------------------------------------|
| `app.ts`      | Central configuration: `TOKEN_CONFIG` (access/refresh TTLs), `ROLES` and `ROLE_HIERARCHY` constants, `ACCOUNT_STATUS`, `SECURITY` limits, `RATE_LIMIT` thresholds, `AUDIT_ACTIONS`, and type exports |
| `index.ts`    | Express server bootstrap: mounts all routers, sets up Helmet/CORS/rate-limiting/Swagger UI, initializes module dependency injection (Repository → Service → Controller pattern), and starts listening on `PORT` |

### 6.2 Config (`src/config/`)

| File            | Purpose                                                          |
|-----------------|------------------------------------------------------------------|
| `constants.ts`  | Shared constant values across the backend (currently empty/minimal) |
| `env.ts`        | Reads and validates environment variables, exports typed `env` object |
| `mailer.ts`     | Nodemailer transporter setup + pre-built email helpers: `sendPasswordResetEmail`, `sendWelcomeEmail` |
| `supabase.ts`   | Exports three Supabase clients: `supabase` (anon/RLS), `supabaseAdmin` (service role, bypasses RLS), and `createUserClient(token)` factory for per-request user-scoped clients |
| `swagger.ts`    | Swagger/OpenAPI spec generation configuration                     |

### 6.3 Middleware (`src/middleware/`)

| File                    | Purpose                                                      |
|-------------------------|--------------------------------------------------------------|
| `authenticate.ts`       | Validates Bearer JWT via Supabase Auth, loads profile from `profiles` table, checks for suspension, attaches `req.user` (with `AuthUser` interface), `req.accessToken`, and `req.userClient` |
| `authorize.ts`          | Role-gate factory: `authorize(...allowedRoles)` — returns 403 if `req.user.role` not in the allowed list |
| `scopeguard.ts`         | Two data-isolation guards: `belongsToMunicipality` (superadmin bypasses) and `belongsToDepartment` (superadmin + municipality_head bypass) |
| `forcePasswordReset.ts` | Blocks all requests (except password-reset endpoints) when `req.user.force_password_reset` is `true` |
| `auditlogger.ts`        | Request-level audit middleware: intercepts `res.json()`, logs successful operations to `audit_logs` table with action, actor, old/new values, IP, and user-agent. Also exports `requestLogger` for method/status/timing logging |
| `rateLimiter.ts`        | Three rate limiters: `globalRateLimiter` (150 req/15min), `authRateLimiter` (20 req/15min), `superadminRateLimiter` (100 req/15min) |
| `validateBody.ts`       | Generic Zod schema validation wrapper — validates `req.body` against a Zod schema, returns 400 with formatted errors on failure |

### 6.4 Modules (`src/modules/`)

---

#### 6.4.1 Auth Module (`src/modules/auth/`)

**Purpose:** Handles all authentication flows — registration, login, token management, direct user creation, and password reset.

| File                                  | Description                                                                  |
|---------------------------------------|------------------------------------------------------------------------------|
| `controller/auth.controller.ts`       | Express handlers: `register`, `login`, `refresh`, `logout`, `forgotPassword`, `getMe` (returns citizen details for citizens, profile for others) |
| `routes/auth.routes.ts`               | Route definitions with Swagger docs. Applies `authenticate`/`authorize` selectively per route |
| `services/auth.service.ts`            | Business logic: `registerService` (citizen creation), `loginService` (sign-in + refresh token rotation), `refreshTokenService`, `logoutService`, `createUserService` (direct user creation with `force_password_reset`), `forgotPasswordService` |

---

#### 6.4.2 Citizen Module (`src/modules/citizen/`)

**Purpose:** Citizen-facing features — complaint submission, complaint tracking, feedback.

| File                                  | Description                                                                  |
|---------------------------------------|------------------------------------------------------------------------------|
| `controller/citizen.controller.ts`    | Handlers: `submitComplaint`, `getMyComplaints`, `getComplaintDetail`, `getComplaintHistory`, `getMunicipalities`, `getCategories`, `submitFeedback` |
| `routes/citizen.routes.ts`            | Two public routes (municipalities list, categories) + five citizen-only authenticated routes |
| `services/citizen.service.ts`         | Uses per-request `userClient` (RLS-enabled) for citizen data operations. Fetches complaint history from `audit_logs`. Feedback submission resolves team/staff from `assignments` table |

---

#### 6.4.3 Complaints Module (`src/modules/complaints/`)

**Purpose:** Generic complaint operations (secondary complaint endpoint, accessible by any authenticated user).

| File                                    | Description                                                                |
|-----------------------------------------|----------------------------------------------------------------------------|
| `controller/complaint.controller.ts`    | Handlers: `create` (submit), `getMyHistory`, `getCategories`              |
| `repository/complaints.repository.ts`   | Data access: insert complaint, query user's complaints, fetch categories   |
| `routes/complaints.routes.ts`           | All routes require auth only (no specific role guard)                      |
| `services/complaints.service.ts`        | Business logic layer between controller and repository                     |

---

#### 6.4.4 Department Module (`src/modules/department/`)

**Purpose:** Department head operations — team management, complaint lifecycle, staff roster, **staff user creation**.

| File                                    | Description                                                                |
|-----------------------------------------|----------------------------------------------------------------------------|
| `controller/department.controller.ts`   | Handlers: `setupTeam`, `attachStaff`, `processGrievanceState` (status transitions with `ongoing`/`resolved`/`rejected`), `getStaffRoster`, **`createStaff`** (creates staff user via `createUserService`) |
| `middleware/department.middleware.ts`    | `verifyDepartmentHeadContext` — checks `role === "department_head"`, account is `active`, resolves `departmentId` from `departments` table where `head_profile_id` matches. Injects `req.departmentId` |
| `repository/department.repository.ts`   | Data access: create teams, add team members, update complaint status, list staff, **`getDepartmentMunicipalityId`** (resolves parent municipality) |
| `routes/department.route.ts`            | All routes protected by `requireAuth` + `verifyDepartmentHeadContext`. Includes **`POST /staff/create`** |
| `services/department.service.ts`        | Business rules: `buildDeploymentTeam`, `assignStaffToSquad`, `resolveGrievance`, `listRoster`, **`getMunicipalityId`** |

---

#### 6.4.5 Municipality Module (`src/modules/municipality/`)

**Purpose:** Municipality head operations — analytics, department provisioning, staff onboarding, complaint oversight, **user creation**.

| File                                     | Description                                                               |
|------------------------------------------|---------------------------------------------------------------------------|
| `controller/index.ts`                    | Module entry point / export aggregation                                   |
| `controller/municipality.controller.ts`  | Handlers: `getAnalytics`, `provisionDepartment`, `onboardStaffProfile`, `getComplaints`, **`createUser`** (creates department_head or staff via `createUserService`) |
| `middleware/municipality.middleware.ts`   | `verifyMunicipalityHeadContext` — checks `role === "municipality_head"`, account is `active`, resolves `municipalityId` from `municipalities` table where `head_profile_id` matches. Injects `req.municipalityId` |
| `repository/municipality.repository.ts`  | Data access: complaint stats, department creation, staff onboarding, complaint queries |
| `routes/municipality.routes.ts`          | All routes protected by `requireAuth` + `verifyMunicipalityHeadContext`. Includes **`POST /users/create`** |
| `services/municipality.service.ts`       | Business logic: `getDashboardAnalytics`, `registerDepartment`, `registerStaffMember`, `getComplaintsLog` |

---

#### 6.4.6 Superadmin Module (`src/modules/superadmin/`)

**Purpose:** Platform-wide administration — analytics, municipality provisioning, user role/status management, audit logs.

| File                                     | Description                                                               |
|------------------------------------------|---------------------------------------------------------------------------|
| `controller/index.ts`                    | Module entry point / export aggregation                                   |
| `controller/superadmin.controller.ts`    | Handlers: `getMetrics`, `provisionMunicipality`, `changeUserRole`, `restrictUserAccess`, `getSystemAudits`, **`createUser`** (creates municipality_head via `createUserService`) |
| `middleware/superadmin.repository.ts`    | **⚠️ Mislocated file** — contains `SuperadminRepository` class (should be in `repository/` folder). Methods: `getMacroAnalytics` (reads `v_superadmin_analytics` view), `createMunicipality`, `updateUserRole` (calls `admin_set_user_role` RPC), `updateAccountStatus`, `getAuditLogs` |
| `routes/superadmin.routes.ts`            | All routes protected by `requireAuth` + `requireSuperadminGuard` (checks `role === "superadmin"` + `account_status === "active"`) |
| `services/superadmin.services.ts`        | Business logic: `getDashboardMetrics`, `registerNewMunicipality`, `adjustUserAuthorization`, `modifyUserAccess`, `fetchSystemAuditTrail` |

---

#### 6.4.7 Staff Module (`src/modules/staff/`)

**Purpose:** Field staff operations — view assigned teams, view department complaint queue.

| File                                  | Description                                                                |
|---------------------------------------|----------------------------------------------------------------------------|
| `controller/staff.controller.ts`      | Handlers: `getMyTeams` (lists assigned teams with complaint details), `getDepartmentQueue` (department's unresolved complaints) |
| `middleware/staff.middleware.ts`       | `verifyStaffContext` — checks `role === "staff"`, account is `active`, resolves `staffId` (from `staff.s_uid`) and `departmentId` (from `staff.primary_department_id`). Injects both into `req` |
| `repository/staff.repository.ts`      | Data access: fetch team memberships with joined complaint data, fetch department complaints |
| `routes/staff.routes.ts`              | All routes protected by `requireAuth` + `verifyStaffContext`               |
| `services/staff.service.ts`           | Business logic: `fetchAssignedFieldWork`, `fetchDepartmentalGrievances`    |

---

#### 6.4.8 Notification Module (`src/modules/notification/`)

**Purpose:** Internal notification system — broadcast alerts, inbox, acknowledgement.

| File                                      | Description                                                            |
|-------------------------------------------|------------------------------------------------------------------------|
| `controller/notification.controller.ts`   | Handlers: `sendAlert` (broadcast notification), `fetchMyAlerts` (inbox), `readAlert` (mark as read) |
| `repository/notification.repository.ts`   | Data access: insert notifications, query by audience, mark as read     |
| `routes/notification.routes.ts`           | All routes require auth only (any authenticated user can broadcast/receive) |
| `service/notification.service.ts`         | Business logic: `broadcastAdministrativeAlert`, `listInboundQueue`, `acknowledgeAlertReceipt` |

---

#### 6.4.9 Shared Module (`src/modules/shared/`)

| File                    | Description                                                        |
|-------------------------|--------------------------------------------------------------------|
| `legacyUser.ts`         | Legacy user compatibility helpers / abstractions                   |
| `moduleMiddleware.ts`   | Shared middleware utilities used across multiple modules            |

---

### 6.5 Routes (`src/routes/`)

| File                | Purpose                                                 |
|---------------------|---------------------------------------------------------|
| `health.routes.ts`  | `GET /health` — simple health check endpoint            |

### 6.6 Shared Services (`src/service/`)

| File               | Purpose                                                  |
|--------------------|----------------------------------------------------------|
| `audit.service.ts` | Shared audit logging logic (currently empty/placeholder) |
| `email.service.ts` | Email sending service (currently empty — logic lives in `config/mailer.ts`) |
| `token.service.ts` | Token management service (currently empty — logic lives in `auth.service.ts`) |

### 6.7 Types (`src/types/`)

| File                | Purpose                                                                  |
|---------------------|--------------------------------------------------------------------------|
| `database.type.ts`  | Complete TypeScript type system for the Supabase/Postgres schema. Defines: all DB enums (`UserRole`, `AccountStatus`, `ComplaintStatus`, etc.), row types for all 14 tables, insert/update utility types, and the `Database` interface mapping tables, views, functions, and enums |

### 6.8 Utils (`src/utils/`)

| File               | Purpose                                                  |
|--------------------|----------------------------------------------------------|
| `auditHelper.ts`   | Helpers for constructing audit entries and computing payload diffs |
| `crypto.ts`        | Cryptographic utilities for hashing and secure token operations (currently empty/minimal) |
| `error.ts`         | Standard error wrapper utilities (currently empty/minimal) |
| `errors.ts`        | Custom error classes: `NotFoundError` (404), `ForbiddenError` (403), `ConflictError` (409), `UnauthorizedError` (401), `ValidationError` (422) |
| `response.ts`      | Two standardized response helpers: `sendSuccess(res, data, message, status)` and `sendError(res, message, status)` — all API responses use `{ success, message, data }` shape |
| `roleHierarchy.ts` | Role hierarchy and authorization helper logic (currently empty — hierarchy defined in `app.ts`) |

### 6.9 Validation (`src/validation/`)

| File                     | Purpose                                                  |
|--------------------------|----------------------------------------------------------|
| `auth.validation.ts`     | Zod schemas: `registerSchema` (citizen-only, no role field), `loginSchema`, `createUserSchema` (enforces `department_id` for staff/dept_head roles), `createStaffSchema` (simplified — no role field), `forgotPasswordSchema`, `resetPasswordSchema`, `refreshTokenSchema` |
| `citizen.validation.ts`  | Zod schemas: `submitComplaintSchema` (municipality_id, title, description, optional category_id/attachment_url), `submitFeedbackSchema` (rating 1-5, optional comment, optional is_anonymous) |

---

## Quick Reference: Role Creation Summary

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ROLE CREATION FLOWS                            │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  CITIZEN ─────── Self-register at POST /api/auth/register              │
│                  (public, no auth needed)                              │
│                                                                        │
│  STAFF ─────────  Created by municipality_head or department_head     │
│                   POST /api/municipality/users/create                  │
│                   POST /api/department/staff/create                    │
│                                                                        │
│  DEPT HEAD ────── Created by municipality_head                        │
│                   POST /api/municipality/users/create                  │
│                   (role="department_head", department_id required)     │
│                                                                        │
│  MUNI HEAD ────── Created by superadmin                               │
│                   POST /api/superadmin/users/create                    │
│                   (role="municipality_head", municipality_id required) │
│                                                                        │
│  SUPERADMIN ───── Manual DB edit or role assignment by existing SA     │
│                   PATCH /api/superadmin/users/assign-role              │
│                                                                        │
│  NOTE: All created users have force_password_reset=true and must       │
│        change their password on first login.                           │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```
