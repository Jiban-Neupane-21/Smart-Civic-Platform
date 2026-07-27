# Smart Civic Platform — 50-Phase Implementation Plan

## Vision Shift
**Old approach:** Superadmin creates a brand-new municipality record, then assigns a head.
**New approach:** All 753 municipalities are pre-seeded in the DB with `is_active = false`. Superadmin selects an existing inactive municipality, fills head details, and activates it. This matches Nepal's real-world fixed administrative hierarchy.

---

## DOMAIN A — Database & Schema (Phases 1–5)

### Phase 1: Add `is_active` Column + Seed All 753 Municipalities
- Verify `is_active BOOLEAN DEFAULT FALSE` exists on `municipalities` table
- Create seed SQL script that inserts all 753 municipalities from the existing frontend data files (`nepal-municipalities.ts`) into the DB
- Each municipality linked to its correct `district_id` via name resolution
- Script must be idempotent (skip if already seeded)

Files:
- `supabase/seed-municipalities.sql` (NEW)
- `Supabase_Schema.sql` (update if needed)
- `Smart_Civic_Platform_Frontend/src/data/nepal-municipalities.ts` (reference for seed data)

### Phase 2: Add DB Views for Superadmin Queries
- Create `v_inactive_municipalities` view: municipalities WHERE `is_active = false`, joined with districts and provinces for display
- Create `v_active_municipalities` view: same but WHERE `is_active = true`
- Create `v_municipality_detail` view: full detail with province name, district name

Files:
- `supabase/views.sql` (NEW)
- `Smart_Civic_Platform_Backend/src/types/database.type.ts` (add view types)

### Phase 3: Add RLS Policies for New Flow
- Superadmin bypasses RLS (service_role key) — no change needed
- Municipality head policies: read only their own municipality's data
- Ensure `profiles` table constraint `chk_tenant_roles_have_municipality` works with new flow
- Verify FK constraint `fk_municipalities_head_profile` works correctly

Files:
- `Supabase_Schema.sql` (review constraints)
- No code changes if existing schema handles it

### Phase 4: Create DB Functions/RPCs for Registration
- Create `rpc_register_municipality_head` — atomic transaction:
  1. Check municipality is not already active
  2. Create auth user (Supabase admin API)
  3. Update municipality: set `is_active = true`, `head_name`, `head_email`, `head_profile_id`
  4. Auto-create wards (1 to `total_wards`)
  5. Return municipality + temp password
- Or handle this in application layer (recommended for error handling)

Files:
- `supabase/rpc-register-municipality.sql` (NEW, optional)
- `Smart_Civic_Platform_Backend/src/modules/superadmin/middleware/superadmin.repository.ts`

### Phase 5: Migration Scripts for Existing Data
- If any municipalities already exist in DB with `is_active = true` from old flow, create migration to reconcile
- Ensure `district_id` column has valid FK references for all existing rows
- Backfill missing wards for already-active municipalities

Files:
- `supabase/migrations/reconcile-existing-data.sql` (NEW)

---

## DOMAIN B — Backend: Reference Data API (Phases 6–10)

### Phase 6: Add GET /api/v1/superadmin/provinces
- Returns all 7 provinces from DB `provinces` table
- No auth required (public reference data) OR superadmin-only (consistent with existing pattern)

Files:
- `Smart_Civic_Platform_Backend/src/modules/superadmin/controller/superadmin.controller.ts`
- `Smart_Civic_Platform_Backend/src/modules/superadmin/services/superadmin.services.ts`
- `Smart_Civic_Platform_Backend/src/modules/superadmin/middleware/superadmin.repository.ts`
- `Smart_Civic_Platform_Backend/src/modules/superadmin/routes/superadmin.routes.ts`

### Phase 7: Add GET /api/v1/superadmin/districts?province_id=
- Returns districts filtered by `province_id` (optional filter)
- If no province_id, return all 77 districts

Files: Same as Phase 6

### Phase 8: Add GET /api/v1/superadmin/municipalities/reference?district_id=&is_active=
- Returns municipalities filtered by `district_id` and `is_active` status
- Used by frontend cascading dropdown to show only inactive municipalities for selection

Files: Same as Phase 6

### Phase 9: Add GET /api/v1/superadmin/municipalities/:id/detail
- Returns full municipality detail with province name, district name, ward count
- Used for confirmation display before registration

Files: Same as Phase 6

### Phase 10: Add GET /api/v1/superadmin/wards/:municipality_id
- Returns all wards for a given municipality
- Used for display after successful registration

