# Municipality Department Management — System Deep-Dive & Improvement Plan

> **Scope:** How a municipality_head creates, lists, edits, and deletes departments in the Smart Civic Platform.
> **Role involved:** `municipality_head` (via middleware `verifyMunicipalityHeadContext`)
> **Tech stack:** React (Vite) frontend + Express backend + Supabase (PostgreSQL).
> **Last updated:** 2026-07-22

---

## 1. Architecture Overview

```
┌───────────────────────────────────────────────────────────────────┐
│  FRONTEND (ManageDept.tsx)                                        │
│  Role: municipality_head                                          │
│    │                                                              │
│    │  fetchWithAuth() ──── JWT ────►  Express Router              │
│    │                                      │                       │
│    │  GET    /api/municipality/departments/categories              │
│    │  GET    /api/municipality/:mid/departments                   │
│    │  POST   /api/municipality/:mid/departments                   │
│    │  PATCH  /api/municipality/:mid/departments/:deptId           │
│    │  DELETE /api/municipality/:mid/departments/:deptId           │
│    │                                      │                       │
└───────────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────────────────────────┐
│  BACKEND (Express)                                                │
│  Mounted at: /api/municipality                                    │
│                                                                   │
│  Middleware stack (global):                                       │
│  1. requireAuth(supabase) — validates JWT                         │
│  2. verifyMunicipalityHeadContext(supabase)                       │
│       └─► Checks: profiles.role === "municipality_head"           │
│       └─► Checks: account_status === "active"                     │
│       └─► Looks up: municipalities[head_profile_id = user.id]     │
│       └─► Sets: req.municipalityId = municipality.m_uid           │
│                                                                   │
│  Controller → Service → Repository → Supabase (service_role)      │
└───────────────────────────────────────────────────────────────────┘
                        │
                        ▼
          ┌───────────────────────────────┐
          │  SUPABASE (PostgreSQL)        │
          │  ┌─────────────────────────┐  │
          │  │ departments             │  │
          │  │ profiles                │  │
          │  │ staff                   │  │
          │  │ complaints              │  │
          │  │ teams / team_members    │  │
          │  └─────────────────────────┘  │
          └───────────────────────────────┘
```

### Key dependencies

| Component | File | Purpose |
|-----------|------|---------|
| Frontend page | `ManageDept.tsx` | CRUD UI for departments under a municipality |
| Middleware | `municipality.middleware.ts` | Verifies `municipality_head` role, injects `req.municipalityId` |
| Controller | `municipality.controller.ts` | 6 handlers: analytics, departments CRUD, staff, complaints, users |
| Service | `municipality.service.ts` | Delegates to repository |
| Repository | `municipality.repository.ts` | Supabase queries for departments, staff, complaints |
| Routes | `municipality.routes.ts` | Route definitions with middleware |
| Auth service | `auth.service.ts` | `createUserService` — creates auth user + profile |

---

## 2. Frontend — Deep Dive (`ManageDept.tsx`)

### 2.1 Page Lifecycle

```
Component Mount
       │
       ├─► fetchCategories()  ──► GET /api/municipality/departments/categories
       │                              └─► Calls supabase RPC: get_department_categories()
       │
       └─► fetchDepartments() ──► GET /api/municipality/:municipalityId/departments
                                      └─► Calls repo.getDepartments(municipalityId)
                                              └─► SELECT * FROM departments
                                                    WHERE municipality_id = ?
                                              └─► Response: { success: true, data: { departments: [...] } }

       │
       ▼
  Search filter (local):
       └─► useEffect filters departments[] by name/email/head name → filtered[]
```

### 2.2 Department CRUD Operations

#### Create Department

```
User clicks "Add Department"
       │
       ▼
openCreate()
  └─► Clears editTarget, formData = emptyForm
  └─► Opens modal
       │
User fills form & submits
       │
       ▼
handleSubmit(e)
  │
  ├─► POST /api/municipality/:municipalityId/departments
  │     Body: { department_name, official_email, head_name,
  │             head_email, head_contact_no, department_category }
  │
  └─► On success (201):
        ├─► Closes modal
        ├─► Re-fetches full department list
        └─► If result.data.head_password exists:
              └─► Shows credentials dialog with email + temp password
```

#### Edit Department

```
User clicks Edit icon
       │
       ▼
openEdit(dept)
  └─► Sets editTarget = dept
  └─► Pre-fills formData:
        ├─► department_name ✓
        ├─► official_email  ✓
        ├─► head_name       ✓
        ├─► head_email      ✓
        ├─► head_contact_no ✗ (set to "")
        └─► department_category ✗ (NOT included — defaults to "other")
       │
User modifies & submits
       │
       ▼
handleSubmit(e)
  │
  ├─► PATCH /api/municipality/:municipalityId/departments/:deptId
  │     Body: same as create (includes head_contact_no which is not a dept column)
  │
  └─► On success → closes modal, re-fetches list
```

#### Delete Department

