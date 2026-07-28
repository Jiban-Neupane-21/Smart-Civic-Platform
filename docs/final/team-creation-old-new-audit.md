# Team Creation, Scheduling & Cross-Department Collaboration — Old vs New Audit

> Based on `docs/PLAN-50-Phases-Team-Creation.md` (50 phases) and `supabase/Supabase_Schema.sql`.

---

## Critical Issues Summary

| # | Severity | Issue | Affected Component |
|---|----------|-------|--------------------|
| 1 | **Critical** | `TeamRow` missing 5 blueprint columns: `municipality_id`, `team_type`, `start_date`, `end_date`, `created_by` | `database.type.ts:380-388` |
| 2 | **Critical** | No `StaffAssignmentRow` type — entire schedule/availability tracking system missing | `database.type.ts` |
| 3 | **Critical** | No cross-department team routes — municipality module has no `/teams` endpoints | `municipality.routes.ts` |
| 4 | **Critical** | Team create endpoint has no time-bound fields — no `start_date`/`end_date` | `department.controller.ts:9-34`, `department.service.ts:7-33` |
| 5 | **Critical** | No schedule conflict checking — staff can be double-booked across teams | Missing `schedule.service.ts` |
| 6 | **High** | No `staff_assignments` table in Database map — can't query schedules | `database.type.ts` |
| 7 | **High** | Team list (`GET /department/teams`) doesn't include dates, expiry, days_remaining info | `department.repository.ts:339-357` |
| 8 | **High** | No auto-release mechanism — teams never auto-deactivate on end_date | Missing cron/logic |
| 9 | **High** | No staff schedule endpoint — staff can't view their own team assignments | `staff.routes.ts` |
| 10 | **High** | No department head schedule view — can't see staff availability before creating teams | `department.controller.ts` |
| 11 | **High** | No complaint-team linking endpoints — `POST /department/teams/:teamName/assign-complaint` missing | Department routes |
| 12 | **Medium** | Team update (`PATCH /department/teams/:teamName`) doesn't support date extension + re-check availability | `department.controller.ts:288-315` |
| 13 | **Medium** | No team deactivation with cascade — no `end_date = NOW()` for staff assignments | `department.controller.ts` |
| 14 | **Medium** | No team validation schemas (`createTeamSchema`, `updateTeamSchema`, `assignComplaintSchema`) | Missing `team.validation.ts` |
| 15 | **Medium** | No team audit logging (TEAM_CREATE, STAFF_ASSIGNED_TO_TEAM, EMERGENCY_OVERRIDE) | `auditlogger.ts` |
| 16 | **Medium** | Department staff repo uses `s_uid` in `getDepartmentStaff` — wrong column name | `department.repository.ts:74` |
| 17 | **Low** | No staff assignment acceptance/acknowledgment tracking | `staff.routes.ts` |
| 18 | **Low** | `TeamMemberRow` has no `acknowledged_at` field for staff acceptance | `database.type.ts:390-396` |

---

## Old Code vs New Target

### Issue 1: TeamRow Missing Blueprint Columns (Critical)

