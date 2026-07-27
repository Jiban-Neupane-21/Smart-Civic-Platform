# Staff Creation — 50-Phase Implementation Plan

## Vision Overview
**Two-Tier Staff Creation Model:**

1. **Municipality Head** — Creates staff for **any** department in their municipality
2. **Department Head** — Creates staff **only** for their own department

Three security markers bind every staff account:
- `municipality_id` → Multi-tenant isolation
- `department_id` → Department boundary
- `role = 'staff'` → Operational (no admin rights)

```text
Municipality Head ──► Any Department ──► Staff
Department Head  ──► Own Department Only ──► Staff
```

---

## DOMAIN A — Backend: Municipality Head Staff Routes (Phases 1–5)

### Phase 1: Add `GET /:municipalityId/staff` Route
- Create route for listing all staff in the municipality
- Query: JOIN `staff` + `profiles` + `departments` WHERE `staff.municipality_id = ?`
- Return: `id`, `full_name`, `email`, `role`, `account_status`, `department_id`, `department_name`, `employee_id`, `expertise`, `created_at`

Files:
- `Smart_Civic_Platform_Backend/src/modules/municipality/routes/municipality.routes.ts`
- `Smart_Civic_Platform_Backend/src/modules/municipality/controller/municipality.controller.ts`
- `Smart_Civic_Platform_Backend/src/modules/municipality/services/municipality.service.ts`
- `Smart_Civic_Platform_Backend/src/modules/municipality/repository/municipality.repository.ts`

### Phase 2: Add `POST /:municipalityId/staff` Route
- Create staff user by Municipality Head for ANY department
- Accept: `full_name`, `email`, `password`, `role` (staff | department_head), `department_id`, `phone`
- Call `createUserService` with `municipality_id` (from middleware) + `department_id` (from body)
- Return: profile data + auto-generated password (if not provided)

Files:
- Same as Phase 1

### Phase 3: Add `PATCH /:municipalityId/staff/:staffId` Route
- Update staff profile fields (full_name, email, phone) + staff fields (expertise, employee_id)
- Must verify staff belongs to this municipality
- Update both `profiles` table and `staff` table

Files:
- Same as Phase 1

### Phase 4: Add `DELETE /:municipalityId/staff/:staffId` Route
- Cascade delete: archive to `deleted_staff` → delete auth user (cascade deletes profile + staff)
- Must verify staff belongs to this municipality
- Extract and follow existing pattern from `department.repository.ts::archiveAndDeleteStaff`

Files:
- Same as Phase 1

### Phase 5: Add `PATCH /:municipalityId/staff/:staffId/status` Route
- Update `account_status` on profile: active | inactive | suspended
- Add `POST /:municipalityId/staff/:staffId/reset-password` for password reset
- Return new temp password on reset

Files:
- Same as Phase 1

---

## DOMAIN B — Backend: Department Head Staff Routes (Phases 6–10)

### Phase 6: Add `GET /staff` Route Under Department Router
- Create route: `GET /api/department/staff` — list all staff in the department head's department
- Department ID injected by `verifyDepartmentHeadContext` middleware
- Return same shape as municipality staff list but filtered to single department

Files:
- `Smart_Civic_Platform_Backend/src/modules/department/routes/department.route.ts`
- `Smart_Civic_Platform_Backend/src/modules/department/controller/department.controller.ts`
- `Smart_Civic_Platform_Backend/src/modules/department/services/department.service.ts`
- `Smart_Civic_Platform_Backend/src/modules/department/repository/department.repository.ts`

### Phase 7: Add `POST /staff` Route Under Department Router
- Create staff under department head's own department (locked — no department choice)
- Accept: `full_name`, `email`, `password`, `phone`
- `department_id` is auto-injected from middleware (NOT from request body)
- `role` defaults to "staff" (department_head cannot create other department_heads)
- Return: profile + temp password

Files:
- Same as Phase 6

### Phase 8: Add `PATCH /staff/:staffId` Route Under Department Router
- Update staff member within department head's scope
- Must verify staff belongs to this department
- Fields: full_name, email, phone, expertise, employee_status

