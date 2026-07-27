# Plan: Superadmin Municipality Management — Full CRUD + Ward Auto-Provisioning

## Goal
Fix the complete municipality management flow for the Superadmin role — from seeding reference data (provinces, districts) to provisioning, listing, editing, and deleting municipalities with proper DB schema alignment and ward auto-creation.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│  FRONTEND (ManageMuniciple.tsx)                                  │
│  Role: superadmin                                                │
│    │                                                             │
│    │  fetchWithAuth() ──── JWT ────►  Express Router             │
│    │                                      │                      │
│    │  POST   /api/superadmin/municipalities/provision            │
│    │  GET    /api/superadmin/municipalities                      │
│    │  PUT    /api/superadmin/municipalities/:id                  │
│    │  DELETE /api/superadmin/municipalities/:id                  │
│    │                                                             │
│  Local data files:                                               │
│  ├── src/data/nepal-provinces.ts     ─── Province/District lists │
│  └── src/data/nepal-municipalities.ts ─── Municipality lists     │
└──────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│  BACKEND (Express)                                               │
│  Mounted at: /api/superadmin                                     │
│                                                                  │
│  Middleware: requireAuth → requireSuperadminGuard                │
│                                                                  │
│  Controller → Service → Repository → Supabase (service_role)     │
│                                                                  │
│  Reference data endpoints (NEW):                                 │
│  ├── GET /provinces     ─── List all provinces from DB           │
│  └── GET /districts?province_id= ─── List districts by province  │
└──────────────────────────────────────────────────────────────────┘
                          │
                          ▼
          ┌──────────────────────────────────────────┐
          │  SUPABASE (PostgreSQL)                    │
          │  ┌────────────────────────────────────┐  │
          │  │ provinces (seeded via SQL)          │  │
          │  │ districts (seeded via SQL)          │  │
          │  │ municipalities (provisioned here)   │  │
          │  │ wards (auto-created on provision)   │  │
          │  │ profiles (municipality_head user)   │  │
          │  │ audit_logs                          │  │
          │  └────────────────────────────────────┘  │
          └──────────────────────────────────────────┘
```

---

## Current State — Problems Found

### P1 🔴 `district` string sent but DB expects `district_id` UUID

| Layer | What it sends/expects |
|-------|----------------------|
| `ManageMuniciple.tsx` | `district: "Kathmandu"` (string name) |
| `superadmin.controller.ts` | Passes `district: "Kathmandu"` → `INSERT INTO municipalities` |
| DB `municipalities` table | Column is `district_id UUID NOT NULL REFERENCES districts(id)` |

**Result:** INSERT fails because `"Kathmandu"` cannot coerce to UUID.

### P2 🔴 `province` column doesn't exist

Frontend sends `province: "Bagmati"` but the `municipalities` table has **no `province` column**. The DB stores province data in a separate `provinces` table linked via `provinces.id ← districts.province_id`.

### P3 🔴 Column naming mismatch — `m_uid` vs `id`

The SQL schema and `MunicipalityRow` type define the PK as `id`, but:

| Location | Uses | Should use |
|----------|------|------------|
| `superadmin.repository.ts` | `.eq("m_uid", ...)` | `.eq("id", ...)` |
| `superadmin.controller.ts` | `newMuni.m_uid` | `newMuni.id` |
| Frontend `Municipality` interface | `m_uid: string` | `id: string` |
| Frontend table rendering | `row.m_uid` | `row.id` |

### P4 🔴 `municipality_type` sent but DB column is `local_level_type`

Frontend sends `municipality_type: "metropolitan_city"` but the DB column is `local_level_type`. The value is the same enum, but the key name is wrong.

### P5 🟡 Duplicate static reference data (4 files, 2 formats)

| File | Contents | Used by |
|------|----------|---------|
| `data/lists/provinces.ts` | `{ id, name, districts[] }` | `CitizenRegister.tsx` |
| `data/lists/municipalities.ts` | `Record<string, {name, type}[]>` | `CitizenRegister.tsx` |
| `src/data/nepal-provinces.ts` | `string[]` + `DISTRICTS_BY_PROVINCE` | `ManageMuniciple.tsx` |
| `src/data/nepal-municipalities.ts` | Same format as above | `ManageMuniciple.tsx` |

The DB already has provinces + districts seeded (from `Supabase_Schema.sql` lines 885-927), but the frontend duplicates them locally instead of querying the DB.

### P6 🟡 No ward auto-creation

Frontend sends `total_wards: 32` but **zero** ward rows are inserted into the `wards` table. The municipality row just stores the number as metadata.

### P7 🟡 Edit modal doesn't pre-fill `local_level_type`

`openEditModal()` reads `municipality_type` instead of `local_level_type`, and the existing row from the API may not have this field at all (since the GET response doesn't match the DB schema).

### P8 🟢 Frontend `Municipality` interface doesn't match DB

```typescript
// Frontend interface (incorrect)
interface Municipality {
  m_uid: string;           // should be id
  district: string;        // should not exist as text
  province: string;        // should not exist
  ...
}

