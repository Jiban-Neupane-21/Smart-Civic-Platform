# Municipality Head → Department & Staff Management — 50-Phase Implementation Plan

## Vision Overview
**Municipality Head** manages two distinct workflows:
1. **Department Setup** — Create organizational units (e.g., Sanitation, Infrastructure, Health)
2. **Department Head Onboarding** — Assign a leadership account bound to that department

Staff management extends to creating regular staff members under any department.

```text
[Municipality Head Logged In]
         │
         ├──► STEP 1: Department Setup
         │         └─ Input: Name, Category, Description, Official Email
         │         └─ System: Auto-links municipality_id, creates dept + head user
         │
         └──► STEP 2: Staff Onboarding (Dept Head or Staff)
                   └─ Input: Name, Email, Password, Role, Department
                   └─ System: Binds municipality_id + department_id + role
```

---

## DOMAIN A — Database & Schema Alignment (Phases 1–5)

### Phase 1: Fix Column Naming — `d_uid` → `id` in Repository
- Current: All repository queries use `.eq("d_uid", ...)` but DB schema defines PK as `id`
- Fix all references in `municipality.repository.ts`: `getDepartmentById`, `updateDepartment`, `deleteDepartment`

Files:
- `Smart_Civic_Platform_Backend/src/modules/municipality/repository/municipality.repository.ts`

### Phase 2: Fix Column Naming — `m_uid` → `id` in Municipality Repository
- Current: `getLocalComplaintStats` uses `.eq("m_uid", municipalityId)`
- Fix to `.eq("id", municipalityId)`
- Also fix return property `municipality.m_uid` → `municipality.id`

Files:
- `Smart_Civic_Platform_Backend/src/modules/municipality/repository/municipality.repository.ts`

### Phase 3: Fix Column Naming — `m_uid` → `id` in Middleware
- Current: `municipality.middleware.ts` selects `.eq("head_profile_id", userId)` and reads `.m_uid`
- Fix to use `id` column

Files:
- `Smart_Civic_Platform_Backend/src/modules/municipality/middleware/municipality.middleware.ts`

### Phase 4: Fix Column Naming — `d_uid` → `id` in Controller & Service
- Current: `provisionDepartment` returns `dept.d_uid`, controller references `dept.d_uid`
- Fix to `dept.id` throughout `municipality.controller.ts`

Files:
- `Smart_Civic_Platform_Backend/src/modules/municipality/controller/municipality.controller.ts`

### Phase 5: Add Missing FK Indexes for Departments & Staff
- Ensure `departments.municipality_id` has an index
- Ensure `staff.primary_department_id` has an index
- Ensure `staff.municipality_id` has an index
- Verify `ON DELETE CASCADE` behavior for department deletion

Files:
- `Supabase_Schema.sql` (review/add indexes)
- No code changes if already present

---

## DOMAIN B — Backend: Department CRUD (Phases 6–10)

### Phase 6: Audit & Fix `getDepartments` — Join with Staff Count
- Current: Returns raw department rows without staff count or complaint count
- Add subquery or second query to include `staff_count` (COUNT of staff where `primary_department_id = dept.id`)
- Add `complaint_count` (COUNT of complaints where `assigned_department_id = dept.id`)

Files:
- `Smart_Civic_Platform_Backend/src/modules/municipality/repository/municipality.repository.ts`
- `Smart_Civic_Platform_Backend/src/modules/municipality/services/municipality.service.ts`

### Phase 7: Add `getDepartmentById` — Proper Join Detail
- Add method to fetch single department with: department fields + head profile name/email/phone + staff count
- Used for edit modal pre-fill and detail view

Files:
- `Smart_Civic_Platform_Backend/src/modules/municipality/repository/municipality.repository.ts`
- `Smart_Civic_Platform_Backend/src/modules/municipality/services/municipality.service.ts`

### Phase 8: Fix `updateDepartment` — Strip Profile-Only Fields
- Current: `updateDepartment` in controller already strips `head_contact_no` but doesn't update the profile
- Add logic: if `head_name` or `head_email` changed, also update the linked profile row
- If `head_contact_no` provided, update profile.phone

Files:
- `Smart_Civic_Platform_Backend/src/modules/municipality/controller/municipality.controller.ts`
- `Smart_Civic_Platform_Backend/src/modules/municipality/repository/municipality.repository.ts`