Files:
- Same as Phase 6

### Phase 9: Add `DELETE /staff/:staffId` Route Under Department Router
- Delete staff from department (cascade: archive → delete auth user)
- Must verify staff belongs to this department
- Follow existing `archiveAndDeleteStaff` pattern

Files:
- Same as Phase 6

### Phase 10: Add Status & Password Routes Under Department Router
- `PATCH /staff/:staffId/status` — update account status
- `POST /staff/:staffId/reset-password` — reset password, return new temp password
- Both scoped to department head's own department

Files:
- Same as Phase 6

---

## DOMAIN C — Backend: Staff Module for Regular Staff (Phases 11–15)

### Phase 11: Add `GET /profile` Route for Staff
- Staff can view their own profile
- Return: full_name, email, phone, role, department_id, department_name, municipality_id, municipality_name, employee_id, expertise

Files:
- `Smart_Civic_Platform_Backend/src/modules/staff/routes/staff.routes.ts`
- `Smart_Civic_Platform_Backend/src/modules/staff/controller/staff.controller.ts`
- `Smart_Civic_Platform_Backend/src/modules/staff/services/staff.service.ts`
- `Smart_Civic_Platform_Backend/src/modules/staff/repository/staff.repository.ts`

### Phase 12: Add `PATCH /profile` Route for Staff
- Staff can update their own profile (limited fields: phone, personal_address)
- They CANNOT change email, role, department, or municipality

Files:
- Same as Phase 11

### Phase 13: Add `GET /my-department` Route for Staff
- Staff can view their department details: name, category, head_name, head_email
- Used for context awareness in dashboard

Files:
- Same as Phase 11

### Phase 14: Add Staff Login — Tenant Isolation Verification
- On login, ensure JWT carries: `profile.role`, `profile.municipality_id`, `profile.department_id`
- Staff dashboard filters ALL data by these markers
- Verify existing `loginService` returns these fields correctly

Files:
- `Smart_Civic_Platform_Backend/src/modules/auth/services/auth.service.ts`

### Phase 15: Add Staff `force_password_reset` Enforcement
- On first login, check `profile.force_password_reset`
- If true, redirect to password change page (frontend)
- After password change, set `force_password_reset = false`
- Already partially implemented — verify and harden

Files:
- `Smart_Civic_Platform_Backend/src/middleware/forcePasswordReset.ts`

---

## DOMAIN D — Backend: Security & Validation (Phases 16–20)

### Phase 16: Add Zod Validation Schemas — Staff Creation
- `createStaffSchema`: full_name (required, min 2), email (required, valid format), password (required, min 6), role (enum: staff|department_head), department_id (required, UUID)
- `updateStaffSchema`: all fields optional, at least one required
- `statusUpdateSchema`: status (enum: active|inactive|suspended)

Files:
- `Smart_Civic_Platform_Backend/src/validation/staff.validation.ts` (NEW)

### Phase 17: Apply Validation Middleware to All Staff Routes
- Municipality routes: apply schemas to `/staff` POST/PATCH
- Department routes: apply schemas to `/staff` POST/PATCH
- Reuse existing `validateBody` middleware pattern

Files:
- `Smart_Civic_Platform_Backend/src/modules/municipality/routes/municipality.routes.ts`
- `Smart_Civic_Platform_Backend/src/modules/department/routes/department.route.ts`

### Phase 18: Enforce Role Gating — Municipality Head Routes
- Municipality head routes already have `verifyMunicipalityHeadContext`
- Additional check: municipality_head can only create `staff` or `department_head` roles
- They CANNOT create `municipality_head`, `superadmin`, or `citizen`

Files:
- `Smart_Civic_Platform_Backend/src/modules/municipality/controller/municipality.controller.ts`

### Phase 19: Enforce Role Gating — Department Head Routes
- Department head can ONLY create `staff` role (not department_head)
- Department head's staff are automatically bound to their department_id
- Add check: if body contains `role` other than `staff`, reject

Files:
- `Smart_Civic_Platform_Backend/src/modules/department/controller/department.controller.ts`

