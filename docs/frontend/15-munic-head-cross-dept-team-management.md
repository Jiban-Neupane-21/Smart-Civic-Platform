# Municipality Head Cross-Department Team Management — OLD → NEW Plan

## OLD (Current State)

### What Exists
- **Backend:** Full CRUD at `/api/municipality/teams` (GET list, POST create, DELETE deactivate)
  - `createCrossDeptTeam` validates `team_name`, `start_date`, `end_date` required
  - **Schedule conflict check** via `ScheduleService.checkBulkAvailability()` — blocks if staff double-booked
  - **Emergency override** (`is_emergency_override`, `override_reason`) — skips conflict check, auto-releases staff from conflicting teams
  - Creates `team_members` + `staff_assignments` records
  - `getCrossDeptTeams` returns: team info, members with profiles, `days_remaining`, `is_expired`, `member_count`
  - `deactivateCrossDeptTeam` sets team inactive + releases all staff assignments

- **Database:** `teams` table with `team_type = 'cross_departmental'`, `team_members`, `staff_assignments`, `check_staff_availability()` function, `auto_release_expired_assignments()` function

- **Frontend (NONE):**
  - No page in `src/pages/munic_head/` for team management
  - No route registered in `AppRoutes.tsx`
  - No navbar item for municipality teams
  - `municipalityApi` has NO team methods
  - No types for cross-department teams in `municipality.types.ts`

### The Gap
When a complaint requires cross-department collaboration (`cross_dept_status !== "none"`), the municipality head currently has **no UI** to create an operational team spanning multiple departments. The flow is broken.

### Cross-Department Collaboration Flow (per PLAN-50)
```
Complaint needs multi-dept collaboration
  → Municipality Head notified
  → Creates cross-department team (staff from primary + supporting depts)
  → Team assigned to handle the complaint
  → Joint sign-off when resolved
```

---

## NEW (Target State)

### New Page: `src/pages/munic_head/ManageCrossDeptTeam.tsx`

### Phase X1: Add API Types & Methods

**Add to `api/types/municipality.types.ts`:**

```ts
// Cross-department team types
interface CrossDeptTeam {
  id: string;
  team_name: string;
  description: string | null;
  team_type: "cross_departmental";
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_expired: boolean;
  days_remaining: number | null;
  member_count: number;
  municipality_id: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  team_members: CrossDeptTeamMember[];
}

interface CrossDeptTeamMember {
  id: string;
  staff_id: string;
  is_leader: boolean;
  joined_at: string;
  staff: {
    s_uid: string;
    employee_id: string | null;
    expertise: string | null;
    profiles: {
      full_name: string;
      email: string;
      phone?: string;
    } | null;
  } | null;
}

interface CreateCrossDeptTeamDto {
  team_name: string;
  description?: string;
  start_date: string;            // ISO date
  end_date: string;              // ISO date
  member_staff_ids: string[];    // staff from ANY department in this municipality
  leader_staff_id?: string;
  is_emergency_override?: boolean;
  override_reason?: string;
}

// Bulk availability check response
interface StaffAvailabilityResult {
  staff_id: string;
  is_available: boolean;
  conflicting_team_name?: string;
  conflict_start?: string;
  conflict_end?: string;
}

// Complaint assignment to team
interface TeamComplaintAssignment {
  id: string;
  complaint_id: string;
  team_id: string;
  assigned_by: string;
  status: "pending" | "accepted" | "in_progress" | "completed" | "cancelled";
  assigned_at: string;
  complaint?: {
    tracking_id: string;
    title: string;
    status: string;
    severity_level: string;
    submitted_date: string;
    sla_due_at?: string;
    sla_breached?: boolean;
    complaint_categories: { category_name: string } | null;
    departments: { department_name: string } | null;
  };
}
```

**Add to `api/modules/municipality.api.ts`:**

```ts
const municipalityApi = {
  // ... existing methods ...

  // ─── Cross-Department Teams ───────────────────────────
  getCrossDeptTeams: () =>
    apiClient.get("/municipality/teams"),

  createCrossDeptTeam: (data: CreateCrossDeptTeamDto) =>
    apiClient.post("/municipality/teams", data),

  deactivateCrossDeptTeam: (teamId: string) =>
    apiClient.delete(`/municipality/teams/${teamId}`),

  getCrossDeptTeamDetail: (teamId: string) =>
    apiClient.get(`/municipality/teams/${teamId}`),

  // ─── Staff Availability ───────────────────────────────
  checkStaffAvailability: (staffIds: string[], startDate: string, endDate: string) =>
    apiClient.post("/municipality/staff/availability", {
      staff_ids: staffIds,
      start_date: startDate,
      end_date: endDate,
    }),

  // ─── Complaint-to-Team Assignment ─────────────────────
  assignComplaintToTeam: (teamId: string, complaintId: string) =>
    apiClient.post(`/municipality/teams/${teamId}/assign-complaint`, {
      complaint_id: complaintId,
    }),

  getTeamComplaints: (teamId: string) =>
    apiClient.get(`/municipality/teams/${teamId}/complaints`),
};
```

