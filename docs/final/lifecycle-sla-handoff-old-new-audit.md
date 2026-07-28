# Grievance Status Lifecycle, Staff Handoff & SLA Auto-Escalation — Old vs New Audit

## Current State Summary

The **Supabase schema** already has all the tables needed (`complaint_handoffs`, `sla_events`, `department_performance_scores`, SLA columns on `complaints`, all status enum values). The **TypeScript types** partially cover them but are missing 3 table types and 2 enums. The **backend code** is significantly behind — only a minimal `SlaMonitorService` and a scattered state transition method in `department.service.ts`.

| Area | Status |
|------|--------|
| **Schema (SQL)** | ✅ 100% — all tables, enums, columns exist |
| **TypeScript types** | ⚠️ Partial — `ComplaintRow` has all fields, but 3 table types missing |
| **Database map entries** | ⚠️ 3 missing (`complaint_handoffs`, `sla_events`, `department_performance_scores`) |
| **Backend services** | ❌ `LifecycleService`/`HandoffService`/`PerformanceService`/`AutoCloseService` all missing |
| **REST endpoints** | ❌ No assignment acceptance flow, no handoff endpoints, no performance endpoints |
| **Frontend** | ❌ All UI components missing |
| **SLA monitoring** | ⚠️ Basic `SlaMonitorService` exists but no Level 1/2 escalation |

---

## Critical Issues

### C1 — 3 Entire Table Types Missing from Database

**Missing types and Database map entries:**

| Table | Schema Exists | TypeScript Type | Database Map Entry |
|-------|:------------:|:--------------:|:-----------------:|
| `complaint_handoffs` | ✅ Supabase_Schema.sql:561 | ❌ No `ComplaintHandoffRow` | ❌ Not in Database map |
| `sla_events` | ✅ Supabase_Schema.sql:611 | ❌ No `SlaEventRow` | ❌ Not in Database map |
| `department_performance_scores` | ✅ Supabase_Schema.sql:828 | ❌ No `DepartmentPerformanceScoreRow` | ❌ Not in Database map |

**ComplaintHandoffRow** needs (from schema):
```typescript
export interface ComplaintHandoffRow {
  id: string;
  complaint_id: string;
  from_staff_id: string | null;
  to_staff_id: string | null;
  to_department_head: boolean;
  handoff_type: HandoffType;
  handoff_reason: string;
  handoff_note: string | null;
  initiated_by: string | null;
  created_at: string;
}
```

**SlaEventRow** needs (from schema):
```typescript
export interface SlaEventRow {
  id: string;
  complaint_id: string;
  sla_level: number;
  triggered_at: string;
  status_at_time: ComplaintStatus;
  notified_staff: boolean;
  notified_dept_head: boolean;
  notified_munic_head: boolean;
  resolved_at: string | null;
}
```

**DepartmentPerformanceScoreRow** needs (from schema):
```typescript
export interface DepartmentPerformanceScoreRow {
  id: string;
  department_id: string;
  municipality_id: string;
  month: string;
  total_complaints: number;
  resolved_count: number;
  sla_breach_count: number;
  avg_resolution_hours: number | null;
  avg_rating: number | null;
  handoff_count: number;
  escalation_count: number;
  performance_score: number | null;
  computed_at: string;
}
```

**Files affected:** database.type.ts — missing types + missing map entries at lines 744-761 area

---

### C2 — 2 Missing Enums in Types

Schema defines (Supabase_Schema.sql:52):
```sql
CREATE TYPE handoff_type AS ENUM ('peer_reassign', 'return_to_dept_head');
```

But `HandoffType` is **not defined** in TypeScript. The `Enums` block (database.type.ts:864-880) also misses `handoff_type`, `notification_type`, `notification_channel`.

Note: `NotificationType` and `NotificationChannel` types DO exist as standalone type aliases (lines 479-488) but are NOT registered in the `Enums` block, meaning `Database["public"]["Enums"]["notification_type"]` won't compile.

**Files affected:** database.type.ts:864-880

---

### C3 — No Centralized Lifecycle State Machine

The PLAN (Phase 6-7) requires a `LifecycleService` with:
- `transition(complaintId, fromStatus, toStatus, actorId, note?)` — validate + execute
- `validateTransition(currentStatus, targetStatus, actorRole)` — state machine rules
- `onTransition(complaintId, newStatus, actorId)` — side effects (notifications, timestamps, audit)

