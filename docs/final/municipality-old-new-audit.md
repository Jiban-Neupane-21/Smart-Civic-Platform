# Municipality Creation — Old Code vs New Code Audit & Plan

> Based on `docs/PLAN-50-Phases-Municipality-creation.md` (original) and `supabase/Supabase_Schema.sql`

---

## 1. Current Issues Found (From Code Review)

### 🔴 CRITICAL — Blocks All CRUD

| # | Issue | File | Line(s) | Detail |
|---|-------|------|---------|--------|
| 1 | `.eq("m_uid", ...)` — column does NOT exist | `superadmin.repository.ts` | 38, 125, 153, 166 | Schema PK is `id`, not `m_uid`. All queries silently return null/error |
| 2 | `provisionMunicipality` INSERTs new row | `superadmin.controller.ts` | 61-77 | Old flow creates new municipality. New flow should SELECT pre-seeded + UPDATE |
| 3 | Views NOT registered in `database.type.ts` | `database.type.ts` | 538-540 | `Views` section is `[_ in never]: never` — can't query views with types |
| 4 | `v_superadmin_analytics` missing from schema | `superadmin.repository.ts` | 11-18 | `getMacroAnalytics()` queries this view but it doesn't exist in Supabase_Schema.sql |

### 🟡 HIGH — Needs Fixing

| # | Issue | File | Line(s) | Detail |
|---|-------|------|---------|--------|
| 5 | `AccountStatus` type mismatches DB enum | `database.type.ts` | 12 | TS: `"active"\|"inactive"\|"suspended"`, DB: `onboarding_status` = `'invited'\|'pending_onboarding'\|'active'\|'expired'\|'suspended'` |
| 6 | No reference data endpoints | — | — | Missing: provinces, districts, reference municipalities, detail, wards |
| 7 | `getMunicipalities()` flat — no JOINs | `superadmin.repository.ts` | 110-117 | Returns raw rows without province_name, district_name |
| 8 | No ward auto-creation on activation | — | — | After activating municipality, wards 1..total_wards must be inserted |
| 9 | `official_email UNIQUE` blocks seeding | Schema | 86 | Pre-seeded municipalities need unique official_email values |
| 10 | Route prefix inconsistent | `index.ts` | 135 | Mounted at `/api/superadmin`, plan says `/api/v1/superadmin` |

---

## 2. Old Code (Current State) — Full API & Implementation Details

### 2.1 Database Layer

#### Table: `municipalities` (from Supabase_Schema.sql)
```sql
id UUID PK,
district_id UUID FK → districts(id),
official_name TEXT NOT NULL,
official_email TEXT NOT NULL UNIQUE,
official_contact_no TEXT,
local_level_type local_level_type NOT NULL DEFAULT 'municipality',
total_wards INTEGER NOT NULL DEFAULT 1,
head_profile_id UUID,
head_name TEXT, head_email TEXT, head_contact_no TEXT,
is_active BOOLEAN NOT NULL DEFAULT FALSE,
registered_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
```

### 2.2 Repository (`superadmin.repository.ts`)

#### `createMunicipality(muniData)`
```typescript
// Line 22-31 — OLD: INSERT new row
async createMunicipality(muniData: Record<string, any>) {
  const { data, error } = await this.supabaseAdmin
    .from("municipalities")
    .insert([muniData])
    .select()
    .single();
  if (error) throw error;
  return data;
}
```
**Issue:** Uses `district` and `province` as plain strings from old controller, not `district_id` UUID.

#### `updateMunicipalityHead(m_uid, profile_id)` — ❌ BROKEN
```typescript
// Line 34-44 — Uses .eq("m_uid", m_uid) — column doesn't exist!
await this.supabaseAdmin
  .from("municipalities")
  .update({ head_profile_id: profile_id })
  .eq("m_uid", m_uid)       // <-- BUG: should be .eq("id", m_uid)
  .select()
  .single();
```

#### `getMunicipalities()` — ❌ No JOINs
```typescript
// Line 110-117 — Flat select, no province_name or district_name
await this.supabaseAdmin
  .from("municipalities")
  .select("*")
  .order("registered_at", { ascending: false });
```

#### `getMunicipalityById(id)` — ❌ BROKEN
```typescript
// Line 121-129 — Uses .eq("m_uid", id) — column doesn't exist!
await this.supabaseAdmin
  .from("municipalities")
  .select("*")
  .eq("m_uid", id)    // <-- BUG: should be .eq("id", id)
  .single();
```