### Phase X2: Cross-Department Team List Page

**Page layout — Team List View:**

```
┌──────────────────────────────────────────────────────────────┐
│  🏛 Cross-Department Team Management                         │
│  Create and manage emergency task forces across departments   │
│  [Create Cross-Dept Team]                                     │
├──────────────────────────────────────────────────────────────┤
│  Filter: [All Active ▼] [Search teams...]                     │
├──────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Team Name    │ Depts │ Members │ Duration  │ Status │ 📋 │ │
│ ├──────────────────────────────────────────────────────────┤ │
│ │ Flood Relief │ 3     │ 12      │ Jul 1-31  │ ✅ Act │ 🔍 │ │
│ │              │       │         │ 30d remain│        │    │ │
│ │ Road Repair  │ 2     │ 8       │ Aug 5-25  │ ⏳ Upc │ 🔍 │ │
│ │              │       │         │ starts in │        │    │ │
│ │              │       │         │ 7d        │        │    │ │
│ │ Cleanup DR   │ —     │ —       │ —         │ ❌ Exp │ 🔍 │ │
│ └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

**Columns:**
| Column | Data | Notes |
|--------|------|-------|
| Team Name | `team_name` | With avatar initials |
| Departments | (computed from members) | Count of unique departments represented |
| Members | `member_count` | Total staff count |
| Duration | `start_date` → `end_date` | Date range + days remaining |
| Status | `is_active` + `is_expired` | **Active** (green), **Expired** (red), **Upcoming** (yellow if not started) |
| Actions | — | View Detail, Deactivate |

**Filters:**
- Status: All / Active / Expired / Upcoming
- Search by team name, description

**Empty state:** "No cross-department teams yet. Create one to handle multi-department complaints."

### Phase X3: Create Cross-Department Team Dialog

**Multi-step or single dialog with sections:**

#### Step 1 — Team Info
- Team name (required)
- Description (optional)
- Start date (required, date picker, cannot be in past)
- End date (required, date picker, must be > start date)
- Auto-calc: "Duration: {N} days"

#### Step 2 — Select Staff by Department (Key Innovation)

The core difference from single-department teams: **staff can come from ANY department.**

```
┌──────────────────────────────────────────────────────┐
│ Select Staff Members (from all departments)           │
│                                                       │
│ ┌───── Department Tabs ────────────────────────────┐ │
│ │ [🚧 Roads] [💧 Water] [🔌 Power] [🗑 Sanitation] │ │
│ │  ✓ 8 staff      5 staff    4 staff    6 staff    │ │
│ └──────────────────────────────────────────────────┘ │
│                                                       │
│ Tab: 🚧 Roads Department (8 staff)                    │
│ ┌──────────────────────────────────────────────────┐  │
│ │ ☑ Ram Sharma         🟢 Free     Expert Surveyor │  │
│ │ ☐ Sita Poudel        🔴 Busy     Jr. Engineer   │  │
│ │    (Flood Relief Jul 1-31)                       │  │
│ │ ☑ Hari GC            🟢 Free     Foreman        │  │
│ │ ...                                              │  │
│ └──────────────────────────────────────────────────┘  │
│                                                       │
│ ✅ Selected: 4 staff from 2 departments               │
│                                                       │
│ Team Leader: [Ram Sharma ▼]                          │
└──────────────────────────────────────────────────────┘
```

**Availability indicators (live-check when dates + staff selected):**
- 🟢 Free — no schedule conflicts for the team's duration
- 🔴 Busy — overlapping assignment, show conflict details
- ⚪ Not checked — dates not yet set

**Selected summary:**
- Badge: "4 staff selected from Roads, Water departments"
- Per-department count in tab headers

#### Step 3 — Emergency Override (Municipality Head Only)

```
┌──────────────────────────────────────────────────────┐
│  ⚠️ Schedule Conflicts Detected                       │
│                                                       │
│  The following staff are already assigned:            │
│  • Sita Poudel — Busy on "Flood Relief" (Jul 1-31)   │
│  • Gopal Rai  — Busy on "Road Maintenance" (Aug 1-15)│
│                                                       │
│  ☑ Emergency Override (Municipality Head only)        │
│  If enabled, affected staff will be auto-released     │
│  from their current teams for this assignment.        │
│                                                       │
│  Override Reason: [required text]                     │
└──────────────────────────────────────────────────────┘
```

#### Step 4 — Review & Confirm

```
┌──────────────────────────────────────────────────────┐
│  Review Cross-Department Team                         │
│                                                       │
│  Team Name:  Flood Emergency Response                 │
│  Duration:   Jul 28, 2026 → Aug 28, 2026 (31 days)   │
│  Type:       Cross-Departmental                       │
│  Departments: Roads (3), Water (2), Sanitation (1)   │
│  Total Members: 6                                     │
│  Leader:     Ram Sharma (Roads Department)            │
│  Override:   Yes — "Urgent flood response needed"     │
│                                                       │
│  [Edit]  [Create Team & Assign Complaints]            │
└──────────────────────────────────────────────────────┘
```

### Phase X4: Team Detail View

**Full-page or dialog with tabs:**

#### Tab 1 — Overview
- Team name, description, dates
- Duration progress bar (time elapsed vs total)
- Days remaining countdown
- Member count, departments involved
- Leader info with department
- Status badge

#### Tab 2 — Members
- Member list grouped by department:

```
Roads Department (3)
├── 🏅 Ram Sharma (Leader) — Surveyor — 🟢 Free
├── Hari GC — Foreman — 🟢 Free
└── Sita Poudel — Jr. Engineer — 🔴 Busy until Jul 31

