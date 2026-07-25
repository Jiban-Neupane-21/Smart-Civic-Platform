# Superadmin Municipality Management — System Deep-Dive & Improvement Plan

> **Scope:** How a superadmin provisions, lists, and deletes municipalities in the Smart Civic Platform.
> **Tech stack:** React (Vite) frontend + Express backend + Supabase (PostgreSQL).
> **Last updated:** 2026-07-22

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│  FRONTEND (React / Vite)                                                │
│  ManageMuniciple.tsx                                                    │
│    │  fetchWithAuth()  ──── JWT ────►  Express Router                   │
│    │                                       │                            │
│    │  POST /api/superadmin/municipalities/provision                     │
│    │  GET  /api/superadmin/municipalities                               │
│    │  DELETE /api/superadmin/municipalities/:id                         │
│    │                                       │                            │
│    │  Static data:                                                      │
│    │  nepal-municipalities.ts ─── local cascade (Province/District/…)   │
└─────────────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  BACKEND (Express)                                                      │
│                                                                         │
│  superadmin.routes.ts  ──►  superadmin.controller.ts                    │
│                                    │                                    │
│                                    ▼                                    │
│                           superadmin.services.ts                        │
│                                    │                                    │
│                                    ▼                                    │
│                           superadmin.repository.ts                      │
│                                    │                                    │
│                                    ▼                                    │
│                              Supabase Client (service_role)              │
│                                    │                                    │
│                                    ▼                                    │
└─────────────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
                      ┌───────────────────────────────┐
                      │     SUPABASE (PostgreSQL)      │
                      │  ┌─────────────────────────┐  │
                      │  │ municipalities          │  │
                      │  │ profiles                │  │
                      │  │ audit_logs              │  │
                      │  │ v_superadmin_analytics  │  │
                      │  └─────────────────────────┘  │
                      └───────────────────────────────┘
```

### Key design decisions

| Decision | Rationale |
|----------|-----------|
| **Static local data for cascading selects** | No need for a `districts` / `provinces` DB table — Nepal's 7 provinces, 76 districts, and 746 local bodies are stable and rarely change |
| **Supabase `service_role` for backend** | Backend uses the admin client to bypass RLS; frontend never calls Supabase directly |
| **Repository pattern** | All DB queries isolated in `superadmin.repository.ts` — easy to swap to Prisma or raw SQL later |
| **Rollback on head user failure** | If creating the municipality head account fails, the municipality row is deleted to avoid orphans |

---

## 2. Frontend — Deep Dive (`ManageMuniciple.tsx`)

### 2.1 Page Lifecycle

```
Component Mount
       │
       ▼
useEffect → fetchMunicipalities()
       │
       ▼
GET /api/superadmin/municipalities
       │
       ▼
Response: { success: true, data: Municipality[] }
       │
       ▼
setMunicipalities(data) → Table renders
```

### 2.2 Cascading 4-Level Select (Provision Modal)

The add-municipality modal uses **zero database calls** for location data — everything comes from two static maps:

| Map | Type | Source |
|-----|------|--------|
| `PROVINCES` | `string[]` | Hardcoded in component (line 52) |
| `DISTRICTS_BY_PROVINCE` | `Record<string, string[]>` | Hardcoded in component (line 62) |
| `MUNICIPALITIES_BY_DISTRICT` | `Record<string, Array<{name, type}>>` | `nepal-municipalities.ts` (line 31) |

**Selection flow:**

```
Province selected
  └─► District dropdown enabled, populated from DISTRICTS_BY_PROVINCE
        │
        ▼
District selected  ── clears municipality_type & official_name
  └─► Municipality Type dropdown enabled
  └─► availableTypes = unique types from MUNICIPALITIES_BY_DISTRICT[district]
        │
        ▼
Type selected  ── clears official_name
  └─► Municipality Name dropdown enabled
  └─► filteredMunicipalities = MUNICIPALITIES_BY_DISTRICT[district]
                                  .filter(m => m.type === selectedType)
```

**Computed variables (recalculated on every render):**

```typescript
// Line 96 — Municipalities present in the selected district
const municipalitiesForDistrict = formData.province && formData.district
  ? MUNICIPALITIES_BY_DISTRICT[formData.district] ?? []
  : [];

// Line 101 — Unique types available in that district
const availableTypes = [...new Set(municipalitiesForDistrict.map((m) => m.type))];