```
User clicks Delete icon → confirm dialog
       │
       ▼
handleDelete()
  │
  ├─► DELETE /api/municipality/:municipalityId/departments/:deptId
  │
  └─► On success:
        ├─► Optimistic remove from local state
        └─► Closes confirm dialog

⚠️ Only deletes the department row — does NOT clean up:
    • department_head auth user (Supabase Auth)
    • department_head profile row (profiles table)
    • staff records linked to this department
    • complaints assigned to this department
```

### 2.3 State Management

| State | Type | Purpose |
|-------|------|---------|
| `departments` | `Department[]` | Full list from API |
| `filtered` | `Department[]` | Client-side search filtered list |
| `search` | `string` | Search query |
| `modalOpen` | `boolean` | Add/Edit dialog visibility |
| `editTarget` | `Department \| null` | Department being edited (null = create mode) |
| `formData` | `object` | Form field values |
| `formError` | `string \| null` | Inline form error |
| `deleteTarget` | `Department \| null` | Department being confirmed for delete |
| `newCredentials` | `{ email, password } \| null` | Success dialog for newly created department head |

---

## 3. Backend — Deep Dive

### 3.1 Middleware: `verifyMunicipalityHeadContext`

Located at `municipality.middleware.ts`. Executed on EVERY route in the router.

```
Request arrives
       │
       ▼
1. Extract req.user.id (set by requireAuth)
       │
       ▼
2. Query: SELECT role, account_status FROM profiles WHERE id = ?
       │
       ├─► If role !== "municipality_head" → 403
       ├─► If account_status !== "active" → 403
       │
       ▼
3. Query: SELECT m_uid FROM municipalities WHERE head_profile_id = ?
       │
       ├─► If no result → 403 (no municipality bound)
       │
       ▼
4. Set: req.municipalityId = municipality.m_uid
       │
       ▼
next()
```

**Critical insight:** The middleware always looks up the municipality by `head_profile_id`. The `:municipalityId` in the URL path is **never actually used** by the controller. The frontend sends it, but the backend ignores it and uses the middleware-injected value. This means:
- A municipality_head can only access their **own** municipality's departments
- The URL param is purely cosmetic / REST convention

### 3.2 Department Provision Flow (`provisionDepartment` — POST)

```
1. Validate: department_name, official_email, head_name, head_email

2. Generate password: crypto.randomBytes(6).toString("hex")

3. Build department data: { department_name, official_email,
   head_name, head_email, department_category, municipality_id }

4. INSERT INTO departments → returns { d_uid, ... }

5. Create head user via createUserService:
   └─► { email, password, full_name, role: "department_head",
          municipality_id, department_id: dept.d_uid, phone }

6. UPDATE departments SET head_profile_id = profile.id WHERE d_uid = ?

7. Return { ...dept, head_password }

⚠️ Rollback: If step 5 fails, the department is deleted (step 1 in catch)
```

### 3.3 Route Definitions (All Municipality Routes)

| Method | Path | Controller Handler | Description |
|--------|------|-------------------|-------------|
| GET | `/analytics` | `getAnalytics` | Dashboard analytics |
| POST | `/departments/create` | `provisionDepartment` | Legacy create |
| **GET** | **`/departments/categories`** | **`getDepartmentCategories`** | **Fetch department categories via RPC** |
| **GET** | **`/:municipalityId/departments`** | **`getDepartments`** | **List departments** |
| GET | `/departments` | `getDepartments` | Fallback (no municipalityId in path) |
| **POST** | **`/:municipalityId/departments`** | **`provisionDepartment`** | **Create department** |
| **PATCH** | **`/:municipalityId/departments/:id`** | **`updateDepartment`** | **Edit department** |
| PATCH | `/departments/:id` | `updateDepartment` | Fallback |
| **DELETE** | **`/:municipalityId/departments/:id`** | **`deleteDepartment`** | **Delete department** |
| DELETE | `/departments/:id` | `deleteDepartment` | Fallback |
| POST | `/staff/onboard` | `onboardStaffProfile` | Create staff profile |
| GET | `/complaints` | `getComplaints` | List complaints |
| POST | `/users/create` | `createUser` | Create department_head or staff user |

### 3.4 Database Schema — Department Row

