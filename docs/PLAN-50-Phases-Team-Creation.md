# Team Creation, Scheduling & Cross-Department Collaboration — 50-Phase Implementation Plan

## Vision Overview
**Two Team Types + Schedule Conflict Validation + Auto-Release:**

1. **Single-Department Team** — Created by Department Head, staff from own dept only
2. **Cross-Department Team** — Created by Municipality Head, staff from ANY department
3. **Schedule Overlap Check** — Prevents double-booking staff across active teams
4. **Time-Bound + Auto-Release** — Teams auto-deactivate when end_date passes

```text
                    ┌──────────────────────────┐
                    │     CREATE NEW TEAM       │
                    └──────────┬───────────────┘
                               │
              ┌────────────────┴────────────────┐
              ▼                                 ▼
  [Single-Department Team]        [Cross-Department Team]
  • Dept Head creates             • Municipality Head creates
  • Own dept staff only           • Any dept staff
              │                                 │
              └────────────────┬────────────────┘
                               │
                               ▼
              ┌──────────────────────────────────┐
              │   CHECK STAFF AVAILABILITY       │
              │   (Schedule Overlap Detection)   │
              └──────────┬───────────────────────┘
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
       [Staff Busy]          [Staff Free]
       • Blocked              • Added to Team
       • Warning shown        • Assigned duration
                                      │
                                      ▼
                          ┌──────────────────────────┐
                          │  end_date reached        │
                          │  → Team auto-deactivates │
                          │  → Staff auto-released   │
                          └──────────────────────────┘
```

---

## DOMAIN A — Database: Schema Changes for Teams (Phases 1–5)

### Phase 1: Add Time-Bound Columns to `teams` Table
- Add `start_date TIMESTAMPTZ` — when the team becomes active
- Add `end_date TIMESTAMPTZ` — when the team auto-deactivates
- Add `team_type TEXT NOT NULL DEFAULT 'single_department'` — enum: `single_department` | `cross_department`
- Add `created_by UUID REFERENCES profiles(id)` — who created the team
- Add `municipality_id UUID REFERENCES municipalities(id)` — for cross-department teams (NULL for single-dept)

Files:
- `supabase/migrations/add-team-timebound-columns.sql` (NEW)
- `Smart_Civic_Platform_Backend/src/types/database.type.ts`

### Phase 2: Add `staff_assignments` Table for Schedule Tracking
- New table to track staff assignments across teams with time range:
  ```sql
  CREATE TABLE staff_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES profiles(id),
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    is_emergency_override BOOLEAN NOT NULL DEFAULT FALSE,
    override_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (staff_id, team_id)
  );
  ```
- This replaces the need to query team_members for time-bound queries
- Enables efficient overlap detection

Files:
- `supabase/migrations/add-staff-assignments-table.sql` (NEW)
- `Smart_Civic_Platform_Backend/src/types/database.type.ts`

### Phase 3: Create DB Function — `check_staff_availability`
- Create PostgreSQL function:
  ```sql
  CREATE OR REPLACE FUNCTION check_staff_availability(
    p_staff_id UUID,
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ
  ) RETURNS TABLE(
    is_available BOOLEAN,
    conflicting_team_id UUID,
    conflicting_team_name TEXT,
    conflict_start TIMESTAMPTZ,
    conflict_end TIMESTAMPTZ
  )
  ```
- Checks `staff_assignments` for overlapping date ranges where staff is active
- Returns availability status + first conflict details

Files:
- `supabase/migrations/rpc-check-staff-availability.sql` (NEW)

### Phase 4: Create DB Function — `auto_release_expired_teams`
- Create function to run on schedule or trigger:
  ```sql
  CREATE OR REPLACE FUNCTION auto_release_expired_assignments()
  RETURNS TABLE(released_staff_id UUID, team_id UUID)
  ```
- Sets `staff_assignments.is_active = false` where `end_date < NOW()`
- Marks teams as `is_active = false` if all members released AND end_date passed
- Can be called by cron job or on every team list fetch

Files:
- `supabase/migrations/rpc-auto-release.sql` (NEW)