### Phase 9: Validate Department Create — Prevent Duplicates
- Add check: no duplicate `department_name` within same `municipality_id`
- Add check: no duplicate `official_email` within same municipality
- Return clear error messages

Files:
- `Smart_Civic_Platform_Backend/src/modules/municipality/controller/municipality.controller.ts`
- `Smart_Civic_Platform_Backend/src/modules/municipality/repository/municipality.repository.ts`

### Phase 10: Remove Duplicate/Fallback Routes
- Current: Routes defined twice — with AND without `:municipalityId` in URL
- Remove fallback routes: `GET /departments`, `PATCH /departments/:id`, `DELETE /departments/:id`
- Keep only: `/:municipalityId/departments`, `/:municipalityId/departments/:id`

Files:
- `Smart_Civic_Platform_Backend/src/modules/municipality/routes/municipality.routes.ts`

---

## DOMAIN C — Backend: Department Head Onboarding (Phases 11–15)

### Phase 11: Rewrite `provisionDepartment` — Atomic Transaction Pattern
- Current: Creates department, THEN creates user, THEN links head_profile_id
- Ensure proper rollback: if user creation fails, delete the department
- Already partially done — verify and harden

Files:
- `Smart_Civic_Platform_Backend/src/modules/municipality/controller/municipality.controller.ts`

### Phase 12: Add Email Duplicate Check Before Department Create
- Before creating department, check if `head_email` already exists in profiles
- If exists, return 400 with clear message — prevents "orphaned department" scenario

Files:
- `Smart_Civic_Platform_Backend/src/modules/municipality/controller/municipality.controller.ts`
- `Smart_Civic_Platform_Backend/src/modules/municipality/repository/municipality.repository.ts`

### Phase 13: Auto-Generate Password for Department Head
- Current: Generates `crypto.randomBytes(6).toString("hex")` inline in controller
- Consider accepting optional password from request body (with minimum length validation)
- If not provided, auto-generate and return in response

Files:
- `Smart_Civic_Platform_Backend/src/modules/municipality/controller/municipality.controller.ts`

### Phase 14: Add Department Head Credentials in Response
- Current: Returns `{ ...dept, head_password }` — already working
- Add: `head_email`, `department_name` in response for frontend success dialog
- Standardize response shape

Files:
- `Smart_Civic_Platform_Backend/src/modules/municipality/controller/municipality.controller.ts`

### Phase 15: Department Head Replacement Flow
- Add endpoint/flow: Replace department head without deleting department
- Steps: nullify old `head_profile_id` → deactivate old user → create new user → link new `head_profile_id`
- Municipalities doc calls this "never delete department, just replace head"

Files:
- `Smart_Civic_Platform_Backend/src/modules/municipality/controller/municipality.controller.ts`
- `Smart_Civic_Platform_Backend/src/modules/municipality/services/municipality.service.ts`
- New route: `POST /:municipalityId/departments/:id/replace-head`

---

## DOMAIN D — Backend: Staff CRUD via Municipality Routes (Phases 16–20)

### Phase 16: Add Staff Routes to Municipality Router
- Current: No staff routes exist under `/api/municipality/:municipalityId/staff`
- Frontend (`ManageStaff.tsx`) calls these endpoints but they don't exist → 404
- Create routes:
  - `GET /:municipalityId/staff` — list all staff in municipality
  - `POST /:municipalityId/staff` — create new staff/department_head user
  - `PATCH /:municipalityId/staff/:staffId` — update staff profile
  - `DELETE /:municipalityId/staff/:staffId` — delete staff (with cascade)
  - `PATCH /:municipalityId/staff/:staffId/status` — update account status
  - `POST /:municipalityId/staff/:staffId/reset-password` — reset password

Files:
- `Smart_Civic_Platform_Backend/src/modules/municipality/routes/municipality.routes.ts`
- `Smart_Civic_Platform_Backend/src/modules/municipality/controller/municipality.controller.ts`

### Phase 17: Add `listStaff` Handler — Get All Staff in Municipality
- Query: JOIN staff + profiles WHERE staff.municipality_id = ?
- Return: staff_id, name, email, role, department_id, department_name, status, created_at
- Support optional `?department_id=` filter

