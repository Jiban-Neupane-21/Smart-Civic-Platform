# Complaint Flow — Old vs New Audit

> Based on `docs/PLAN-50-Phases-Complaint-Flow.md` (50 phases) and `supabase/Supabase_Schema.sql`.

---

## Critical Issues Summary

| # | Severity | Issue | Affected Component |
|---|----------|-------|--------------------|
| 1 | **Critical** | `ComplaintRow` missing 10+ blueprint columns: `tracking_id`, `secondary_category_id`, `lead_department_id`, `cross_dept_status`, `severity_level`, `location_source`, `latitude`, `longitude`, `ward_number`, `submission_step_completed`, `current_staff_id`, `current_team_id`, `sla_level`, `sla_breached`, `sla_breached_at`, `escalated_to_munic_head`, `escalated_at`, `handoff_count` | `database.type.ts:260-277` |
| 2 | **Critical** | No `complaint_collaborations` or `complaint_sign_offs` types — entire multi-department collaboration system missing | `database.type.ts` |
| 3 | **Critical** | No auto-routing engine — complaint submission doesn't resolve department from category | `citizen.service.ts:14-41`, `complaints.service.ts` |
| 4 | **Critical** | No tracking ID generation — no `tracking_id` format or service | Missing `tracking-id.service.ts` |
| 5 | **Critical** | No 4-step submission endpoint — old `POST /api/complaints/submit` accepts flat body without location/category/severity structure | `complaint.controller.ts:7-20`, `citizen.service.ts:14-41` |
| 6 | **High** | No `ComplaintStatus` enum values: `assigned`, `escalated`, `reopened`, `cross_dept_pending` | `database.type.ts:40-46` |
| 7 | **High** | `ComplaintCategoryRow` missing `department_id` FK for direct dept routing | `database.type.ts:251-258` |
| 8 | **High** | No location resolution service — no ward-from-address, no GPS, no manual selection logic | Missing `location-resolver.service.ts` |
| 9 | **High** | No collaboration service — no sign-off, no Method A/B escalation | Missing `collaboration.service.ts` |
| 10 | **High** | No SLA monitoring — no `sla_monitor.service.ts`, no breach detection cron | Missing `sla-monitor.service.ts` |
| 11 | **High** | No notification service for complaint events (submitted, status change, collaboration, reopen) | Missing `notification.service.ts` |
| 12 | **High** | No media upload endpoint for complaint evidence (`POST /api/citizen/complaints/:id/media`) | Citizen routes |
| 13 | **High** | No public tracking lookup (`GET /api/public/complaints/track/:trackingId`) | Missing `public` module |
| 14 | **High** | Department status update state machine is incomplete — no `assigned`, `escalated`, `cross_dept_pending`, `reopened` transitions | `department.service.ts:46-70` |
| 15 | **High** | Staff routes have no assignment status endpoints (no accept/start/resolve) | `staff.routes.ts:1-105` |
| 16 | **Medium** | Citizen complaint submit has no KYC gate or rate limiting | `citizen.service.ts:14-41` |
| 17 | **Medium** | No cascade geography endpoints under `/api/public/` (provinces, districts, municipalities) — duplicated in citizen module | Missing `public` module |
| 18 | **Medium** | No complaint reopen endpoint for citizens | `citizen.service.ts` |
| 19 | **Medium** | No complaint notes/updates endpoint (internal vs public) | `citizen.service.ts`, `department.service.ts` |
| 20 | **Medium** | No export or analytics endpoints (`GET /api/v1/department/complaints/export`, `GET /api/v1/department/analytics`) | Department routes |
| 21 | **Medium** | `ComplaintsRepository.getCitizenComplaints` returns limited fields — no tracking_id, severity, category name, department name | `complaints.repository.ts:22-36` |
| 22 | **Low** | Department repository `getDepartmentSummary` filters only by `assigned_department_id` — misses collaboration complaints where this dept is supporting | `department.repository.ts:82-127` |
| 23 | **Low** | No `assigned` status in complaint lifecycle — complaints go from `pending` directly to `under_review`/`in_progress` | `department.service.ts:46-70` |
| 24 | **Low** | No handoff support — `complaint_handoffs` table types exist in schema but no endpoints or service logic | Missing service |