### Phase 5: Add Indexes & Constraints for Performance
- Index on `staff_assignments(staff_id, start_date, end_date)` for overlap queries
- Index on `staff_assignments(team_id)` for team lookup
- Index on `teams(municipality_id)` for cross-department queries
- Index on `teams(created_by)` for admin queries
- Constraint: `start_date < end_date` on both `teams` and `staff_assignments`

Files:
- `supabase/migrations/add-team-indexes.sql` (NEW)

---

## DOMAIN B — Backend: Single-Department Team CRUD (Phases 6–10)

### Phase 6: Rewrite `POST /department/teams/create` — Add Time-Bound Fields
- Current: accepts `team_name, description, member_staff_ids, leader_staff_id`
- New: adds `start_date, end_date` (required)
- Auto-sets: `department_id` from middleware, `team_type = 'single_department'`, `created_by` from JWT
- Creates team row + inserts team_members + inserts staff_assignments
- Validates: team_name unique within department, dates not in past

Files:
- `Smart_Civic_Platform_Backend/src/modules/department/controller/department.controller.ts`
- `Smart_Civic_Platform_Backend/src/modules/department/services/department.service.ts`
- `Smart_Civic_Platform_Backend/src/modules/department/repository/department.repository.ts`

### Phase 7: Add Schedule Overlap Check in Team Creation
- Before adding each staff member to team, call `check_staff_availability`
- If staff is busy during the requested period, return error with conflict details
- Allow override parameter (for emergency situations) — default false
- If override=true and caller is Municipality Head, skip conflict check

Files:
- `Smart_Civic_Platform_Backend/src/modules/department/services/department.service.ts`
- `Smart_Civic_Platform_Backend/src/modules/department/repository/department.repository.ts`

### Phase 8: Rewrite `GET /department/teams` — Include Time & Availability Info
- Current: returns teams with team_members
- New: add `start_date, end_date, team_type, member_count, days_remaining`
- Add `is_expired` computed field (true if end_date < NOW())
- Auto-filter expired teams or mark them distinctly

Files:
- `Smart_Civic_Platform_Backend/src/modules/department/repository/department.repository.ts`
- `Smart_Civic_Platform_Backend/src/modules/department/services/department.service.ts`

### Phase 9: Add `PATCH /department/teams/:teamName` — Extend/Modify Dates
- Allow updating: description, is_active, start_date, end_date
- If dates change, re-check staff availability for updated range
- If extending end_date, notify existing members
- Prevent changing team_name (use deactivate + create instead)

Files:
- `Smart_Civic_Platform_Backend/src/modules/department/controller/department.controller.ts`
- `Smart_Civic_Platform_Backend/src/modules/department/repository/department.repository.ts`

### Phase 10: Add Team Deactivation with Cascade
- Deactivate team: set `is_active = false` on team
- Set `staff_assignments.end_date = NOW()` for all active members
- This triggers the "auto-release" behavior manually
- Add reason field for deactivation (completed, cancelled, replaced)

Files:
- `Smart_Civic_Platform_Backend/src/modules/department/controller/department.controller.ts`
- `Smart_Civic_Platform_Backend/src/modules/department/repository/department.repository.ts`

---

## DOMAIN C — Backend: Cross-Department Team Creation (Phases 11–15)

### Phase 11: Create Municipality Head Team Routes
- New route group under municipality router: `/:municipalityId/teams`
- All routes protected by `verifyMunicipalityHeadContext`
- Routes:
  - `GET /:municipalityId/teams` — list all cross-department teams
  - `POST /:municipalityId/teams` — create cross-department team
  - `GET /:municipalityId/teams/:teamId` — get team detail
  - `PATCH /:municipalityId/teams/:teamId` — update team
  - `DELETE /:municipalityId/teams/:teamId` — deactivate team

Files:
- `Smart_Civic_Platform_Backend/src/modules/municipality/routes/municipality.routes.ts`
- `Smart_Civic_Platform_Backend/src/modules/municipality/controller/municipality.controller.ts`
- `Smart_Civic_Platform_Backend/src/modules/municipality/services/municipality.service.ts`
- `Smart_Civic_Platform_Backend/src/modules/municipality/repository/municipality.repository.ts`