#### `updateMunicipality(id, data)` — ❌ BROKEN
```typescript
// Line 149-158 — Uses .eq("m_uid", id) — column doesn't exist!
await this.supabaseAdmin
  .from("municipalities")
  .update(data)
  .eq("m_uid", id)    // <-- BUG: should be .eq("id", id)
  .select()
  .single();
```

#### `deleteMunicipality(id)` — ❌ BROKEN
```typescript
// Line 162-172 — Uses .eq("m_uid", id) — column doesn't exist!
await this.supabaseAdmin
  .from("municipalities")
  .delete()
  .eq("m_uid", id)    // <-- BUG: should be .eq("id", id)
  .select()
  .single();
```

#### `getMacroAnalytics()` — ❌ MISSING VIEW
```typescript
// Line 11-18 — Queries v_superadmin_analytics which doesn't exist in schema
await this.supabaseAdmin
  .from("v_superadmin_analytics")
  .select("*")
  .single();
// This view is NOT created anywhere in Supabase_Schema.sql
```

### 2.3 Service (`superadmin.services.ts`)

Simple passthrough layer (lines 1-112). No business logic. All 11 methods just call `this.repo.method()` wrapped in try/catch.

### 2.4 Controller (`superadmin.controller.ts`)

#### `POST provisionMunicipality` — ❌ WRONG ARCHITECTURE
```typescript
// Line 18-105
// Accepts: official_name, official_email, district (string), province (string), ...
// Flow:
//   1. Check email not exists
//   2. Generate random password
//   3. Build payload with { district: "Kathmandu", province: "Bagmati" } (strings!)
//   4. INSERT new municipality (creates row)
//   5. createUserService → creates auth user
//   6. updateMunicipalityHead → links head_profile_id
//   7. Return newMuni (which has no m_uid because column doesn't exist)
```
**Issues:**
- Creates NEW municipality instead of selecting pre-seeded
- Uses string names for district/province, not UUID FKs
- Calls `updateMunicipalityHead` with `newMuni.m_uid` — will be undefined
- No ward auto-creation

#### `GET getMunicipalities` — ❌ NO JOIN DATA
Returns flat rows without province_name, district_name.

#### `DELETE deleteMunicipality(id)` — ❌ BROKEN
Fetches municipality by `m_uid`, tries to delete profile, then delete municipality. All `m_uid` queries silently fail.

### 2.5 Routes (`superadmin.routes.ts`)

| Method | Path | Handler | Status |
|--------|------|---------|--------|
| GET | `/analytics` | `getMetrics` | ❌ Missing view |
| POST | `/municipalities/provision` | `provisionMunicipality` | ❌ Wrong flow |
| PATCH | `/users/assign-role` | `changeUserRole` | ✅ OK |
| PATCH | `/users/manage-status` | `restrictUserAccess` | ✅ OK |
| GET | `/audit-logs` | `getSystemAudits` | ✅ OK |
| POST | `/users/create` | `createUser` | ✅ OK |
| GET | `/municipalities` | `getMunicipalities` | ❌ No JOINs |
| PUT | `/municipalities/:id` | `updateMunicipality` | ❌ Broken (`m_uid`) |
| DELETE | `/municipalities/:id` | `deleteMunicipality` | ❌ Broken (`m_uid`) |

### 2.6 `app.ts` Route Mounting
```typescript
// Line 135: Mounted at /api/superadmin (NO v1 prefix)
app.use("/api/superadmin", superadminRouter);
// Actual routes become: /api/superadmin/municipalities/provision (etc.)
```

### 2.7 Current Data Flow Diagram
```
Frontend (static nepal-municipalities.ts)
  → POST /api/superadmin/municipalities/provision
  → Body: { official_name, official_email, district: "Kathmandu", province: "Bagmati", ... }
  → Controller builds payload with string district/province
  → Repository: INSERT INTO municipalities (...)           ← Creates NEW row
  → Repository: .eq("m_uid", result.m_uid)                 ← BROKEN — column doesn't exist
  → Auth: createUserService → auth.users + profiles
  → No wards created
  → Response: { success: true, data: { ... , m_uid: undefined } }
```

---

## 3. New Code (Target State) — Full API & Implementation Specification