Current scattered state changes:
- `department.service.ts:87-110` — `resolveGrievance()` allows ad-hoc status transitions with no validity checking
- `department.controller.ts:78-91` — `processGrievanceState` allows `in_progress`, `resolved`, `rejected`, `closed`, `under_review` but NO validation of valid transition paths
- `citizen.service.ts:203-250` — `reopenComplaint()` directly sets `status: "reopened"` with no centralized state machine

**Impacts:**
- Transitions can violate state machine rules (e.g., PENDING → RESOLVED bypassing ASSIGNED → IN_PROGRESS)
- No audit trail for transitions (no `complaint_updates` entries created centrally)
- No side effects on transition (notifications, SLA timer management)
- Citizen transparency messages not generated

**Files affected:** department.service.ts:87-110, department.controller.ts:78-91, citizen.service.ts:203-250

---

### C4 — No Assignment Acceptance Flow

The PLAN (Phase 10) requires acceptance flow:
- `POST /api/v1/staff/assignments/:id/accept` → status = ASSIGNED, set `accepted_at`
- `POST /api/v1/staff/assignments/:id/start` → status = IN_PROGRESS, set `started_at`
- `POST /api/v1/staff/assignments/:id/complete` → status = RESOLVED, set `completed_at`

Current state:
- `ComplaintAssignmentRow` (database.type.ts:420-435) already has `accepted_at`, `started_at`, `completed_at` columns
- `AssignmentStatus` enum has `pending | accepted | in_progress | completed | cancelled | reassigned`
- `staff.service.ts:58-64` — `acknowledgeAssignment` only works on `team_members` table, not `complaint_assignments`
- **NO endpoints exist** to update complaint_assignments status or timestamps
- **NO validation** that staff is the assigned person before accepting

**Files affected:** staff.service.ts:58-64, staff.repository.ts:118-129

---

### C5 — No Handoff Service

The PLAN (Phases 11-15) requires a `HandoffService` with:
- `initiateHandoff(complaintId, fromStaffId, reason, note)`
- `transferToPeer(complaintId, fromStaffId, toStaffId, reason, note)`
- `returnToDepartmentHead(complaintId, fromStaffId, reason, note)`
- `acceptHandoff(handoffId, toStaffId)`
- `rejectHandoff(handoffId, toStaffId, reason)`

Current state:
- Schema has `complaint_handoffs` table (Supabase_Schema.sql:561) with all columns ready
- `handoff_type` enum exists: `peer_reassign | return_to_dept_head`
- ComplaintRow has `handoff_count: number` and `current_staff_id: string | null`
- **NO HandoffService class exists**
- **NO handoff endpoints exist**
- **NO handoff repository methods exist**
- `AssignmentStatus.reassigned` exists in types but is never used

**Impact:** Staff have no way to transfer tickets. Tickets stuck on a staff member who is unavailable have no resolution path.

---

### C6 — SLA Monitor Service Missing Level 1/2 Escalation

Current `SlaMonitorService` (sla-monitor.service.ts:1-54) only has:
- `calculateSlaDueDate(severity)` — sets initial SLA due date (24h/72h/120h)
- `checkAndFlagBreaches()` — flags all overdue complaints as `sla_breached = true`

**What's missing:**
- **Level 1 Warning** (24h in ASSIGNED): No query for complaints in ASSIGNED > 24h with `sla_level = 0`
- **Level 2 Escalation** (48h without progress): No escalation to ESCALATED status, no `sla_events` row creation
- **No notification dispatch**: Doesn't send SMS/alert to staff or department head
- **No `sla_events` table interaction**: Schema has the table but service never writes to it
- **No `sla_level` incrementing**: Never sets `sla_level = 1` for warning or `sla_level = 2` for escalation
- **No performance penalty**: Doesn't trigger performance score penalty on escalation

**Files affected:** sla-monitor.service.ts:25-53

---

### C7 — No Performance Scoring Service

The PLAN (Phases 26-30) requires a `PerformanceService` with:
- `calculateMonthlyScore(departmentId, month)` using resolution rate (40%), SLA compliance (30%), avg rating (20%), handoff efficiency (10%)
- `getDepartmentScore(departmentId, month)` — retrieve
- `getDepartmentRanking(municipalityId, month)` — ranking