Files:
- `Smart_Civic_Platform_Backend/src/modules/municipality/controller/municipality.controller.ts`
- `Smart_Civic_Platform_Backend/src/modules/municipality/repository/municipality.repository.ts`

### Phase 18: Add `createStaff` Handler — Create Staff or Department Head User
- Accept: name, email, password, role (staff|department_head), department_id
- Call `createUserService` with municipality_id + department_id
- Return: profile data + auto-generated password
- Validate: no duplicate email, valid role, valid department_id

Files:
- `Smart_Civic_Platform_Backend/src/modules/municipality/controller/municipality.controller.ts`
- Already partially exists as `createUser` method — align with frontend expectations

### Phase 19: Add Staff Update & Delete Handlers
- Update: PATCH staff profile fields (name, email, phone) + staff fields (expertise, etc.)
- Delete: Cascade — archive to deleted_staff → delete auth user (cascade deletes profile + staff)
- Status update: PATCH profile.account_status (active/inactive/suspended)

Files:
- `Smart_Civic_Platform_Backend/src/modules/municipality/controller/municipality.controller.ts`
- `Smart_Civic_Platform_Backend/src/modules/municipality/repository/municipality.repository.ts`

### Phase 20: Add Reset Password Handler
- Accept staffId, generate new random password
- Update auth user password via `supabaseAdmin.auth.admin.updateUserById`
- Return new temporary password
- Set `force_password_reset = true` on profile

Files:
- `Smart_Civic_Platform_Backend/src/modules/municipality/controller/municipality.controller.ts`
- `Smart_Civic_Platform_Backend/src/modules/municipality/repository/municipality.repository.ts`

---

## DOMAIN E — Backend: Department Head Scope (Phases 21–25)

### Phase 21: Verify Department Head Middleware
- Current middleware `verifyDepartmentHeadContext` in `department.middleware.ts`
- Check: sets `req.departmentId` for department_head role
- Ensure it properly reads `id` not `d_uid`
- Ensure it uses correct column names for department lookup

Files:
- `Smart_Civic-Platform_Backend/src/modules/department/middleware/department.middleware.ts`

### Phase 22: Department Head — Complaint Management Endpoints
- Current: `processGrievanceState`, `getStaffRoster`, `getDashboard` already exist
- Verify they use correct column names (no `d_uid` references)
- Add `getDepartmentComplaints` with status filter + pagination

Files:
- `Smart_Civic_Platform_Backend/src/modules/department/controller/department.controller.ts`
- `Smart_Civic_Platform_Backend/src/modules/department/repository/department.repository.ts`

### Phase 23: Department Head — Team Management
- Current: `setupTeam`, `attachStaff`, `getTeams`, `getTeamDetails`, `updateTeam`, `removeMember`, `toggleLeader`
- Fix column name references (`team_id` → `id`, `s_uid` → `id`)
- Verify all queries work with actual DB schema

Files:
- `Smart_Civic_Platform_Backend/src/modules/department/repository/department.repository.ts`
- `Smart_Civic_Platform_Backend/src/modules/department/controller/department.controller.ts`

### Phase 24: Department Head — Staff Management Within Department
- Current: `createStaff`, `updateStaff`, `removeStaff` exist in department controller
- These allow department_head to manage staff under their department
- Verify: proper role gating (department_head can only manage staff, not department_heads)
- Fix column references (`s_uid` → `id`)

Files:
- `Smart_Civic_Platform_Backend/src/modules/department/repository/department.repository.ts`

### Phase 25: Department Head — Dashboard Analytics
- Current: Returns complaint counts, resolution rate, staff count, active teams
- Verify queries use correct column names
- Add: recent activity log, SLA breach alerts

Files:
- `Smart_Civic_Platform_Backend/src/modules/department/services/department.service.ts`
- `Smart_Civic_Platform_Backend/src/modules/department/repository/department.repository.ts`

---

## DOMAIN F — Frontend: ManageDept.tsx Rewrite (Phases 26–30)

### Phase 26: Fix Department Interface — Match DB Schema
- Add all fields: `id`, `department_name`, `department_category`, `official_email`, `head_name`, `head_email`, `head_profile_id`, `staff_count`, `complaint_count`, `is_active`, `created_at`
- Remove `d_uid` field, keep `id` as primary

