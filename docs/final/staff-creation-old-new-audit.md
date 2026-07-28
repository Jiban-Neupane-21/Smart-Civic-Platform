# Staff Creation — Old Code vs New Code Audit & Plan

> Based on `docs/PLAN-50-Phases-Staff-Creation.md` and `supabase/Supabase_Schema.sql`

---

## 1. Current Issues Found (From Code Review)

### 🔴 CRITICAL — Blocks Staff CRUD

| # | Issue | File | Detail |
|---|-------|------|--------|
| 1 | **No staff list/create routes under municipality** | `municipality.routes.ts` | Frontend calls `GET/POST /api/municipality/:mid/staff` but these don't exist → 404 |
| 2 | **Department middleware reads `.d_uid`** — column doesn't exist | `department.middleware.ts:46,61` | `.select("d_uid")` returns `undefined`, `req.departmentId = undefined` |
| 3 | **Department repo**: 5 methods use `.d_uid` instead of `id` | `department.repository.ts:69,79,152,168,176` | `getDepartmentSummary`, `updateStaffRecord`, `getDepartmentMunicipalityId`, `getDepartmentCategoryAndName` |
| 4 | **Department repo**: 3 methods use `.s_uid` instead of `id` | `department.repository.ts:63,153,173` | `getDepartmentStaff`, `updateStaffRecord`, `archiveAndDeleteStaff` |
| 5 | **Staff module has no profile/my-department routes** | `staff.routes.ts` | Only `my-assignments` and `department-queue` exist. Missing: `GET /profile`, `PATCH /profile`, `GET /my-department` |

### 🟡 HIGH — Missing or Broken

| # | Issue | File | Detail |
|---|-------|------|--------|
| 6 | **No status update or password reset routes under department** | `department.route.ts` | `PATCH /staff/:staffId/status` and `POST /staff/:staffId/reset-password` don't exist |
| 7 | **Department `createStaff` doesn't enforce role = 'staff' only** | `department.controller.ts:179-218` | Dept head could potentially create `department_head` by manipulating body (no role check) |
| 8 | **No duplicate email check before staff creation** | Both controllers | Neither municipality `createUser` nor department `createStaff` checks for duplicate email → Supabase returns cryptic errors |
| 9 | **Field name mismatch: frontend sends `name` but backend expects `full_name`** | Frontend → Backend | Frontend `ManageStaff.tsx` sends `{ name, departmentId }`, backend needs `{ full_name, department_id }` |
| 10 | **`onboardStaffProfile` is a separate flow requiring existing profile_id** | `municipality.controller.ts:117-133` | Requires pre-existing profile_id — awkward two-step process |
| 11 | **Staff middleware works correctly (uses `id`)** ✅ | `staff.middleware.ts` | No column name issues — this is the only middleware that's correct |
| 12 | **Staff repository has no column issues** ✅ | `staff.repository.ts` | Uses `profile_id` and `staff_id` correctly |

---

## 2. Old Code (Current State) — Full API & Implementation Details

### 2.1 Database Schema (`staff` + `profiles`)

```sql
profiles (
    id UUID PK REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL, email TEXT, phone TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'citizen',
    account_status onboarding_status NOT NULL DEFAULT 'invited',
    municipality_id UUID FK, department_id UUID FK,
    force_password_reset BOOLEAN DEFAULT FALSE,
    CONSTRAINT chk_tenant_roles_have_municipality
      CHECK (role NOT IN ('municipality_head','department_head','staff') OR municipality_id IS NOT NULL)
);

staff (
    id UUID PK,
    profile_id UUID NOT NULL UNIQUE FK → profiles(id) ON DELETE CASCADE,
    municipality_id UUID NOT NULL FK → municipalities(id),
    primary_department_id UUID NOT NULL FK → departments(id),
    employee_id TEXT, expertise TEXT,
    employee_status employee_status NOT NULL DEFAULT 'active',
    UNIQUE (employee_id, municipality_id)
);
```

