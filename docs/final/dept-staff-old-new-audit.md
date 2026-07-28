# Department & Staff Management — Old Code vs New Code Audit & Plan

> Based on `docs/PLAN-50-Phases-Dept-Staff.md` and `supabase/Supabase_Schema.sql`

---

## 1. Current Issues Found (From Code Review)

### 🔴 CRITICAL — Blocks Department & Staff CRUD

| # | Issue | File | Line(s) | Detail |
|---|-------|------|---------|--------|
| 1 | `.eq("d_uid", ...)` in 6 repository methods — column doesn't exist | `municipality.repository.ts` | PK is `id`, not `d_uid` |
| 2 | `.eq("d_uid", ...)` in department repository (5 methods) | `department.repository.ts` | 43, 69, 79, 152, 168 | PK is `id`, not `d_uid` |
| 3 | `.eq("m_uid", ...)` in municipality repository | `municipality.repository.ts` | 14, 18 | PK is `id`, not `m_uid` |
| 4 | `.eq("s_uid", ...)` in department repository | `department.repository.ts` | 21, 27, 153, 173, 242 | PK is `id`, not `s_uid` |
| 5 | Middleware reads `.m_uid` from query result | `municipality.middleware.ts` | 50, 66 | Returns undefined `municipalityId` |

### 🟡 HIGH — Missing Functionality

| # | Issue | File | Line(s) | Detail |
|---|-------|------|---------|--------|
| 6 | No staff list/create/update/delete routes under municipality | `municipality.routes.ts` | — | Frontend calls `/staff` endpoints → 404 |
| 7 | `getDepartments()` returns flat rows — no staff_count/complaint_count JOIN | `municipality.repository.ts` | 39-43 | Just `SELECT *` with no aggregations |
| 8 | `getDepartmentById()` broken (`d_uid`) and no JOIN with head profile | `municipality.repository.ts` | 45-51 | No profile name/email in response |
| 9 | Duplicate routes: with AND without `:municipalityId` | `municipality.routes.ts` | 86-92 | Same endpoints registered twice |
| 10 | `provisionDepartment` uses `dept.d_uid` for rollback/linking | `municipality.controller.ts` | 79, 84, 91 | Returns undefined |
| 11 | `getStaffRoster` returns `s_uid` not `id` | `department.repository.ts` | 61-68 | Frontend can't map staff IDs |
| 12 | Edit department doesn't update linked profile (name/email/phone) | `municipality.controller.ts` | 102-109 | Only updates department row |
| 13 | No duplicate name/email validation before department create | `municipality.controller.ts` | 56-94 | Can create duplicates |
| 14 | `getDepartmentStaff` queries `.s_uid` — broken column | `department.repository.ts` | 61-68 | Returns null/undefined |

---

## 2. Old Code (Current State) — Full API & Implementation Details

### 2.1 Database Schema (`departments` + `staff`)

```sql
departments (
    id UUID PK,
    municipality_id UUID FK → municipalities(id) ON DELETE CASCADE,
    department_name TEXT NOT NULL,
    department_category department_category NOT NULL DEFAULT 'other',
    official_email TEXT NOT NULL,
    department_logo TEXT,
    head_profile_id UUID FK → profiles(id) ON DELETE SET NULL,
    head_name TEXT, head_email TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ,
    UNIQUE (municipality_id, department_name)
);

staff (
    id UUID PK,
    profile_id UUID NOT NULL UNIQUE FK → profiles(id) ON DELETE CASCADE,
    municipality_id UUID NOT NULL FK → municipalities(id) ON DELETE CASCADE,
    primary_department_id UUID NOT NULL FK → departments(id) ON DELETE CASCADE,
    employee_id TEXT,
    expertise TEXT, contact_number TEXT,
    gender gender, date_of_birth DATE,
    onboarded_at TIMESTAMPTZ,
    employee_status employee_status NOT NULL DEFAULT 'active',
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    UNIQUE (employee_id, municipality_id)
);
```