Files: Same as Phase 6

---

## DOMAIN C — Backend: Registration Flow (Phases 11–15)

### Phase 11: Rewrite `POST /municipalities/provision` — New Logic
- Accept `municipality_id` (UUID) instead of `official_name` + `district` + `province`
- Accept head details: `head_name`, `head_email`, `head_password` (optional, auto-generate if missing)
- Step 1: Verify the municipality exists and `is_active = false`
- Step 2: Validate head_email not already in use

Files:
- `Smart_Civic_Platform_Backend/src/modules/superadmin/controller/superadmin.controller.ts`
- `Smart_Civic_Platform_Backend/src/modules/superadmin/services/superadmin.services.ts`

### Phase 12: Create Municipality Head Auth User
- Call `createUserService` with `municipality_id`, `role: "municipality_head"`
- Handle errors with proper rollback
- Set `force_password_reset = true` for first login

Files:
- `Smart_Civic_Platform_Backend/src/modules/superadmin/controller/superadmin.controller.ts`
- `Smart_Civic_Platform_Backend/src/modules/auth/services/auth.service.ts` (review)

### Phase 13: Activate Municipality + Link Head Profile
- Update municipality: `is_active = true`, `head_profile_id = profile.id`, `head_name`, `head_email`
- Atomic: if this fails, roll back the auth user creation

Files:
- `Smart_Civic_Platform_Backend/src/modules/superadmin/middleware/superadmin.repository.ts`
- `Smart_Civic_Platform_Backend/src/modules/superadmin/services/superadmin.services.ts`

### Phase 14: Auto-Create Wards on Activation
- Loop 1 to `total_wards` (from municipality record), INSERT into `wards` table
- Use batch insert for performance
- Log ward creation errors but don't roll back municipality activation

Files:
- `Smart_Civic_Platform_Backend/src/modules/superadmin/controller/superadmin.controller.ts`

### Phase 15: Return Success Response with Temp Credentials
- Return: `{ municipality_id, official_name, head_email, head_password (auto-generated) }`
- Follow existing pattern: `{ success: true, data: { ... } }`

Files:
- `Smart_Civic_Platform_Backend/src/modules/superadmin/controller/superadmin.controller.ts`

---

## DOMAIN D — Backend: Municipality CRUD (Phases 16–20)

### Phase 16: Fix `GET /municipalities` — Return Joined Data
- JOIN municipalities with districts and provinces
- Return display names: `province_name`, `district_name` alongside IDs
- Fix column mapping: use `id` not `m_uid`

Files:
- `Smart_Civic_Platform_Backend/src/modules/superadmin/middleware/superadmin.repository.ts`

### Phase 17: Fix Repository — `m_uid` → `id`
- Change all `.eq("m_uid", ...)` to `.eq("id", ...)` in all repository methods
- Methods: `getMunicipalityById`, `updateMunicipality`, `deleteMunicipality`, `updateMunicipalityHead`

Files:
- `Smart_Civic_Platform_Backend/src/modules/superadmin/middleware/superadmin.repository.ts`

### Phase 18: Fix Repository — Add Proper Query Methods
- Add `getProvinces()`, `getDistricts(provinceId?)`, `getReferenceMunicipalities(districtId, isActive?)`
- Add `getMunicipalityDetail(id)` with JOINs
- Add `activateMunicipality(id, headProfileId, headName, headEmail)`
- Add `createWards(municipalityId, count)`

Files:
- `Smart_Civic_Platform_Backend/src/modules/superadmin/middleware/superadmin.repository.ts`

### Phase 19: Add Service Passthrough Methods
- Add service methods for all new repository methods
- Keep consistent error handling pattern

Files:
- `Smart_Civic_Platform_Backend/src/modules/superadmin/services/superadmin.services.ts`

### Phase 20: Update Routes with New Endpoints
- Add new route registrations
- Keep existing routes for backward compatibility (or redirect)
- Update Swagger/OpenAPI docs

Files:
- `Smart_Civic_Platform_Backend/src/modules/superadmin/routes/superadmin.routes.ts`

---

## DOMAIN E — Frontend: API Layer & Types (Phases 21–25)

### Phase 21: Update API_ENDPOINTS
- Add new endpoints: provinces, districts, reference municipalities, municipality detail, wards
- Keep existing endpoints for backward compatibility
- Update BASE_URL if needed

Files:
- `Smart_Civic_Platform_Frontend/src/api/index.ts`