### 2.2 Three Creation Paths (Current)

#### Path A: Municipality Head — `POST /api/municipality/users/create`
```typescript
// municipality.controller.ts:195-233
// Accepts: { email, password, full_name, role, department_id, phone }
// Allows role: "department_head" or "staff"
// Calls createUserService with municipality_id from middleware + department_id from body
// Returns: profile data
```
**Issues:** Route is at `/users/create`, not `/staff`. No duplicate email check.

#### Path B: Municipality Head — `POST /api/municipality/staff/onboard`
```typescript
// municipality.controller.ts:117-133
// Accepts: { profile_id, primary_department_id, employee_id, expertise }
// Requires existing profile_id (two-step flow)
// Creates staff row only (no auth user)
```
**Issues:** Requires pre-existing user profile. Two-step process is awkward.

#### Path C: Department Head — `POST /api/department/staff/create`
```typescript
// department.controller.ts:161-216
// Accepts: { email, password, full_name, phone, expertise }
// Calls createUserService with role = "staff", department_id from middleware
// Then updates staff expertise
```
**Issues:** Uses `req.departmentId` from middleware which reads `.d_uid` → **undefined**.

### 2.3 Current API Endpoint Map

| Method | Path | Module | Status | Issue |
|--------|------|--------|--------|-------|
| GET | `/api/municipality/:mid/staff` | Municipality | ❌ Missing | 404 — doesn't exist |
| POST | `/api/municipality/:mid/staff` | Municipality | ❌ Missing | 404 — doesn't exist |
| PATCH | `/api/municipality/:mid/staff/:staffId` | Municipality | ❌ Missing | 404 — doesn't exist |
| DELETE | `/api/municipality/:mid/staff/:staffId` | Municipality | ❌ Missing | 404 — doesn't exist |
| PATCH | `/api/municipality/:mid/staff/:staffId/status` | Municipality | ❌ Missing | 404 — doesn't exist |
| POST | `/api/municipality/:mid/staff/:staffId/reset-password` | Municipality | ❌ Missing | 404 — doesn't exist |
| POST | `/api/municipality/users/create` | Municipality | ⚠️ Exists | Wrong path, wrong field names |
| POST | `/api/municipality/staff/onboard` | Municipality | ⚠️ Exists | Two-step, awkward |
| GET | `/api/department/staff-roster` | Department | ⚠️ Broken | Uses `s_uid` — returns undefined IDs |
| POST | `/api/department/staff/create` | Department | ⚠️ Broken | Middleware `d_uid` = undefined |
| PATCH | `/api/department/staff/:staffId` | Department | ⚠️ Broken | Uses `s_uid` + `d_uid` |
| DELETE | `/api/department/staff/:staffId` | Department | ⚠️ Broken | Uses `s_uid` + `d_uid` |
| PATCH | `/api/department/staff/:staffId/status` | Department | ❌ Missing | 404 — doesn't exist |
| POST | `/api/department/staff/:staffId/reset-password` | Department | ❌ Missing | 404 — doesn't exist |
| GET | `/api/staff/my-assignments` | Staff | ✅ OK | — |
| GET | `/api/staff/department-queue` | Staff | ✅ OK | — |
| GET | `/api/staff/profile` | Staff | ❌ Missing | — |
| PATCH | `/api/staff/profile` | Staff | ❌ Missing | — |
| GET | `/api/staff/my-department` | Staff | ❌ Missing | — |

### 2.4 Current Broken Data Flow

```
DEPARTMENT HEAD CREATES STAFF (current — broken):

Department Head logged in
  → Middleware: SELECT d_uid FROM departments WHERE head_profile_id = ?
  → d_uid returns undefined (column doesn't exist)
  → req.departmentId = undefined

  POST /api/department/staff/create
  → Body: { email, password, full_name, phone }
  → createUserService with department_id = undefined
  → Staff created without department binding
  → Returns profile data
```

