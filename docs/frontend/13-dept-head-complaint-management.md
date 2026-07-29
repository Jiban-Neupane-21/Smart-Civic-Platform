# Department Head Complaint Management — OLD → NEW Plan

## OLD (Current State)

**File:** `src/pages/dept_head/ComplainDetails.tsx` — **empty (0 lines)** — not implemented

### Issues
- Page is a complete placeholder — no code exists
- **Not wired in `AppRoutes.tsx`** — no route registered for complaint management
- No `ComplaintDetail.tsx` exists either (for individual complaint view with collaboration/sign-off)
- `UserProfile` in `useAuth.ts` lacks `departmentId` field
- `departmentApi` has no complaint-related methods (only CRUD for departments)
- No types exist for department-head complaint queue items
- No province/district/municipality scope verification

### What the PLAN-50 doc says (Phase 41–44):
- Phase 41: Build complaint queue (table with tracking ID, severity, SLA, collaboration badge, filters)
- Phase 42: Build complaint detail view (tabs for overview, timeline, collaboration, assignment)
- Phase 43: Build "Request Collaboration" UI (Method B — dialog with dept dropdown + note)
- Phase 44: Build Sign-Off UI & Collaboration Status Tracker (progress card, sign-off buttons)

---

## NEW (Target State)

### Backend Endpoints Available

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/department/queue?status=` | List complaints for this dept (primary + supporting via collaborations) |
| `PATCH` | `/api/department/complaints/:id/state` | Update status: `in_progress`, `resolved`, `rejected`, `closed`, `under_review` |
| `POST` | `/api/department/complaints/:id/collaborate` | Request collaboration with another dept |
| `POST` | `/api/department/complaints/:id/sign-off` | Approve/reject sign-off |
| `GET` | `/api/department/collaborations` | List collaboration requests |
| `GET` | `/api/department/dashboard` | Dashboard KPIs |
| `GET` | `/api/department/staff-roster` | List staff |

### What Backend Queue Returns

```json
[
  {
    "co_uid": "uuid",
    "tracking_id": "KTM-WARD5-RD-2026-000042",
    "title": "Broken street light",
    "description": "Street light has been broken...",
    "status": "pending",
    "priority": "medium",
    "severity_level": "high",
    "cross_dept_status": "none",
    "location_source": "registered_address",
    "ward_number": 5,
    "submitted_date": "2026-07-28T10:30:00Z",
    "sla_due_at": "2026-07-29T10:30:00Z",
    "sla_breached": false,
    "complaint_categories": { "category_name": "Roads & Infrastructure" },
    "citizens": { "first_name": "Ram", "last_name": "Sharma", "contact_number": "98XXXXXXXX" }
  }
]
```

### Province-District-Municipality Scope

**Concept:** A department belongs to a specific municipality (via `departments.municipality_id`), which belongs to a district, which belongs to a province. Only complaints from citizens registered in the **same province, district, municipality** should be visible.

**Current backend query** already filters by `assigned_department_id` or `lead_department_id` but does NOT verify citizen's registered address scope. This needs a backend change:

**Recommended backend change** in `getDepartmentComplaintsQueue`:
```ts
// Add JOIN to citizens table to verify scope
query = query
  .join("citizens", "complaints.citizen_id", "citizens.id")
  .join("municipalities", "departments.municipality_id", "municipalities.id")
  .join("districts", "municipalities.district_id", "districts.id")
  .filter("citizens.current_municipality_id", "eq", "municipalities.id")
  // OR citizens.permanent_municipality_id = municipalities.id
```

**Frontend scope display (once backend supports it):**
- Header showing: `{Department Name} — {Municipality Name} > {District} > {Province}`
- Only complaints from citizens registered in this area shown
- Scope mismatch indicator if any complaint falls outside

---

### Phase D1: Define Types & Add API Methods

**Add to `api/types/department.types.ts`:**

```ts
// Queue item returned by GET /api/department/queue
interface DeptQueueComplaint {
  co_uid: string;
  tracking_id: string;
  title: string;
  description?: string;
  status: ComplaintStatus;        // full backend enum
  priority?: string;
  severity_level: "low" | "medium" | "high" | "urgent";
  cross_dept_status: "none" | "pending_collaboration" | "in_collaboration" | "joint_signoff";
  location_source?: string;
  ward_number?: number;
  submitted_date: string;
  sla_due_at?: string | null;
  sla_breached?: boolean;
  complaint_categories: { category_name: string } | null;
  citizens: { first_name: string; last_name: string; contact_number: string } | null;
}

// Status update payload
interface UpdateComplaintStateDto {
  action: "in_progress" | "resolved" | "rejected" | "closed" | "under_review";
  resolution_note?: string;
  rejection_reason?: string;
}

// Collaboration request payload
interface RequestCollaborationDto {
  supporting_department_id: string;
  inspection_note?: string;
}

// Sign-off payload
interface SubmitSignOffDto {
  decision: "approved" | "rejected";
  note?: string;
}