### 3.1 Database Layer — Already Matches

Schema already has the correct structure. What's missing:
- **`seed-municipalities.sql`** — Insert all 753 municipalities with `is_active = false`
- **`v_superadmin_analytics`** view — missing from schema
- **Views registered in `database.type.ts`** — currently empty

### 3.2 Repository — Target Methods

```typescript
// ===== FIXED EXISTING METHODS =====

// Fix 1: m_uid → id in ALL methods
async updateMunicipalityHead(id: string, profile_id: string) {
  const { data, error } = await this.supabaseAdmin
    .from("municipalities")
    .update({ head_profile_id: profile_id })
    .eq("id", id)                        // FIXED
    .select()
    .single();
}

async getMunicipalityById(id: string) {
  const { data, error } = await this.supabaseAdmin
    .from("municipalities")
    .select("*")
    .eq("id", id)                        // FIXED
    .single();
}

async updateMunicipality(id: string, data: Record<string, any>) {
  const { data: result, error } = await this.supabaseAdmin
    .from("municipalities")
    .update(data)
    .eq("id", id)                        // FIXED
    .select()
    .single();
}

async deleteMunicipality(id: string) {
  const { data, error } = await this.supabaseAdmin
    .from("municipalities")
    .delete()
    .eq("id", id)                        // FIXED
    .select()
    .single();
}

// Fix 2: Use view for active municipalities
async getMunicipalities() {
  const { data, error } = await this.supabaseAdmin
    .from("v_active_municipalities")     // FIXED: uses view with JOINs
    .select("*")
    .order("official_name");
}

// Fix 3: Fix analytics — create view first
async getMacroAnalytics() {
  // Requires v_superadmin_analytics to be created in schema
  const { data, error } = await this.supabaseAdmin
    .from("v_superadmin_analytics")
    .select("*")
    .single();
}

// ===== NEW METHODS =====

// Phase 6: Get all provinces
async getProvinces(): Promise<ProvinceRow[]> {
  const { data, error } = await this.supabaseAdmin
    .from("provinces")
    .select("*")
    .order("name");
  if (error) throw error;
  return data;
}

// Phase 7: Get districts (optionally filtered by province)
async getDistricts(provinceId?: string): Promise<DistrictRow[]> {
  let query = this.supabaseAdmin
    .from("districts")
    .select("*")
    .order("name");
  if (provinceId) query = query.eq("province_id", provinceId);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// Phase 8: Get municipalities for cascading dropdown
async getReferenceMunicipalities(
  districtId?: string,
  isActive?: boolean
): Promise<any[]> {
  let query = this.supabaseAdmin
    .from("municipalities")
    .select("id, official_name, local_level_type, total_wards, district_id")
    .order("official_name");
  if (districtId) query = query.eq("district_id", districtId);
  if (isActive !== undefined) query = query.eq("is_active", isActive);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// Phase 9: Get municipality detail (using existing view)
async getMunicipalityDetail(id: string) {
  const { data, error } = await this.supabaseAdmin
    .from("v_municipality_detail")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

// Phase 10: Get wards for a municipality
async getWards(municipalityId: string): Promise<WardRow[]> {
  const { data, error } = await this.supabaseAdmin
    .from("wards")
    .select("*")
    .eq("municipality_id", municipalityId)
    .order("ward_no");
  if (error) throw error;
  return data;
}

// Phase 13: Activate municipality (atomic)
async activateMunicipality(
  id: string,
  headProfileId: string,
  headName: string,
  headEmail: string
) {
  const { data, error } = await this.supabaseAdmin
    .from("municipalities")
    .update({
      is_active: true,
      head_profile_id: headProfileId,
      head_name: headName,
      head_email: headEmail,
      registered_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("is_active", false)   // Safety check: only activate if inactive
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Phase 14: Create wards for a municipality
async createWards(municipalityId: string, count: number): Promise<void> {
  const wards = Array.from({ length: count }, (_, i) => ({
    municipality_id: municipalityId,
    ward_no: i + 1,
  }));
  const { error } = await this.supabaseAdmin
    .from("wards")
    .insert(wards);
  if (error) throw error;
}
```

### 3.3 Service — Target Methods