---

## Old Code vs New Target

### Issue 1: ComplaintRow Missing Blueprint Columns (Critical)

**Old (Current):** `database.type.ts:260-277` — only 17 fields:
```typescript
export interface ComplaintRow {
  co_uid, citizen_id, municipality_id, category_id, assigned_department_id,
  ticket_type, title, description, priority, status, rejection_reason,
  resolution_note, sla_due_at, submitted_date, resolution_date, updated_at
}
```

**New (Target):** `Supabase_Schema.sql:474-512` — 38 columns, adding:
- `tracking_id TEXT NOT NULL UNIQUE` — blueprint format
- `secondary_category_id UUID` — multi-dept support
- `lead_department_id UUID` — primary owner
- `cross_dept_status TEXT` — collaboration state
- `severity_level TEXT NOT NULL DEFAULT 'medium'`
- `location_source TEXT`, `latitude DECIMAL(10,7)`, `longitude DECIMAL(10,7)`
- `ward_number SMALLINT`
- `submission_step_completed INTEGER DEFAULT 0`
- `current_staff_id UUID`, `current_team_id UUID`
- `sla_level INTEGER DEFAULT 0`, `sla_breached BOOLEAN`, `sla_breached_at TIMESTAMPTZ`
- `escalated_to_munic_head BOOLEAN`, `escalated_at TIMESTAMPTZ`
- `handoff_count INTEGER DEFAULT 0`

### Issue 2: No Collaboration/Sign-Off Types (Critical)

**Old (Current):** No `ComplaintCollaborationRow` or `ComplaintSignOffRow` in types.

**New (Target):** `Supabase_Schema.sql:577-606` defines both tables with full types needed:
```typescript
interface ComplaintCollaborationRow {
  id, complaint_id, primary_dept_id, supporting_dept_id, initiated_by,
  initiation_method, inspection_note, primary_sign_off, supporting_sign_off,
  primary_signed_at, supporting_signed_at, status, created_at, updated_at
}
interface ComplaintSignOffRow {
  id, complaint_id, department_id, signed_by, role_at_time, decision, note, signed_at
}
```

### Issue 3: No Auto-Routing Engine (Critical)

**Old (Current):** `citizen.service.ts:14-41` — `submitComplaint` takes a raw `municipality_id` without resolving department from category. No routing logic exists. `complaints.service.ts:7-18` — `fileNewGrievance` just inserts without routing.

**New (Target):** PLAN-50 Phases 11-15:
- `RoutingEngine` service: `mapCategoryToDepartment(categoryId, municipalityId)`, `resolvePrimaryDepartment()`, `resolveSupportingDepartment()`
- Single-dept auto-route: set `assigned_department_id` + `lead_department_id`
- Multi-dept auto-route (Method A): create `complaint_collaborations` row, set `cross_dept_status`

### Issue 4: No Tracking ID Generation (Critical)

**Old (Current):** No tracking ID format or service. Complaints only have UUID `co_uid`.

**New (Target):** PLAN-50 Phase 17: `TrackingIdService` generating format: `{MUNI_CODE}-WARD{NO}-{CAT_CODE}-{YEAR}-{SEQUENCE}` (e.g., `KTM-WARD4-SWM-2026-000001`). Generated in a transaction with daily counter.

### Issue 5: No 4-Step Submission (Critical)

**Old (Current):**
- `complaint.controller.ts:7-20` — flat body, no structured location/category/details
- `citizen.routes.ts:98-102` — citizen complaint submit accepts flat body
- `citizen.validation.ts:3-8` — `submitComplaintSchema` only validates `municipality_id`, `title`, `description`, optional `category_id`

**New (Target):** PLAN-50 Phase 16 — structured 4-step body:
```json
{
  "location": { "source": "registered_address|gps|manual", "ward_id", "latitude", "longitude" },
  "category": { "primary_category_id", "secondary_category_id?" },
  "details": { "title", "description", "severity_level" },
  "step_completed": 4
}
```

### Issue 6: ComplaintStatus Enum Incomplete (High)