### Phase 12: Add `POST /:municipalityId/teams` — Create Cross-Department Team
- Accept: `team_name, description, start_date, end_date, members[]`
- Members array: `[{ staff_id, department_id, is_leader }]`
- Staff can be from ANY department in this municipality
- Validates: all staff_ids belong to this municipality
- Auto-sets: `team_type = 'cross_department'`, `municipality_id` from context
- Creates team row + inserts all team_members + staff_assignments

Files:
- Same as Phase 11

### Phase 13: Add Cross-Department Staff Availability Check
- Check ALL selected staff for schedule conflicts before creating team
- If ANY staff is busy, return detailed error listing all conflicts
- Municipality Head has `emergency_override` option (Phase 15)
- Return: which staff are available vs busy with conflict details

Files:
- Same as Phase 11

### Phase 14: Auto-Notify Department Heads When Staff Borrowed
- When staff from Department A are added to a cross-department team, notify Department Head of Department A
- Create notification: "Your staff [Name] has been assigned to [Team Name] from [start] to [end]"
- Use existing notification system or add direct notification creation
- Notification appears on Department Head's dashboard

Files:
- `Smart_Civic_Platform_Backend/src/modules/municipality/controller/municipality.controller.ts`
- `Smart_Civic_Platform_Backend/src/modules/notification/`

### Phase 15: Add Emergency Override for Municipality Head
- Add `is_emergency_override` boolean to team create request
- If true: skip schedule conflict check for ALL members
- If true: auto-release staff from their current conflicting teams (set end_date = NOW())
- Log override reason + who performed it in audit_logs
- Only available for Municipality Head role (not Department Head)

Files:
- `Smart_Civic_Platform_Backend/src/modules/municipality/controller/municipality.controller.ts`
- `Smart_Civic_Platform_Backend/src/middleware/auditlogger.ts`

---

## DOMAIN D — Backend: Schedule Conflict Engine (Phases 16–20)

### Phase 16: Create Schedule Service
- New service: `ScheduleService` in shared module
- Methods:
  - `checkAvailability(staffId, startDate, endDate)` — single staff check
  - `checkBulkAvailability(staffIds[], startDate, endDate)` — bulk check
  - `getStaffSchedule(staffId, dateFrom, dateTo)` — get all assignments in date range
  - `getDepartmentSchedule(departmentId, dateFrom, dateTo)` — all staff in dept
  - `releaseStaff(staffId, teamId, reason)` — force-release from team

Files:
- `Smart_Civic_Platform_Backend/src/service/schedule.service.ts` (NEW)

### Phase 17: Add `GET /staff/schedule` Endpoint
- Staff can view their own schedule
- Returns: all active/pending assignments with team names, dates, status
- Shows: upcoming, active, and past assignments
- Used by staff dashboard to see current team commitments

Files:
- `Smart_Civic_Platform_Backend/src/modules/staff/controller/staff.controller.ts`
- `Smart_Civic_Platform_Backend/src/modules/staff/services/staff.service.ts`
- `Smart_Civic_Platform_Backend/src/modules/staff/repository/staff.repository.ts`

### Phase 18: Add Department Head Schedule View
- `GET /department/staff-schedule` — see ALL staff schedules in department
- Shows: each staff member's current assignments with time ranges
- Color-coded: green (free), yellow (upcoming), red (busy), grey (past)
- Enables Department Head to know who is available before creating teams

Files:
- `Smart_Civic_Platform_Backend/src/modules/department/controller/department.controller.ts`
- `Smart_Civic_Platform_Backend/src/modules/department/repository/department.repository.ts`

### Phase 19: Add Auto-Release Cron Job / On-Query Check
- Option A: Create a scheduled task (setInterval) that runs every hour
- Option B: Check on every team list fetch and auto-release expired
- Implement Option B (simpler, no infra needed):
  - When `GET /department/teams` or `GET /:mid/teams` is called, check for expired
  - If expired assignments found, update them + mark team inactive if all expired