```typescript
export class SuperadminService {
  constructor(private repo: SuperadminRepository) {}

  // ===== FIXED EXISTING =====
  async getDashboardMetrics() { /* same structure, relies on fixed view */ }
  async getAllMunicipalities() { /* relies on fixed v_active_municipalities */ }
  async fetchMunicipalityById(id: string) { /* relies on fixed .eq("id") */ }
  async modifyMunicipality(id: string, data: any) { /* relies on fixed .eq("id") */ }
  async removeMunicipality(id: string) { /* relies on fixed .eq("id") */ }

  // ===== NEW METHODS =====
  async getProvinces() { return this.repo.getProvinces(); }
  async getDistricts(provinceId?: string) { return this.repo.getDistricts(provinceId); }
  async getReferenceMunicipalities(districtId?: string, isActive?: boolean) {
    return this.repo.getReferenceMunicipalities(districtId, isActive);
  }
  async getMunicipalityDetail(id: string) { return this.repo.getMunicipalityDetail(id); }
  async getWards(municipalityId: string) { return this.repo.getWards(municipalityId); }
  async activateMunicipality(id: string, headProfileId: string, headName: string, headEmail: string) {
    return this.repo.activateMunicipality(id, headProfileId, headName, headEmail);
  }
  async createWards(municipalityId: string, count: number) {
    return this.repo.createWards(municipalityId, count);
  }
}
```

### 3.4 Controller — Target `provisionMunicipality`

```typescript
// Phase 11-15: Complete new registration flow
provisionMunicipality = async (req: Request, res: Response): Promise<void> => {
  try {
    const { municipality_id, head_name, head_email, head_password: customPassword } = req.body;

    if (!municipality_id || !head_name || !head_email) {
      res.status(400).json({ success: false, error: "municipality_id, head_name, head_email required." });
      return;
    }

    // Step 1: Verify municipality exists and is inactive
    const municipality = await this.service.fetchMunicipalityById(municipality_id);
    if (!municipality) {
      res.status(404).json({ success: false, error: "Municipality not found." });
      return;
    }
    if (municipality.is_active) {
      res.status(400).json({ success: false, error: "Municipality is already active." });
      return;
    }

    // Step 2: Check if email already in use
    const emailExists = await this.service.checkEmailExists(head_email);
    if (emailExists) {
      res.status(400).json({ success: false, error: "A user with this email already exists." });
      return;
    }

    // Step 3: Generate or use provided password
    const head_password = customPassword || crypto.randomBytes(6).toString("hex");

    // Step 4: Create auth user + profile (via handle_new_user trigger)
    const profile = await createUserService({
      email: head_email,
      password: head_password,
      full_name: head_name,
      role: "municipality_head",
      municipality_id: municipality_id,
      created_by: (req as any).user?.id || "superadmin",
    });

    // Step 5: Activate municipality + link head profile (atomic)
    const activated = await this.service.activateMunicipality(
      municipality_id,
      profile.id,
      head_name,
      head_email
    );

    // Step 6: Auto-create wards
    try {
      await this.service.createWards(municipality_id, municipality.total_wards);
    } catch (wardError: any) {
      console.error("Ward creation warning:", wardError.message);
      // Don't roll back — wards can be created manually
    }

    // Step 7: Return success
    res.status(201).json({
      success: true,
      data: {
        municipality_id,
        official_name: municipality.official_name,
        head_email,
        head_password,
        local_level_type: municipality.local_level_type,
        total_wards: municipality.total_wards,
      },
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
};
```

### 3.5 Controller — New Reference Endpoints

```typescript
// Phase 6
getProvinces = async (req: Request, res: Response): Promise<void> => {
  try {
    const provinces = await this.service.getProvinces();
    res.status(200).json({ success: true, data: provinces });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Phase 7
getDistricts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { province_id } = req.query;
    const districts = await this.service.getDistricts(province_id as string);
    res.status(200).json({ success: true, data: districts });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Phase 8
getReferenceMunicipalities = async (req: Request, res: Response): Promise<void> => {
  try {
    const { district_id, is_active } = req.query;
    const isActiveBool = is_active !== undefined ? is_active === "true" : undefined;
    const municipalities = await this.service.getReferenceMunicipalities(
      district_id as string,
      isActiveBool
    );
    res.status(200).json({ success: true, data: municipalities });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Phase 9
getMunicipalityDetail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const detail = await this.service.getMunicipalityDetail(id);
    res.status(200).json({ success: true, data: detail });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Phase 10
getWards = async (req: Request, res: Response): Promise<void> => {
  try {
    const { municipality_id } = req.params;
    const wards = await this.service.getWards(municipality_id);
    res.status(200).json({ success: true, data: wards });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
```