// Collaboration item
interface DeptCollaboration {
  id: string;
  complaint_id: string;
  primary_dept_id: string;
  supporting_dept_id: string;
  initiated_by: string;
  initiation_method: "citizen_tagging" | "staff_escalation";
  inspection_note?: string;
  primary_sign_off: boolean;
  supporting_sign_off: boolean;
  status: "active" | "completed" | "cancelled";
  created_at: string;
}
```

**Add to `api/modules/department.api.ts`:**

```ts
const departmentApi = {
  // ... existing methods (getDepartments, getDepartmentById, createDepartment, updateDepartment, deleteDepartment) ...

  getQueue: (status?: string) =>
    apiClient.get("/department/queue", { params: { status } }),

  updateComplaintState: (complaintId: string, data: UpdateComplaintStateDto) =>
    apiClient.patch(`/department/complaints/${complaintId}/state`, data),

  requestCollaboration: (complaintId: string, data: RequestCollaborationDto) =>
    apiClient.post(`/department/complaints/${complaintId}/collaborate`, data),

  submitSignOff: (complaintId: string, data: SubmitSignOffDto) =>
    apiClient.post(`/department/complaints/${complaintId}/sign-off`, data),

  getCollaborations: () =>
    apiClient.get("/department/collaborations"),

  getDashboard: () =>
    apiClient.get("/department/dashboard"),
};
```

**Add `departmentId` to `hooks/useAuth.ts`:**

```ts
export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  municipality_id?: string;
  municipalityId?: string;
  departmentId?: string;          // ADD THIS
}
```

### Phase D2: Build Complaint Queue Page (Phase 41)

New `ComplainDetails.tsx` — complaint list/queue page.

**Structure:**
- Header with department name + scope breadcrumb (Province > District > Municipality)
- Filter toolbar:
  - Status dropdown (all statuses from backend)
  - Search by tracking ID or title
  - Severity filter (optional)
  - Collaboration type filter: "All", "Single Dept", "Multi-Dept"
- Data table with columns:
  | Column | Source | Notes |
  |--------|--------|-------|
  | Tracking ID | `tracking_id` | Blue monospace, clickable |
  | Title | `title` | Truncated |
  | Citizen | `citizens.first_name + last_name` | Full name |
  | Category | `complaint_categories.category_name` | Chip |
  | Ward | `ward_number` | Badge |
  | Severity | `severity_level` | Color-coded chip |
  | Status | `status` | Full color-coded enum chip |
  | SLA | `sla_due_at` | Countdown; red if breached |
  | Collaboration | `cross_dept_status` | Badge if cross-dept |
- Row click → navigate to detail view (or open dialog)
- Loading state: skeleton rows
- Empty state: "No complaints assigned" + icon
- Error state: Alert with retry

**Status color map (full 10-value):**

```ts
const STATUS_COLOR: Record<string, ChipProps["color"]> = {
  pending:            "warning",
  assigned:           "info",
  under_review:       "info",
  in_progress:        "primary",
  resolved:           "success",
  rejected:           "error",
  closed:             "default",
  escalated:          "error",
  reopened:           "warning",
  cross_dept_pending: "secondary",
};
```

**Collaboration badge:**
- `cross_dept_status !== "none"` → show "🤝 Multi-Dept" badge with tooltip showing partner dept
- If `cross_dept_status === "joint_signoff"` → show "✅ Joint Sign-off"

### Phase D3: Build Quick-Action Dialog (Phase 42 – simplified)

In-column actions without needing a separate detail page for MVP:

- Click complaint → opens dialog with:
  - **Overview tab**: tracking ID, title, description, category, citizen name, ward, severity, status, submitted date, SLA
  - **Status Update**: dropdown with allowed transitions, optional note/reason
  - **Collaboration** (if `cross_dept_status !== "none"`): sign-off status (primary ✅/❌, supporting ✅/❌), sign-off button
  - **Collaboration Request** button (if `cross_dept_status === "none"`): opens sub-dialog with department dropdown + inspection note

### Phase D4: Request Collaboration UI (Phase 43)

Button in dialog: "Request Collaboration"
- Opens sub-dialog:
  - Department dropdown (list other departments in same municipality, fetched from `municipalityApi.getDepartments()`)
  - Inspection note textarea
  - Submit → `POST /api/department/complaints/:id/collaborate`
- On success: status updates to `cross_dept_pending`, collaboration badge appears

### Phase D5: Sign-Off UI (Phase 44)

When `cross_dept_status` is active:
- Collaboration Status card in dialog:
  - Lead Department: ✅ / ❌ sign-off + date
  - Supporting Department: ✅ / ❌ sign-off + date
  - Progress bar
- Sign-off button for current dept head
- Sub-dialog: Approve / Reject + note
- On both signed: auto-transition to RESOLVED

### Phase D6: Wire Up Route + Auth

**In `AppRoutes.tsx`:**

```tsx
import ComplainDetails from "../pages/dept_head/ComplainDetails";

// Add inside department_head ProtectedRoute group:
<Route path="/department_head/complaints" element={<ComplainDetails />} />
```

**Navbar update** — add link to "Complaint Queue" in dept head sidebar/nav.

---

## Files Changed

| File | Action | Phase |
|------|--------|-------|
| `src/pages/dept_head/ComplainDetails.tsx` | **Rewrite** — build full complaint queue page | D2 |
| `src/pages/dept_head/ComplaintDetail.tsx` | **Create** — individual complaint detail + collaboration + sign-off | D3–D5 |
| `src/api/types/department.types.ts` | Add `DeptQueueComplaint`, DTOs for state/collab/sign-off | D1 |
| `src/api/modules/department.api.ts` | Add 5 new methods (queue, state, collaborate, sign-off, collaborations) | D1 |
| `src/hooks/useAuth.ts` | Add `departmentId` to `UserProfile` | D1 |
| `src/routes/AppRoutes.tsx` | Add `/department_head/complaints` route | D6 |
| `src/layouts/Sidebar.tsx` (or nav) | Add "Complaint Queue" link | D6 |
| `src/components/CollaborationStatusCard.tsx` | **Create** — reusable collab status component | D5 |

## Backend Change Needed

In `department.repository.ts` → `getDepartmentComplaintsQueue`:
- Add JOIN to `citizens` table
- Filter by `citizens.current_municipality_id` or `citizens.permanent_municipality_id` matching the department's `municipality_id`
- This ensures only complaints from citizens registered in the same province/district/municipality are shown
- Also join `municipalities` → `districts` → `provinces` to verify the full scope chain