- Add logging for auto-release events

Files:
- `Smart_Civic_Platform_Backend/src/modules/department/services/department.service.ts`
- `Smart_Civic_Platform_Backend/src/modules/municipality/services/municipality.service.ts`

### Phase 20: Add Assignment History Tracking
- When staff is released from team (manual or auto), keep historical record
- Add `released_at TIMESTAMPTZ` and `release_reason TEXT` to `staff_assignments`
- Allow viewing past team assignments for audit/reference
- Endpoint: `GET /staff/assignment-history`

Files:
- `Smart_Civic_Platform_Backend/src/modules/staff/controller/staff.controller.ts`
- `Smart_Civic_Platform_Backend/src/modules/staff/repository/staff.repository.ts`

---

## DOMAIN E — Backend: Complaint-Team Linking (Phases 21–25)

### Phase 21: Add `POST /department/teams/:teamName/assign-complaint`
- Link a complaint to a team via `complaint_assignments` table
- Accept: `complaint_id`
- Validates: complaint is assigned to this department
- Creates complaint_assignment row with `team_id`, `assigned_by`, `status = 'pending'`
- Sets `is_current = true` on new assignment, `false` on old ones

Files:
- `Smart_Civic_Platform_Backend/src/modules/department/controller/department.controller.ts`
- `Smart_Civic_Platform_Backend/src/modules/department/services/department.service.ts`
- `Smart_Civic_Platform_Backend/src/modules/department/repository/department.repository.ts`

### Phase 22: Add `GET /department/teams/:teamName/complaints`
- List all complaints assigned to a team
- Returns: complaint details, assignment status, assigned date
- Shows: pending, in_progress, resolved counts

Files:
- Same as Phase 21

### Phase 23: Add `PATCH /department/complaints/:complaintId/assignment`
- Update assignment status: accept, start, complete, cancel
- Track timestamps: `accepted_at`, `started_at`, `completed_at`
- Only department_head can update assignments

Files:
- Same as Phase 21

### Phase 24: Add Team Complaints Dashboard
- Summary: total complaints assigned, by status, SLA breaches
- For each complaint: title, status, days open, assigned date
- Filter by status, sort by date

Files:
- `Smart_Civic_Platform_Backend/src/modules/department/services/department.service.ts`
- `Smart_Civic_Platform_Backend/src/modules/department/repository/department.repository.ts`

### Phase 25: Add Team Performance Metrics
- Track: complaints resolved per team, avg resolution time
- Track: team member count changes over time
- Endpoint: `GET /department/teams/:teamName/metrics`
- Used for department head reporting

Files:
- Same as Phase 21

---

## DOMAIN F — Frontend: ManageTeam.tsx — Dept Head View Rewrite (Phases 26–30)

### Phase 26: Add Date Fields to Team Create/Edit Form
- Add `start_date` and `end_date` date-time pickers (required)
- Add validation: end_date > start_date, start_date not in past
- Show: duration in days calculated automatically
- Display: "Team will auto-release on [end_date]"

Files:
- `Smart_Civic_Platform_Frontend/src/pages/dept_head/ManageTeam.tsx`

### Phase 27: Add Schedule Conflict UI on Team Create
- When staff selected, frontend calls availability check before submit
- Show inline warnings per staff member if they have conflicts
- Display: "Staff [Name] is busy on [Team Name] from [date] to [date]"
- Block submission if conflicts exist (dept head cannot override)
- Show green checkmark for available staff

Files:
- `Smart_Civic_Platform_Frontend/src/pages/dept_head/ManageTeam.tsx`
- `Smart_Civic_Platform_Frontend/src/api/index.ts` (add schedule API)

### Phase 28: Add Team List — Show Time & Status
- Add columns: Duration, Days Remaining, Type, Member Count
- Color-code: green (active), yellow (starting soon), red (expired), grey (inactive)
- Show progress bar for time elapsed vs total duration
- Filter: active, upcoming, expired, all

Files:
- `Smart_Civic_Platform_Frontend/src/pages/dept_head/ManageTeam.tsx`