// DB schema (actual)
MunicipalityRow {
  id: string;
  district_id: string;     // UUID FK
  local_level_type: LocalLevelType;
  ...
}
```

---

## Fix Plan — 4 Phases

### Phase 1 — Seed Reference Data & Add Read Endpoints

| # | Task | Files | Description |
|---|------|-------|-------------|
| 1.1 | **Seed provinces & districts from local data** | `supabase/seed-reference.sql` (NEW) | Run a one-time SQL script that inserts provinces and districts using the names from `nepal-provinces.ts`. Skip if already seeded (idempotent). |
| 1.2 | **Add GET /provinces endpoint** | `superadmin.controller.ts`, `superadmin.services.ts`, `superadmin.repository.ts`, `superadmin.routes.ts` | Returns all provinces from DB `provinces` table. This lets frontend stop hardcoding province lists. |
| 1.3 | **Add GET /districts endpoint** | Same files as 1.2 | Accepts optional `?province_id=` query param. Returns districts from DB `districts` table. |
| 1.4 | **Consolidate duplicate frontend data files** | `data/lists/provinces.ts`, `src/data/nepal-provinces.ts` | Keep one canonical source. Either delete the duplicates or have one re-export the other. |

### Phase 2 — Fix Backend Municipality CRUD

| # | Task | Files | Description |
|---|------|-------|-------------|
| 2.1 | **Fix `district_name` → `district_id` resolution** | `superadmin.controller.ts` | Query `districts` table by name to get `district_id` UUID. Build proper `muniPayload` with correct column names. |
| 2.2 | **Fix column names in payload** | `superadmin.controller.ts` | Use proper DB column names: `district_id` (not district), `local_level_type` (not municipality_type). Remove `province`. |
| 2.3 | **Fix `m_uid` → `id` in repository** | `superadmin.repository.ts` | Change all `.eq("m_uid", ...)` → `.eq("id", ...)` |
| 2.4 | **Fix `m_uid` → `id` in controller** | `superadmin.controller.ts` | Use `newMuni.id` instead of `newMuni.m_uid` |
| 2.5 | **Fix `m_uid` → `id` in provision flow** | `superadmin.controller.ts` | The `rollback` code and `updateMunicipalityHead` call use `newMuni.m_uid` |

### Phase 3 — Fix Frontend ManageMuniciple.tsx

| # | Task | Files | Description |
|---|------|-------|-------------|
| 3.1 | **Fix `Municipality` interface to match DB** | `ManageMuniciple.tsx` | Change `m_uid` → `id`, `district: string` → `district_id?: string`, `province` → remove, add `local_level_type` |
| 3.2 | **Fix table rendering to use proper fields** | `ManageMuniciple.tsx` | Derive `district` and `province` display names from `district_id` via lookup (either from DB or local map). Or join data on backend. |
| 3.3 | **Fix create modal payload** | `ManageMuniciple.tsx` | Send `district_name` (the name string) instead of trying to send UUID — backend will resolve it. Rename `municipality_type` → `local_level_type`. Remove `province` from body. |
| 3.4 | **Fix edit modal pre-fill** | `ManageMuniciple.tsx` | Use correct field names when pre-filling form data for edit mode. |
| 3.5 | **Refetch on edit success** | `ManageMuniciple.tsx` | After edit, re-fetch the full list instead of doing local state mutation (ensures consistency). |

### Phase 4 — Ward Auto-Creation

| # | Task | Files | Description |
|---|------|-------|-------------|
| 4.1 | **Add ward auto-creation on provision** | `superadmin.controller.ts` (after municipality insert) | Loop `i = 1` to `total_wards`, INSERT rows into `wards` table with `municipality_id` and `ward_no`. |
| 4.2 | **Add `getWards` endpoint** | `superadmin.controller.ts`, etc. | GET `/:municipalityId/wards` — returns wards for a municipality (useful for listing during provision success display). |

---

## Detailed Implementation

### Phase 2.1 — Fix `district_name` → `district_id` Resolution

In `superadmin.controller.ts::provisionMunicipality`:

```typescript
// After destructuring req.body:
const { district, province, ...rest } = req.body;