### 2.2 Municipality Repository — Broken Methods

#### `getLocalComplaintStats(municipalityId)` — ❌ BROKEN
```typescript
// Line 13-19: Uses .eq("m_uid", municipalityId)
await this.supabaseAdmin
  .from("municipalities")
  .select("m_uid, official_name")
  .eq("m_uid", municipalityId)         // <-- BUG: should be .eq("id", municipalityId)
  .single();
// Return: municipality.m_uid → undefined
```

#### `getDepartments(municipalityId)` — ❌ No JOINs
```typescript
// Line 39-43: Flat select without staff_count or complaint_count
await this.supabaseAdmin
  .from("departments")
  .select("*")
  .eq("municipality_id", municipalityId); // Note: column name IS correct here
```

#### `getDepartmentById(departmentId)` — ❌ BROKEN
```typescript
// Line 45-51: Uses .eq("d_uid", departmentId)
await this.supabaseAdmin
  .from("departments")
  .select("*")
  .eq("d_uid", departmentId)           // <-- BUG: should be .eq("id", departmentId)
  .single();
```

#### `updateDepartment(departmentId, data)` — ❌ BROKEN
```typescript
// Line 69-76: Uses .eq("d_uid", departmentId)
await this.supabaseAdmin
  .from("departments")
  .update(departmentData)
  .eq("d_uid", departmentId)           // <-- BUG: should be .eq("id", departmentId)
  .select()
  .single();
```

#### `deleteDepartment(departmentId)` — ❌ BROKEN
```typescript
// Line 78-83: Uses .eq("d_uid", departmentId)
await this.supabaseAdmin
  .from("departments")
  .delete()
  .eq("d_uid", departmentId)           // <-- BUG: should be .eq("id", departmentId)
```

### 2.3 Municipality Controller — Broken Methods

#### `provisionDepartment` — ❌ USES `d_uid` (WRONG) 6 TIMES
```typescript
// Line 79: refs.dept.d_uid → undefined
department_id: dept.d_uid,             // <-- BUG: should be dept.id
// Line 84: refs.dept.d_uid → undefined
await this.service.updateDepartment(dept.d_uid, {...});  // <-- BUG
// Line 91: refs.dept.d_uid → undefined
await this.service.deleteDepartment(dept.d_uid);          // <-- BUG
```

#### `updateDepartment` — ❌ Doesn't sync profile changes
```typescript
// Line 102-109: Only updates department row
const { head_contact_no, ...cleanBody } = req.body;
const dept = await this.service.updateDepartment(id, cleanBody);
// head_name and head_email changes NOT synced to profiles table
```

#### `deleteDepartment` — ❌ BROKEN (calls broken methods)
```typescript
// Line 119: getDepartmentById uses d_uid → returns undefined/wrong
const department = await this.service.getDepartmentById(id);
```

### 2.4 Municipality Middleware — ❌ BROKEN

```typescript
// Line 50: Selects .m_uid (WRONG column name)
const { data: municipality, error: muniError } = await supabase
  .from("municipalities")
  .select("m_uid")                     // <-- BUG: should be "id"
  .eq("head_profile_id", userId)
  .single();

// Line 66: Sets req.municipalityId = undefined
req.municipalityId = municipality.m_uid;  // <-- BUG: undefined
```

### 2.5 Municipality Routes — ❌ Duplicate + Missing

```typescript
// DUPLICATE ROUTES (registered twice):
router.get("/:municipalityId/departments", controller.getDepartments);
router.get("/departments", controller.getDepartments);           // duplicate fallback
router.post("/:municipalityId/departments", controller.provisionDepartment);
router.post("/departments/create", controller.provisionDepartment); // also registered above
router.patch("/:municipalityId/departments/:id", controller.updateDepartment);
router.patch("/departments/:id", controller.updateDepartment);   // duplicate fallback
router.delete("/:municipalityId/departments/:id", controller.deleteDepartment);
router.delete("/departments/:id", controller.deleteDepartment);  // duplicate fallback

// MISSING ROUTES (nowhere to be found):
// GET  /:municipalityId/staff            ← Not implemented
// POST /:municipalityId/staff            ← Not implemented
// PATCH /:municipalityId/staff/:staffId  ← Not implemented
// DELETE /:municipalityId/staff/:staffId ← Not implemented
```