Water Department (2)
├── ...
```

- Add/remove members (re-check availability)
- Toggle leader
- Per-member availability status

#### Tab 3 — Assigned Complaints

**This is where the collaboration flow connects:**

```
┌──────────────────────────────────────────────────────────┐
│  Assigned Complaints (3)   [Assign Complaint]            │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ Tracking ID  │ Title    │ Dept    │ Status  │ Assign │ │
│ ├──────────────────────────────────────────────────────┤ │
│ │ KTM-WARD4-.. │ Flood in │ Roads + │ 🤝 Coll│ Jul 20 │ │
│ │              │ Bishnum..│ Water   │ Pending │        │ │
│ │ KTM-WARD5-.. │ Drain    │ Sanit.. │ 🔄 In   │ Jul 19 │ │
│ │              │ blockage │         │ Progr.. │        │ │
│ └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

**Assign Complaint button** opens a complaint selector showing:
- Complaints with `cross_dept_status !== "none"` (collaboration-needed)
- Filterable by: tracking ID, title, department, status
- Shows which departments are already involved

**Quick actions per assignment:**
- View complaint detail
- Update assignment status (pending → in_progress → completed)

### Phase X5: Connect Collaboration Flow

**From `ComplainDetails.tsx` (munic_head), add an action button:**

When viewing a complaint with `cross_dept_status !== "none"`:
```
┌──────────────────────────────────────────────┐
│  Cross-Department Collaboration Detected      │
│  Primary: Roads Department                    │
│  Supporting: Water Department                 │
│  Status: Pending Collaboration                │
│                                               │
│  [Create Cross-Department Team] → pre-fills   │
│   team form with complaint context            │
└──────────────────────────────────────────────┘
```

Clicking "Create Cross-Department Team" from the complaint detail:
1. Navigates to team creation page
2. Pre-fills team name suggestion: "{Category} Response Team"
3. Pre-selects the relevant departments as targets
4. After team creation, auto-assigns the complaint to the team

### Phase X6: Wire Up Route + Navbar

**In `AppRoutes.tsx`:**

```tsx
import ManageCrossDeptTeam from "../pages/munic_head/ManageCrossDeptTeam";

// Inside municipality_head ProtectedRoute group:
<Route path="/municipality_head/teams" element={<ManageCrossDeptTeam />} />
<Route path="/municipality_head/teams/:teamId" element={<ManageCrossDeptTeam />} />
```

**In navbar config:** Add "Cross-Dept Teams" nav item for municipality_head role.

---