### Phase 22: Create Frontend Types Matching DB Schema
- Update `Municipality` interface to match `MunicipalityRow` from DB types
- Add `Province`, `District`, `Ward` interfaces
- Remove `m_uid`, `province` (string), `district` (string)
- Add `id`, `district_id`, `local_level_type`, `province_name`, `district_name` (display)

Files:
- `Smart_Civic_Platform_Frontend/src/pages/Superadmin/ManageMuniciple.tsx`
- `Smart_Civic_Platform_Frontend/src/types/userRole.type.ts` (or new types file)

### Phase 23: Add API Helper Functions for Reference Data
- Create `fetchProvinces()`, `fetchDistricts(provinceId)`, `fetchMunicipalities(districtId, isActive)`
- Wrap in try/catch with proper error handling
- Add loading/error states

Files:
- `Smart_Civic_Platform_Frontend/src/pages/Superadmin/ManageMuniciple.tsx`
- `Smart_Civic_Platform_Frontend/src/api/index.ts` (optional)

### Phase 24: Add Registration API Call
- Create `registerMunicipality(municipalityId, headName, headEmail, password?)` function
- Handle success response with temp credentials
- Handle error responses (email taken, already active, not found)

Files:
- `Smart_Civic_Platform_Frontend/src/pages/Superadmin/ManageMuniciple.tsx`

### Phase 25: Add CRUD API Helpers
- Add `fetchMunicipalities()`, `updateMunicipality(id, data)`, `deleteMunicipality(id)`
- Ensure proper payload serialization

Files:
- `Smart_Civic_Platform_Frontend/src/pages/Superadmin/ManageMuniciple.tsx`

---

## DOMAIN F — Frontend: ManageMuniciple.tsx Rewrite (Phases 26–30)

### Phase 26: Rewrite UI — Cascading Dropdown Registration
- Replace static data imports with API calls to DB-backed endpoints
- Cascade: Province → District → Municipality (inactive only) → Head Details
- Province dropdown fetches from `GET /provinces`
- District dropdown fetches on province selection from `GET /districts?province_id=`
- Municipality dropdown fetches on district selection from `GET /municipalities/reference?district_id=&is_active=false`

Files:
- `Smart_Civic_Platform_Frontend/src/pages/Superadmin/ManageMuniciple.tsx`

### Phase 27: Rewrite UI — Registration Form
- Show selected municipality details (name, type, total wards) as read-only info
- Head details: Full Name, Email, Phone
- Password: optional input + auto-generate toggle
- Submit button with loading state
- Success dialog showing temp credentials

Files:
- `Smart_Civic_Platform_Frontend/src/pages/Superadmin/ManageMuniciple.tsx`

### Phase 28: Rewrite UI — Municipality Table
- Show only active municipalities in the table
- Display: Name, Province, District, Type, Head Name, Email, Status, Created Date
- Add search/filter by province, district, name
- Pagination

Files:
- `Smart_Civic_Platform_Frontend/src/pages/Superadmin/ManageMuniciple.tsx`

### Phase 29: Rewrite UI — Edit Modal
- Edit only non-critical fields: head_name, head_email, official_email, contact_no, etc.
- Pre-fill from GET detail response
- Submit via PUT /municipalities/:id

Files:
- `Smart_Civic_Platform_Frontend/src/pages/Superadmin/ManageMuniciple.tsx`

### Phase 30: Rewrite UI — Delete with Confirmation
- Confirmation dialog with cascade info (wards, departments, staff will be deleted)
- Delete via DELETE /municipalities/:id
- Refresh table after deletion
- Error handling

Files:
- `Smart_Civic_Platform_Frontend/src/pages/Superadmin/ManageMuniciple.tsx`

---

## DOMAIN G — Frontend: Remove Static Data Dependency (Phases 31–35)

### Phase 31: Consolidate Static Data Files
- Audit all usages of `data/nepal-provinces.ts`, `data/nepal-municipalities.ts`
- Identify which pages still need static data vs. can use API

Files:
- `Smart_Civic_Platform_Frontend/src/data/nepal-provinces.ts`
- `Smart_Civic_Platform_Frontend/src/data/nepal-municipalities.ts`
- `Smart_Civic_Platform_Frontend/src/pages/auth/CitizenRegister.tsx`

### Phase 32: Migrate CitizenRegister.tsx to DB-Backed Dropdowns
- Replace static province/district dropdown with API calls
- Ensure backward compatibility