Current state:
- Schema has `department_performance_scores` table (Supabase_Schema.sql:828)
- `monthly_aggregated_stats` table (Supabase_Schema.sql:798) contains raw metrics
- `FeedbackRow` (database.type.ts:446) has `rating: number`
- **NO PerformanceService class exists**
- **NO performance endpoints exist**
- **NO monthly auto-calculation cron exists**
- **No integration** with SLA escalation (escalation → score penalty)

---

### C8 — No Auto-Close Service

The PLAN (Phase 25) requires auto-closing complaints after 7 days of inactivity post-RESOLVED.

Current state:
- **NO `AutoCloseService` exists**
- **No cron job** for daily auto-close
- Complaints in RESOLVED status remain there indefinitely

---

### C9 — No Resolution Proof Upload Tied to Completion

The PLAN (Phase 21-22) requires:
- Before marking RESOLVED: staff must upload at least 1 "after work" photo
- `POST /api/v1/staff/assignments/:id/resolve-with-proof`
- Media records with `context = 'assignment_proof'`

Current state:
- `MediaContext = "assignment_proof"` type exists (database.type.ts:165)
- **No upload endpoint** tied to assignment completion
- `department.service.ts:resolveGrievance()` allows status change to RESOLVED with no proof requirement
- Storage service exists but no integration

**Files affected:** department.service.ts:87-110

---

### C10 — No Citizen Timeline API

The PLAN (Phase 9) requires:
- `GET /api/citizen/complaints/:id/timeline` — status history with citizen-friendly messages

Current state:
- `complaint_updates` table exists in schema and types (`ComplaintUpdateRow` at database.type.ts:437)
- **NO timeline endpoint exists**
- **NO citizen-friendly message mapping** per status
- Reopen flow creates a `complaint_updates` entry but other transitions do not

---

### C11 — No Department Reassignment Dashboard

The PLAN (Phase 14) requires:
- `GET /api/v1/department/complaints/reassignment-required` — tickets returned by staff
- `POST /api/v1/department/complaints/:id/reassign` — dept head reassigns

Current state:
- Department repo has `assignComplaintToTeam` but no reassignment-specific logic
- No endpoint for listing tickets needing reassignment
- No endpoint for department head manual reassignment

---

### C12 — No Municipality Head Escalation Feed

The PLAN (Phase 19) requires:
- `GET /api/municipality/:mid/complaints/escalated` — list ESCALATED complaints
- `POST /api/municipality/:mid/complaints/:id/intervene` — munic head action

Current state:
- `ComplaintStatus.escalated` exists
- `ComplaintRow.escalated_to_munic_head` and `escalated_at` exist
- **No escalation feed endpoint exists**

---

## Old Code Audit (per file with line numbers)

### 1. `src/types/database.type.ts`

| Lines | Issue |
|-------|-------|
| 76-117 | `ComplaintRow`: ✅ All SLA/handoff columns exist (sla_level, sla_breached, sla_breached_at, escalated_to_munic_head, escalated_at, current_staff_id, current_team_id, handoff_count) |
| 119-134 | `ComplaintCollaborationRow`: ✅ Exists |
| 136-145 | `ComplaintSignOffRow`: ✅ Exists |
| 164-165 | `MediaContext`: ✅ `assignment_proof` exists |
| 420-435 | `ComplaintAssignmentRow`: ✅ accepted_at, started_at, completed_at exist |
| 437-444 | `ComplaintUpdateRow`: ✅ Exists |
| 446-459 | `FeedbackRow`: ✅ Exists |
| 479-486 | `NotificationType`: ✅ `handoff`, `sla_warning`, `sla_escalation` exist |
| 864-880 | **Enums block**: ❌ Missing `handoff_type`, `notification_type`, `notification_channel` — even though standalone type aliases exist for NotificationType and NotificationChannel |
| **MISSING** | ❌ No `ComplaintHandoffRow` type |
| **MISSING** | ❌ No `SlaEventRow` type |
| **MISSING** | ❌ No `DepartmentPerformanceScoreRow` type |
| **MISSING** | ❌ No `HandoffType` type |
| **MISSING** | ❌ No Database map entries for `complaint_handoffs`, `sla_events`, `department_performance_scores` |

### 2. `src/service/sla-monitor.service.ts`

