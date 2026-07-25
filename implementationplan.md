# Plan: Department Team Management — Full CRUD + Member Management

## Goal
Build a complete Team Management page for the Department Head role, enabling creation, editing, member assignment, and deactivation of teams within their department.

---

## Current State

### What exists (Backend)
- `teams` table: `id, department_id, team_name, description, is_active, created_at, updated_at`
- `team_members` table: `id, team_id, staff_id, is_leader, joined_at`
- `POST /api/department/teams/create` — Creates team (only accepts `team_name`)
- `POST /api/department/teams/assign-member` — Adds staff to team (accepts `team_id, staff_id, is_leader`)

### What exists (Frontend)
- `ManageTeam.tsx` — Empty file (0 lines)
- `navbar.config.tsx` — Team nav item already wired for Department role → `/department_head/team`
- `AppRoutes.tsx` — **No route yet** for `/department_head/team`

### What's missing
- No endpoint to **list teams** with members
- No endpoint to **update team** (name, description, is_active)
- No endpoint to **deactivate/delete team**
- No endpoint to **remove member** from team
- No endpoint to **toggle leader** status
- No frontend page at all

---

## Changes Required

### Part 1: Backend — New Endpoints

#### 1a. Repository: `department.repository.ts`

Add 5 new methods:

```typescript
// List all teams in department with member count and leader info
async getDepartmentTeams(departmentId: string) {
  const { data, error } = await this.supabaseAdmin
    .from("teams")
    .select(`
      id, team_name, description, is_active, created_at, updated_at,
      team_members (
        id, staff_id, is_leader, joined_at,
        staff (
          s_uid, employee_id, expertise,
          profiles ( full_name, email )
        )
      )
    `)
    .eq("department_id", departmentId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

// Get single team with full member details
async getTeamById(teamId: string, departmentId: string) {
  const { data, error } = await this.supabaseAdmin
    .from("teams")
    .select(`
      id, team_name, description, is_active, created_at, updated_at,
      team_members (
        id, staff_id, is_leader, joined_at,
        staff (
          s_uid, employee_id, expertise,
          profiles ( full_name, email, phone )
        )
      )
    `)
    .eq("id", teamId)
    .eq("department_id", departmentId)
    .single();

  if (error) throw error;
  return data;
}

// Update team info (name, description, is_active)
async updateTeam(teamId: string, departmentId: string, payload: {
  team_name?: string;
  description?: string;
  is_active?: boolean;
}) {
  const { data, error } = await this.supabaseAdmin
    .from("teams")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", teamId)
    .eq("department_id", departmentId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Remove a member from a team
async removeTeamMember(teamId: string, staffId: string, departmentId: string) {
  // Verify team belongs to department
  const { data: team, error: teamError } = await this.supabaseAdmin
    .from("teams")
    .select("id")
    .eq("id", teamId)
    .eq("department_id", departmentId)
    .single();

  if (teamError || !team) throw new Error("Team not found or access denied.");

  const { error } = await this.supabaseAdmin
    .from("team_members")
    .delete()
    .eq("team_id", teamId)
    .eq("staff_id", staffId);

  if (error) throw error;
}

// Toggle leader status for a team member
async toggleTeamLeader(teamId: string, staffId: string, departmentId: string, isLeader: boolean) {
  // Verify team belongs to department
  const { data: team, error: teamError } = await this.supabaseAdmin
    .from("teams")
    .select("id")
    .eq("id", teamId)
    .eq("department_id", departmentId)
    .single();

  if (teamError || !team) throw new Error("Team not found or access denied.");

  // If setting as leader, remove existing leader first
  if (isLeader) {
    await this.supabaseAdmin
      .from("team_members")
      .update({ is_leader: false })
      .eq("team_id", teamId)
      .eq("is_leader", true);
  }

  const { error } = await this.supabaseAdmin
    .from("team_members")
    .update({ is_leader: isLeader })
    .eq("team_id", teamId)
    .eq("staff_id", staffId);

  if (error) throw error;
}
```

#### 1b. Service: `department.service.ts`

Add 5 new methods:

```typescript
async listTeams(departmentId: string) {
  return await this.repo.getDepartmentTeams(departmentId);
}

async getTeamDetails(teamId: string, departmentId: string) {
  return await this.repo.getTeamById(teamId, departmentId);
}

async updateTeamInfo(teamId: string, departmentId: string, payload: {
  team_name?: string;
  description?: string;
  is_active?: boolean;
}) {
  return await this.repo.updateTeam(teamId, departmentId, payload);
}

async removeMemberFromTeam(teamId: string, staffId: string, departmentId: string) {
  return await this.repo.removeTeamMember(teamId, staffId, departmentId);
}

async setTeamLeader(teamId: string, staffId: string, departmentId: string, isLeader: boolean) {
  return await this.repo.toggleTeamLeader(teamId, staffId, departmentId, isLeader);
}
```

#### 1c. Controller: `department.controller.ts`

Add 5 new handler methods:

```typescript
// GET /teams — List all teams with members
getTeams = async (req: any, res: Response) => { ... }

// GET /teams/:teamId — Get team details
getTeamDetails = async (req: any, res: Response) => { ... }

// PATCH /teams/:teamId — Update team (name, description, is_active)
updateTeam = async (req: any, res: Response) => { ... }

// DELETE /teams/:teamId/members/:staffId — Remove member
removeMember = async (req: any, res: Response) => { ... }

// PATCH /teams/:teamId/members/:staffId — Toggle leader
toggleLeader = async (req: any, res: Response) => { ... }
```

#### 1d. Routes: `department.route.ts`

Add 5 new routes:

```typescript
router.get("/teams", controller.getTeams);
router.get("/teams/:teamId", controller.getTeamDetails);
router.patch("/teams/:teamId", controller.updateTeam);
router.delete("/teams/:teamId/members/:staffId", controller.removeMember);
router.patch("/teams/:teamId/members/:staffId", controller.toggleLeader);
```

#### Complete Backend Endpoint List (after changes)

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/department/teams` | List all teams with members |
| `GET` | `/api/department/teams/:teamId` | Get team details |
| `POST` | `/api/department/teams/create` | Create team (existing) |
| `PATCH` | `/api/department/teams/:teamId` | Update team |
| `POST` | `/api/department/teams/assign-member` | Add member (existing) |
| `PATCH` | `/api/department/teams/:teamId/members/:staffId` | Toggle leader |
| `DELETE` | `/api/department/teams/:teamId/members/:staffId` | Remove member |

---

### Part 2: Frontend — `ManageTeam.tsx`

#### UI Structure (following ManageStaff.tsx pattern)

```
┌─────────────────────────────────────────────────────┐
│  🏢 Team Management                                  │
│  Create, manage, and monitor your department teams   │
│                                          [+ Add Team]│
├─────────────────────────────────────────────────────┤
│  [🔍 Search teams...]              X teams found     │
├─────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐ │
│  │ Team Name │ Leader │ Members │ Status │ Actions  │ │
│  ├───────────┼────────┼─────────┼────────┼──────────┤ │
│  │ Water A   │ Ram    │ 5       │ Active │ ✏️ 👥 🗑️ │ │
│  │ Water B   │ Hari   │ 3       │ Active │ ✏️ 👥 🗑️ │ │
│  └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

#### Dialogs

1. **Create/Edit Team Dialog**
   - Team Name (required)
   - Description (optional, multiline)
   - Toggle: Is Active (only in edit mode)

2. **Team Members Dialog** (click Members icon or row)
   - Shows current members with name, email, expertise, role (Leader/Member)
   - "Add Member" button → dropdown of available staff not yet in team
   - Per-member actions: Toggle Leader, Remove from team
   - Only one leader allowed per team

3. **Delete Team Confirmation Dialog**
   - "Deactivate Team" warning with team name
   - Team is deactivated (is_active = false), not hard-deleted

#### State Management