### 3.6 Routes — Target

```typescript
export function createSuperadminRouter(
  supabaseAdminClient: SupabaseClient,
  controller: SuperadminController,
): Router {
  const router = Router();
  router.use(requireAuth(supabaseAdminClient));
  router.use(requireSuperadminGuard(supabaseAdminClient));

  // === ANALYTICS ===
  router.get("/analytics", controller.getMetrics);

  // === REFERENCE DATA (Phases 6-10) ===
  router.get("/provinces", controller.getProvinces);                          // NEW
  router.get("/districts", controller.getDistricts);                          // NEW
  router.get("/municipalities/reference", controller.getReferenceMunicipalities); // NEW
  router.get("/municipalities/:id/detail", controller.getMunicipalityDetail); // NEW
  router.get("/wards/:municipality_id", controller.getWards);                 // NEW

  // === MUNICIPALITY REGISTRATION (Phase 11-15) ===
  router.post("/municipalities/provision", controller.provisionMunicipality); // REWRITTEN

  // === USER MANAGEMENT ===
  router.patch("/users/assign-role", controller.changeUserRole);
  router.patch("/users/manage-status", controller.restrictUserAccess);
  router.post("/users/create", controller.createUser);

  // === MUNICIPALITY CRUD (Phase 16-20) ===
  router.get("/municipalities", controller.getMunicipalities);                // FIXED (via view)
  router.put("/municipalities/:id", controller.updateMunicipality);           // FIXED (id vs m_uid)
  router.delete("/municipalities/:id", controller.deleteMunicipality);        // FIXED (id vs m_uid)

  // === AUDIT ===
  router.get("/audit-logs", controller.getSystemAudits);

  return router;
}
```

### 3.7 Target API Endpoint Map

| Method | Path | Phase | Description |
|--------|------|-------|-------------|
| GET | `/api/superadmin/provinces` | 6 | List all 7 provinces |
| GET | `/api/superadmin/districts?province_id=` | 7 | List districts (optional filter) |
| GET | `/api/superadmin/municipalities/reference?district_id=&is_active=` | 8 | Cascading dropdown data |
| GET | `/api/superadmin/municipalities/:id/detail` | 9 | Full municipality detail |
| GET | `/api/superadmin/wards/:municipality_id` | 10 | Wards for a municipality |
| POST | `/api/superadmin/municipalities/provision` | 11-15 | Register municipality head |
| GET | `/api/superadmin/municipalities` | 16 | List active municipalities |
| PUT | `/api/superadmin/municipalities/:id` | 16-17 | Update municipality |
| DELETE | `/api/superadmin/municipalities/:id` | 16-17 | Delete municipality |
| GET | `/api/superadmin/analytics` | 41 | Dashboard metrics |
| PATCH | `/api/superadmin/users/assign-role` | 42 | Change user role |
| PATCH | `/api/superadmin/users/manage-status` | 42 | Suspend/reactivate |
| POST | `/api/superadmin/users/create` | 12 | Create municipality_head user |
| GET | `/api/superadmin/audit-logs` | 43 | Audit trail |

### 3.8 Target Data Flow
```
Frontend (API-backed dropdowns)
  Step 1: GET /api/superadmin/provinces → [Province Dropdown]
  Step 2: GET /api/superadmin/districts?province_id=xxx → [District Dropdown]
  Step 3: GET /api/superadmin/municipalities/reference?district_id=xxx&is_active=false → [Muni Dropdown]
  Step 4: POST /api/superadmin/municipalities/provision
  → Body: { municipality_id: "uuid", head_name: "...", head_email: "...", head_password?: "..." }
  → Controller:
      1. SELECT FROM municipalities WHERE id = ? AND is_active = false  (verify exists & inactive)
      2. SELECT FROM profiles WHERE email = ?                            (check duplicate)
      3. supabaseAdmin.auth.admin.createUser()                           (create auth user)
      4. DB trigger handle_new_user → INSERT INTO profiles               (auto-create profile)
      5. UPDATE municipalities SET is_active = true, head_profile_id = ?, ... (activate)
      6. INSERT INTO wards (ward_no: 1..total_wards)                     (auto-create wards)
  → Response: { success: true, data: { municipality_id, official_name, head_email, head_password } }
```