| Lines | Issue |
|-------|-------|
| 9-19 | `calculateSlaDueDate`: ✅ Works, but should use `default_sla_hours` from `complaint_categories` instead of severity-based hardcoded hours |
| 25-53 | `checkAndFlagBreaches`: ❌ Only flags all overdue complaints — no Level 1 (24h) / Level 2 (48h) distinction |
| 28-34 | ❌ Does not filter by `sla_level` — flags complaints that may already be Level 1 warned |
| 42-50 | ❌ Does not create `sla_events` rows |
| 42-50 | ❌ Does not set `sla_level = 2` or `status = 'escalated'` |
| ALL | ❌ Does not send notifications |
| ALL | ❌ Does not penalize performance scores |

### 3. `src/modules/department/services/department.service.ts`

| Lines | Issue |
|-------|-------|
| 87-110 | `resolveGrievance`: ❌ No state machine validation — allows any status transition |
| 90 | ❌ Accepts `action: Exclude<ComplaintStatus, "pending">` — too permissive, allows invalid transitions |
| 94-101 | ❌ No proof photo validation before RESOLVED |
| 87-110 | ❌ No `complaint_updates` audit entry created |
| ALL | ❌ No reassignment logic |

### 4. `src/modules/department/controller/department.controller.ts`

| Lines | Issue |
|-------|-------|
| 78-91 | `processGrievanceState`: ❌ Allows `["in_progress", "resolved", "rejected", "closed", "under_review"]` without validating transition path |
| ALL | ❌ No reassignment endpoint |
| ALL | ❌ No "reassignment required" listing endpoint |

### 5. `src/modules/department/repository/department.repository.ts`

| Lines | Issue |
|-------|-------|
| 33-57 | `updateComplaintStatus`: ✅ Works but doesn't track previous status |
| 593-630 | `assignComplaintToTeam`: ✅ Creates `complaint_assignments` row. Sets complaint status to `assigned`. Missing: doesn't set `current_staff_id` |
| ALL | ❌ No reassignment-specific methods |
| ALL | ❌ No handoff query methods |

### 6. `src/modules/citizen/services/citizen.service.ts`

| Lines | Issue |
|-------|-------|
| 203-250 | `reopenComplaint`: ❌ No centralized state machine — directly sets status |
| 225 | ❌ No reopen count validation (max 2 reopens per PLAN) |
| 203-250 | ❌ No time-window check (must be within 7 days of resolution) |
| 203-250 | ❌ No `sla_due_at` recalculation on reopen |

### 7. `src/modules/staff/services/staff.service.ts`

| Lines | Issue |
|-------|-------|
| 58-64 | `acknowledgeAssignment`: ❌ Works on `team_members` table, not `complaint_assignments` |
| ALL | ❌ No complaint assignment acceptance endpoints |
| ALL | ❌ No handoff/transfer endpoints |

### 8. `src/modules/staff/repository/staff.repository.ts`

| Lines | Issue |
|-------|-------|
| 118-129 | `acknowledgeAssignment`: ❌ Updates `team_members.acknowledged_at` — should update `complaint_assignments.accepted_at` |
| ALL | ❌ No complaint assignment queries |

### 9. `src/service/collaboration.service.ts`

| Lines | Issue |
|-------|-------|
| 1-155 | ✅ Cross-dept collaboration and sign-off flow exists. NOTE: This covers the collaboration aspects mentioned in the complaint-flow audit |

---

## New Target Implementation (per PLAN-50 and Supabase_Schema.sql)

### Schema Already Complete ✅

The following PLAN phases are **already done** at the schema level:

| Phase | What | Schema Status |
|-------|------|:------------:|
| Phase 1 | `assigned`, `escalated`, `reopened` in status enum | ✅ `complaint_status` already has all 10 values |
| Phase 2 | `complaint_handoffs` table | ✅ Exists at Supabase_Schema.sql:561 |
| Phase 3 | `sla_events` table | ✅ Exists at Supabase_Schema.sql:611 |
| Phase 4 | SLA columns on `complaints` | ✅ All 8 columns exist (sla_level, sla_breached, etc.) |
| Phase 5 | `department_performance_scores` table | ✅ Exists at Supabase_Schema.sql:828 |