// Resolve district name → district_id
const { data: districtRow, error: districtErr } = await this.service
  .resolveDistrictByName(district);
if (districtErr || !districtRow) {
  res.status(400).json({ success: false, error: `District "${district}" not found in database.` });
  return;
}

// Build proper payload matching DB columns
const muniPayload = {
  district_id: districtRow.id,
  official_name,
  official_email,
  local_level_type: municipality_type,    // rename: municipality_type → local_level_type
  total_wards: total_wards || 1,
  head_name,
  head_email,
  official_contact_no: official_contact_no || null,
  mayor_chairperson_name: mayor_chairperson_name || null,
  deputy_mayor_vice_chairperson_name: deputy_mayor_vice_chairperson_name || null,
  about_description: about_description || null,
};

const newMuni = await this.service.registerNewMunicipality(muniPayload);
// newMuni.id (not newMuni.m_uid)
```

In `superadmin.repository.ts`, add a new method:

```typescript
async getDistrictByName(name: string): Promise<DistrictRow | null> {
  const { data, error } = await this.supabaseAdmin
    .from("districts")
    .select("*")
    .eq("name", name)
    .maybeSingle();
  if (error) throw error;
  return data;
}
```

### Phase 2.3 — Fix `m_uid` → `id` in Repository

All repository methods that reference `m_uid` must change to `id`:

| Method | Current | Fixed |
|--------|---------|-------|
| `getMunicipalityById` | `.eq("m_uid", id)` | `.eq("id", id)` |
| `updateMunicipality` | `.eq("m_uid", id)` | `.eq("id", id)` |
| `deleteMunicipality` | `.eq("m_uid", id)` | `.eq("id", id)` |
| `updateMunicipalityHead` | `.eq("m_uid", m_uid)` | `.eq("id", m_uid)` |
| `updateUserRole` | (uses RPC, fine) | — |
| `createMunicipality` | (insert with select → returns `id`) | working if payload is correct |

### Phase 4.1 — Ward Auto-Creation

In `superadmin.controller.ts`, after the municipality is successfully inserted:

```typescript
// Auto-create wards
const wards = [];
for (let i = 1; i <= total_wards; i++) {
  wards.push({
    municipality_id: newMuni.id,
    ward_no: i,
  });
}

// Batch insert all wards
const { error: wardsErr } = await this.service
  .getRepository()
  .from("wards")
  .insert(wards);