// Line 104 — Municipalities matching both district AND selected type
const filteredMunicipalities = formData.municipality_type
  ? municipalitiesForDistrict.filter((m) => m.type === formData.municipality_type)
  : [];
```

### 2.3 Provision Form Submit

```
User clicks "Save Municipality"
       │
       ▼
handleAddSubmit(e)
       │
       ▼
POST /api/superadmin/municipalities/provision
  Body: { official_name, district, province, official_email,
          head_name, head_email, total_wards, municipality_type }
       │
       ▼
On success (201):
  │
  ├─► Prepend new municipality to table (optimistic update)
  ├─► Show success dialog with auto-generated password
  └─► Reset form, close modal

On error:
  └─► Show error Alert
```

### 2.4 List / Delete

- **List:** `GET /api/superadmin/municipalities` → renders in MUI Table
- **Delete:** `DELETE /api/superadmin/municipalities/:id` → remove from table optimistically

---

## 3. Backend — Deep Dive

### 3.1 Dependency Chain

```
createSuperadminRouter(supabaseAdmin, controller)
  │
  └─► SuperadminController
        │
        └─► SuperadminService
              │
              └─► SuperadminRepository (receives supabaseAdmin — service_role)
```

### 3.2 Provision Flow (`provisionMunicipality` — POST, line 18–91)

```
1. Validate required fields:
   official_name, official_email, head_name, head_email

2. Check head_email uniqueness in profiles table

3. Generate temp password: crypto.randomBytes(6).toString("hex")

4. INSERT into municipalities table (via service.registerNewMunicipality)
   └─► Returns { m_uid, ... }

5. Create head user via auth service:
   └─► createUserService({ email, password, full_name, role: "municipality_head",
                           municipality_id: newMuni.m_uid })

6. Wait 500ms (for DB trigger) then fetch profile_id by head_email

7. UPDATE municipalities SET head_profile_id = ... WHERE m_uid = ...

8. Return { ...newMuni, head_password }

⚠️ Rollback: If step 5 fails, the municipality is deleted (step 82)
```

### 3.3 Repository Layer (Supabase Queries)

| Method | Query | Purpose |
|--------|-------|---------|
| `getMacroAnalytics()` | `SELECT * FROM v_superadmin_analytics` | Dashboard KPIs |
| `createMunicipality()` | `INSERT INTO municipalities ... .select().single()` | Create municipality |
| `updateMunicipalityHead()` | `UPDATE municipalities SET head_profile_id = ...` | Link head user |
| `checkEmailExists()` | `SELECT id FROM profiles WHERE email = ...` | Prevent duplicates |
| `getProfileIdByEmail()` | Same as above, returns id | Fetch recently created profile |
| `updateUserRole()` | `supabase.rpc("admin_set_user_role", ...)` | Role change via secure RPC |
| `updateAccountStatus()` | `UPDATE profiles SET account_status = ...` | Suspend/reactivate |
| `getAuditLogs()` | `SELECT * FROM audit_logs ORDER BY created_at DESC` | Audit trail |
| `getMunicipalities()` | `SELECT * FROM municipalities ORDER BY registered_at DESC` | List all |
| `deleteMunicipality()` | `DELETE FROM municipalities WHERE m_uid = id` | Remove municipality |

### 3.4 Routes & Middleware

All superadmin routes are protected by two middleware layers:

```
requireAuth(supabase)        — Extracts JWT, validates via supabase.auth.getUser()
requireSuperadminGuard(supabase) — Checks profiles.role === "superadmin"
                                    AND profiles.account_status === "active"