## Visual Mockup — Complete Page

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🏛 Smart Civic Platform — Kathmandu Metro                    [Admin ▼]     │
├─────────────────────────────────────────────────────────────────────────────┤
│  📊 Dashboard  │  🏗 Complaints  │  👥 Staff  │  🤝 Cross-Dept Teams  │  ⚙ │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Cross-Department Team Management                                           │
│  ─────────────────────────────────────────────                              │
│  Create emergency task forces spanning multiple departments                 │
│  to handle complex complaints that need collaboration.                      │
│                                                                              │
│  [+ Create Cross-Department Team]                                           │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ [All Types ▼]  [Any Status ▼]  🔍 [Search teams...]                    ││
│  ├─────────────────────────────────────────────────────────────────────────┤│
│  │ Team Name         │ Depts │ Members │ Duration        │ Status  │ Actns ││
│  ├─────────────────────────────────────────────────────────────────────────┤│
│  │ 🏅 Flood Response  │ Roads  │ 6       │ Jul 28 → Aug 28 │ ✅      │ 👁  ││
│  │                   │ Water  │         │ 30 days remain  │ Active  │      ││
│  │                   │ Sanit  │         │ ████████░░░░ 60%│         │      ││
│  ├─────────────────────────────────────────────────────────────────────────┤│
│  │ 🏅 Road Safety     │ Roads  │ 4       │ Aug 10 → Sep 10 │ ⏳      │ 👁  ││
│  │                   │ Traffic│         │ Starts in 12d   │ Upcoming│      ││
│  │                   │        │         │ █░░░░░░░░░░░  0%│         │      ││
│  ├─────────────────────────────────────────────────────────────────────────┤│
│  │ 🏅 Cleanup Drive   │ Sanit  │ 3       │ Jun 1 → Jun 30  │ ❌      │ 👁  ││
│  │                   │        │         │ Expired 28d ago │ Expired │      ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  Showing 3 teams (2 active)                                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Implementation Priority

| Pri | Phase | Effort | Why |
|-----|-------|--------|-----|
| 🔴 P0 | X1 | Low | Types + API methods (blocker for everything) |
| 🔴 P0 | X2 | Medium | Team list page — view all cross-dept teams |
| 🔴 P0 | X3 | High | **Create team** with multi-department staff selector + availability check + override |
| 🟡 P1 | X4 | Medium | Team detail view with members + complaints tabs |
| 🟡 P1 | X5 | Medium | Connect from complaint detail → create team for that complaint |
| 🟢 P2 | X6 | Low | Route + navbar wiring |

## Files Changed

| File | Action |
|------|--------|
| `src/pages/munic_head/ManageCrossDeptTeam.tsx` | **New** — main cross-department team page |
| `src/pages/munic_head/ComplainDetails.tsx` | **Update** — add "Create Cross-Dept Team" button for collaboration complaints |
| `src/api/types/municipality.types.ts` | Add `CrossDeptTeam`, `CrossDeptTeamMember`, `CreateCrossDeptTeamDto`, `StaffAvailabilityResult`, `TeamComplaintAssignment` |
| `src/api/modules/municipality.api.ts` | Add 7 new methods (CRUD teams, availability, complaint assignment) |
| `src/components/CrossDeptStaffSelector.tsx` | **New** — department-tabbed staff selector with availability indicators |
| `src/components/TeamComplaintSelector.tsx` | **New** — complaint picker filtered by collaboration-needed |
| `src/config/navbar.config.tsx` | Add "Cross-Dept Teams" nav item for municipality_head |
| `src/routes/AppRoutes.tsx` | Add `/municipality_head/teams` route |

## Backend API Contract (reference)

```
GET /api/municipality/teams
→ { success: true, data: [{ id, team_name, description, team_type, start_date, end_date,
    is_active, is_expired, days_remaining, member_count, team_members: [{ staff_id, is_leader,
    staff: { s_uid, employee_id, expertise, profiles: { full_name, email } } }] }] }

POST /api/municipality/teams
Body: { team_name, description?, start_date, end_date, member_staff_ids[], leader_staff_id?,
        is_emergency_override?, override_reason? }
→ Validates: dates required, conflict check (unless override), creates team + members + assignments
→ { success: true, data: { id, team_name, ... } }

DELETE /api/municipality/teams/:teamId
→ Deactivates team + releases all staff assignments
→ { success: true, message: "Team deactivated." }

POST /api/municipality/teams/:teamId/assign-complaint
Body: { complaint_id }
→ { success: true, data: { assignment_id, status: "pending" } }

GET /api/municipality/teams/:teamId/complaints
→ { success: true, data: [{ complaint: { tracking_id, title, status, ... } }] }
```

## Flow from Complaint Detail to Team Creation

```
ComplainDetails.tsx                         ManageCrossDeptTeam.tsx
┌──────────────────┐                        ┌─────────────────────────┐
│ Complaint Detail  │                        │                         │
│ • tracking_id     │                        │  Team name auto-filled  │
│ • primary dept    │  [Create Team]         │  based on complaint     │
│ • supporting dept │ ─────────────────────> │                         │
│ • cross_dept_stat │   Navigate with        │  Departments pre-       │
│   = "pending_coll"│   complaint context     │  selected: Roads+Water │
│                   │                        │                         │
│ [Create Cross-    │                        │  After team created:    │
│  Department Team] │                        │  → auto-assign complaint│
└──────────────────┘                        └─────────────────────────┘
```
