# Department Head Team Management — OLD → NEW Plan

## OLD (Current State)

**File:** `src/pages/dept_head/ManageTeam.tsx` (981 lines)

### What It Does
- Lists teams in a table: Team Name (with avatar), Leader, Members count, Status (Active/Inactive), Actions
- Search by team name, description, or leader
- Create team dialog: name, description, multi-select staff, optional leader
- Edit team dialog: name, description only (no staff changes)
- Members dialog: add/remove members, toggle leader, shows available staff roster
- Deactivate team with confirmation dialog

### Missing Features (per PLAN-50)
- **No date fields** — teams are not time-bound (no `start_date` / `end_date`)
- **No schedule conflict check** — staff can be double-booked across teams
- **No complaint assignment** — cannot assign complaints to teams as tasks
- **No team detail view** — clicking a team doesn't show assigned complaints or staff schedule
- **No duration/SLA indicators** — no days remaining, no progress bar
- **Uses raw `fetchWithAuth`** — not using `departmentApi` or typed API methods
- **Local types** — Team, TeamMember, StaffRosterItem are component-scoped

### Backend Endpoints Available (team-related)

| Method | Endpoint | Used? |
|--------|----------|-------|
| `POST` | `/department/teams/create` | ✅ Create |
| `POST` | `/department/teams/assign-member` | ✅ Add member |
| `GET` | `/department/teams` | ✅ List teams |
| `GET` | `/department/teams/:teamName` | ❌ Not used (no detail view) |
| `PATCH` | `/department/teams/:teamName` | ✅ Edit team |
| `DELETE` | `/department/teams/:teamName/members/:staffId` | ✅ Remove member |
| `PATCH` | `/department/teams/:teamName/members/:staffId` | ✅ Toggle leader |
| `POST` | `/department/teams/:teamName/assign-complaint` | ❌ **Not used** |
| `GET` | `/department/teams/:teamName/complaints` | ❌ **Not used** |

---

## NEW (Target State)

### Phase T1: Add Team API Methods

**Add to `api/modules/department.api.ts`:**

```ts
// Team types
interface TeamMember {
  staff_id: string;
  is_leader: boolean;
  joined_at: string;
  staff: {
    s_uid: string;
    employee_id: string | null;
    expertise: string | null;
    profiles: { full_name: string; email: string; phone?: string } | null;
  } | null;
}

interface Team {
  team_name: string;
  description: string | null;
  is_active: boolean;
  start_date?: string | null;        // NEW
  end_date?: string | null;          // NEW
  team_type?: string;                // NEW
  created_at: string;
  updated_at: string;
  team_members: TeamMember[];
}

interface CreateTeamDto {
  team_name: string;
  description?: string;
  start_date?: string;               // NEW
  end_date?: string;                 // NEW
  member_staff_ids?: string[];
  leader_staff_id?: string;
}

interface TeamComplaintAssignment {
  id: string;
  complaint_id: string;
  team_id: string;
  assigned_by: string;
  status: "pending" | "accepted" | "in_progress" | "completed" | "cancelled";
  assigned_at: string;
  accepted_at?: string;
  started_at?: string;
  completed_at?: string;
  complaint?: {
    tracking_id: string;
    title: string;
    status: string;
    severity_level: string;
    submitted_date: string;
    sla_due_at?: string;
    sla_breached?: boolean;
    complaint_categories: { category_name: string } | null;
  };
}

// Methods to add:
getTeams: () => apiClient.get("/department/teams"),
getTeamDetail: (teamName: string) => apiClient.get(`/department/teams/${encodeURIComponent(teamName)}`),
createTeam: (data: CreateTeamDto) => apiClient.post("/department/teams/create", data),
updateTeam: (teamName: string, data: Partial<CreateTeamDto>) =>
  apiClient.patch(`/department/teams/${encodeURIComponent(teamName)}`, data),
assignComplaintToTeam: (teamName: string, complaintId: string) =>
  apiClient.post(`/department/teams/${encodeURIComponent(teamName)}/assign-complaint`, { complaint_id: complaintId }),
getTeamComplaints: (teamName: string) =>
  apiClient.get(`/department/teams/${encodeURIComponent(teamName)}/complaints`),
checkStaffAvailability: (staffIds: string[], startDate: string, endDate: string) =>
  apiClient.post("/department/staff/availability", { staff_ids: staffIds, start_date: startDate, end_date: endDate }),
```

### Phase T2: Add Time-Bound Fields to Create/Edit Team

**Changes in create team dialog:**
- Add `start_date` and `end_date` date-time inputs (or date pickers)
- Validation: `end_date > start_date`, `start_date` not in past (unless editing)
- Auto-calculate duration in days display: "Duration: 14 days"
- Display: "Team will auto-release on {end_date}"