```

**Registered routes:**

| Method | Path | Handler |
|--------|------|---------|
| GET | `/analytics` | `getMetrics` |
| POST | `/municipalities/provision` | `provisionMunicipality` |
| PATCH | `/users/assign-role` | `changeUserRole` |
| PATCH | `/users/manage-status` | `restrictUserAccess` |
| GET | `/audit-logs` | `getSystemAudits` |
| POST | `/users/create` | `createUser` |
| GET | `/municipalities` | `getMunicipalities` |
| DELETE | `/municipalities/:id` | `deleteMunicipality` |

### 3.5 Database Schema — Municipality Row

```typescript
interface MunicipalityRow {
  id: string;                          // UUID
  district_id: string;                 // FK → districts.id
  official_name: string;
  official_email: string;
  official_contact_no: string | null;
  local_level_type: LocalLevelType;    // "metropolitan_city" | "sub_metropolitan_city" | "municipality" | "rural_municipality"
  total_wards: number;
  official_logo: string | null;
  about_description: string | null;
  mayor_chairperson_name: string | null;
  deputy_mayor_vice_chairperson_name: string | null;
  head_profile_id: string | null;      // FK → profiles.id
  head_name: string | null;
  head_email: string | null;
  head_contact_no: string | null;
  is_active: boolean;
  registered_at: string;
  updated_at: string;
}
```

> ⚠️ **Discrepancy:** The `municipalities` DB table uses `district_id` (UUID FK to `districts` table), but the frontend form sends `district: string` (the district **name**). The `provisionMunicipality` controller passes the entire `req.body` to `createMunicipality()`, so the DB insert may fail or store the name string in a non-existent `district` column (not `district_id`). This needs fixing (see improvement plan).

---

## 4. Identified Discrepancies & Gaps

### 4.1 Frontend ↔ Backend Endpoint Mismatch

Frontend `API_ENDPOINTS.SUPERADMIN` defines many endpoints that have **no backend handler**:

| Frontend Endpoint | Backend Exists? | Notes |
|------------------|-----------------|-------|
| `STATS` | ❌ No | Backend has `/analytics` (different path) |
| `USERS` | ❌ No | No `GET /users` handler |
| `USER_BY_ID` | ❌ No | No `GET /users/:id` handler |
| `USER_STATUS` | ❌ No | Backend has `/users/manage-status` (PATCH, different shape) |
| `USER_IMPERSONATE` | ❌ No | No implementation |
| `ADMINS` | ❌ No | No implementation |
| `FEATURE_FLAGS` | ❌ No | No implementation |
| `TOGGLE_FEATURE_FLAG` | ❌ No | No implementation |
| `UPDATE_MUNICIPALITY` | ❌ No | No `PUT /municipalities/:id` handler |

### 4.2 `district_id` vs `district` Column Mismatch

- DB schema: `municipalities.district_id` (UUID FK → `districts.id`)
- Frontend sends: `district: "Kathmandu"` (string name)
- Backend: passes raw `req.body` to `createMunicipality()`
- **Result:** Likely a runtime error or silent mis-insertion

### 4.3 500ms Sleep in Provision Flow

At `superadmin.controller.ts:73`:
```typescript
await new Promise(resolve => setTimeout(resolve, 500));
```
This is brittle. A better approach: return the `m_uid` from the municipality insert, then create the user with `municipality_id` already set, and use a `returning` clause or a direct query to get the profile ID after user creation.

### 4.4 No Edit Functionality

- The edit `IconButton` in the table (line 322) has no `onClick` handler
- There is no `PUT /municipalities/:id` endpoint
- Superadmins currently cannot update municipality details

### 4.5 Hardcoded Province/District Duplication

`PROVINCES` and `DISTRICTS_BY_PROVINCE` are hardcoded in the component. The same data could be derived from `nepal-municipalities.ts` to avoid duplication.

---

## 5. Improvement Plan

### Phase 1 — Critical Fixes (Must Do)

| # | Task | Description | Files |
|---|------|-------------|-------|
| 1.1 | **Fix district insert** | Map `district` (name) → `district_id` (UUID) before DB insert by querying the `districts` table; or add a `district_name` column to municipalities | `superadmin.controller.ts`, `superadmin.repository.ts` |
| 1.2 | **Remove 500ms sleep** | Create the `profile` within the same transaction or use a RETURNING clause from the auth service to get `profile_id` directly | `superadmin.controller.ts`, auth service |
| 1.3 | **Add backend UPDATE endpoint** | `PUT /municipalities/:id` so the edit button works | `superadmin.routes.ts`, `superadmin.controller.ts`, `superadmin.services.ts`, `superadmin.repository.ts` |

### Phase 2 — Enhancements (Should Do)

| # | Task | Description | Files |
|---|------|-------------|-------|
| 2.1 | **Wire edit button** | Add `handleEdit` that opens a pre-filled modal with the same cascading selects + extra fields (contact_no, mayor, deputy_mayor, logo, description) | `ManageMuniciple.tsx` |
| 2.2 | **Add missing CRUD fields** | Add `official_contact_no`, `official_logo` (URL upload), `about_description`, `mayor_chairperson_name`, `deputy_mayor_vice_chairperson_name` to the provision/edit form | `ManageMuniciple.tsx`, `superadmin.controller.ts` |
| 2.3 | **Derive province/district from data** | Auto-generate `PROVINCES` and `DISTRICTS_BY_PROVINCE` from `nepal-municipalities.ts` to eliminate hardcoded duplication | `ManageMuniciple.tsx` |
| 2.4 | **Add form validation** | Add frontend validation (email format, required fields highlight, min total_wards=1) | `ManageMuniciple.tsx` |
| 2.5 | **Add pagination/filter to table** | Add search bar, province/district filter, and pagination for the municipality list table | `ManageMuniciple.tsx` |

### Phase 3 — Strategic Improvements (Nice to Have)

| # | Task | Description | Files |
|---|------|-------------|-------|
| 3.1 | **Implement missing frontend endpoints** | Add actual backend handlers for `STATS`, `USERS`, `FEATURE_FLAGS` etc. or remove them from the frontend if unused | Both |
| 3.2 | **Add bulk operations** | Bulk activate/deactivate municipalities, export as CSV | Both |
| 3.3 | **Add activity log per municipality** | Show audit trail entries filtered by `municipality_id` in the table or a detail panel | `superadmin.controller.ts`, `ManageMuniciple.tsx` |
| 3.4 | **Add municipality detail page** | A dedicated page showing wards, departments, staff, and complaints for a specific municipality | Frontend |
| 3.5 | **Add ward provisioning** | When creating a municipality, auto-create N ward entries (1 per `total_wards`) | `superadmin.controller.ts`, `superadmin.repository.ts` |
| 3.6 | **Add image upload for logo** | Integrate with Supabase Storage or a CDN for municipality logos | Both |

### Phase 4 — Technical Debt

| # | Task | Description |
|---|------|-------------|
| 4.1 | **Align API paths** | Decide whether backend should match the frontend endpoint names (e.g., `/analytics` vs `/stats`) or vice versa — then update one to match the other |
| 4.2 | **Add proper error types** | Create a shared error-handling middleware instead of inline try/catch in every controller method |
| 4.3 | **Add input sanitization/validation** | Use Zod or Joi schemas on the backend for request body validation |
| 4.4 | **Add unit tests** | Test the provision flow, cascading selects, and rollback logic |

---

## 6. How Data Flows (End-to-End Example)

### Provisioning "Kathmandu Metropolitan City"

```
1. User selects:
   Province: "Bagmati"
   District: "Kathmandu"
   Type: "metropolitan_city"
   Name: "Kathmandu"