Files:
- `Smart_Civic_Platform_Frontend/src/pages/auth/CitizenRegister.tsx`

### Phase 33: Create Shared Location Picker Component
- Extract cascading Province → District → Municipality dropdown into reusable component
- Props: `onChange(provinceId, districtId, municipalityId)`, `showMunicipality`, `municipalityFilter`
- Used by: ManageMuniciple.tsx, CitizenRegister.tsx, future pages

Files:
- `Smart_Civic_Platform_Frontend/src/components/LocationPicker.tsx` (NEW)
- `Smart_Civic_Platform_Frontend/src/pages/Superadmin/ManageMuniciple.tsx` (refactor)
- `Smart_Civic_Platform_Frontend/src/pages/auth/CitizenRegister.tsx` (refactor)

### Phase 34: Remove Old Static Data Files
- Delete `data/nepal-provinces.ts` and `data/nepal-municipalities.ts` after full migration
- Keep `data/lists/` files if still referenced elsewhere

Files:
- `Smart_Civic_Platform_Frontend/src/data/nepal-provinces.ts` (DELETE)
- `Smart_Civic_Platform_Frontend/src/data/nepal-municipalities.ts` (DELETE)

### Phase 35: Update Frontend Routes & Navigation
- Ensure Superadmin pages are properly routed
- Update ProtectedRoute if needed for superadmin role check
- Fix any broken imports from deleted data files

Files:
- `Smart_Civic_Platform_Frontend/src/routes/AppRoutes.tsx`
- `Smart_Civic_Platform_Frontend/src/routes/ProtectedRoute.tsx`

---

## DOMAIN H — Municipality Head Module (Phases 36–40)

### Phase 36: Municipality Head — Login & Tenant Isolation
- Ensure login service reads `municipality_id` from profile
- All subsequent queries filter by `municipality_id`
- JWT carries `municipality_id` in user_metadata

Files:
- `Smart_Civic_Platform_Backend/src/modules/auth/services/auth.service.ts`
- `Smart_Civic_Platform_Backend/src/middleware/scopeguard.ts`

### Phase 37: Municipality Head — Dashboard & Analytics
- Show municipality-specific metrics
- Total departments, staff, citizens, complaints
- Recent activity feed

Files:
- `Smart_Civic_Platform_Frontend/src/pages/munic_head/Homepage.tsx`
- `Smart_Civic_Platform_Backend/src/modules/municipality/`

### Phase 38: Municipality Head — Department Management
- Create/list/edit/delete departments
- Assign department head
- Department category selection

Files:
- `Smart_Civic_Platform_Frontend/src/pages/munic_head/ManageDept.tsx`
- `Smart_Civic_Platform_Backend/src/modules/department/`

### Phase 39: Municipality Head — Staff Management
- Create staff accounts
- Assign to departments
- Manage staff status
- View staff list

Files:
- `Smart_Civic_Platform_Frontend/src/pages/munic_head/ManageStaff.tsx`
- `Smart_Civic_Platform_Backend/src/modules/staff/`

### Phase 40: Municipality Head — Complaint Oversight
- View all complaints in municipality
- Assign to departments
- Track resolution progress
- Generate reports

Files:
- `Smart_Civic_Platform_Frontend/src/pages/munic_head/ComplainDetails.tsx`
- `Smart_Civic_Platform_Frontend/src/pages/munic_head/ReportAnalytics.tsx`

---

## DOMAIN I — Superadmin Dashboard & System Admin (Phases 41–45)

### Phase 41: Superadmin Dashboard — Analytics
- System-wide metrics across all active municipalities
- Charts: municipalities by province, user distribution, complaint stats
- Use pre-aggregated view `v_superadmin_analytics`

Files:
- `Smart_Civic_Platform_Frontend/src/pages/Superadmin/Homepage.tsx`
- `Smart_Civic_Platform_Backend/src/modules/superadmin/controller/superadmin.controller.ts`

### Phase 42: Superadmin — User Management
- List all users across all municipalities
- Change roles (but restrict superadmin creation)
- Suspend/reactivate accounts
- Force password reset

Files:
- Existing controller/routes already have this — verify and fix if broken

### Phase 43: Superadmin — Audit Log Viewer
- View system-wide audit trail
- Filter by action type, user, municipality, date range
- Pagination

Files:
- `Smart_Civic_Platform_Frontend/src/pages/Superadmin/AuditLog.tsx`
- Existing backend audit log endpoint