### Phase 20: Duplicate Email Check Before Staff Creation
- Before creating any staff user, check if email exists in `profiles`
- Return 409 Conflict with clear message if duplicate
- This prevents "silent failure" where Supabase returns opaque error

Files:
- `Smart_Civic_Platform_Backend/src/modules/municipality/controller/municipality.controller.ts`
- `Smart_Civic_Platform_Backend/src/modules/department/controller/department.controller.ts`
- `Smart_Civic_Platform_Backend/src/modules/municipality/repository/municipality.repository.ts`
- `Smart_Civic_Platform_Backend/src/modules/department/repository/department.repository.ts`

---

## DOMAIN E — Backend: Column Name Fixes (Phases 21–25)

### Phase 21: Fix `d_uid` → `id` in Department Middleware
- `department.middleware.ts` line 46: `.eq("head_profile_id", userId)` → no change needed for filter
- Line 61: `req.departmentId = department.d_uid` → change to `department.id`
- Line 46: `.select("d_uid")` → `.select("id")`

Files:
- `Smart_Civic_Platform_Backend/src/modules/department/middleware/department.middleware.ts`

### Phase 22: Fix `d_uid` → `id` in Department Repository
- `getDepartmentById`, `updateDepartment`, `deleteDepartment`: `.eq("d_uid", id)` → `.eq("id", id)`
- `getDepartmentSummary`: `.eq("d_uid", departmentId)` → `.eq("id", departmentId)`
- `getDepartmentMunicipalityId`: `.eq("d_uid", departmentId)` → `.eq("id", departmentId)`
- `getDepartmentCategoryAndName`: `.eq("d_uid", departmentId)` → `.eq("id", departmentId)`

Files:
- `Smart_Civic_Platform_Backend/src/modules/department/repository/department.repository.ts`

### Phase 23: Fix `s_uid` → `id` in Department Repository
- `getDepartmentStaff`: `.eq("s_uid", staffId)` → `.eq("id", staffId)`
- `updateStaffRecord`: `.eq("s_uid", staffId)` → `.eq("id", staffId)`
- `archiveAndDeleteStaff`: `.eq("s_uid", staffId)` → `.eq("id", staffId)`

Files:
- `Smart_Civic_Platform_Backend/src/modules/department/repository/department.repository.ts`

### Phase 24: Fix `m_uid` → `id` in Municipality Repository & Middleware
- `municipality.middleware.ts`: `.select("m_uid")` → `.select("id")`, `req.municipalityId = municipality.m_uid` → `municipality.id`
- `municipality.repository.ts`: `getLocalComplaintStats` — `.eq("m_uid", municipalityId)` → `.eq("id", municipalityId)`

Files:
- `Smart_Civic_Platform_Backend/src/modules/municipality/middleware/municipality.middleware.ts`
- `Smart_Civic_Platform_Backend/src/modules/municipality/repository/municipality.repository.ts`

### Phase 25: Fix Staff Repository Column Names
- `staff.repository.ts`: No column name issues found (uses `profile_id` correctly)
- Verify `staff.controller.ts` and `staff.service.ts` use correct column names
- No changes expected

Files:
- `Smart_Civic_Platform_Backend/src/modules/staff/repository/staff.repository.ts` (verify)
- `Smart_Civic_Platform_Backend/src/modules/staff/services/staff.service.ts` (verify)

---

## DOMAIN F — Frontend: ManageStaff.tsx — Municipality Head View (Phases 26–30)

### Phase 26: Rewrite API Calls — Fix Endpoints
- Current calls `GET/POST /api/municipality/:municipalityId/staff` — these DON'T EXIST yet
- After Phase 1-2, these will work — ensure frontend URLs match backend routes
- Fix response data normalization (handle nested `{ data: [...] }` vs `{ data: { staff: [...] } }`)

Files:
- `Smart_Civic_Platform_Frontend/src/pages/munic_head/ManageStaff.tsx`