### Target: Phase 6-7 — LifecycleService (State Machine)
- `LifecycleService.transition(complaintId, fromStatus, toStatus, actorId, note?)`
- `LifecycleService.validateTransition(currentStatus, targetStatus, actorRole)`
- `LifecycleService.onTransition(complaintId, newStatus, actorId)` — side effects
- State machine rules:
  - PENDING → ASSIGNED (dept head assigns)
  - PENDING → REJECTED (dept head rejects)
  - ASSIGNED → IN_PROGRESS (staff accepts/start)
  - ASSIGNED → REJECTED
  - IN_PROGRESS → RESOLVED (staff completes with proof)
  - IN_PROGRESS → REJECTED
  - RESOLVED → CLOSED (citizen feedback)
  - RESOLVED → REOPENED (within 7 days, max 2x)
  - REOPENED → IN_PROGRESS (dept head reassigns)
  - ASSIGNED → (24h) → SLA_LEVEL_1_WARNING
  - ASSIGNED → (48h) → ESCALATED
- File: `src/service/lifecycle.service.ts` (NEW)

### Target: Phase 8 — Status Change Endpoints
- `PATCH /api/v1/department/complaints/:id/status` — Dept Head
- `PATCH /api/v1/staff/assignments/:id/status` — Staff (accept/start/complete)
- `POST /api/citizen/complaints/:id/reopen` — Citizen
- `PATCH /api/municipality/:mid/complaints/:id/status` — Munic Head override

### Target: Phase 9 — Citizen Timeline API
- `GET /api/citizen/complaints/:id/timeline` — status history with citizen-friendly messages

### Target: Phase 10 — Assignment Acceptance Flow
- `POST /api/v1/staff/assignments/:id/accept` → accepted_at
- `POST /api/v1/staff/assignments/:id/start` → started_at, status IN_PROGRESS
- `POST /api/v1/staff/assignments/:id/complete` → completed_at, status RESOLVED

### Target: Phase 11-13 — HandoffService
- `HandoffService.initiateHandoff()`, `.transferToPeer()`, `.returnToDepartmentHead()`, `.acceptHandoff()`, `.rejectHandoff()`
- Endpoint: `POST /api/v1/staff/assignments/:id/transfer`
- Endpoint: `POST /api/v1/staff/assignments/:id/return-to-dept`
- File: `src/service/handoff.service.ts` (NEW)

### Target: Phase 14 — Dept Head Reassignment Dashboard
- `GET /api/v1/department/complaints/reassignment-required`
- `POST /api/v1/department/complaints/:id/reassign`

### Target: Phase 15 — Handoff Audit Trail
- `GET /api/v1/department/complaints/:id/handoffs`

### Target: Phase 16-18 — SLA Monitor (Enhanced)
- **Level 1** (24h in ASSIGNED): set `sla_level = 1`, insert `sla_events`, send SMS/alert
- **Level 2** (48h without progress): set `sla_level = 2`, `status = 'escalated'`, `sla_breached = true`, insert `sla_events`, high-priority alert to munic head
- Penalize department performance score

### Target: Phase 19 — Munic Head Escalation Feed
- `GET /api/municipality/:mid/complaints/escalated`
- `POST /api/municipality/:mid/complaints/:id/intervene`

### Target: Phase 20 — SLA Dashboard Stats
- Department: sla_warnings, sla_breaches, avg_response_time, avg_resolution_time
- Municipality: total_escalated, escalated_by_department, sla_compliance_rate

### Target: Phase 21-22 — Resolution Proof Photos
- `POST /api/v1/staff/assignments/:id/resolve-with-proof` (multipart, at least 1 photo)
- `POST /api/v1/staff/assignments/:id/start-with-photo` (optional "before" photo)
- Media records with `context = 'assignment_proof'`

### Target: Phase 23 — Citizen Resolution Review
- `GET /api/citizen/complaints/:id/proof`
- `POST /api/citizen/complaints/:id/confirm-resolution` (satisfied → CLOSED, not → reopen)

### Target: Phase 24 — Reopen Flow (Enhanced)
- Max 2 reopens per complaint
- 7-day time window from resolution
- `reopen_count` tracking
- Notify department head on reopen

### Target: Phase 25 — AutoCloseService
- Daily cron: close complaints RESOLVED > 7 days without citizen feedback
- File: `src/service/auto-close.service.ts` (NEW)

### Target: Phase 26-28 — PerformanceService
- Score formula: Resolution Rate (40%) + SLA Compliance (30%) + Avg Rating (20%) + Handoff Efficiency (10%)
- Monthly auto-calculation cron (1st of each month)
- Penalty on SLA breach
- File: `src/service/performance.service.ts` (NEW)