2. Frontend POSTs to /api/superadmin/municipalities/provision:
   {
     "official_name": "Kathmandu",
     "district": "Kathmandu",
     "province": "Bagmati",
     "official_email": "info@kathmandu.gov.np",
     "head_name": "Admin Name",
     "head_email": "admin@kathmandu.gov.np",
     "total_wards": 32,
     "municipality_type": "metropolitan_city"
   }

3. Backend:
   a. Validates required fields
   b. Checks head_email is unique
   c. Generates password "a1b2c3d4e5f6"
   d. INSERTs into municipalities → gets m_uid
   e. Creates Supabase Auth user with municipality_head role
   f. Waits 500ms
   g. Fetches profile.id by head_email
   h. UPDATEs municipalities SET head_profile_id = profile.id

4. Response:
   {
     "success": true,
     "data": {
       "m_uid": "uuid-...",
       "official_name": "Kathmandu",
       "head_password": "a1b2c3d4e5f6",
       ...
     }
   }

5. Frontend shows success dialog with email + temp password
```

---

## 7. Database Table Relationships

```
provinces (id, name, capital)
    │
    │ 1:N
    ▼
districts (id, province_id, name)
    │
    │ 1:N
    ▼
municipalities (id, district_id, official_name, local_level_type, ...)
    │
    │ 1:N
    ├── wards (id, municipality_id, ward_no, ...)
    ├── departments (id, municipality_id, department_name, ...)
    ├── profiles (id, municipality_id, role, ...)     ← head_profile_id links here
    └── complaints (id, municipality_id, ...)
```

---

## 8. How to Test Locally

```bash
# Backend
cd Smart_Civic_Platform_Backend
npm run dev          # Starts on localhost:3000

# Frontend
cd Smart_Civic_Platform_Frontend
npm run dev          # Starts on localhost:5173
```

Check Swagger docs: http://localhost:3000/api/docs