### Phase 27: Fix Staff Interface — Match Backend Response
- Current: `{ id, name, email, role, status, department_id, department, created_at }`
- New: `{ id, full_name, email, role, account_status, department_id, department_name, employee_id, expertise, created_at }`
- Map response fields to interface properly

Files:
- `Smart_Civic_Platform_Frontend/src/pages/munic_head/ManageStaff.tsx`

### Phase 28: Fix Create Form — Correct Field Names
- Current sends: `{ name, email, password, role, departmentId }`
- Must send: `{ full_name, email, password, role, department_id }`
- Add: `expertise` field (optional), `employee_id` field (optional)
- Add form validation (required fields, email format, password min 6 chars)

Files:
- `Smart_Civic_Platform_Frontend/src/pages/munic_head/ManageStaff.tsx`

### Phase 29: Fix Edit Form — Pre-fill All Fields
- Current edit sends: `{ name, email, role, departmentId }`
- Fix to send proper fields matching backend expectations
- Pre-fill: full_name, email, role, department_id, expertise, employee_id
- Password field shown only on create (not on edit)

Files:
- `Smart_Civic_Platform_Frontend/src/pages/munic_head/ManageStaff.tsx`

### Phase 30: Add Success/Error Feedback
- Success dialog for staff creation showing temp password
- Success toast for edit/delete/status update
- Error alerts with clear messages
- Loading states for all operations

Files:
- `Smart_Civic_Platform_Frontend/src/pages/munic_head/ManageStaff.tsx`

---

## DOMAIN G — Frontend: Department Head Staff View (Phases 31–35)

### Phase 31: Create Department Head Staff Management Page
- New page: `ManageDepartmentStaff.tsx` under `pages/dept_head/`
- Similar to ManageStaff.tsx but:
  - No department selector (auto-locked to their department)
  - Can only create `staff` role (not department_head)
  - Simplified UI focused on team management

Files:
- `Smart_Civic_Platform_Frontend/src/pages/dept_head/ManageDepartmentStaff.tsx` (NEW)

### Phase 32: Add Staff List View for Department Head
- Fetch from: `GET /api/department/staff`
- Table: Name, Email, Role (always staff), Status, Actions
- Search by name/email
- Filter by status

Files:
- Same as Phase 31