**Old (Current):** `database.type.ts:380-388` — only 7 fields:
```typescript
export interface TeamRow {
  id: string;
  department_id: string;
  team_name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

**New (Target):** `Supabase_Schema.sql:408-427` adds 5 columns:
- `municipality_id UUID` — for cross-department teams (NULL for single-dept)
- `team_type team_type NOT NULL DEFAULT 'single_department'` — enum: `single_department` | `cross_departmental`
- `start_date TIMESTAMPTZ` — when team becomes active
- `end_date TIMESTAMPTZ` — when team auto-deactivates
- `created_by UUID REFERENCES profiles(id)` — who created the team
- Also has constraint: `chk_team_type` ensuring correct FK based on type

### Issue 2: No StaffAssignmentRow Type (Critical)

**Old (Current):** No `StaffAssignmentRow` exists in types. No way to represent time-bound staff-team assignments.

**New (Target):** `Supabase_Schema.sql:441-455` defines `staff_assignments` table:
```typescript
interface StaffAssignmentRow {
  id: string;
  staff_id: string;
  team_id: string;
  assigned_by: string | null;
  start_date: string;
  end_date: string;
  is_emergency_override: boolean;
  override_reason: string | null;
  released_at: string | null;
  release_reason: string | null;
  created_at: string;
}
```
Plus unique constraint `(staff_id, team_id)` and `CHECK (start_date < end_date)`.

### Issue 3: No Cross-Department Team Routes (Critical)

**Old (Current):** `municipality.routes.ts:1-83` — No team endpoints. Department routes (`department.route.ts:70-108`) handle teams only for single-department.

**New (Target):** PLAN-50 Phase 11 — New routes under municipality:
- `GET /:municipalityId/teams` — list cross-department teams
- `POST /:municipalityId/teams` — create cross-department team
- `GET /:municipalityId/teams/:teamId` — team detail
- `PATCH /:municipalityId/teams/:teamId` — update team
- `DELETE /:municipalityId/teams/:teamId` — deactivate team

### Issue 4: Team Create Missing Time-Bound Fields (Critical)

**Old (Current):** `department.controller.ts:9-34` — `setupTeam` accepts only: `team_name`, `description`, `member_staff_ids`, `leader_staff_id`. No dates.
- `department.service.ts:7-33` — `buildDeploymentTeam` creates team + members but no `start_date`/`end_date`, no `staff_assignments` rows.

**New (Target):** PLAN-50 Phase 6: Rewrite to accept `team_name`, `description`, `member_staff_ids`, `leader_staff_id`, `start_date` (required), `end_date` (required). Creates team row + team_members + staff_assignments. Validates dates not in past, team_name unique.

### Issue 5: No Schedule Conflict Checking (Critical)

**Old (Current):** No check for overlapping staff assignments. Staff can be added to multiple teams with overlapping dates.

**New (Target):** PLAN-50 Phase 7, 13, 16:
- `ScheduleService.checkAvailability(staffId, startDate, endDate)` — checks `staff_assignments` for overlapping date ranges
- `ScheduleService.checkBulkAvailability(staffIds[], startDate, endDate)` — bulk check
- Phase 3: DB function `check_staff_availability()` — server-side conflict detection
- Phase 7: Dept head team creation validates all staff before adding
- Phase 15: Municipality head `is_emergency_override` skips conflict check

### Issue 6: No staff_assignments in Database Map (High)

**Old (Current):** `database.type.ts` Database map includes `teams` and `team_members` but no `staff_assignments` table entry.

**New (Target):** Add `staff_assignments` to the Database map with full `StaffAssignmentRow`, insert/update types.

### Issue 7: Team List Missing Time/Avail Info (High)

**Old (Current):** `department.repository.ts:339-357` — `getDepartmentTeams` returns teams with members but no dates, expiry status, or days_remaining.

**New (Target):** PLAN-50 Phase 8: Returns `start_date`, `end_date`, `team_type`, `member_count`, `days_remaining`, `is_expired` computed field. Auto-filter or mark expired teams.

### Issue 8: No Auto-Release Mechanism (High)

**Old (Current):** No logic to auto-deactivate teams when `end_date` passes.

**New (Target):** PLAN-50 Phase 4, 19:
- DB function `auto_release_expired_assignments()` — sets `staff_assignments.released_at` and marks team `is_active = false`
- Option B (simpler): check on every `GET /department/teams` or `GET /:mid/teams` fetch

### Issue 9: No Staff Schedule View (High)

**Old (Current):** `staff.routes.ts:1-105` — No schedule/team assignment endpoint.

**New (Target):** PLAN-50 Phase 17: `GET /staff/schedule` — returns all active/pending/past assignments with team names, dates, status.

### Issue 10: No Dept Head Schedule View (High)

**Old (Current):** `department.controller.ts:1-361` — No staff schedule view.

**New (Target):** PLAN-50 Phase 18: `GET /department/staff-schedule` — all staff schedules in department with color-coded availability.

### Issue 11: No Complaint-Team Linking (High)

**Old (Current):** `department.route.ts:1-165` — No complaint assignment to team endpoints.

**New (Target):** PLAN-50 Phase 21-22:
- `POST /department/teams/:teamName/assign-complaint` — link complaint via `complaint_assignments`
- `GET /department/teams/:teamName/complaints` — list complaints assigned to team
- `PATCH /department/complaints/:complaintId/assignment` — update assignment status

### Issue 12: Team Update Missing Date Support (Medium)

**Old (Current):** `department.controller.ts:288-315` — `updateTeam` accepts `team_name, description, is_active`. No date extension support.

**New (Target):** PLAN-50 Phase 9: Support updating `description`, `is_active`, `start_date`, `end_date`. If dates change, re-check staff availability. Prevent changing team_name.

### Issue 13: No Team Deactivation with Cascade (Medium)

**Old (Current):** No team deactivation endpoint that cascades to staff assignments.

**New (Target):** PLAN-50 Phase 10:
- Deactivate team: set `is_active = false` on team + set `staff_assignments.end_date = NOW()` + `released_at = NOW()` for all active members
- Add reason: completed, cancelled, replaced

### Issue 14: No Team Validation Schemas (Medium)

**Old (Current):** No `team.validation.ts` file. Request bodies validated manually in controller.

**New (Target):** PLAN-50 Phase 44:
- `createTeamSchema`: team_name, description, start_date, end_date, member_staff_ids, leader_staff_id, is_emergency_override, override_reason
- `updateTeamSchema`: team_name, description, start_date, end_date, is_active
- `assignComplaintSchema`: complaint_id (UUID)
- `updateAssignmentSchema`: status (enum), notes

### Issue 15: No Team Audit Logging (Medium)

**Old (Current):** No audit events for team operations.

**New (Target):** PLAN-50 Phase 45: Log TEAM_CREATE, TEAM_UPDATE, TEAM_DEACTIVATE, STAFF_ASSIGNED_TO_TEAM, STAFF_RELEASED_FROM_TEAM, COMPLAINT_ASSIGNED_TO_TEAM, EMERGENCY_OVERRIDE_USED.

### Issue 16: s_uid in Department Repository (Medium)

**Old (Current):** `department.repository.ts:74` — `.select("s_uid, ...")` should be `.select("id, ...")`. This is carried over from the dept-staff audit (Issue 13 in dept-staff audit).

**New (Target):** PLAN-50 Phase 41: Fix all `s_uid` references to `id`.

### Issue 17: No Staff Assignment Acceptance (Low)

**Old (Current):** No endpoint for staff to accept/acknowledge team assignments.

**New (Target):** PLAN-50 Phase 39: `PATCH /staff/assignments/:id/acknowledge` — set `acknowledged_at` timestamp. Send reminder if not acknowledged within 24h.

### Issue 18: TeamMemberRow Missing acknowledged_at (Low)

**Old (Current):** `database.type.ts:390-396` — `TeamMemberRow` has no `acknowledged_at` field.

**New (Target):** PLAN-50 Phase 39: Add `acknowledged_at TIMESTAMPTZ` to `team_members` for staff acceptance tracking.

---

## Target Implementation Summary

### New Files Required

| # | File | Purpose | PLAN Phase |
|---|------|---------|------------|
| 1 | `src/service/schedule.service.ts` | Staff availability checking, schedule queries | 16 |
| 2 | `src/validation/team.validation.ts` | Zod schemas for team CRUD + assignment | 44 |
| 3 | `supabase/migrations/add-team-timebound-columns.sql` | Add start_date, end_date, team_type, created_by, municipality_id to teams | 1 |
| 4 | `supabase/migrations/add-staff-assignments-table.sql` | Create staff_assignments table | 2 |
| 5 | `supabase/migrations/rpc-check-staff-availability.sql` | DB function for overlap detection | 3 |
| 6 | `supabase/migrations/rpc-auto-release.sql` | Auto-release expired assignments function | 4 |
| 7 | `supabase/migrations/add-team-indexes.sql` | Indexes for performance | 5 |
| 8 | `tests/team-single-department.test.ts` | Single-dept team tests | 46 |
| 9 | `tests/team-cross-department.test.ts` | Cross-dept team tests | 47 |
| 10 | `tests/team-schedule.test.ts` | Schedule/availability tests | 48 |

### Existing Files to Modify

| # | File | Changes | PLAN Phase |
|---|------|---------|------------|
| 1 | `src/types/database.type.ts` | Add 5 cols to TeamRow, add StaffAssignmentRow, add staff_assignments to Database map, add TeamType enum | 1-2, 6 |
| 2 | `src/modules/department/controller/department.controller.ts` | Add dates to team create, add dept schedule view, add complaint-team endpoints, add team deactivation | 6, 9-10, 18, 21-23 |
| 3 | `src/modules/department/services/department.service.ts` | Add schedule overlap check, auto-release logic, complaint assignment, team metrics | 6-7, 19, 21-25 |
| 4 | `src/modules/department/repository/department.repository.ts` | Add staff_assignments queries, update team list with dates/expiry, fix s_uid→id, add assignment queries | 6-8, 21-25, 41-43 |
| 5 | `src/modules/department/routes/department.route.ts` | Add complaint-team linking routes, staff-schedule route | 21-23, 18 |
| 6 | `src/modules/municipality/routes/municipality.routes.ts` | Add cross-department team CRUD routes | 11 |
| 7 | `src/modules/municipality/controller/municipality.controller.ts` | Add cross-dept team handlers + notification on staff borrow | 11-15 |
| 8 | `src/modules/municipality/services/municipality.service.ts` | Add cross-dept team logic, staff validation across departments | 12-13 |
| 9 | `src/modules/municipality/repository/municipality.repository.ts` | Add cross-dept team queries, staff-by-department queries | 11-12 |
| 10 | `src/modules/staff/routes/staff.routes.ts` | Add schedule view, assignment history, assignment acknowledgment | 17, 20, 39 |
| 11 | `src/modules/staff/controller/staff.controller.ts` | Add schedule + assignment handlers | 17, 20, 39 |
| 12 | `src/modules/staff/services/staff.service.ts` | Add schedule query logic | 17, 20 |
| 13 | `src/middleware/auditlogger.ts` | Add audit events for team operations | 45 |

---

## Sprint Plan (4 Sprints)

### Sprint 1: Database Schema & Types (Phases 1-5)
- Phase 1: Migration to add `start_date`, `end_date`, `team_type`, `created_by`, `municipality_id` to `teams`
- Phase 2: Create `staff_assignments` table with FK constraints + unique + CHECK
- Phase 3: Create `check_staff_availability()` DB function
- Phase 4: Create `auto_release_expired_assignments()` DB function
- Phase 5: Add indexes for staff_assignments + teams + constraints
- Update `database.type.ts`: TeamRow + StaffAssignmentRow + Database map

### Sprint 2: Single-Department Team CRUD (Phases 6-10)
- Phase 6: Rewrite `POST /department/teams/create` — add `start_date`, `end_date`, create staff_assignments
- Phase 7: Add schedule overlap check on team creation
- Phase 8: Rewrite `GET /department/teams` — include dates, days_remaining, is_expired
- Phase 9: Rewrite `PATCH /department/teams/:teamName` — support date extension + re-check
- Phase 10: Add team deactivation with cascade to staff_assignments

### Sprint 3: Cross-Department + Schedule Engine (Phases 11-20)
- Phase 11: Add municipality team routes + controller + service + repository
- Phase 12: Implement cross-department team creation with multi-dept staff validation
- Phase 13: Add cross-department staff availability check
- Phase 14: Auto-notify dept heads when staff borrowed cross-department
- Phase 15: Add `is_emergency_override` for municipality head
- Phase 16: Create `ScheduleService` (check, bulk check, getSchedule, release)
- Phase 17: Add `GET /staff/schedule` endpoint
- Phase 18: Add `GET /department/staff-schedule` endpoint
- Phase 19: Implement auto-release on team list fetch + logging
- Phase 20: Add assignment history tracking + `GET /staff/assignment-history`

### Sprint 4: Complaint-Team Linking, Validation, Tests & Docs (Phases 21-50)
- Phase 21: Add `POST /department/teams/:teamName/assign-complaint`
- Phase 22: Add `GET /department/teams/:teamName/complaints`
- Phase 23: Add `PATCH /department/complaints/:complaintId/assignment`
- Phase 24: Add team complaints dashboard summary
- Phase 25: Add team performance metrics endpoint
- Phase 26-40: Frontend (ManageTeam.tsx rewrite, municipality team UI, staff schedule)
- Phase 41-43: Fix `s_uid`/`d_uid` column references in team code
- Phase 44: Create Zod validation schemas for team endpoints
- Phase 45: Add audit logging for team operations
- Phase 46-50: Tests + documentation

---

## Summary of Changes

| Metric | Current | Target |
|--------|---------|--------|
| TeamRow fields | 7 | 12 (+ municipality_id, team_type, start_date, end_date, created_by) |
| New types | 0 | StaffAssignmentRow (11 fields) |
| Team table in DB map | teams, team_members | + staff_assignments |
| Department team endpoints | 5 (create, list, detail, update, deactivate-member) | 10 (+ assign-complaint, team-complaints, update-assignment, staff-schedule, deactivate-team) |
| Municipality endpoints | ~20 dept/staff/complaint | ~25 (+ 5 team CRUD) |
| Staff endpoints | 5 (profile, update, my-department, assignments, queue) | 7 (+ schedule, assignment-history) |
| Schedule checking | None | Real-time overlap detection via DB function + service |
| Team dates | None | start_date + end_date with validation |
| Auto-release | Manual only | Automatic on end_date (checked on fetch) |
| Cross-dept teams | Not possible | Full CRUD by municipality head |
| Emergency override | None | Municipality Head can override conflicts |
| Complaint-team link | None | Full assignment lifecycle |
| Team validation | Manual in controller | Zod schemas (3 new schemas) |
| Audit logging | None for teams | 7 audit event types |
| Column bugs | s_uid in staff queries | Fixed to id |