**Old (Current):** `database.type.ts:40-46` — only: `pending`, `under_review`, `in_progress`, `resolved`, `rejected`, `closed`.

**New (Target):** `Supabase_Schema.sql:41` — adds: `assigned`, `escalated`, `reopened`, `cross_dept_pending`.

### Issue 7: ComplaintCategoryRow Missing department_id (High)

**Old (Current):** `database.type.ts:251-258` — no `department_id` field.

**New (Target):** `Supabase_Schema.sql:464` — `department_id UUID REFERENCES departments(id) ON DELETE SET NULL`. This enables direct FK routing instead of relying solely on the enum.

### Issue 8: No Location Resolution Service (High)

**Old (Current):** No `location-resolver.service.ts`. No logic to resolve ward from citizen address, GPS, or manual selection.

**New (Target):** PLAN-50 Phase 6: `LocationResolver` with methods:
- `resolveFromRegisteredAddress(citizenId)` — read `citizens.ward_id` → join to `wards.municipality_id`
- `resolveFromGPS(lat, lng)` — reverse-geocode
- `resolveFromManualSelection(wardId)` — validate ward exists

### Issue 9: No Collaboration Service (High)

**Old (Current):** No `collaboration.service.ts`.

**New (Target):** PLAN-50 Phase 26: `CollaborationService`:
- `initiateCitizenTagging()` — Method A
- `initiateStaffEscalation()` — Method B
- `submitSignOff()` — record sign-off
- `checkJointSignOff()` — both depts signed?
- `autoResolveIfSignedOff()` — auto RESOLVED

### Issue 10: No SLA Monitoring (High)

**Old (Current):** No `sla-monitor.service.ts`. No cron job for SLA breach detection.

**New (Target):** PLAN-50 Phase 34: `SlaMonitorService`:
- Hourly cron: query complaints where `status NOT IN ('resolved','closed','rejected') AND sla_due_at < NOW()`
- Set `sla_breached = TRUE`
- Notify department head + municipality head
- Escalate if breach persists > 24h

### Issue 11: No Notification Service (High)

**Old (Current):** Notification tables exist in schema but no service, routes, or controller.

**New (Target):** PLAN-50 Phase 31-32:
- `NotificationService`: `sendToProfile()`, `sendToRole()`, `sendToDepartment()`
- Auto-trigger on: complaint submitted, status change, collaboration request, sign-off needed, reopen
- Endpoints: `GET /api/notifications`, `GET /api/notifications/unread-count`, `PATCH /api/notifications/:id/read`, `PATCH /api/notifications/read-all`

### Issue 12: No Media Upload (High)

**Old (Current):** No complaint media upload endpoint.

**New (Target):** PLAN-50 Phase 18: `POST /api/citizen/complaints/:id/media` — upload to `complaint-media/{trackingId}/` bucket, insert into `media` table with `context = 'complaint'`.

### Issue 13: No Public Tracking Lookup (High)

**Old (Current):** No public unauthenticated tracking endpoint.

**New (Target):** PLAN-50 Phase 33: `GET /api/public/complaints/track/:trackingId` — returns status, title, category, department, dates (no personal info).

### Issue 14: Department State Machine Incomplete (High)

**Old (Current):** `department.service.ts:46-70` — `resolveGrievance` only allows: `in_progress`, `resolved`, `rejected`, `closed`, `under_review`. No `assigned`, `escalated`, `cross_dept_pending`, `reopened`.

**New (Target):** PLAN-50 Phase 21 — full state machine:
```
PENDING → ACCEPTED → IN_PROGRESS → RESOLVED → CLOSED
  │          │            │
  └→ REJECTED └→ REJECTED  └→ REJECTED
                              RESOLVED → REOPENED → IN_PROGRESS
```

### Issue 15: Staff Routes Missing Assignment Status (High)

**Old (Current):** `staff.routes.ts:1-105` — only: profile, department, team assignements, department queue. No assignment status endpoints.

**New (Target):** PLAN-50 Phase 23: `PATCH /api/v1/staff/assignments/:id/status` — staff can set: `ACCEPTED`, `IN_PROGRESS`, `RESOLVED`. Auto-update parent complaint status.