### Phase 33: Add Create Staff Form for Department Head
- Fields: full_name, email, password, phone, expertise
- No department selector (auto-bound to department head's department)
- Role auto-set to "staff" (not selectable)
- Validation: required fields, email format, password min 6

Files:
- Same as Phase 31

### Phase 34: Add Edit/Delete for Department Head
- Edit: PATCH `/api/department/staff/:staffId`
- Delete: DELETE `/api/department/staff/:staffId` with cascade warning
- Status update: PATCH `/api/department/staff/:staffId/status`
- Password reset: POST `/api/department/staff/:staffId/reset-password`

Files:
- Same as Phase 31

### Phase 35: Add Route for Department Head Staff Page
- Add route in `AppRoutes.tsx`: `/dept-head/manage-staff` → `ManageDepartmentStaff`
- Update navbar config for department_head role
- Add protected route with role check

Files:
- `Smart_Civic_Platform_Frontend/src/routes/AppRoutes.tsx`
- `Smart_Civic_Platform_Frontend/src/config/navbar.config.tsx`

---

## DOMAIN H — Frontend: Staff Dashboard & Profile (Phases 36–40)

### Phase 36: Create Staff Dashboard Page
- Shows: welcome message with staff name and role
- Shows: department name, municipality name
- Shows: quick stats (assigned teams count, pending tasks)
- Layout similar to existing `Homepage.tsx` under staff pages

Files:
- `Smart_Civic_Platform_Frontend/src/pages/staff/Homepage.tsx` (rewrite/update)

### Phase 37: Create Staff Profile Page
- View own profile: full_name, email, phone, department, role
- Edit limited fields: phone only
- Password change form (current + new password)

Files:
- `Smart_Civic_Platform_Frontend/src/pages/staff/ProfilePage.tsx` (rewrite/update)

### Phase 38: Add Staff Dashboard API Calls
- Fetch staff profile: GET `/api/staff/profile`
- Fetch department info: GET `/api/staff/my-department`
- Fetch assigned teams: GET `/api/staff/my-assignments` (already exists)
- Fetch department queue: GET `/api/staff/department-queue` (already exists)

Files:
- `Smart_Civic_Platform_Frontend/src/pages/staff/Homepage.tsx`
- `Smart_Civic_Platform_Frontend/src/pages/staff/ProfilePage.tsx`

### Phase 39: Add Force Password Reset Flow for Staff
- On login, if `force_password_reset` is true, redirect to password change page
- Create dedicated password change page
- After successful change, redirect to dashboard
- Use existing `changePasswordService`

Files:
- `Smart_Civic_Platform_Frontend/src/pages/auth/ForcePasswordReset.tsx` (NEW)
- `Smart_Civic_Platform_Frontend/src/routes/AppRoutes.tsx`
- `Smart_Civic_Platform_Backend/src/middleware/forcePasswordReset.ts`

### Phase 40: Add Staff Navigation
- Update navbar config for `staff` role
- Nav items: Dashboard, My Profile, My Teams, Department Queue
- Match existing pattern from `navbar.config.tsx`

Files:
- `Smart_Civic_Platform_Frontend/src/config/navbar.config.tsx`

---

## DOMAIN I — Existing Module Fixes (Phases 41–45)

### Phase 41: Fix Existing `createUser` Endpoint
- `POST /api/municipality/users/create` already exists
- Verify it accepts correct field names and returns proper response
- Update to align with new staff creation flow

Files:
- `Smart_Civic_Platform_Backend/src/modules/municipality/controller/municipality.controller.ts`

### Phase 42: Fix Existing `onboardStaffProfile` Endpoint
- `POST /api/municipality/staff/onboard` requires existing profile_id
- This is a separate flow from direct creation — used for pre-existing users
- Verify it still works or deprecate in favor of new combined flow

Files:
- `Smart_Civic_Platform_Backend/src/modules/municipality/controller/municipality.controller.ts`

### Phase 43: Fix Existing Department `createStaff`
- `POST /api/department/staff/create` already exists in department router
- Verify it uses `req.departmentId` (injected by middleware) not from body
- Fix field name alignment (full_name vs name)

Files:
- `Smart_Civic_Platform_Backend/src/modules/department/controller/department.controller.ts`

### Phase 44: Remove Duplicate/Vestigial Routes
- Audit all municipality and department routes for duplicates
- Remove: `/staff/onboard` if replaced by new `/staff` POST
- Keep backward compatibility aliases if needed with deprecation notice

Files:
- `Smart_Civic_Platform_Backend/src/modules/municipality/routes/municipality.routes.ts`
- `Smart_Civic_Platform_Backend/src/modules/department/routes/department.route.ts`

### Phase 45: Standardize All Staff Responses
- All staff endpoints return: `{ success: true, data: { ... } }`
- List endpoints return array in data
- Create endpoints return created record
- Error responses: `{ success: false, error: "message" }`

Files:
- All controller files in municipality, department, and staff modules

---

## DOMAIN J — Testing, Documentation & Deployment (Phases 46–50)

### Phase 46: Backend Tests — Municipality Head Creates Staff
- Test: Create staff for Department A → verify staff row + profile + auth user
- Test: Create staff for Department B (different dept) → verify correct department_id
- Test: Create staff with duplicate email → 409
- Test: Create staff with missing fields → 400
- Test: List staff returns correct count

Files:
- `Smart_Civic_Platform_Backend/tests/staff-create-municipality.test.ts` (NEW)

### Phase 47: Backend Tests — Department Head Creates Staff
- Test: Department head creates staff → verify department_id = own dept
- Test: Department head tries to create department_head → 403
- Test: Department head tries to create staff for different dept → not possible (locked)
- Test: List staff returns only their department's staff

Files:
- `Smart_Civic_Platform_Backend/tests/staff-create-department.test.ts` (NEW)

### Phase 48: Backend Tests — Staff Login & Isolation
- Test: Staff login → returns correct profile, municipality_id, department_id
- Test: Staff accesses another department's data → empty results
- Test: Force password reset → redirect to change password
- Test: Suspended staff cannot login

Files:
- `Smart_Civic_Platform_Backend/tests/staff-login-isolation.test.ts` (NEW)

### Phase 49: Frontend Tests — ManageStaff.tsx
- Component tests:
  - Renders staff list from API
  - Create staff form validates required fields
  - Create staff sends correct payload
  - Edit staff pre-fills data correctly
  - Delete staff shows confirmation
  - Status update flow works

Files:
- `Smart_Civic_Platform_Frontend/src/__tests__/ManageStaff.test.tsx` (NEW)

### Phase 50: Documentation & Cleanup
- Create `docs/staff-creation-flow.md` documenting both creation methods
- Update `AGENT.md` with new architecture
- Remove all `d_uid`/`s_uid`/`m_uid` references across entire codebase
- Final review: verify field name consistency (full_name vs name, department_id vs departmentId)
- Verify three security markers are present on every staff record

Files:
- `Smart_Civic_Platform/docs/staff-creation-flow.md` (NEW)
- `Smart_Civic_Platform/AGENT.md`
- `Smart_Civic_Platform_Backend/CLAUDE.md`

---

## Summary: 10 Domains × 5 Phases = 50 Phases

| Domain | Phases | Focus |
|--------|--------|-------|
| **A** | 1–5 | Backend: Municipality Head Staff Routes (GET/POST/PATCH/DELETE/Status) |
| **B** | 6–10 | Backend: Department Head Staff Routes (scoped to own department) |
| **C** | 11–15 | Backend: Staff Module (profile, login, tenant isolation) |
| **D** | 16–20 | Backend: Security & Validation (Zod schemas, role gating, duplicate check) |
| **E** | 21–25 | Backend: Column Name Fixes (d_uid→id, s_uid→id, m_uid→id) |
| **F** | 26–30 | Frontend: ManageStaff.tsx — Municipality Head View |
| **G** | 31–35 | Frontend: Department Head Staff View (new page) |
| **H** | 36–40 | Frontend: Staff Dashboard & Profile |
| **I** | 41–45 | Existing Module Fixes (duplicate routes, field alignment) |
| **J** | 46–50 | Testing, Documentation & Deployment |

---

## Key Issues Found

### 1. Missing Staff Routes Under Municipality
Frontend calls `GET /api/municipality/:mid/staff` and `POST /api/municipality/:mid/staff` — **these routes don't exist**. The frontend always gets a 404.

### 2. Field Name Mismatch
Frontend sends `{ name, departmentId }` but backend expects `{ full_name, department_id }`.

### 3. No Department Head Staff Management Page
The frontend has no dedicated staff management page for department_head role. The only staff page exists under `pages/munic_head/`.

### 4. Column Name Rot (`d_uid`, `s_uid`, `m_uid`)
Every repository file uses legacy column names that don't match the actual DB schema (which uses `id`).

### 5. No Duplicate Email Check
Neither municipality nor department staff creation endpoints check for duplicate emails before calling Supabase, leading to cryptic errors.

### Three Security Markers Flow
```
Staff Creation Request
        │
        ▼
┌───────────────────────────────┐
│ 1. Validates creator role      │
│    (municipality_head OR       │
│     department_head)          │
└───────────────┬───────────────┘
                ▼
┌───────────────────────────────┐
│ 2. Binds municipality_id      │ ← From middleware or body
│    (from JWT context)         │
└───────────────┬───────────────┘
                ▼
┌───────────────────────────────┐
│ 3. Binds department_id        │ ← From body (municipality head)
│    or auto-injected (dept     │    or from middleware (dept head)
│    head context)              │
└───────────────┬───────────────┘
                ▼
┌───────────────────────────────┐
│ 4. Sets role = 'staff'        │ ← Staff = operational only
│    (or department_head if     │
│     municipality head chose)  │
└───────────────┬───────────────┘
                ▼
      Staff Account Created
  ┌──────┼──────┐
  │      │      │
  ▼      ▼      ▼
 muni_id dept_id role
```
