# Department Head Dashboard — Implementation Plan

## Goal
Implement the `/department_head/dashboard` page (`Dept_Dashboard.tsx`) showing a
**comprehensive department summary**, backed by a new backend endpoint that
aggregates data for the authenticated department head's department.

Scope (confirmed with user): **full-stack**, **comprehensive metrics**.

---

## Context / Conventions
- Backend uses layered pattern: `repository` → `service` → `controller` → `route` (see `src/modules/department/*`).
- Department router is mounted at `app.use("/api/department", departmentRouter)` (`src/index.ts:137`). Every route is already guarded by `requireAuth` + `verifyDepartmentHeadContext`, which attaches `req.departmentId` (`department.middleware.ts:61`).
- Table columns of interest (`src/types/database.type.ts`):
  - `complaints.assigned_department_id`, `complaints.status` (enum: `pending|under_review|in_progress|resolved|rejected|closed`), `complaints.title`, `complaints.priority`, `complaints.submitted_date`.
  - `staff.primary_department_id`.
  - `teams.department_id`, `teams.is_active`.
  - `departments.d_uid`, `departments.department_name`.
- Frontend uses MUI + `react-icons`. Dashboard pages (see `src/pages/munic_head/Homepage.tsx`) follow a `StatCard` pattern, loading state, and error `Alert`. State comes from `useAuth()` (`user_profile` in localStorage); note `UserProfile` currently has no `department_name`, so the department name must come from the API.
- API base: `BASE_URL = VITE_API_URL || "http://localhost:3000/api"` (`src/api/index.ts`). Endpoint URL = `${BASE_URL}/department/dashboard`.
- NOTE: `munic_head/Homepage.tsx` imports `../../../api/municipality` which does **not** exist yet (pre-existing broken import). Our new `src/api/department.ts` is created explicitly to avoid the same gap.

---

## Backend Changes (`Smart_Civic_Platform_Backend`)

### 1. Repository — `src/modules/department/repository/department.repository.ts`
Add `getDepartmentSummary(departmentId: string)` returning raw counts/rows:
- Department name: `.from("departments").select("department_name").eq("d_uid", departmentId).single()`.
- Complaint breakdown: `.from("complaints").select("status, id, title, priority, submitted_date, category_id").eq("assigned_department_id", departmentId).order("submitted_date",{ascending:false}).limit(5)` — aggregate counts in service (avoids N status queries).
- Staff count (active, non-deleted): `.from("staff").select("*",{count:"exact",head:true}).eq("primary_department_id",departmentId).eq("is_deleted",false)`.
- Active teams count: `.from("teams").select("*",{count:"exact",head:true}).eq("department_id",departmentId).eq("is_active",true)`.

### 2. Service — `src/modules/department/services/department.service.ts`
Add `getDashboard(departmentId)`:
- Call repo method.
- Compute `totalComplaints`, per-status counts, `resolutionRate = round(((resolved + closed) / total) * 100)` (0 when total is 0).
- Return `DepartmentDashboardData` object.

### 3. Controller — `src/modules/department/controller/department.controller.ts`
Add `getDashboard = async (req, res)`:
- `const data = await this.service.getDashboard(req.departmentId);`
- `res.status(200).json({ success: true, data });` with try/catch → `500` on error.

### 4. Route — `src/modules/department/routes/department.route.ts`
Add (within the protected router, e.g. before `/teams/create`):
```ts
router.get("/dashboard", controller.getDashboard);
```
Add an `@openapi` `/api/department/dashboard` block (GET, tags [Department API], 200 description) to match existing doc style.

### 5. Types
Define the response shape (backend can reuse an inline interface or add to `database.type.ts`):
```ts
interface DepartmentDashboardData {
  department_name: string;
  totalComplaints: number;
  pending: number;       under_review: number;  in_progress: number;
  resolved: number;      rejected: number;      closed: number;
  resolutionRate: number; // percent
  totalStaff: number;
  activeTeams: number;
  recentComplaints: {
    id: string; title: string; status: ComplaintStatus;
    priority: Priority; submitted_date: string; category_id: string;
  }[];
}
```

---

## Frontend Changes (`Smart_Civic_Platform_Frontend`)

### 6. Types — `src/types/dashboard.type.ts`
Add `DepartmentDashboardData` and `DepartmentSummary` interfaces mirroring the backend response.

### 7. API client — `src/api/department.ts` (NEW)
```ts
import { fetchWithAuth } from "./index";
import type { DepartmentDashboardData } from "../types/dashboard.type";

export const departmentApi = {
  getDashboard: async (): Promise<{ success: boolean; data: DepartmentDashboardData }> => {
    const res = await fetchWithAuth(`${BASE_URL}/department/dashboard`);
    return res.json();
  },
};
```
(Expose `BASE_URL` from `./index` if not already exported.)

### 8. Page — `src/pages/dept_head/Dept_Dashboard.tsx` (NEW, replacing empty file)
Mirror `munic_head/Homepage.tsx` structure with `react-icons/fi` + MUI:
- Loading: centered `CircularProgress`. Error: `Alert`.
- Header: "Welcome to {department_name} Department 👋" + subtitle.
- KPI `StatCard` grid (gradient cards, hover lift) for comprehensive summary:
  - Total Complaints, Resolution Rate (%)
  - Pending, Under Review, In Progress, Resolved, Rejected/Closed
  - Total Staff, Active Teams
- Recent Complaints card: `List` of `recentComplaints` with title, `Chip` status color (reuse the `getStatusChipColor` helper from `citizen/Dashboard.tsx`), and date; empty-state message.

### 9. Routing — `src/routes/AppRoutes.tsx`
- Import `DeptDashboard` from `"../pages/dept_head/Dept_Dashboard"`.
- Replace `<div>Department Head Dashboard Placeholder</div>` at `/department_head/dashboard` with `<DeptDashboard />`.

---

## Validation
- Backend: `npm run build` / `tsc` in `Smart_Civic_Platform_Backend` (no type errors). Optional: call `GET /api/department/dashboard` with a department-head bearer token via Swagger (`/api/docs`) → verify counts, `resolutionRate`, and `recentComplaints`.
- Frontend: `npm run lint` and `npm run build` in `Smart_Civic_Platform_Frontend` (fix the placeholder route import). Run `npm run dev`, log in as a department head, open `/department_head/dashboard` → cards populate, loading/empty/error states render.

## Risks / Open Questions
- `UserProfile` lacks `department_name`; dashboard relies on the API for the name (handled).
- `munic_head/Homepage.tsx` already imports a non-existent `api/municipality` module — out of scope, but the same missing-module pitfall is avoided by creating `api/department.ts`.
- Resolution-rate formula uses `resolved + closed` over total; confirm acceptable (alternative: resolved only).
- If `complaints` for a department can be large, the single `select("status,...")` fetch is fine for a dashboard; no pagination needed for the top-5 recent list.