Files:
- `Smart_Civic_Platform_Frontend/src/pages/munic_head/ManageDept.tsx`

### Phase 27: Fix Edit Modal — Include `department_category`
- Current: `openEdit` does NOT pre-fill `department_category` — defaults to "other"
- Add: `department_category: dept.department_category || "other"` in form pre-fill
- Also add: proper `head_contact_no` handling

Files:
- `Smart_Civic_Platform_Frontend/src/pages/munic_head/ManageDept.tsx`

### Phase 28: Add Client-Side Form Validation
- Required fields: department_name, official_email, head_name, head_email, department_category
- Email format validation for official_email and head_email
- Prevent submit if validation fails
- Show inline error messages per field

Files:
- `Smart_Civic_Platform_Frontend/src/pages/munic_head/ManageDept.tsx`

### Phase 29: Fix Delete — Confirmation with Cascade Info
- Show warning: "This will also delete the department head account and all associated staff"
- Add cascade warning text in delete confirmation dialog
- Improve error handling on delete failure

Files:
- `Smart_Civic_Platform_Frontend/src/pages/munic_head/ManageDept.tsx`

### Phase 30: Add Department Categories Display
- Show `department_category` as a chip/badge in the table
- Add filter by category dropdown
- Show staff count and complaint count in table columns (currently missing)

Files:
- `Smart_Civic_Platform_Frontend/src/pages/munic_head/ManageDept.tsx`

---

## DOMAIN G — Frontend: ManageStaff.tsx Rewrite (Phases 31–35)

### Phase 31: Fix Staff Interface — Match DB Schema
- Current: Uses `{ id, name, email, role, status, department_id, department, created_at }`
- Fix to match actual response from backend:
  - `id` (profile_id), `full_name` (not name), `email`, `role`, `account_status` (not status)
  - `department_id`, `department_name`, `employee_id`, `expertise`, `created_at`

Files:
- `Smart_Civic_Platform_Frontend/src/pages/munic_head/ManageStaff.tsx`

### Phase 32: Fix Create Staff Payload
- Current sends: `{ name, email, password, role, departmentId }`
- Backend expects: `{ full_name, email, password, role, department_id }`
- Fix field name mapping before API call
- Add form validation (required fields, email format, password min length)

Files:
- `Smart_Civic_Platform_Frontend/src/pages/munic_head/ManageStaff.tsx`

### Phase 33: Fix Edit Staff Payload
- Current sends: `{ name, email, role, departmentId }`
- Backend expects: PATCH with profile fields + staff fields
- Fix field name mapping
- Don't send password on edit (only on create)

Files:
- `Smart_Civic_Platform_Frontend/src/pages/munic_head/ManageStaff.tsx`

### Phase 34: Fix Status Update Flow
- Current: Opens dialog, sends PATCH with `{ status: newStatus }`
- Backend expects: PATCH to update `account_status` on profile
- Verify the endpoint exists and fix URL path
- Add success/error toast feedback

Files:
- `Smart_Civic_Platform_Frontend/src/pages/munic_head/ManageStaff.tsx`

### Phase 35: Fix Password Reset Flow
- Current: POST to reset-password endpoint, shows alert on success
- Add: success dialog showing new temporary password (so head can copy it)
- Verify endpoint exists in backend

Files:
- `Smart_Civic_Platform_Frontend/src/pages/munic_head/ManageStaff.tsx`

---

## DOMAIN H — Frontend: Department List Integration (Phases 36–40)

### Phase 36: Department Dropdown — Fetch from API
- Current: Departments fetched from `GET /municipality/:municipalityId/departments`
- Normalize response data (handle nested `{ data: { departments: [...] } }` shape)
- Handle loading/error states

Files:
- `Smart_Civic_Platform_Frontend/src/pages/munic_head/ManageStaff.tsx`
- `Smart_Civic_Platform_Frontend/src/pages/munic_head/ManageDept.tsx`

### Phase 37: Department Selector Component — Reusable
- Extract reusable `DepartmentSelect` component
- Props: `municipalityId`, `value`, `onChange`, `label`, `required`, `error`
- Used by ManageDept.tsx (edit mode) and ManageStaff.tsx (create/edit)

Files:
- `Smart_Civic_Platform_Frontend/src/components/DepartmentSelect.tsx` (NEW)