### 2.6 Department Repository — Broken Methods (5 more)

```typescript
// getDepartmentSummary (line 69):
.eq("d_uid", departmentId)     // <-- BUG

// updateStaffRecord (line 152-153):
.eq("s_uid", staffId)          // <-- BUG (twice!)

// getDepartmentMunicipalityId (line 168):
.eq("d_uid", departmentId)     // <-- BUG

// getDepartmentCategoryAndName (line 176):
.eq("d_uid", departmentId)     // <-- BUG

// getDepartmentStaff (line 63):
.select("s_uid, employee_id, expertise, profiles(full_name, email)")
// s_uid doesn't exist!                                        // <-- BUG

// archiveAndDeleteStaff (line 173):
.eq("s_uid", staffId)          // <-- BUG
// Also selects `s_uid` in the query on line 180

// getDepartmentTeams (line 242):
staff ( s_uid, ... )           // <-- BUG: s_uid doesn't exist
```

### 2.7 Current Department Data Flow Diagram

```
Municipality Head Logged In
  → Middleware: SELECT m_uid FROM municipalities WHERE head_profile_id = ?  ← Returns undefined
  → req.municipalityId = undefined

  POST /api/municipality/departments/create
  → Body: { department_name, official_email, head_name, head_email, department_category? }
  → Creates department row (returns dept with .d_uid = undefined)
  → createUserService with dept.d_uid as department_id → passes undefined
  → updateDepartment(dept.d_uid, {...}) → .eq("d_uid", undefined) → no-op
  → Returns { success: true, data: { ...d_uid: undefined, head_password: "abc123" } }
```

### 2.8 Current Staff Data Flow

```
  GET /api/municipality/:municipalityId/staff  → 404 (no route exists)
  POST /api/municipality/:municipalityId/staff → 404 (no route exists)

  Only option: POST /api/municipality/users/create  (if frontend knows about it)
  → Body: { email, password, full_name, role, department_id }
  → Creates auth user + profile + staff (via trigger)
  → Returns profile data
```

---

## 3. New Code (Target State) — Full API & Implementation Specification

### 3.1 Repository — Target Methods (Fixed)