### Issue 16: No KYC Gate on Complaint Submit (Medium)

**Old (Current):** `citizen.service.ts:14-41` — no KYC check before submission.

**New (Target):** PLAN-50 Phase 20: Unverified citizens limited to 3 pending complaints. Verified citizens unlimited. Rate limit: max 5 submissions per 24h.

### Issue 17: No Public Cascade Geography Module (Medium)

**Old (Current):** `citizen.routes.ts:27-49` — municipality and categories are under `/api/citizen/` (requires auth via middleware at line 51).

**New (Target):** PLAN-50 Phase 8: New `/api/public/` module with unauthenticated cascade endpoints: provinces, districts (by province), municipalities (by district).

### Issue 18: No Reopen Endpoint (Medium)

**Old (Current):** No citizen reopen endpoint.

**New (Target):** PLAN-50 Phase 25: `POST /api/citizen/complaints/:id/reopen` — validate resolved/closed within 7 days, set REOPENED, notify department.

### Issue 19: No Complaint Updates/Notes Endpoint (Medium)

**Old (Current):** No endpoints for adding or viewing complaint updates/notes.

**New (Target):** PLAN-50 Phase 24:
- `POST /api/citizen/complaints/:id/updates` — citizen notes (public)
- `POST /api/v1/department/complaints/:id/updates` — staff notes (internal/external)
- `GET /api/citizen/complaints/:id/updates` — citizen sees public only
- `GET /api/v1/department/complaints/:id/updates` — staff sees all

### Issue 20: No Export/Analytics Endpoints (Medium)

**Old (Current):** No CSV export or analytics endpoints.

**New (Target):** PLAN-50 Phase 35:
- `GET /api/v1/department/complaints/export?format=csv`
- `GET /api/v1/department/analytics` — daily trends, staff perf, category breakdown
- `GET /api/municipality/:mid/analytics` — by ward, by dept, resolution rate

### Issue 21: Citizen Complaint List Returns Limited Fields (Medium)

**Old (Current):** `complaints.repository.ts:22-36` — `getCitizenComplaints` selects only: `co_uid, title, description, status, submitted_date, assigned_department_id, resolution_note, rejection_reason`. No tracking_id, severity, category name.

**New (Target):** Include `tracking_id`, `severity_level`, category name (via join), department name, SLA status.

### Issue 22: Department Dashboard Missing Collaboration Complaints (Low)

**Old (Current):** `department.repository.ts:94-101` — filters by `assigned_department_id` only. Misses complaints where this department is the supporting partner in a collaboration.

**New (Target):** PLAN-50 Phase 29: Department queue should include both assigned + collaboration complaints.

---

## Target Implementation Summary

### New Files Required

| # | File | Purpose | PLAN Phase |
|---|------|---------|------------|
| 1 | `src/service/location-resolver.service.ts` | Resolve ward from address/GPS/manual | 6 |
| 2 | `src/service/routing-engine.service.ts` | Map category→department, auto-route | 11-15 |
| 3 | `src/service/tracking-id.service.ts` | Generate blueprint-format tracking IDs | 17 |
| 4 | `src/service/collaboration.service.ts` | Multi-dept collaboration + sign-off logic | 26-30 |
| 5 | `src/service/sla-monitor.service.ts` | Hourly SLA breach detection cron | 34 |
| 6 | `src/service/notification.service.ts` | Send notifications on complaint events | 31 |
| 7 | `src/service/export.service.ts` | CSV export for complaints | 35 |
| 8 | `src/middleware/location-validation.ts` | Validate ward belongs to municipality | 10 |
| 9 | `src/middleware/rate-limit.ts` | Rate limiting for complaint submission | 20 |
| 10 | `src/modules/public/routes/public.routes.ts` | Public cascade + tracking endpoints | 8, 33 |
| 11 | `src/modules/public/controller/public.controller.ts` | Public endpoint handlers | 8, 33 |
| 12 | `src/modules/public/services/public.service.ts` | Public query logic | 8, 33 |
| 13 | `src/modules/notifications/routes/notification.routes.ts` | Notification CRUD endpoints | 32 |
| 14 | `src/modules/notifications/controller/notification.controller.ts` | Notification handlers | 32 |
| 15 | `src/modules/notifications/services/notification.service.ts` | Notification query logic | 32 |
| 16 | `supabase/migrations/v3-complaint-blueprint-columns.sql` | Add tracking_id, severity, location, SLA, collab columns | 1 |
| 17 | `supabase/migrations/v3-complaint-collaborations.sql` | Create complaint_collaborations table | 2 |
| 18 | `supabase/migrations/v3-complaint-signoffs.sql` | Create complaint_sign_offs table | 3 |
| 19 | `supabase/migrations/v3-update-complaint-status-enum.sql` | Add cross_dept_pending, reopened | 4 |
| 20 | `supabase/migrations/v3-category-department-mapping.sql` | Add department_id to complaint_categories | 5 |
| 21 | `tests/complaint-routing.test.ts` | Location + routing tests | 46 |
| 22 | `tests/complaint-collaboration.test.ts` | Lifecycle + collaboration tests | 47 |