### Phase 38: Add Department Head Name in Staff List
- Current: Staff table shows department name but not head name
- Add column showing which staff member is the department head (special badge)
- Highlight department_head role with distinct color

Files:
- `Smart_Civic_Platform_Frontend/src/pages/munic_head/ManageStaff.tsx`

### Phase 39: Add Pagination to Staff & Department Tables
- Current: No pagination — all records loaded at once
- Add pagination (10/25/50 per page)
- Or implement server-side pagination for large datasets

Files:
- `Smart_Civic_Platform_Frontend/src/pages/munic_head/ManageStaff.tsx`
- `Smart_Civic_Platform_Frontend/src/pages/munic_head/ManageDept.tsx`

### Phase 40: Add Empty State & Error Boundary
- Show friendly empty state when no departments/staff exist
- Add error boundary wrapper
- Add retry button on fetch failure

Files:
- `Smart_Civic_Platform_Frontend/src/pages/munic_head/ManageStaff.tsx`
- `Smart_Civic_Platform_Frontend/src/pages/munic_head/ManageDept.tsx`

---

## DOMAIN I — Cross-Cutting Concerns (Phases 41–45)

### Phase 41: Standardize API Response Shape
- All municipality endpoints should return: `{ success: boolean, data?: any, error?: string }`
- Frontend should normalize: `result?.data?.departments ?? result?.data ?? result`
- Create shared response helper

Files:
- `Smart_Civic_Platform_Backend/src/modules/municipality/controller/municipality.controller.ts`
- `Smart_Civic_Platform_Frontend/src/pages/munic_head/ManageDept.tsx`
- `Smart_Civic_Platform_Frontend/src/pages/munic_head/ManageStaff.tsx`

### Phase 42: Add Zod Validation Schemas for All Endpoints
- Create validation schemas for:
  - `provisionDepartment`: department_name, official_email, head_name, head_email, department_category
  - `updateDepartment`: partial of above
  - `createStaff`: full_name, email, password, role, department_id
  - `updateStaff`: partial fields
- Apply via `validateBody` middleware

Files:
- `Smart_Civic_Platform_Backend/src/validation/municipality.validation.ts` (NEW)
- `Smart_Civic_Platform_Backend/src/modules/municipality/routes/municipality.routes.ts`

### Phase 43: Audit Logging for All CRUD Operations
- Log: DEPARTMENT_CREATE, DEPARTMENT_UPDATE, DEPARTMENT_DELETE
- Log: STAFF_CREATE, STAFF_UPDATE, STAFF_DELETE, STAFF_STATUS_CHANGE
- Log: HEAD_REPLACE, PASSWORD_RESET
- Use existing audit logger middleware or call audit helper

Files:
- `Smart_Civic_Platform_Backend/src/middleware/auditlogger.ts`
- `Smart_Civic_Platform_Backend/src/modules/municipality/controller/municipality.controller.ts`

### Phase 44: Role & Permission Guards — Double Verify
- Ensure municipality_head routes reject department_head users (role mismatch)
- Ensure department_head routes reject municipality_head users
- Superadmin should NOT access municipality routes (use superadmin routes instead)
- Add integration tests for role gating

Files:
- `Smart_Civic_Platform_Backend/src/modules/municipality/middleware/municipality.middleware.ts`
- `Smart_Civic_Platform_Backend/src/modules/department/middleware/department.middleware.ts`

### Phase 45: Error Handling Standardization
- All controllers should use try/catch with specific error types
- Return appropriate HTTP status codes: 400 (validation), 404 (not found), 409 (conflict), 500 (server)
- Consistent error message format: `{ success: false, error: "human readable message" }`

Files:
- All controller files in municipality and department modules

---

## DOMAIN J — Testing, Documentation & Deployment (Phases 46–50)

### Phase 46: Backend Tests — Department CRUD
- Test: Create department → verify dept row + auth user + profile created
- Test: Create department with duplicate head_email → 400
- Test: Edit department name/category → verify DB updated
- Test: Delete department → verify cascade (auth user, profile, department deleted)
- Test: Department head can only see own department's data

Files:
- `Smart_Civic_Platform_Backend/tests/department.test.ts` (NEW)