**Changes in team table:**
- New columns: Duration (start → end), Days Remaining, Type
- Status: add "Active" (green), "Expired" (red), "Upcoming" (yellow) based on dates
- Progress bar showing % of time elapsed

### Phase T3: Staff Schedule Conflict Detection

**Before creating team:**
- When staff selected and dates filled, call `checkStaffAvailability`
- Show inline availability per staff member:
  - ✅ Green: staff is free for full duration
  - ⚠️ Amber: staff has upcoming conflict (from different dates)
  - ❌ Red: staff has overlapping assignment with conflict details
- Block submission if any conflicts (dept head cannot override — only municipality head can)

**Conflict display:**
```
❌ Ram Sharma — Busy on "Road Repair Team" (Jul 28 – Aug 15)
```

### Phase T4: Complaint Assignment to Team (Core Feature)

**New section in team detail / members dialog:**
- Tab or button: "Assigned Complaints"
- Opens complaint selector dialog listing unassigned/in-progress complaints from the queue

**Complaint selector:**
- Fetch queue via `GET /api/department/queue?status=pending,under_review`
- Display tracking ID, title, severity, status
- Search/filter to find complaint
- Select complaint → assign to team

**Assigned complaints list:**
| Column | Source |
|--------|--------|
| Tracking ID | `complaint.tracking_id` |
| Title | `complaint.title` |
| Severity | `complaint.severity_level` (chip) |
| Status | `complaint.status` (chip) |
| SLA | `complaint.sla_due_at` (countdown) |
| Assignment Status | `pending / accepted / in_progress / completed` |
| Assigned At | `assigned_at` |
| Actions | Update status, unassign |

**Assignment flow:**
1. Dept head clicks "Assign Complaint" in team detail
2. Modal opens with complaint queue list (filtered to unassigned)
3. Select complaint → `POST /department/teams/:teamName/assign-complaint`
4. Complaint appears in team's complaint list
5. Team members can view complaint in their dashboard

### Phase T5: Team Detail View with Tabs

**When clicking a team row, open detail dialog/tabs (not just members):**

**Tab 1 — Overview:**
- Team name, description, dates, duration, type
- Status badge, days remaining
- Member count, leader name

**Tab 2 — Members:**
- Current member list (same as current members dialog)
- Add/remove members
- Toggle leader
- Per-member availability status

**Tab 3 — Assigned Complaints:**
- Complaint assignment table (from Phase T4)
- Assign new complaint button
- Update assignment status

### Phase T6: Rewire to Use `departmentApi`

**Instead of:**
```ts
const res = await fetchWithAuth(`${BASE_URL}/department/teams`);
```

**Use:**
```ts
import { departmentApi } from "../../api";
const res = await departmentApi.getTeams();
```

- Move types from component to `api/types/department.types.ts` (or complaints.types.ts)
- Handle errors uniformly via apiClient interceptor
- Remove `BASE_URL` and `fetchWithAuth` dependency from this component

---

## Implementation Priority

| Priority | Phase | Effort | Why |
|----------|-------|--------|-----|
| 🔴 P0 | T4 | Medium | **Core ask**: "assign complain as task" — complaint assignment is the main new feature |
| 🔴 P0 | T1 | Low | API methods needed by everything else |
| 🟡 P1 | T6 | Low | Switch to typed API (cleanup) |
| 🟡 P1 | T5 | Medium | Team detail with tabs (needed for complaint list display) |
| 🟢 P2 | T2 | Low | Date fields (already in backend schema) |
| 🟢 P2 | T3 | Medium | Schedule conflict (only if backend supports it) |

## Files Changed

| File | Action |
|------|--------|
| `src/pages/dept_head/ManageTeam.tsx` | **Rewrite** — add complaint assignment, date fields, team detail tabs, schedule conflict |
| `src/api/modules/department.api.ts` | Add 7 new methods (teams CRUD, complaint assign, availability check) |
| `src/api/types/department.types.ts` | Add `Team`, `TeamMember`, `CreateTeamDto`, `TeamComplaintAssignment` types |
| `src/components/ComplaintSelector.tsx` | **Create** — reusable complaint picker for assigning to teams |

## Backend API Contract (reference)

```
POST /department/teams/:teamName/assign-complaint
Body: { complaint_id: "uuid" }
→ Validates complaint belongs to this department
→ Creates complaint_assignment row
→ Sets status = "pending"

GET /department/teams/:teamName/complaints
→ Returns assigned complaints with complaint details, assignment status, dates

GET /department/teams
→ Already returns teams with team_members
→ May need enhancement for start_date/end_date (check backend schema first)

POST /department/staff/availability (NEW — if not existing)
Body: { staff_ids: ["uuid"], start_date: "ISO", end_date: "ISO" }
→ Returns [{ staff_id, is_available, conflicting_team_name?, conflict_start?, conflict_end? }]
```