### 2.5 Department Repository — Broken Staff Methods

```typescript
// getDepartmentStaff (line 61-68):
await this.supabaseAdmin
  .from("staff")
  .select("s_uid, employee_id, expertise, profiles(full_name, email)")
  //    ^^^^ BUG: s_uid doesn't exist, should be "id"
  .eq("primary_department_id", departmentId);

// updateStaffRecord (line 141-167):
.eq("s_uid", staffId)           // <-- BUG: should be .eq("id", staffId)

// archiveAndDeleteStaff (line 173-230):
.eq("s_uid", staffId)           // <-- BUG: should be .eq("id", staffId)

// getDepartmentSummary (line 69-91):
.eq("d_uid", departmentId)      // <-- BUG: should be .eq("id", departmentId)

// getDepartmentMunicipalityId (line 163-170):
.eq("d_uid", departmentId)      // <-- BUG

// getDepartmentCategoryAndName (line 174-180):
.eq("d_uid", departmentId)      // <-- BUG
```

### 2.6 Department Middleware — Broken

```typescript
// department.middleware.ts:44-48
const { data: department, error: deptError } = await supabase
  .from("departments")
  .select("d_uid")                    // <-- BUG: should be "id"
  .eq("head_profile_id", userId)
  .single();

// Line 61:
req.departmentId = department.d_uid;   // <-- BUG: undefined
```

### 2.7 Staff Middleware — ✅ Correct

```typescript
// staff.middleware.ts:33-37
const { data: staffMeta, error: metaError } = await supabase
  .from("staff")
  .select("id, primary_department_id")  // ✅ Uses correct "id"
  .eq("profile_id", userId)
  .single();

req.staffId = staffMeta.id;             // ✅ Correct
req.departmentId = staffMeta.primary_department_id;  // ✅ Correct
```

---

## 3. New Code (Target State) — Full API & Implementation Specification

### 3.1 Repository — Target Methods (Municipality Module)

```typescript
// ===== NEW: Staff CRUD in municipality repository =====

async getStaff(municipalityId: string, departmentId?: string) {
  let query = this.supabaseAdmin
    .from("staff")
    .select(`
      id,
      employee_id, expertise, employee_status, onboarded_at,
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