### Phase 29: Add Team Detail View — Staff Schedule
- When clicking a team, show detailed view with:
  - Team info, dates, type, description
  - Staff list with individual assignment dates
  - Each staff's availability status for the team's duration
  - Option to extend dates or deactivate team

Files:
- `Smart_Civic_Platform_Frontend/src/pages/dept_head/ManageTeam.tsx`

### Phase 30: Add Complaint Assignment UI in Team Detail
- Tab or section: "Assigned Complaints"
- Button: "Assign Complaint" — opens complaint selector
- Complaint selector shows unassigned complaints in department
- List: assigned complaints with status, SLA, resolution time
- Actions: update status, add note, complete

Files:
- `Smart_Civic_Platform_Frontend/src/pages/dept_head/ManageTeam.tsx`

---

## DOMAIN G — Frontend: Municipality Head Cross-Department Team UI (Phases 31–35)

### Phase 31: Create Municipality Head Team Page
- New page: `pages/Superadmin/ManageMunicipalityTeams.tsx` (or under munic_head)
- Or extend existing municipality dashboard
- Full CRUD for cross-department teams
- Different from Dept Head team page — shows ALL teams across all departments

Files:
- `Smart_Civic_Platform_Frontend/src/pages/munic_head/ManageTeams.tsx` (NEW)
- `Smart_Civic_Platform_Frontend/src/routes/AppRoutes.tsx`
- `Smart_Civic_Platform_Frontend/src/config/navbar.config.tsx`

### Phase 32: Add Cross-Department Staff Selector
- Department tabs: show all departments with staff count badges
- Within each department tab: list staff with checkboxes
- Show: staff name, role, expertise, current availability status
- Availability indicator: green (free), red (busy in team), yellow (busy in other)
- Selected staff count per department shown in tab header

Files:
- Same as Phase 31

### Phase 33: Add Schedule Conflict Warnings with Override
- When staff selected, show conflict warnings inline
- For Municipality Head: show "Emergency Override" checkbox
- If override checked: warning changes from "Blocked" to "Will be released"
- Show release reason text field (required for override)
- Confirmation dialog before override: "This will pull staff from their current team"

Files:
- Same as Phase 31

### Phase 34: Add Team List View for Municipality Head
- Table: Team Name, Departments Involved, Member Count, Duration, Status
- Expand row to show staff from each department
- Filter by department, status, date range
- Sort by created date, end date

Files:
- Same as Phase 31

### Phase 35: Add Department Head Notification Display
- When Department Head logs in, show borrowed staff alerts
- Notification: "Staff [Name] assigned to [Cross-Dept Team] from [date] to [date]"
- Click notification → shows team details
- List of currently borrowed staff with return dates

Files:
- `Smart_Civic_Platform_Frontend/src/pages/dept_head/Homepage.tsx`
- `Smart_Civic_Platform_Frontend/src/pages/dept_head/ManageTeam.tsx`

---

## DOMAIN H — Frontend: Staff Schedule View (Phases 36–40)

### Phase 36: Add Staff Schedule/Teams Page
- New page or tab on staff dashboard
- Shows: My Current Teams, Upcoming Assignments, Past Assignments
- Each team card: Team Name, Department, Duration, Role (leader/member)
- Status badge: Active, Upcoming, Completed

Files:
- `Smart_Civic_Platform_Frontend/src/pages/staff/MyTeams.tsx` (NEW)
- `Smart_Civic_Platform_Frontend/src/routes/AppRoutes.tsx`
- `Smart_Civic_Platform_Frontend/src/config/navbar.config.tsx`

### Phase 37: Add Team Member View — Staff Can See Team Details
- Click team → view: members, leader, description, dates
- Staff can see: who else is on the team, who is the leader
- Staff can view assigned complaints to their team
- Read-only view for regular staff

Files:
- Same as Phase 36

### Phase 38: Add Staff Availability Calendar View
- Simple calendar/gantt showing their assignments over time
- Current month view with markers for active assignments
- Shows: free days vs assigned days
- Used for staff self-awareness of schedule