```typescript
interface DepartmentRow {
  d_uid: string;                              // UUID primary key
  municipality_id: string;                    // FK → municipalities.m_uid
  department_name: string;
  department_category: DepartmentCategory;    // "water_supply" | "electricity" | ...
  official_email: string;
  official_logo: string | null;
  head_profile_id: string | null;             // FK → profiles.id
  head_name: string | null;
  head_email: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

Note: `head_contact_no` is NOT a column on `departments` — it lives on the user's `profile` record.

---

## 4. Identified Issues

### P1 — Delete Department Doesn't Cascade

`deleteDepartment` only runs `DELETE FROM departments WHERE d_uid = ?`. It leaves:
- The **department_head auth user** (Supabase Auth) — dangling
- The **department_head profile row** (`profiles` table) — dangling
- The **staff records** linked to this department — orphaned (FK may prevent delete)
- The **complaints** assigned to this department — orphaned

**Same pattern as the municipality fix we just completed.**

### P2 — Edit Modal Loses `department_category`

In `openEdit()` (line 141–152 of `ManageDept.tsx`):

```typescript
setFormData({
  department_name: dept.department_name || "",
  official_email: dept.official_email || "",
  head_name: dept.head_name || "",
  head_email: dept.head_email || "",
  head_contact_no: ""  // ← Not stored on department model
  // ← department_category is MISSING — defaults to "other"
});
```

Saving an edit silently resets `department_category` to `"other"` because it's not pre-filled.

### P3 — PATCH Sends `head_contact_no` to Departments Table

The `head_contact_no` field is sent in the PATCH body:
```json
{ "department_name": "...", "head_contact_no": "1234567890", ... }
```

The `departments` table has **no `head_contact_no` column**. Supabase may silently ignore it, but it's dead data in the payload. The contact number is stored on the `profiles` table and would need a separate update.

### P4 — `getDepartments` Controller Ignores URL Param

The `getDepartments` handler reads `req.municipalityId` (middleware-injected) not `req.params.municipalityId`. The URL segment `:municipalityId` is syntactically required but semantically ignored. If a bug or misconfiguration ever caused the middleware to fail, this could lead to confusing behavior.

### P5 — No Client-Side Form Validation

Similar to the municipality form (before we fixed it), the department form has no validation:
- Empty `department_name` submits
- Invalid email formats accepted
- No minimum field checks before API call

---

## 5. Improvement Plan

### Phase 1 — Critical Fixes (Department Delete Cascade)

| # | Task | Description | Files |
|---|------|-------------|-------|
| 1.1 | **Fetch department before delete** | Add `getDepartmentById` to repo to read `head_profile_id` | `municipality.repository.ts` |
| 1.2 | **Add cascade methods** | Add `deleteProfileById` and `deleteAuthUser` to repo | `municipality.repository.ts` |
| 1.3 | **Add service passthrough** | Wire new repo methods through service | `municipality.service.ts` |
| 1.4 | **Rewrite deleteDepartment** | Nullify `head_profile_id` → delete profile → delete auth user → delete department | `municipality.controller.ts` |

### Phase 2 — Bug Fixes

| # | Task | Description | Files |
|---|------|-------------|-------|
| 2.1 | **Fix edit modal: include `department_category`** | Add `department_category` to `openEdit` form pre-fill | `ManageDept.tsx` |
| 2.2 | **Remove `head_contact_no` from PATCH payload** | Strip profile-only fields from department update body | `municipality.controller.ts` |
| 2.3 | **Add client-side validation** | Required field + email format checks before submit | `ManageDept.tsx` |

### Phase 3 — Improvements

| # | Task | Description |
|---|------|-------------|
| 3.1 | **Clean up duplicate routes** | Remove fallback routes (`/departments`, `/departments/:id`) — they're untested and misleading |
| 3.2 | **Use URL param or document middleware** | Either actually read `req.params.municipalityId` or document that the middleware overrides it |
| 3.3 | **Add staff count and complaint count to department list** | The `Department` interface has `staff_count` and `complaint_count` but they're not populated — add JOIN queries or subqueries |

---

## 6. End-to-End Flow Example

### Creating "Water Supply" Department

```
User fills form: department_name="Water Supply", category="water_supply",
                 email="water@kathmandu.gov.np", head="Ram Sharma",
                 head_email="ram@kathmandu.gov.np", phone="9841234567"

Frontend POST /api/municipality/uuid-abc/departments
Body: { department_name: "Water Supply", department_category: "water_supply",
        official_email: "water@kathmandu.gov.np", head_name: "Ram Sharma",
        head_email: "ram@kathmandu.gov.np", head_contact_no: "9841234567" }

Backend:
  1. Middleware: injects req.municipalityId from token lookup
  2. Validates required fields
  3. Generates password: "a1b2c3d4e5f6"
  4. INSERT INTO departments (municipality_id, department_name, ...)
  5. CREATE USER (auth + profile) with role=department_head, linked to dept
  6. UPDATE departments SET head_profile_id = profile.id
  7. Returns { d_uid, department_name: "Water Supply", head_password: "a1b2c3d4e5f6" }

Frontend shows credentials dialog with email + password
```

---

## 7. Test Checklist

- [ ] Create department → verify department row + auth user + profile created
- [ ] Create department with duplicate head_email → should fail with clear error
- [ ] Edit department name/category → verify DB updated
- [ ] Edit department: verify `department_category` is preserved (not reset to "other")
- [ ] Delete department:
  - [ ] Verify department row deleted
  - [ ] Verify department_head auth user deleted
  - [ ] Verify department_head profile deleted
  - [ ] Verify staff/complaints handled (soft deleted or reassigned)
- [ ] Municipality head can only see their own municipality's departments
- [ ] Department head cannot access `/api/municipality` routes (403)
- [ ] Superadmin cannot access `/api/municipality` routes (403, role check)