async checkEmailExists(email: string): Promise<boolean> {
  const { data, error } = await this.supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

async updateStaffRecord(municipalityId: string, staffId: string, payload: any) {
  const { data: staff, error: fetchErr } = await this.supabaseAdmin
    .from("staff")
    .select("profile_id")
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

  // Update staff-specific fields
  const staffFields: any = {};
  if (payload.expertise !== undefined) staffFields.expertise = payload.expertise;
  if (payload.employee_id !== undefined) staffFields.employee_id = payload.employee_id;
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

async archiveAndDeleteStaff(municipalityId: string, staffId: string, deletedBy: string) {
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
  if (fetchErr) throw new Error("Staff not found");

  // Archive to deleted_staff
  await this.supabaseAdmin.from("deleted_staff").insert({
    original_staff_id: staff.id,
    original_profile_id: staff.profile_id,
    full_name: staff.profile?.full_name || "",
    email: staff.profile?.email || "",
    phone: staff.profile?.phone || null,
    employee_id: staff.employee_id,
    expertise: staff.expertise,
    employee_status: staff.employee_status,
    primary_department_id: staff.primary_department_id,
    municipality_id: staff.municipality_id,
    deleted_by: deletedBy,
  });

  // Delete auth user (cascade deletes profile + staff)
  await this.supabaseAdmin.auth.admin.deleteUser(staff.profile_id);
}

async updateStaffAccountStatus(municipalityId: string, staffId: string, status: string) {
  const { data: staff } = await this.supabaseAdmin
    .from("staff")
    .select("profile_id")
    .eq("id", staffId)
    .eq("municipality_id", municipalityId)
    .single();

  await this.supabaseAdmin
    .from("profiles")
    .update({ account_status: status })
    .eq("id", staff.profile_id);
}

async resetStaffPassword(municipalityId: string, staffId: string, newPassword: string) {
  const { data: staff } = await this.supabaseAdmin
    .from("staff")
    .select("profile_id")
    .eq("id", staffId)
    .eq("municipality_id", municipalityId)
    .single();

  await this.supabaseAdmin.auth.admin.updateUserById(staff.profile_id, {
    password: newPassword,
  });
  await this.supabaseAdmin.from("profiles").update({ force_password_reset: true }).eq("id", staff.profile_id);
}
```

### 3.2 Municipality Controller — Target Staff Handlers

```typescript
// ===== NEW: List staff in municipality =====
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

// ===== NEW: Create staff (municipality head can create staff or department_head) =====
createStaff = async (req: any, res: Response): Promise<void> => {
  try {
    const { full_name, email, password, role, department_id, phone } = req.body;

    if (!full_name || !email || !password || !role || !department_id) {
      res.status(400).json({ success: false, error: "Missing required fields: full_name, email, password, role, department_id" });
      return;
    }

    if (!["staff", "department_head"].includes(role)) {
      res.status(400).json({ success: false, error: "Municipality head can only create staff or department_head roles" });
      return;
    }

    // Check duplicate email first
    const emailExists = await this.service.checkEmailExists(email);
    if (emailExists) {
      res.status(409).json({ success: false, error: "A user with this email already exists" });
      return;
    }

    const profile = await createUserService({
      email, password, full_name, role,
      municipality_id: req.municipalityId,
      department_id,
      phone,
      created_by: req.user.id,
    });

    res.status(201).json({ success: true, data: profile });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// ===== NEW: Update staff =====
updateStaff = async (req: any, res: Response): Promise<void> => {
  try {
    const { staffId } = req.params;
    const updated = await this.service.updateStaff(req.municipalityId, staffId, req.body);
    res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// ===== NEW: Delete staff =====
deleteStaff = async (req: any, res: Response): Promise<void> => {
  try {
    const { staffId } = req.params;
    await this.service.archiveAndDeleteStaff(req.municipalityId, staffId, req.user.id);
    res.status(200).json({ success: true, message: "Staff deleted successfully" });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// ===== NEW: Update staff status =====
updateStaffStatus = async (req: any, res: Response): Promise<void> => {
  try {
    const { staffId } = req.params;
    const { status } = req.body;
    if (!["active", "inactive", "suspended"].includes(status)) {
      res.status(400).json({ success: false, error: "Status must be active, inactive, or suspended" });
      return;
    }
    await this.service.updateStaffAccountStatus(req.municipalityId, staffId, status);
    res.status(200).json({ success: true, message: `Staff status updated to ${status}` });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// ===== NEW: Reset staff password =====
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

### 3.3 Municipality Routes — Target (Staff Section)

```typescript
// Routes to ADD to the existing municipality router:
// ===== STAFF CRUD (Phase 1-5) =====
router.get("/staff", controller.listStaff);                    // NEW
router.post("/staff", controller.createStaff);                 // NEW
router.patch("/staff/:staffId", controller.updateStaff);       // NEW
router.delete("/staff/:staffId", controller.deleteStaff);      // NEW
router.patch("/staff/:staffId/status", controller.updateStaffStatus);       // NEW
router.post("/staff/:staffId/reset-password", controller.resetStaffPassword); // NEW

// Keep existing routes for backward compat
router.post("/users/create", controller.createUser);
```

### 3.4 Department Routes — Target (Staff Section)

```typescript
// Routes to ADD/FIX in department router:
// ===== STAFF CRUD (Phase 6-10) =====
router.get("/staff", controller.getStaffRoster);               // was /staff-roster
router.post("/staff", controller.createStaff);                 // was /staff/create
router.patch("/staff/:staffId", controller.updateStaff);       // exists (fix s_uid)
router.delete("/staff/:staffId", controller.removeStaff);      // exists (fix s_uid)
router.patch("/staff/:staffId/status", controller.updateStaffStatus);     // NEW
router.post("/staff/:staffId/reset-password", controller.resetStaffPassword); // NEW
```

### 3.5 Department Controller — Target `createStaff` Fix

```typescript
// Phase 7: Fix — enforce role='staff' for department head
createStaff = async (req: any, res: Response): Promise<void> => {
  try {
    const { email, password, full_name, phone, expertise } = req.body;

    if (!email || !password || !full_name) {
      res.status(400).json({ success: false, error: "Missing required fields" });
      return;
    }

    // ENFORCE: Department head can ONLY create staff role (Phase 19)
    // If body contains role !== "staff", reject
    if (req.body.role && req.body.role !== "staff") {
      res.status(403).json({ success: false, error: "Department head can only create staff accounts" });
      return;
    }

    // Check duplicate email
    const emailExists = await this.service.checkEmailExists(email);
    if (emailExists) {
      res.status(409).json({ success: false, error: "A user with this email already exists" });
      return;
    }

    const municipalityId = await this.service.getMunicipalityId(req.departmentId);

    const profile = await createUserService({
      email, password, full_name,
      role: "staff",                                            // Always staff — enforced
      municipality_id: municipalityId,
      department_id: req.departmentId,                          // Auto-injected from middleware
      phone,
      created_by: req.user.id,
    });

    // Set expertise
    // ... (existing logic)

    res.status(201).json({ success: true, data: profile });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
};
```

### 3.6 Staff Module — Target (Phases 11-15)

```typescript
// staff.routes.ts — NEW routes to add:
router.get("/profile", controller.getMyProfile);               // NEW
router.patch("/profile", controller.updateMyProfile);          // NEW
router.get("/my-department", controller.getMyDepartment);      // NEW

// staff.controller.ts — NEW handlers:
getMyProfile = async (req: any, res: Response): Promise<void> => {
  try {
    // JOIN staff + profiles + departments
    const { data, error } = await supabaseAdmin
      .from("staff")
      .select(`
        id, employee_id, expertise,
        profile:profiles!profile_id(id, full_name, email, phone, role, account_status, created_at),
        department:departments!primary_department_id(id, department_name, department_category)
      `)
      .eq("profile_id", req.user.id)
      .single();
    if (error) throw error;
    res.status(200).json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

updateMyProfile = async (req: any, res: Response): Promise<void> => {
  try {
    const { phone, personal_address } = req.body;
    // Only allow updating limited fields
    const updates: any = {};
    if (phone !== undefined) updates.phone = phone;
    // Staff CANNOT change email, role, department, municipality
    const { error } = await supabaseAdmin
      .from("profiles")
      .update(updates)
      .eq("id", req.user.id);
    if (error) throw error;
    res.status(200).json({ success: true, message: "Profile updated" });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
};

getMyDepartment = async (req: any, res: Response): Promise<void> => {
  try {
    const { data, error } = await supabaseAdmin
      .from("departments")
      .select("id, department_name, department_category, head_name, head_email")
      .eq("id", req.departmentId)
      .single();
    if (error) throw error;
    res.status(200).json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
```

### 3.7 Target API Endpoint Map

| Method | Path | Creator | Phase | Description |
|--------|------|---------|-------|-------------|
| GET | `/api/municipality/staff` | Muni Head | 1 | List staff (optional `?department_id=`) |
| POST | `/api/municipality/staff` | Muni Head | 2 | Create staff or department_head |
| PATCH | `/api/municipality/staff/:staffId` | Muni Head | 3 | Update staff profile + staff fields |
| DELETE | `/api/municipality/staff/:staffId` | Muni Head | 4 | Delete staff (archive + cascade) |
| PATCH | `/api/municipality/staff/:staffId/status` | Muni Head | 5 | Update account status |
| POST | `/api/municipality/staff/:staffId/reset-password` | Muni Head | 5 | Reset password |
| GET | `/api/department/staff` | Dept Head | 6 | List own department staff |
| POST | `/api/department/staff` | Dept Head | 7 | Create staff (role=staff enforced) |
| PATCH | `/api/department/staff/:staffId` | Dept Head | 8 | Update staff |
| DELETE | `/api/department/staff/:staffId` | Dept Head | 9 | Delete staff |
| PATCH | `/api/department/staff/:staffId/status` | Dept Head | 10 | Update status |
| POST | `/api/department/staff/:staffId/reset-password` | Dept Head | 10 | Reset password |
| GET | `/api/staff/profile` | Staff | 11 | View own profile |
| PATCH | `/api/staff/profile` | Staff | 12 | Update limited profile fields |
| GET | `/api/staff/my-department` | Staff | 13 | View own department |
| GET | `/api/staff/my-assignments` | Staff | ✅ | Existing |
| GET | `/api/staff/department-queue` | Staff | ✅ | Existing |

### 3.8 Target Data Flows

```
MUNICIPALITY HEAD CREATES STAFF:
  POST /api/municipality/staff
  Body: { full_name, email, password, role: "staff", department_id: "uuid", phone: "..." }
  → Middleware: verifies municipality_head role, injects req.municipalityId
  → Controller:
      1. Validate: full_name, email, password, department_id required
      2. Validate: role is "staff" or "department_head"
      3. Check: email not duplicate → 409 if exists
      4. createUserService → auth.users + profiles (trigger) + staff (trigger)
      5. Return { success: true, data: { id, email, full_name, role } }

DEPARTMENT HEAD CREATES STAFF:
  POST /api/department/staff
  Body: { full_name, email, password, phone }
  → Middleware: verifies department_head role, injects req.departmentId
  → Controller:
      1. Validate: full_name, email, password required
      2. ENFORCE: role = "staff" (body role rejected if not "staff")
      3. Check: email not duplicate → 409 if exists
      4. createUserService with municipality_id (resolved from dept) + department_id (from middleware)
      5. Return profile data

STAFF VIEWS PROFILE:
  GET /api/staff/profile
  → Middleware: verifies staff role, injects req.staffId, req.departmentId
  → Controller: JOIN staff + profiles + departments → return full profile

THREE SECURITY MARKERS (every staff record):
  1. municipality_id — tenant isolation (from middleware context)
  2. department_id — department boundary (from body or middleware)
  3. role = 'staff' — no admin rights (enforced by role gate)
```

---

## 4. Implementation Plan (4 Sprints)

### Sprint 1 — Column Name Fixes (Phase 21-25)
| Step | Task | Files |
|------|------|-------|
| 1.1 | Fix `d_uid` → `id` in department middleware | `department.middleware.ts:46,61` |
| 1.2 | Fix `d_uid` → `id` in 5 department repo methods | `department.repository.ts:69,79,152,168,176` |
| 1.3 | Fix `s_uid` → `id` in 3 department repo methods | `department.repository.ts:63,153,173` |
| 1.4 | Fix `d_uid` references in getDepartmentStaff select | `department.repository.ts:63` |
| 1.5 | Fix `s_uid` in archiveAndDeleteStaff & getDepartmentTeams | `department.repository.ts:173,180,242` |

### Sprint 2 — Municipality Staff Routes (Phases 1-5)
| Step | Task | Files |
|------|------|-------|
| 2.1 | Add `getStaff` + `checkEmailExists` to repository | `municipality.repository.ts` |
| 2.2 | Add `updateStaffRecord`, `archiveAndDeleteStaff` to repository | `municipality.repository.ts` |
| 2.3 | Add `updateStaffAccountStatus`, `resetStaffPassword` to repository | `municipality.repository.ts` |
| 2.4 | Add service passthrough methods | `municipality.service.ts` |
| 2.5 | Add 6 staff controller handlers | `municipality.controller.ts` |
| 2.6 | Register 6 staff routes | `municipality.routes.ts` |

### Sprint 3 — Department Staff Routes (Phases 6-10)
| Step | Task | Files |
|------|------|-------|
| 3.1 | Fix `getStaffRoster` (s_uid → id, correct select) | `department.repository.ts` |
| 3.2 | Fix `createStaff` — enforce role='staff', add duplicate check | `department.controller.ts` |
| 3.3 | Fix `updateStaffRecord` (s_uid → id) | `department.repository.ts` |
| 3.4 | Fix `archiveAndDeleteStaff` (s_uid → id) | `department.repository.ts` |
| 3.5 | Add status + password reset handlers | `department.controller.ts` |
| 3.6 | Fix route paths (`/staff` not `/staff-roster`, `/staff/create`) | `department.route.ts` |

### Sprint 4 — Staff Module + Validation (Phases 11-20)
| Step | Task | Files |
|------|------|-------|
| 4.1 | Add `GET /profile`, `PATCH /profile`, `GET /my-department` | `staff.controller.ts` + `staff.routes.ts` |
| 4.2 | Add Zod validation schemas | `validation/staff.validation.ts` (NEW) |
| 4.3 | Enforce role gating (muni head vs dept head) | Both controllers |
| 4.4 | Add duplicate email check before all staff creation | Both controllers |
| 4.5 | Standardize all staff responses | All staff controllers |

---

## 5. Summary of Changes by Module

| Module | File | Changes |
|--------|------|---------|
| **Municipality** | `repository` | Add 6 new staff methods, fix `m_uid` |
| **Municipality** | `controller` | Add 6 new staff handlers, add duplicate email check |
| **Municipality** | `service` | Add 6 passthrough methods |
| **Municipality** | `routes` | Add 6 staff routes, keep legacy `/users/create` |
| **Department** | `middleware` | Fix `d_uid` → `id` (2 spots) |
| **Department** | `repository` | Fix 5× `d_uid` → `id`, fix 3× `s_uid` → `id` |
| **Department** | `controller` | Fix `createStaff` role enforcement, add status/reset handlers |
| **Department** | `routes` | Fix route paths, add status/reset routes |
| **Staff** | `controller` | Add 3 new handlers (profile, dept) |
| **Staff** | `routes` | Add 3 new routes (profile + my-department) |
| **Validation** | NEW file | Zod schemas for staff create/update/status |

---

## 6. Quick Reference: Old vs New

| Aspect | Old (Current) | New (Target) |
|--------|---------------|--------------|
| **Muni staff routes** | ❌ Missing (404) | ✅ 6 full CRUD endpoints |
| **Dept staff routes** | ⚠️ Broken (`s_uid`/`d_uid`) | ✅ Fixed + status/reset added |
| **Staff profile routes** | ❌ Missing | ✅ 3 endpoints (profile + dept) |
| **Department middleware** | `.select("d_uid")` → undefined | `.select("id")` → correct |
| **Dept repo: `s_uid`** | Used in 3 methods → broken | `.eq("id", ...)` → works |
| **Dept repo: `d_uid`** | Used in 5 methods → broken | `.eq("id", ...)` → works |
| **Staff middleware** | ✅ Already correct | ✅ No change needed |
| **Role enforcement (dept head)** | ❌ Not checked | ✅ Only `staff` role allowed |
| **Duplicate email check** | ❌ Not done | ✅ Checked before all creation |
| **Staff creates staff** | N/A | ✅ Blocked by middleware (role ≠ staff) |
| **Password reset route** | ❌ Missing | ✅ `POST /.../reset-password` |
| **Status update route** | ❌ Missing | ✅ `PATCH /.../status` |