### Existing Files to Modify

| # | File | Changes | PLAN Phase |
|---|------|---------|------------|
| 1 | `src/types/database.type.ts` | Add 15+ fields to ComplaintRow, add Collaboration/SignOff types, fix ComplaintStatus enum, add department_id to ComplaintCategoryRow | 1-5 |
| 2 | `src/modules/citizen/routes/citizen.routes.ts` | Add media upload, reopen, updates endpoints; update submit body | 16, 18, 24-25 |
| 3 | `src/modules/citizen/services/citizen.service.ts` | Full rewrite: 4-step submission, location resolution, routing, KYC gate, rate limit, reopen | 12-13, 16-20, 25 |
| 4 | `src/modules/citizen/controller/citizen.controller.ts` | Add handlers for new endpoints | 16, 18, 24-25 |
| 5 | `src/validation/citizen.validation.ts` | New submit schema with location/category/details structure | 16 |
| 6 | `src/modules/complaints/routes/complaints.routes.ts` | Update submit, add analytics; consolidate with citizen routes | 16 |
| 7 | `src/modules/complaints/services/complaints.service.ts` | Add routing, tracking ID generation | 11-17 |
| 8 | `src/modules/complaints/repository/complaints.repository.ts` | Add collaboration joins, tracking ID queries | 2, 17, 29 |
| 9 | `src/modules/complaints/controller/complaint.controller.ts` | Update create handler for new schema | 16 |
| 10 | `src/modules/department/routes/department.route.ts` | Add collaboration, sign-off, notes, export, analytics routes | 22, 27-30, 35 |
| 11 | `src/modules/department/controller/department.controller.ts` | Add collaboration/sign-off/export/analytics handlers | 22, 27-30, 35 |
| 12 | `src/modules/department/services/department.service.ts` | Add collaboration queries, expand state machine, supporting dept visibility | 21-24, 29-30 |
| 13 | `src/modules/department/repository/department.repository.ts` | Expand dashboard to include collaborations, add export queries | 29-30, 35 |
| 14 | `src/modules/department/middleware/department.middleware.ts` | Add multi-dept visibility support | 29 |
| 15 | `src/modules/staff/routes/staff.routes.ts` | Add assignment status endpoints | 23 |
| 16 | `src/modules/staff/controller/staff.controller.ts` | Add assignment status handlers | 23 |
| 17 | `src/modules/staff/services/staff.service.ts` | Add assignment status logic | 23 |
| 18 | `src/middleware/auditlogger.ts` | Add routing + collaboration audit events | 14 |

---

## Sprint Plan (5 Sprints)

### Sprint 1: Database Schema & Types (Phases 1-5)
- Phase 1: Add blueprint columns migration — tracking_id, secondary_category, lead_department, cross_dept_status, severity_level, location, ward_number, submission_step, SLA columns
- Phase 2: Create `complaint_collaborations` table
- Phase 3: Create `complaint_sign_offs` table
- Phase 4: Add `cross_dept_pending`, `reopened` to complaint_status enum
- Phase 5: Add `department_id` FK to `complaint_categories`
- Update `database.type.ts` with all new types, fix ComplaintStatus enum