```typescript
// ===== FIXED: m_uid → id =====
async getLocalComplaintStats(municipalityId: string) {
  const { data: municipality, error: muniError } = await this.supabaseAdmin
    .from("municipalities")
    .select("id, official_name")          // FIXED: m_uid → id
    .eq("id", municipalityId)             // FIXED: m_uid → id
    .single();
  // ...
  return {
    municipality_id: municipality.id,     // FIXED: m_uid → id
    // ...
  };
}

// ===== FIXED: d_uid → id in ALL department methods =====
async getDepartmentById(departmentId: string) {
  const { data, error } = await this.supabaseAdmin
    .from("departments")
    .select(`
      *,
      head_profile:profiles!head_profile_id(full_name, email, phone)
    `)
    .eq("id", departmentId)              // FIXED: d_uid → id
    .single();
}

async updateDepartment(departmentId: string, data: any) {
  const { data: result, error } = await this.supabaseAdmin
    .from("departments")
    .update(data)
    .eq("id", departmentId)              // FIXED: d_uid → id
    .select()
    .single();
}

async deleteDepartment(departmentId: string) {
  const { error } = await this.supabaseAdmin
    .from("departments")
    .delete()
    .eq("id", departmentId);             // FIXED: d_uid → id
}

// ===== IMPROVED: getDepartments with staff_count + complaint_count =====
async getDepartments(municipalityId: string) {
  const { data, error } = await this.supabaseAdmin
    .from("departments")
    .select(`
      *,
      staff_count:staff(count),
      complaint_count:complaints(count)
    `)
    .eq("municipality_id", municipalityId)
    .eq("is_active", true);
  if (error) throw error;
  return data;
}

// ===== NEW: Staff CRUD methods =====
async getStaff(municipalityId: string, departmentId?: string) {
  let query = this.supabaseAdmin
    .from("staff")
    .select(`
      id, employee_id, expertise, employee_status, onboarded_at,
      profile:profiles!profile_id(id, full_name, email, phone, role, account_status),
      department:departments!primary_department_id(id, department_name)
    `)
    .eq("municipality_id", municipalityId)
    .eq("is_deleted", false);
  if (departmentId) query = query.eq("primary_department_id", departmentId);
  const { data, error } = await query.order("onboarded_at", { ascending: false });
  if (error) throw error;
  return data;
}

async updateStaffRecord(staffId: string, municipalityId: string, payload: any) {
  // Fetch staff record first
  const { data: staff, error: fetchErr } = await this.supabaseAdmin
    .from("staff")
    .select("profile_id, primary_department_id")
    .eq("id", staffId)                    // FIXED: s_uid → id
    .eq("municipality_id", municipalityId)
    .single();
  if (fetchErr) throw new Error("Staff not found");

  // Update profile fields
  const profileFields: any = {};
  if (payload.full_name !== undefined) profileFields.full_name = payload.full_name;
  if (payload.email !== undefined) profileFields.email = payload.email;
  if (payload.phone !== undefined) profileFields.phone = payload.phone;
  if (Object.keys(profileFields).length > 0) {
    await this.supabaseAdmin.from("profiles").update(profileFields).eq("id", staff.profile_id);
  }

  // Update staff fields
  const staffFields: any = {};
  if (payload.expertise !== undefined) staffFields.expertise = payload.expertise;
  if (payload.contact_number !== undefined) staffFields.contact_number = payload.contact_number;
  if (payload.employee_status !== undefined) staffFields.employee_status = payload.employee_status;
  if (payload.gender !== undefined) staffFields.gender = payload.gender;
  if (payload.date_of_birth !== undefined) staffFields.date_of_birth = payload.date_of_birth;
  if (Object.keys(staffFields).length > 0) {
    staffFields.updated_at = new Date().toISOString();
    const { data, error } = await this.supabaseAdmin
      .from("staff")
      .update(staffFields)
      .eq("id", staffId)                  // FIXED: s_uid → id
      .eq("municipality_id", municipalityId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  return staff;
}

async archiveAndDeleteStaff(staffId: string, municipalityId: string, deletedBy: string) {
  // Fetch staff + profile for archive
  const { data: staff, error: fetchErr } = await this.supabaseAdmin
    .from("staff")
    .select(`
      id, profile_id, employee_id, expertise, contact_number,
      gender, date_of_birth, personal_address, employee_status,
      primary_department_id, municipality_id,
      profile:profiles!profile_id(full_name, email, phone)
    `)
    .eq("id", staffId)                    // FIXED: s_uid → id
    .eq("municipality_id", municipalityId)
    .single();

  // Archive to deleted_staff
  await this.supabaseAdmin.from("deleted_staff").insert({ ... });

  // Delete auth user (cascade deletes profile + staff)
  await this.supabaseAdmin.auth.admin.deleteUser(staff.profile_id);
}

async updateStaffStatus(staffId: string, municipalityId: string, status: string) {
  const { data: staff } = await this.supabaseAdmin
    .from("staff")
    .select("profile_id")
    .eq("id", staffId)
    .eq("municipality_id", municipalityId)
    .single();

  const { error } = await this.supabaseAdmin
    .from("profiles")
    .update({ account_status: status })
    .eq("id", staff.profile_id);
  if (error) throw error;
}

async resetStaffPassword(staffId: string, municipalityId: string, newPassword: string) {
  const { data: staff } = await this.supabaseAdmin
    .from("staff")
    .select("profile_id")
    .eq("id", staffId)
    .eq("municipality_id", municipalityId)
    .single();

  await this.supabaseAdmin.auth.admin.updateUserById(staff.profile_id, {
    password: newPassword,
  });
  await this.supabaseAdmin
    .from("profiles")
    .update({ force_password_reset: true })
    .eq("id", staff.profile_id);
}
```