Files:
- Same as Phase 36

### Phase 39: Add Staff Assignment Acceptance
- When staff is added to team, they see it on dashboard
- Optional: staff can accept/acknowledge the assignment
- Track `acknowledged_at` timestamp
- If not acknowledged within 24h, send reminder

Files:
- `Smart_Civic_Platform_Backend/src/modules/staff/controller/staff.controller.ts`
- `Smart_Civic_Platform_Frontend/src/pages/staff/MyTeams.tsx`

### Phase 40: Add Staff Notification for New Assignments
- When staff is added to a team, create notification
- Notification appears on staff dashboard
- Notification: "You've been added to [Team Name] from [start] to [end]"
- Click → go to team detail view

Files:
- `Smart_Civic_Platform_Frontend/src/pages/staff/Homepage.tsx`
- `Smart_Civic_Platform_Backend/src/modules/staff/`

---

## DOMAIN I — Backend: Fixes & Column Alignment (Phases 41–45)

### Phase 41: Fix `s_uid` → `id` in Department Repository (Staff Queries)
- `getDepartmentStaff`: `.select("s_uid, ...")` → `.select("id, ...")`
- `updateStaffRecord`: `.eq("s_uid", staffId)` → `.eq("id", staffId)`
- `archiveAndDeleteStaff`: `.eq("s_uid", staffId)` → `.eq("id", staffId)`

Files:
- `Smart_Civic_Platform_Backend/src/modules/department/repository/department.repository.ts`

### Phase 42: Fix `d_uid` → `id` in Department Middleware
- `department.middleware.ts`: `.select("d_uid")` → `.select("id")`
- `req.departmentId = department.d_uid` → `department.id`

Files:
- `Smart_Civic_Platform_Backend/src/modules/department/middleware/department.middleware.ts`

### Phase 43: Fix Team Repository — Use Correct Column Names
- `getDepartmentTeams`, `getTeamByName`: verify all `.eq()` use `id` not `d_uid`
- `resolveTeamPk`: ensure UUID extraction works with `id` column
- `extractTeamPk`: add `id` as primary key extractor

Files:
- `Smart_Civic_Platform_Backend/src/modules/department/repository/department.repository.ts`

### Phase 44: Add Zod Validation for Team Endpoints
- `createTeamSchema`: team_name (required), description, start_date (required), end_date (required), member_staff_ids (array), leader_staff_id, is_emergency_override, override_reason
- `updateTeamSchema`: team_name, description, start_date, end_date, is_active
- `assignComplaintSchema`: complaint_id (required, UUID)
- `updateAssignmentSchema`: status (enum), notes

Files:
- `Smart_Civic_Platform_Backend/src/validation/team.validation.ts` (NEW)

### Phase 45: Add Audit Logging for All Team Operations
- Log: TEAM_CREATE, TEAM_UPDATE, TEAM_DEACTIVATE
- Log: STAFF_ASSIGNED_TO_TEAM, STAFF_RELEASED_FROM_TEAM
- Log: COMPLAINT_ASSIGNED_TO_TEAM, COMPLAINT_REASSIGNED
- Log: EMERGENCY_OVERRIDE_USED (with reason)
- Use existing audit logger middleware

Files:
- All controller files in department and municipality modules
- `Smart_Civic_Platform_Backend/src/middleware/auditlogger.ts`

---

## DOMAIN J — Testing, Documentation & Deployment (Phases 46–50)

### Phase 46: Backend Tests — Single-Department Team
- Test: Create team with staff → verify team row + members + assignments
- Test: Create team with schedule conflict → error with conflict details
- Test: Create team without conflict → success
- Test: Deactivate team → members released
- Test: Auto-release on end_date reached
- Test: Department head can only use own department staff

Files:
- `Smart_Civic_Platform_Backend/tests/team-single-department.test.ts` (NEW)

### Phase 47: Backend Tests — Cross-Department Team
- Test: Municipality head creates team with staff from 3 departments
- Test: Cross-department team includes all selected staff
- Test: Department head notified when staff borrowed
- Test: Emergency override releases staff from conflicting teams
- Test: Municipality head cannot create single-department team (no route)