### Target: Phases 29-30 — Performance Endpoints
- `GET /api/v1/department/performance` — current score + trend
- `GET /api/v1/department/performance/history?months=6`
- `GET /api/municipality/:mid/performance/rankings`
- Color coding: green (>80), yellow (60-80), red (<60)

### Target: Phases 31-35 — Notifications & Alerts (Overlap with notification audit)
- AlertDispatcher: SMS, in-app, push for SLA warnings, escalations, handoffs, reopens
- `GET /api/notifications` — paginated for all roles
- Escalation dashboard for municipality head

### Target: Phases 36-40 — Frontend: Citizen Timeline
- StatusTimeline component (vertical stepper)
- Citizen ComplaintDetail page (timeline, details, media, handoff history, SLA status, feedback form)
- SLA countdown on dashboard (green >24h, yellow <24h, red breached)
- ResolutionReview page (proof photos, feedback, reopen)

### Target: Phases 41-45 — Frontend: Staff & Admin Panels
- Staff Assignments screen with handoff dialog
- Dept Head ComplaintQueue with reassignment tab
- Munic Head EscalationFeed with intervene dialog
- Dept Performance dashboard
- SLA notification badges

### Target: Phases 46-50 — Tests & Docs
- Backend tests: lifecycle transitions, handoff/SLA, performance scoring
- Frontend tests: timeline, handoff dialog, escalation feed
- Documentation: `docs/grievance-lifecycle-sla-handoff.md`

---

## Old-to-New Mapping

| Old Component | New Component | Strategy |
|---------------|--------------|----------|
| No `ComplaintHandoffRow` | `ComplaintHandoffRow` type + Database map entry | Create |
| No `SlaEventRow` | `SlaEventRow` type + Database map entry | Create |
| No `DepartmentPerformanceScoreRow` | `DepartmentPerformanceScoreRow` type + Database map entry | Create |
| No `HandoffType` | `HandoffType` enum + Enums block entry | Create |
| Missing enums ×3 | Add `handoff_type`, `notification_type`, `notification_channel` to Enums block | Create |
| `SlaMonitorService` (basic) | Enhanced `SlaMonitorService` with Level 1/2 escalation, `sla_events` logging, notifications | Rewrite |
| `department.service.ts resolveGrievance` (scattered) | `LifecycleService.transition()` with state machine | Create new, refactor calls |
| `citizen.service.ts reopenComplaint` (direct) | `LifecycleService.transition()` | Refactor to use LifecycleService |
| No `HandoffService` | `HandoffService` (peer transfer, dept head return, accept/reject) | Create |
| No `PerformanceService` | `PerformanceService` + monthly cron | Create |
| No `AutoCloseService` | `AutoCloseService` daily cron | Create |
| No assignment acceptance flow | 3 endpoints (accept/start/complete) for `complaint_assignments` | Create |
| No resolution proof upload | `POST /.../resolve-with-proof` endpoint with mandatory photo | Create |
| No citizen timeline API | `GET /api/citizen/complaints/:id/timeline` | Create |
| No reassignment endpoints | `POST /.../reassign`, `GET /.../reassignment-required` | Create |
| No escalation feed | `GET /api/municipality/:mid/complaints/escalated`, `POST /.../intervene` | Create |
| No performance endpoints | 3 endpoints (score, history, rankings) | Create |
| No frontend components | 8+ components across citizen/staff/dept head/munic head | Create |
| No tests | 3 backend test files + 3 frontend test files | Create |

---

## Sprint Plan (5 Sprints)

### Sprint 1 — Database & Types (Phases 1-5 — mostly done, fill gaps)
1. Create `ComplaintHandoffRow` type + Database map entry + missing `HandoffType` enum
2. Create `SlaEventRow` type + Database map entry
3. Create `DepartmentPerformanceScoreRow` type + Database map entry
4. Add `handoff_type`, `notification_type`, `notification_channel` to Enums block
5. Create migration script (if any remaining gaps — verify schema completeness)

### Sprint 2 — Lifecycle Engine & Assignment Flow (Phases 6-10)
1. Create `LifecycleService` with `transition()`, `validateTransition()`, `onTransition()`
2. Implement full state machine (all valid transitions with role checks)
3. Create status change endpoints for all roles
4. Create assignment acceptance flow endpoints (accept/start/complete)
5. Create citizen timeline API with friendly messages
6. Refactor `department.service.ts resolveGrievance()` to use LifecycleService
7. Refactor `citizen.service.ts reopenComplaint()` to use LifecycleService
8. Write transition tests