### 3.2 Municipality Middleware — Fixed

```typescript
export const verifyMunicipalityHeadContext = (supabase: SupabaseClient) => {
  return async (req: any, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) { /* 401 */ return; }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, account_status")
      .eq("id", userId)
      .single();

    if (profileError || !profile || profile.account_status !== "active" || profile.role !== "municipality_head") {
      res.status(403).json({ success: false, error: "Access Denied" });
      return;
    }

    const { data: municipality, error: muniError } = await supabase
      .from("municipalities")
      .select("id")                          // FIXED: m_uid → id
      .eq("head_profile_id", userId)
      .single();

    if (muniError || !municipality) { /* 403 */ return; }

    req.municipalityId = municipality.id;     // FIXED: m_uid → id
    next();
  };
};
```

### 3.3 Municipality Controller — Target

```typescript
// ===== FIXED: provisionDepartment — uses .id not .d_uid =====
provisionDepartment = async (req: any, res: Response): Promise<void> => {
  try {
    const { department_name, official_email, head_name, head_email, department_category } = req.body;
    if (!department_name || !official_email || !head_name || !head_email) {
      res.status(400).json({ success: false, error: "Missing required fields" });
      return;
    }

    // Check duplicate name within municipality
    const existing = await this.service.getDepartments(req.municipalityId);
    if (existing?.find((d: any) => d.department_name.toLowerCase() === department_name.toLowerCase())) {
      res.status(409).json({ success: false, error: "Department name already exists in this municipality" });
      return;
    }

    const head_password = crypto.randomBytes(6).toString("hex");
    const departmentData = {
      department_name, official_email, head_name, head_email,
      ...(department_category && { department_category }),
      municipality_id: req.municipalityId,
    };

    const dept = await this.service.registerDepartment(req.municipalityId, departmentData);

    try {
      const userProfile = await createUserService({
        email: head_email,
        password: head_password,
        full_name: head_name,
        role: "department_head",
        municipality_id: req.municipalityId,
        department_id: dept.id,                     // FIXED: d_uid → id
        phone: req.body.head_contact_no,
        created_by: req.user?.id || "municipality_head",
      });

      await this.service.updateDepartment(dept.id, {  // FIXED: d_uid → id
        head_profile_id: userProfile.id,
      });

      res.status(201).json({ success: true, data: { ...dept, head_password } });
    } catch (userError: any) {
      await this.service.deleteDepartment(dept.id);   // FIXED: d_uid → id
      throw new Error(`Rolled back: ${userError.message}`);
    }
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// ===== IMPROVED: updateDepartment — syncs profile changes =====
updateDepartment = async (req: any, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { head_contact_no, head_name, head_email, ...deptFields } = req.body;

    // If head_name/head_email changed, also update the linked profile
    if (head_name || head_email || head_contact_no) {
      const dept = await this.service.getDepartmentById(id);
      if (dept?.head_profile_id) {
        const profileUpdate: any = {};
        if (head_name) profileUpdate.full_name = head_name;
        if (head_email) profileUpdate.email = head_email;
        if (head_contact_no) profileUpdate.phone = head_contact_no;
        await this.service.updateProfile(dept.head_profile_id, profileUpdate);
      }
    }

    const dept = await this.service.updateDepartment(id, {
      ...deptFields,
      ...(head_name && { head_name }),
      ...(head_email && { head_email }),
    });
    res.status(200).json({ success: true, data: dept });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// ===== NEW: Staff handlers =====
listStaff = async (req: any, res: Response): Promise<void> => {
  try {
    const { department_id } = req.query;
    const staff = await this.service.getStaff(
      req.municipalityId,
      department_id as string | undefined
    );
    res.status(200).json({ success: true, data: staff });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

createStaff = async (req: any, res: Response): Promise<void> => {
  try {
    const { full_name, email, password, role, department_id } = req.body;
    if (!full_name || !email || !password || !role || !department_id) {
      res.status(400).json({ success: false, error: "Missing required fields" });
      return;
    }
    if (!["staff", "department_head"].includes(role)) {
      res.status(400).json({ success: false, error: "Role must be staff or department_head" });
      return;
    }

    const profile = await createUserService({
      email, password, full_name, role,
      municipality_id: req.municipalityId,
      department_id,
      created_by: req.user.id,
    });

    res.status(201).json({ success: true, data: profile });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
};

updateStaff = async (req: any, res: Response): Promise<void> => {
  try {
    const { staffId } = req.params;
    const updated = await this.service.updateStaff(req.municipalityId, staffId, req.body);
    res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
};

deleteStaff = async (req: any, res: Response): Promise<void> => {
  try {
    const { staffId } = req.params;
    await this.service.archiveAndDeleteStaff(staffId, req.municipalityId, req.user.id);
    res.status(200).json({ success: true, message: "Staff deleted successfully" });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
};

updateStaffStatus = async (req: any, res: Response): Promise<void> => {
  try {
    const { staffId } = req.params;
    const { status } = req.body;
    await this.service.updateStaffAccountStatus(req.municipalityId, staffId, status);
    res.status(200).json({ success: true, message: "Status updated" });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
};

resetStaffPassword = async (req: any, res: Response): Promise<void> => {
  try {
    const { staffId } = req.params;
    const newPassword = crypto.randomBytes(6).toString("hex");
    await this.service.resetStaffPassword(req.municipalityId, staffId, newPassword);
    res.status(200).json({ success: true, data: { new_password: newPassword } });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
};
```