if (wardsErr) {
  console.error("Ward creation failed:", wardsErr);
  // Don't rollback — municipality already created
}
```

### Frontend — Fix `Municipality` Interface

```typescript
interface Municipality {
  id: string;                  // was m_uid
  district_id: string;         // was district (string name)
  official_name: string;
  official_email: string;
  local_level_type: string;    // was municipality_type
  total_wards: number;
  head_name: string | null;
  head_email: string | null;
  is_active: boolean;
  registered_at: string;
  // Computed display fields (from lookup or API response):
  district_name?: string;
  province_name?: string;
}
```

---

## Complete File Change Summary

| File | Phase | Change |
|------|-------|--------|
| **`supabase/seed-reference.sql`** | 1.1 | NEW — Idempotent seed script for provinces + districts from local data files |
| **`superadmin.repository.ts`** | 1.2, 1.3, 2.3 | Add `getProvinces()`, `getDistricts()`, `getDistrictByName()`; fix `m_uid` → `id` |
| **`superadmin.services.ts`** | 1.2, 1.3, 2.1 | Add passthrough methods for new repo methods |
| **`superadmin.controller.ts`** | 1.2, 1.3, 2.1, 2.2, 2.4, 2.5, 4.1 | Add `getProvinces`, `getDistricts` handlers; rewrite `provisionMunicipality` with proper column mapping + district resolution + ward auto-creation; fix `m_uid` → `id` |
| **`superadmin.routes.ts`** | 1.2, 1.3 | Add GET `/provinces`, GET `/districts` routes |
| **`ManageMuniciple.tsx`** | 3.1–3.5 | Fix interface, table rendering, create modal payload, edit modal pre-fill, refetch on edit |
| **`nepal-provinces.ts`** | 1.4 | Keep as canonical or delete if DB-backed endpoints replace it |
| **`nepal-municipalities.ts`** | 1.4 | Keep as reference for municipality list in create/select dropdowns |

---

## End-to-End Data Flow (After Fix)

### Provisioning "Kathmandu Metropolitan City"

```
1. Superadmin fills form:
   Province: "Bagmati" (from DB-backed dropdown)
   District: "Kathmandu" (from DB-backed dropdown)
   Type: "metropolitan_city"
   Name: "Kathmandu"
   total_wards: 32
   ...

2. Frontend POST /api/superadmin/municipalities/provision:
   {
     official_name: "Kathmandu",
     district: "Kathmandu",          // string name — backend resolves
     municipality_type: "metropolitan_city",
     official_email: "info@kathmandu.gov.np",
     head_name: "Admin Name",
     head_email: "admin@kathmandu.gov.np",
     total_wards: 32,
     official_contact_no: "...",
     mayor_chairperson_name: "...",
     deputy_mayor_vice_chairperson_name: "...",
     about_description: "..."
   }

3. Backend:
   a. Resolves "Kathmandu" → district_id via districts table lookup
   b. Builds payload with correct columns:
      { district_id: "uuid", local_level_type: "metropolitan_city", ... }
   c. INSERT INTO municipalities → returns { id, ... }
   d. Creates auth user via createUserService
   e. UPDATE municipalities SET head_profile_id = profile.id
   f. Auto-creates 32 ward rows in `wards` table
   g. Returns { id, official_name, head_password, ... }

4. Frontend:
   a. Shows success dialog with temp password
   b. Municipality appears in table with province/district resolved via display lookup
```

---

## Database Schema Reference (for debugging)

```sql
-- Relevant columns of municipalities table
id              UUID PRIMARY KEY
district_id     UUID NOT NULL REFERENCES districts(id)
official_name   TEXT NOT NULL
official_email  TEXT NOT NULL UNIQUE
local_level_type local_level_type NOT NULL DEFAULT 'municipality'
total_wards     INTEGER NOT NULL DEFAULT 1
head_profile_id UUID REFERENCES profiles(id)
head_name       TEXT
head_email      TEXT
official_contact_no TEXT
mayor_chairperson_name TEXT
deputy_mayor_vice_chairperson_name TEXT
about_description TEXT
is_active       BOOLEAN NOT NULL DEFAULT TRUE
registered_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

---

## Test Checklist

- [ ] Seed provinces & districts → verify DB has 7 provinces, 77 districts
- [ ] GET /provinces returns correct list
- [ ] GET /districts?province_id= returns correct districts
- [ ] Create municipality with valid data:
  - [ ] District name resolves to UUID
  - [ ] Municipality inserted with `local_level_type`, `district_id`
  - [ ] Head user created with `municipality_head` role
  - [ ] `head_profile_id` linked to municipality
  - [ ] N ward rows created (N = total_wards)
  - [ ] Temp password returned
- [ ] Create municipality with invalid district name → 400 error
- [ ] Create municipality with duplicate head_email → 400 error
- [ ] List municipalities → correct data returned
- [ ] Edit municipality → fields updated correctly
- [ ] Delete municipality → cascades properly (head user, profile, municipality)
- [ ] Frontend table shows province/district as display names, not UUIDs