### Sprint 3 — Handoff & SLA Escalation (Phases 11-20)
1. Create `HandoffService` with peer transfer, dept head return, accept/reject
2. Create staff transfer/return endpoints
3. Create dept head reassignment endpoints + dashboard
4. Create handoff audit trail endpoint
5. Enhance `SlaMonitorService` with Level 1 (24h) + Level 2 (48h) escalation
6. Create `sla_events` logging in SLA monitor
7. Create munic head escalation feed + intervene endpoints
8. Add SLA dashboard stats to existing department/municipality dashboards
9. Write handoff + SLA tests

### Sprint 4 — Resolution Proof, Reopen & Auto-Close (Phases 21-30)
1. Create resolution proof upload endpoint (mandatory "after" photo)
2. Create "before" photo upload on assignment start
3. Create citizen resolution review endpoint (proof viewing + confirm)
4. Enhance reopen flow (max 2x, 7-day window, reopen_count, notification)
5. Create `AutoCloseService` daily cron
6. Create `PerformanceService` with score formula
7. Create monthly auto-calculation cron
8. Create performance score endpoints (dept + municipality)
9. Add SLA breach → score penalty integration
10. Create performance dashboard views
11. Write performance + auto-close tests

### Sprint 5 — Frontend UI & Documentation (Phases 36-50)
1. Create `StatusTimeline.tsx` component (vertical stepper)
2. Create `ComplaintDetail.tsx` citizen page with all sections
3. Create `SlaCountdown.tsx` component
4. Create `ResolutionReview.tsx` page
5. Create `Assignments.tsx` staff screen with handoff dialog
6. Create `HandoffDialog.tsx` component
7. Create `ComplaintQueue.tsx` dept head reassignment panel
8. Create `AssignDialog.tsx` component
9. Create `EscalationFeed.tsx` munic head panel
10. Create `InterveneDialog.tsx` component
11. Create `Performance.tsx` dept head score dashboard
12. Create `DeptRankings.tsx` munic head rankings
13. Create `AlertToast.tsx` for SLA notifications
14. Update navbar for all roles with notification badges
15. Write all frontend tests
16. Create documentation
17. Seed `notification_templates` for SLA/handoff events
18. Lint + typecheck all changed code

---

## Summary of Changes

| Category | Old | New |
|----------|-----|-----|
| **Types defined** | 0 lifecycle-specific types (reuses ComplaintRow) | 3 new types (ComplaintHandoffRow, SlaEventRow, DepartmentPerformanceScoreRow) |
| **Database map entries** | 0 lifecycle entries | 3 new entries (complaint_handoffs, sla_events, department_performance_scores) |
| **Enums** | 0 lifecycle enums in Enums block | 3 new (handoff_type, notification_type, notification_channel) |
| **SLA Monitor** | Basic breach flagging only | Level 1 (24h warning) + Level 2 (48h escalation) with sla_events logging + notifications + performance penalty |
| **State machine** | Scattered ad-hoc transitions in dept service + citizen service | Centralized `LifecycleService` with validation + audit + side effects |
| **Handoff system** | None | `HandoffService` with peer transfer, dept head return, accept/reject, audit trail |
| **Assignment flow** | `acknowledgeAssignment` on team_members only | Full 3-step flow: accept → in_progress → complete on complaint_assignments |
| **Resolution proof** | None (status change without proof) | Mandatory "after work" photo upload, optional "before" photo |
| **Citizen timeline** | None | Status history with citizen-friendly messages per status |
| **Reopen flow** | Basic (no limits) | Max 2 reopens, 7-day window, reopen_count tracking, notification |
| **Auto-close** | None | Daily cron: close after 7 days without citizen feedback |
| **Performance scoring** | None | Formula-based scoring (0-100), monthly auto-calculation, SLA breach penalty, ranking |
| **Reassignment dashboard** | None | Dept head: reassignment-required list + reassign; Munic head: escalation feed + intervene |
| **Performance endpoints** | None | 3 dept endpoints + 2 municipality endpoints |
| **Frontend components** | 0 | 8+ components across 4 roles |
| **Tests** | 0 lifecycle tests | 3 backend test files + 3 frontend test files |
| **Migrations** | 0 needed (schema already complete) | Schema already complete — verify no migration needed |