### 3.4 Municipality Routes — Target (Cleaned)

```typescript
export function createMunicipalityRouter(
  supabaseAdminClient: SupabaseClient,
  controller: MunicipalityController,
): Router {
  const router = Router();
  router.use(requireAuth(supabaseAdminClient));

  // Public (within auth): department categories
  router.get("/departments/categories", controller.getDepartmentCategories);

  // Municipality head context required for all below
  router.use(verifyMunicipalityHeadContext(supabaseAdminClient));

  // === ANALYTICS ===
  router.get("/analytics", controller.getAnalytics);

  // === DEPARTMENT CRUD ===
  router.get("/departments", controller.getDepartments);
  router.post("/departments", controller.provisionDepartment);         // was /departments/create
  router.get("/departments/:id", controller.getDepartmentDetail);      // NEW: single dept with join
  router.patch("/departments/:id", controller.updateDepartment);
  router.delete("/departments/:id", controller.deleteDepartment);

  // === STAFF CRUD (NEW — Phase 16-20) ===
  router.get("/staff", controller.listStaff);                          // NEW
  router.post("/staff", controller.createStaff);                       // NEW
  router.patch("/staff/:staffId", controller.updateStaff);             // NEW
  router.delete("/staff/:staffId", controller.deleteStaff);            // NEW
  router.patch("/staff/:staffId/status", controller.updateStaffStatus);     // NEW
  router.post("/staff/:staffId/reset-password", controller.resetStaffPassword); // NEW

  // === DEPARTMENT HEAD REPLACEMENT ===
  router.post("/departments/:id/replace-head", controller.replaceDepartmentHead); // NEW

  // === COMPLAINTS ===
  router.get("/complaints", controller.getComplaints);

  // === LEGACY: User create (keep for backward compat) ===
  router.post("/users/create", controller.createUser);

  return router;
}
```

### 3.5 Target API Endpoint Map (Municipality Module)