### Phase 47: Backend Tests — Staff CRUD
- Test: Create staff user → verify profile + staff row created
- Test: Create department_head user → verify role set correctly
- Test: Update staff profile → verify changes reflected
- Test: Delete staff → verify auth user + profile + staff deleted
- Test: Status update → verify account_status changed

Files:
- `Smart_Civic_Platform_Backend/tests/staff.test.ts` (NEW)

### Phase 48: Frontend Tests — ManageDept.tsx
- Component tests:
  - Renders department list from API
  - Create department form validation (required fields, email format)
  - Edit modal pre-fills department_category correctly
  - Delete confirmation dialog appears
  - Success credentials dialog shows on create

Files:
- `Smart_Civic_Platform_Frontend/src/__tests__/ManageDept.test.tsx` (NEW)

### Phase 49: Frontend Tests — ManageStaff.tsx
- Component tests:
  - Renders staff list from API
  - Create staff form with all fields
  - Edit staff pre-fills data correctly
  - Status update dialog works
  - Password reset flow works

Files:
- `Smart_Civic_Platform_Frontend/src/__tests__/ManageStaff.test.tsx` (NEW)

### Phase 50: Documentation & Cleanup
- Update `docs/municipality-department-management.md` with new flow
- Remove all `d_uid` / `m_uid` references across the codebase
- Consolidate duplicate route definitions
- Final review: ensure no hardcoded static data for departments
- Update AGENT.md with new architecture

Files:
- `Smart_Civic_Platform/docs/municipality-department-management.md`
- `Smart_Civic_Platform/AGENT.md`
- `Smart_Civic_Platform_Backend/CLAUDE.md`

---

## Summary: 10 Domains × 5 Phases = 50 Phases

| Domain | Phases | Focus |
|--------|--------|-------|
| **A** | 1–5 | Database & Schema Alignment (fix d_uid/m_uid → id) |
| **B** | 6–10 | Backend Department CRUD (fixes, joins, validation) |
| **C** | 11–15 | Backend Department Head Onboarding (atomic, replacement) |
| **D** | 16–20 | Backend Staff CRUD via Municipality Routes (create routes) |
| **E** | 21–25 | Backend Department Head Scope (teams, complaints, dashboard) |
| **F** | 26–30 | Frontend ManageDept.tsx Rewrite (fixes, validation, UI) |
| **G** | 31–35 | Frontend ManageStaff.tsx Rewrite (field mapping, flows) |
| **H** | 36–40 | Frontend Department List Integration (selectors, pagination) |
| **I** | 41–45 | Cross-Cutting (validation, audit logs, error handling) |
| **J** | 46–50 | Testing, Documentation & Cleanup |

---

## Key Architectural Issues Found

### 1. `d_uid` / `m_uid` vs `id`
Every repository file uses `d_uid` or `m_uid` but the actual DB PK column is `id`. This works because Supabase apparently accepts both, but it's fragile and misleading.

### 2. Missing Staff Routes Under Municipality
Frontend calls `GET /api/municipality/:municipalityId/staff` but NO such route exists — it would return 404. The existing `createUser` endpoint in municipality controller is meant for this but its route is `/users/create`, not `/staff`.

### 3. Frontend Field Name Mismatch
`ManageStaff.tsx` sends `{ name, departmentId }` but backend expects `{ full_name, department_id }`. The response is never properly normalized.

### 4. Edit Modal Loses `department_category`
This is confirmed in both the existing doc and the code. Editing a department silently resets category to "other".

### 5. No Delete Cascade for Departments
When a department is deleted, staff records and complaints become orphaned. The FK constraint may prevent deletion entirely.

### Data Flow (After Fix)
```
CREATE DEPARTMENT:
  POST /api/municipality/:mid/departments
  Body: { department_name, department_category, official_email, head_name, head_email }
  → Creates department row
  → Creates auth user (department_head role)
  → Links head_profile_id
  → Returns { id, department_name, head_email, head_password }

CREATE STAFF:
  POST /api/municipality/:mid/staff
  Body: { full_name, email, password, role, department_id }
  → Creates auth user (staff or department_head role)
  → Returns { profile_id, email, full_name, role }

LIST STAFF:
  GET /api/municipality/:mid/staff
  → Returns [{ id, full_name, email, role, account_status,
               department_id, department_name, created_at }]
```