### Phase 44: Superadmin — System Settings
- Maintenance mode toggle
- Feature flags
- Default SLA configuration
- Email configuration

Files:
- `Smart_Civic_Platform_Frontend/src/pages/Superadmin/SystemSetting.tsx`
- `Smart_Civic_Platform_Backend/src/service/`

### Phase 45: Superadmin — Ward Management
- View wards for any municipality
- Override ward names/chairperson
- Manual ward creation if needed

Files:
- NEW frontend page or extend ManageMuniciple.tsx

---

## DOMAIN J — Testing, Deployment & Documentation (Phases 46–50)

### Phase 46: Backend Testing
- Unit tests for repository methods
- Integration tests for registration flow
- Test: invalid district ID, duplicate email, already-active municipality
- Test: ward auto-creation count matches total_wards

Files:
- `Smart_Civic_Platform_Backend/tests/` (NEW directory)
- Test files for superadmin module

### Phase 47: Frontend Testing
- Component tests for ManageMuniciple.tsx
- Test cascading dropdown behavior
- Test form validation
- Test success/error states

Files:
- `Smart_Civic_Platform_Frontend/src/__tests__/` (NEW directory)

### Phase 48: Security & Error Handling Audit
- Verify all superadmin endpoints have proper auth middleware
- Check for SQL injection in raw queries
- Ensure temp password is never logged
- Rate limiting on registration endpoint
- Input validation (Zod schemas)

Files:
- All superadmin module files
- `Smart_Civic_Platform_Backend/src/validation/`

### Phase 49: Documentation
- Update API documentation (Swagger/OpenAPI)
- Create deployment guide
- Document the new municipality registration flow
- Update AGENT.md / CLAUDE.md with new architecture

Files:
- `Smart_Civic_Platform/AGENT.md`
- `Smart_Civic_Platform_Backend/CLAUDE.md`
- `Smart_Civic_Platform/docs/`

### Phase 50: Production Deployment Preparation
- Environment variable checklist
- Database migration run order
- Seed data verification
- Rollback plan
- Monitoring setup
- Performance optimization (indexes, query optimization)

Files:
- Deployment scripts
- `.env.example` updates
- CI/CD configuration

---

## Summary: 10 Domains × 5 Phases = 50 Phases

| Domain | Phases | Focus |
|--------|--------|-------|
| **A** | 1–5 | Database & Schema |
| **B** | 6–10 | Backend Reference Data API |
| **C** | 11–15 | Backend Registration Flow |
| **D** | 16–20 | Backend Municipality CRUD Fixes |
| **E** | 21–25 | Frontend API Layer & Types |
| **F** | 26–30 | Frontend ManageMuniciple.tsx Rewrite |
| **G** | 31–35 | Frontend Static Data Removal |
| **H** | 36–40 | Municipality Head Module |
| **I** | 41–45 | Superadmin Dashboard & System Admin |
| **J** | 46–50 | Testing, Security, Deployment |

---

## Key Architectural Changes

### Before (Current State)
```
Frontend (static data) → POST { official_name, district: "Kathmandu", province: "Bagmati", ... }
                                                      ↓
Backend → INSERT INTO municipalities (creates NEW row, is_active = true by default)
          → createUserService → link head_profile_id
```

### After (New Flow)
```
Frontend (DB-backed dropdowns) → POST { municipality_id: "uuid", head_name, head_email, password? }
                                                      ↓
Backend → SELECT FROM municipalities WHERE id = ? AND is_active = false
          → createUserService (municipality_head role)
          → UPDATE municipalities SET is_active = true, head_profile_id = ?, head_name = ?, head_email = ?
          → Auto-create wards (1..total_wards)
          → Return { municipality, temp_password }
```

### DB Schema — Key Columns
```sql
municipalities (
  id UUID PK,
  district_id UUID FK → districts(id),
  official_name TEXT,
  local_level_type local_level_type,
  total_wards INTEGER,
  is_active BOOLEAN DEFAULT FALSE,  -- KEY CHANGE: default false
  head_profile_id UUID FK → profiles(id),
  head_name TEXT,
  head_email TEXT,
  ...
)
```

### Frontend Data Flow
```
1. GET /provinces → [Province Dropdown]
2. GET /districts?province_id=xxx → [District Dropdown]
3. GET /municipalities/reference?district_id=xxx&is_active=false → [Municipality Dropdown]
4. User fills head details → POST /municipalities/provision { municipality_id, head_name, head_email }
5. Show success with temp credentials
6. Refresh active municipality list
```