### Sprint 2: Location & Auto-Routing Backend (Phases 6-15)
- Phase 6: Create `LocationResolver` service (address/GPS/manual)
- Phase 7: Add ward lookup endpoint (`GET /api/citizen/wards?municipality_id=`)
- Phase 8: Create `/api/public/` module with province/district/municipality cascade
- Phase 9: Add GPS location capture endpoint
- Phase 10: Create location validation middleware
- Phase 11: Create `RoutingEngine` service (category→department mapping)
- Phase 12: Implement single-department auto-route
- Phase 13: Implement multi-department auto-route (Method A)
- Phase 14: Add routing audit logging
- Phase 15: Add fallback routing for unmatched categories

### Sprint 3: 4-Step Submission, Media & Tracking (Phases 16-20)
- Phase 16: Rewrite submission endpoint — structured 4-step body
- Phase 17: Create `TrackingIdService` — blueprint format
- Phase 18: Add media upload endpoint for complaint evidence
- Phase 19: Add severity→SLA mapping (low=120h, medium=72h, high=24h)
- Phase 20: Add KYC gate + rate limiting on submission

### Sprint 4: Lifecycle, Collaboration & Notifications (Phases 21-35)
- Phase 21: Define single-dept state machine (accept, reject, reopen)
- Phase 22: Add status update endpoint for department head
- Phase 23: Add assignment status endpoint for staff
- Phase 24: Add complaint updates/notes endpoints (internal vs public)
- Phase 25: Add citizen reopen endpoint (within 7 days)
- Phase 26: Create `CollaborationService`
- Phase 27: Implement Method B — staff escalation/request collaboration
- Phase 28: Implement joint sign-off endpoints
- Phase 29: Add multi-dept visibility middleware
- Phase 30: Add multi-dept dashboard stats
- Phase 31: Create `NotificationService` for complaint events
- Phase 32: Add notification CRUD endpoints
- Phase 33: Add public tracking lookup endpoint
- Phase 34: Create `SlaMonitorService` — hourly breach cron
- Phase 35: Add export & analytics endpoints

### Sprint 5: Frontend, Testing & Docs (Phases 36-50)
- Phase 36-40: Frontend 4-step submission wizard (location, category, details, review)
- Phase 41-45: Frontend dept head panels (queue, detail, collaboration, sign-off, staff)
- Phase 46-48: Backend tests (routing, lifecycle, collaboration)
- Phase 49: Frontend tests (wizard, dept panels)
- Phase 50: Documentation, cleanup, update AGENT.md/CLAUDE.md

---

## Summary of Changes

| Metric | Current | Target |
|--------|---------|--------|
| ComplaintRow fields | 17 | 38 (+21 blueprint columns) |
| Types missing | complaint_collaborations, complaint_sign_offs | Both added |
| ComplaintStatus values | 6 | 10 (+ assigned, escalated, reopened, cross_dept_pending) |
| New service files | 0 | 7 (location-resolver, routing-engine, tracking-id, collaboration, sla-monitor, notification, export) |
| New SQL migrations | 0 | 5 |
| New modules | 0 | 2 (public, notifications) |
| Submission body | Flat (municipality_id, title, description) | Structured 4-step (location, category, details, step) |
| Routing | None (manual municipality_id) | Auto: category→department with fallback |
| Collaboration | None | Multi-dept Method A (citizen tag) + Method B (staff escalate) |
| Tracking | UUID only (co_uid) | Blueprint tracking IDs (KTM-WARD4-SWM-2026-000001) |
| SLA | sla_due_at column exists, no monitoring | Hourly cron breach detection + escalation |
| Notifications | Tables exist in schema | Full service + CRUD endpoints |
| Media upload | None | complaint-media storage bucket + upload endpoint |
| Public endpoints | None | /api/public/ cascade + tracking lookup |
| Department dashboard | assigned_department_id only | Includes collaborations + supporting role |
| Staff assignment | None | accept, start, resolve endpoints |
| Citizen complaint limit | None | KYC gate: 3 pending unverified, 5/24h rate limit |