---

## 4. Implementation Plan (4 Sprints)

### Sprint 1 — Schema & Data Fixes
| Step | Task | Files |
|------|------|-------|
| 1.1 | Fix `m_uid` → `id` in all 4 repository methods | `superadmin.repository.ts` |
| 1.2 | Create `v_superadmin_analytics` view | `Supabase_Schema.sql` |
| 1.3 | Fix `AccountStatus` type to match DB `onboarding_status` | `database.type.ts` |
| 1.4 | Create `seed-municipalities.sql` with all 753 municipalities | `supabase/seed-municipalities.sql` (NEW) |
| 1.5 | Add view types to `database.type.ts` (Views section) | `database.type.ts` |

### Sprint 2 — Reference Data API
| Step | Task | Files |
|------|------|-------|
| 2.1 | Add `getProvinces()` + `getDistricts()` to repository | `superadmin.repository.ts` |
| 2.2 | Add `getReferenceMunicipalities()` to repository | `superadmin.repository.ts` |
| 2.3 | Add `getMunicipalityDetail()` + `getWards()` to repository | `superadmin.repository.ts` |
| 2.4 | Add service passthrough methods | `superadmin.services.ts` |
| 2.5 | Add controller handlers | `superadmin.controller.ts` |
| 2.6 | Register new routes | `superadmin.routes.ts` |

### Sprint 3 — Registration Flow Rewrite
| Step | Task | Files |
|------|------|-------|
| 3.1 | Rewrite `provisionMunicipality` — accept `municipality_id` | `superadmin.controller.ts` |
| 3.2 | Add `activateMunicipality()` to repository | `superadmin.repository.ts` |
| 3.3 | Add `createWards()` to repository | `superadmin.repository.ts` |
| 3.4 | Wire up full registration flow with rollback | `superadmin.controller.ts` |

### Sprint 4 — Backend Hardening
| Step | Task | Files |
|------|------|-------|
| 4.1 | Fix `getMunicipalities()` to use `v_active_municipalities` | `superadmin.repository.ts` |
| 4.2 | Fix `getMunicipalityById` → use view | `superadmin.repository.ts` |
| 4.3 | Create scope guard middleware for tenant isolation | `middleware/scopeguard.ts` (NEW) |
| 4.4 | Security & input validation audit | All superadmin files |

---

## 5. Summary of Code Changes

| File | Changes |
|------|---------|
| `supabase/Supabase_Schema.sql` | Add `v_superadmin_analytics` view (line ~975) |
| `supabase/seed-municipalities.sql` | **NEW** — 753 municipality inserts |
| `src/types/database.type.ts` | Fix `AccountStatus`, add view types in `Views` section |
| `src/modules/superadmin/middleware/superadmin.repository.ts` | Fix 4× `m_uid`→`id`, add 7 new methods, fix `getMunicipalities` to use view |
| `src/modules/superadmin/services/superadmin.services.ts` | Add 7 passthrough methods |
| `src/modules/superadmin/controller/superadmin.controller.ts` | Rewrite `provisionMunicipality`, add 5 new handlers |
| `src/modules/superadmin/routes/superadmin.routes.ts` | Add 5 new reference routes |

---

## 6. Quick Reference: Old vs New

| Aspect | Old (Current) | New (Target) |
|--------|---------------|--------------|
| **Municipality creation** | INSERT new row | SELECT pre-seeded + UPDATE |
| **Column referenced** | `m_uid` (doesn't exist) | `id` (correct PK) |
| **District/Province** | Plain strings | UUID FK references |
| **Wards** | Not created | Auto-created (1..total_wards) |
| **Reference endpoints** | None | 5 new endpoints |
| **GET /municipalities** | Flat `SELECT *` | Uses `v_active_municipalities` view |
| **Analytics view** | Missing (crashes) | `v_superadmin_analytics` |
| **Provision request** | `{ official_name, district, province, ... }` | `{ municipality_id, head_name, head_email }` |
| **Provision response** | `{ ..., m_uid: undefined }` | `{ municipality_id, official_name, head_email, head_password }` |
| **Route prefix** | `/api/superadmin` | `/api/superadmin` (kept consistent) |