| Method | Path | Phase | Description |
|--------|------|-------|-------------|
| GET | `/api/municipality/analytics` | 37 | Dashboard metrics |
| GET | `/api/municipality/departments/categories` | 38 | List department categories |
| GET | `/api/municipality/departments` | 6 | List departments (with counts) |
| POST | `/api/municipality/departments` | 11 | Create department + head |
| GET | `/api/municipality/departments/:id` | 7 | Department detail (with head profile) |
| PATCH | `/api/municipality/departments/:id` | 8 | Update department |
| DELETE | `/api/municipality/departments/:id` | 29 | Delete department + cascade |
| POST | `/api/municipality/departments/:id/replace-head` | 15 | Replace dept head |
| GET | `/api/municipality/staff` | 17 | List staff (optional `?department_id=`) |
| POST | `/api/municipality/staff` | 18 | Create staff/dept_head user |
| PATCH | `/api/municipality/staff/:staffId` | 19 | Update staff |
| DELETE | `/api/municipality/staff/:staffId` | 19 | Delete staff + archive |
| PATCH | `/api/municipality/staff/:staffId/status` | 19 | Update account status |
| POST | `/api/municipality/staff/:staffId/reset-password` | 20 | Reset staff password |
| GET | `/api/municipality/complaints` | 40 | List complaints |
| POST | `/api/municipality/users/create` | 18 | Legacy: create user |

### 3.6 Target Department Data Flow

```
CREATE DEPARTMENT:
  POST /api/municipality/departments
  Headers: Authorization: Bearer <token>
  Body: {
    department_name: "Water Supply Division",
    department_category: "water_supply",
    official_email: "water@lalitpur.gov.np",
    head_name: "Ram Sharma",
    head_email: "ram.sharma@lalitpur.gov.np",
    head_contact_no: "9841234567"
  }
  → Middleware: SELECT id FROM municipalities WHERE head_profile_id = ? → req.municipalityId
  → Controller:
      1. Check duplicate department_name within municipality (409 if exists)
      2. INSERT INTO departments (municipality_id, department_name, ...) → returns dept.id
      3. Create auth user + profile (department_head role) with department_id = dept.id
      4. UPDATE departments SET head_profile_id = ? WHERE id = dept.id
  → Response: {
      success: true,
      data: {
        id: "uuid", department_name: "Water Supply Division",
        head_email: "ram.sharma@lalitpur.gov.np",
        head_password: "a1b2c3d4e5f6"
      }
    }
```

### 3.7 Target Staff Data Flow

```
CREATE STAFF:
  POST /api/municipality/staff
  Body: { full_name, email, password, role: "staff", department_id }
  → Creates auth user (triggers handle_new_user → profile + staff rows)
  → Returns profile data

LIST STAFF:
  GET /api/municipality/staff?department_id=xxx
  → JOIN staff + profiles + departments
  → Returns [{ id, full_name, email, role, account_status,
               department_id, department_name, employee_id, expertise, created_at }]

DELETE STAFF:
  DELETE /api/municipality/staff/:staffId
  → Fetch staff record → archive to deleted_staff → delete auth user (cascade deletes profile + staff)
```

---

## 4. Implementation Plan (4 Sprints)

### Sprint 1 — Column Name Fixes (Domain A)
| Step | Task | Files | Lines |
|------|------|-------|-------|
| 1.1 | Fix `m_uid` → `id` in `getLocalComplaintStats` | `municipality.repository.ts` | 14, 18, 36 |
| 1.2 | Fix `d_uid` → `id` in 3 municipality repo methods | `municipality.repository.ts` | 48, 73, 81 |
| 1.3 | Fix `d_uid` → `id` in 5 department repo methods | `department.repository.ts` | 69, 79, 152, 168, 176 |
| 1.4 | Fix `s_uid` → `id` in 5 department repo methods | `department.repository.ts` | 63, 153, 173, 180, 242 |
| 1.5 | Fix `m_uid` → `id` in middleware | `municipality.middleware.ts` | 50, 66 |
| 1.6 | Fix `dept.d_uid` → `dept.id` in controller (6 refs) | `municipality.controller.ts` | 79, 84, 87, 91 |