```typescript
// Team list
const [teams, setTeams] = useState<Team[]>([]);
const [filtered, setFiltered] = useState<Team[]>([]);
const [search, setSearch] = useState("");
const [loading, setLoading] = useState(true);

// Staff roster (for member assignment dropdown)
const [staffRoster, setStaffRoster] = useState<StaffMember[]>([]);

// Create/Edit team dialog
const [teamModalOpen, setTeamModalOpen] = useState(false);
const [editTeam, setEditTeam] = useState<Team | null>(null);
const [teamForm, setTeamForm] = useState({ team_name: "", description: "" });

// Members dialog
const [membersDialogOpen, setMembersDialogOpen] = useState(false);
const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
const [addMemberStaffId, setAddMemberStaffId] = useState("");

// Delete dialog
const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
const [deleteTarget, setDeleteTarget] = useState<Team | null>(null);
```

#### API Calls

| Action | Endpoint | Method |
|--------|----------|--------|
| Load teams | `GET /department/teams` | fetchWithAuth |
| Load staff roster | `GET /department/staff-roster` | fetchWithAuth |
| Create team | `POST /department/teams/create` | fetchWithAuth |
| Update team | `PATCH /department/teams/:teamId` | fetchWithAuth |
| Add member | `POST /department/teams/assign-member` | fetchWithAuth |
| Toggle leader | `PATCH /department/teams/:teamId/members/:staffId` | fetchWithAuth |
| Remove member | `DELETE /department/teams/:teamId/members/:staffId` | fetchWithAuth |
| Deactivate team | `PATCH /department/teams/:teamId` | fetchWithAuth (sets is_active: false) |

#### Team Card/Table Columns

| Column | Source | Notes |
|--------|--------|-------|
| Team Name | `team.team_name` | Primary identifier |
| Leader | `team.team_members.find(m => m.is_leader)?.staff.profiles.full_name` | Shows "—" if no leader |
| Members | `team.team_members.length` | Member count badge |
| Status | `team.is_active` | Chip: Active (green) / Inactive (grey) |
| Actions | — | Edit, Members, Deactivate |

---

### Part 3: Routing

#### `AppRoutes.tsx`

Add import and route:

```tsx
import DeptManageTeam from "../pages/dept_head/ManageTeam";

// Inside the department_head protected route block:
<Route path="/department_head/team" element={<DeptManageTeam />} />
```

---

## File Changes Summary

| File | Change |
|------|--------|
| `Supabase_Schema.sql` | No changes needed (tables already exist) |
| `department.repository.ts` | Add 5 methods: getDepartmentTeams, getTeamById, updateTeam, removeTeamMember, toggleTeamLeader |
| `department.service.ts` | Add 5 methods: listTeams, getTeamDetails, updateTeamInfo, removeMemberFromTeam, setTeamLeader |
| `department.controller.ts` | Add 5 handlers: getTeams, getTeamDetails, updateTeam, removeMember, toggleLeader |
| `department.route.ts` | Add 5 routes (GET, GET, PATCH, DELETE, PATCH) |
| `ManageTeam.tsx` | Full implementation (~600-700 lines) |
| `AppRoutes.tsx` | Add import + route for `/department_head/team` |

---

## UX Flow

### Create Team
1. Dept head clicks "+ Add Team"
2. Modal: Team Name (required), Description (optional)
3. Submits → `POST /teams/create` → team created with `is_active: true`
4. Table refreshes

### Manage Members
1. Dept head clicks Members icon on a team row
2. Members dialog opens showing current members with role badges
3. **Add member**: Select from dropdown of unassigned staff → `POST /teams/assign-member`
4. **Set leader**: Click "Make Leader" on a member → `PATCH /teams/:teamId/members/:staffId` (auto-removes previous leader)
5. **Remove member**: Click remove icon → `DELETE /teams/:teamId/members/:staffId`

### Edit Team
1. Dept head clicks Edit icon on a team row
2. Modal pre-filled with team name + description
3. Can toggle Active/Inactive status
4. Submits → `PATCH /teams/:teamId`

### Deactivate Team
1. Dept head clicks Deactivate icon
2. Confirmation dialog: "Deactivate team [name]? Members will be unassigned."
3. Confirms → `PATCH /teams/:teamId` with `is_active: false`
4. Team shows as "Inactive" in table

---

## Team Dashboard Data (already exists)

The department dashboard already returns `activeTeams` count. The ManageTeam page is the detailed view. No dashboard changes needed.