Files:
- `Smart_Civic_Platform_Backend/tests/team-cross-department.test.ts` (NEW)

### Phase 48: Backend Tests — Schedule & Availability
- Test: Staff availability check → free when no overlap
- Test: Staff availability check → busy when overlapping assignment exists
- Test: Bulk availability check → returns status for all staff
- Test: Staff released from team → availability restored
- Test: Assignment history preserved after release

Files:
- `Smart_Civic_Platform_Backend/tests/team-schedule.test.ts` (NEW)

### Phase 49: Frontend Tests — ManageTeam.tsx
- Component tests:
  - Team list renders with time/status info
  - Create team form validates dates (end > start)
  - Schedule conflict warning displays correctly
  - Staff selector shows availability status
  - Emergency override flow for municipality head
  - Complaint assignment to team works

Files:
- `Smart_Civic_Platform_Frontend/src/__tests__/ManageTeam.test.tsx` (NEW)

### Phase 50: Documentation & Cleanup
- Create `docs/team-creation-flow.md` documenting:
  - Single-department vs cross-department teams
  - Schedule conflict validation
  - Time-bound auto-release
  - Emergency override procedure
  - Complaint-to-team assignment
- Remove all `s_uid`/`d_uid` references from team code
- Update `AGENT.md` and `CLAUDE.md` with new architecture

Files:
- `Smart_Civic_Platform/docs/team-creation-flow.md` (NEW)
- `Smart_Civic_Platform/AGENT.md`
- `Smart_Civic_Platform_Backend/CLAUDE.md`

---

## Summary: 10 Domains × 5 Phases = 50 Phases

| Domain | Phases | Focus |
|--------|--------|-------|
| **A** | 1–5 | Database: Schema Changes (time-bound, availability, auto-release) |
| **B** | 6–10 | Backend: Single-Department Team CRUD (with dates, conflict check) |
| **C** | 11–15 | Backend: Cross-Department Team (municipality head, notifications, override) |
| **D** | 16–20 | Backend: Schedule Conflict Engine (service, views, auto-release) |
| **E** | 21–25 | Backend: Complaint-Team Linking (assign, track, dashboard) |
| **F** | 26–30 | Frontend: ManageTeam.tsx — Dept Head (dates, conflicts, complaints) |
| **G** | 31–35 | Frontend: Municipality Head Cross-Dept UI (selectors, override) |
| **H** | 36–40 | Frontend: Staff Schedule View (my teams, calendar, notifications) |
| **I** | 41–45 | Backend Fixes (column names, validation, audit logs) |
| **J** | 46–50 | Testing, Documentation & Deployment |

---

## Key Architecture Changes Required

### New DB Tables
```
teams (enhanced)
├── start_date TIMESTAMPTZ          ← NEW
├── end_date TIMESTAMPTZ            ← NEW
├── team_type TEXT                   ← NEW: 'single_department' | 'cross_department'
├── created_by UUID                  ← NEW: FK → profiles
└── municipality_id UUID             ← NEW: FK → municipalities (for cross-dept)

staff_assignments (NEW)
├── staff_id UUID → staff
├── team_id UUID → teams
├── assigned_by UUID → profiles
├── start_date TIMESTAMPTZ
├── end_date TIMESTAMPTZ
├── is_emergency_override BOOLEAN
├── override_reason TEXT
├── released_at TIMESTAMPTZ          ← NULL until released
└── release_reason TEXT
```

### Current State vs New State

| Feature | Current | New |
|---------|---------|-----|
| Team type | Single-department only | Single + Cross-department |
| Time-bound | No date tracking | start_date + end_date |
| Auto-release | Manual deactivate only | Automatic on end_date |
| Schedule check | None | Real-time overlap detection |
| Staff selector | Single department | Multi-department tabs |
| Emergency override | None | Municipality Head only |
| Dept Head notification | None | Auto-notified when staff borrowed |
| Complaint assignment | Manual via separate endpoint | Integrated in team detail |