### Sprint 2 — Department Improvements (Domain B + C)
| Step | Task | Files |
|------|------|-------|
| 2.1 | Add `staff_count` + `complaint_count` to `getDepartments` | `municipality.repository.ts` |
| 2.2 | Add `getDepartmentDetail` with head profile JOIN | `municipality.repository.ts` + service |
| 2.3 | Add duplicate name check in `provisionDepartment` | `municipality.controller.ts` |
| 2.4 | Sync profile changes in `updateDepartment` | `municipality.controller.ts` |
| 2.5 | Add `replace-head` endpoint (Phase 15) | controller + routes |
| 2.6 | Remove duplicate route definitions | `municipality.routes.ts` |

### Sprint 3 — Staff CRUD Routes (Domain D)
| Step | Task | Files |
|------|------|-------|
| 3.1 | Add `getStaff` repository method | `municipality.repository.ts` |
| 3.2 | Add `createStaff` handler | `municipality.controller.ts` |
| 3.3 | Add `updateStaff` + `deleteStaff` handlers | `municipality.controller.ts` |
| 3.4 | Add `updateStaffStatus` + `resetStaffPassword` handlers | `municipality.controller.ts` |
| 3.5 | Register all staff routes | `municipality.routes.ts` |
| 3.6 | Add service passthrough methods | `municipality.service.ts` |

### Sprint 4 — Cross-Cutting (Domain I)
| Step | Task | Files |
|------|------|-------|
| 4.1 | Add Zod validation schemas | `validation/municipality.validation.ts` (NEW) |
| 4.2 | Standardize response shape | All controller files |
| 4.3 | Add audit logging for CRUD ops | Controller + middleware |
| 4.4 | Verify role guards (municipality_head vs department_head) | Middleware files |

---

## 5. Summary of Code Changes

| File | Changes |
|------|---------|
| `municipality/middleware/municipality.middleware.ts` | Fix `m_uid` → `id` (2 spots) |
| `municipality/repository/municipality.repository.ts` | Fix `m_uid` → `id`, `d_uid` → `id`, add staff_count/complaint_count JOIN, add 6 new staff methods |
| `municipality/services/municipality.service.ts` | Add staff CRUD passthrough methods (6 new) |
| `municipality/controller/municipality.controller.ts` | Fix `d_uid` → `id` (6 refs), sync profile on update, add 6 staff handlers |
| `municipality/routes/municipality.routes.ts` | Remove duplicate routes, add 6 staff routes, add replace-head route |
| `department/repository/department.repository.ts` | Fix `d_uid` → `id` (5 spots), fix `s_uid` → `id` (5 spots) |
| `department/controller/department.controller.ts` | No column fixes needed (uses params) |
| `department/services/department.service.ts` | No changes needed |

---

## 6. Quick Reference: Old vs New

| Aspect | Old (Current) | New (Target) |
|--------|---------------|--------------|
| **Department PK column** | `d_uid` (doesn't exist) | `id` (correct) |
| **Staff PK column** | `s_uid` (doesn't exist) | `id` (correct) |
| **Municipality PK column** | `m_uid` (doesn't exist) | `id` (correct) |
| **getDepartments** | Flat `SELECT *` | With `staff_count`, `complaint_count` |
| **getDepartmentById** | Broken (`d_uid`), no JOIN | Fixed `id`, JOIN with head profile |
| **updateDepartment** | Only dept row | Also syncs profile name/email/phone |
| **provisionDepartment** | Uses `dept.d_uid` (undefined) | Uses `dept.id` (correct) |
| **Staff routes** | None (404) | 6 full CRUD endpoints |
| **Route duplication** | Each route registered twice | Clean, single registration |
| **Duplicate validation** | None | Check before create (409) |
| **Middleware** | `municipality.m_uid` (undefined) | `municipality.id` (correct) |
| **Department categories** | Missing in edit modal | Properly pre-filled |
