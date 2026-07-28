# First-Login Self-Onboarding & Profile Activation — Old vs New Audit

## Current State Summary

The **Supabase schema** is already 100% complete — `onboarding_status` enum has all 5 values (`invited`, `pending_onboarding`, `active`, `expired`, `suspended`), `role_invites` and `onboarding_wizard_progress` tables exist, and `profiles` has all onboarding columns. The **TypeScript types** lag behind (ProfileRow missing 9 onboarding columns, no RoleInviteRow/OnboardingWizardProgressRow types, no Database map entries). The **backend code** has no invite flow — all staff/dept head/muni head accounts are created directly with `status = active`, bypassing the entire onboarding wizard.

| Area | Status |
|------|--------|
| **Schema (SQL)** | ✅ 100% — all enums, tables, columns exist |
| **TypeScript types** | ❌ `ProfileRow` missing 9 onboarding columns, 2 table types + DB map entries missing |
| **app.ts constants** | ❌ `ACCOUNT_STATUS` has `INACTIVE` instead of `invited/pending_onboarding/expired` |
| **Backend services** | ❌ No `RoleInviteService`, no `OnboardingWizardService`, no guard middleware, no public invite endpoints |
| **Staff creation** | ❌ Direct creation via `createUserService` with `account_status: "active"` — no invite flow |
| **Identity upload** | ⚠️ Citizen identity upload exists; staff identity upload does not |
| **Frontend** | ❌ All wizard UI, invite acceptance page, invite management pages missing |

---

## Critical Issues

### C1 — ProfileRow Missing 9 Onboarding Columns

Schema (Supabase_Schema.sql:158-174) has these on `profiles`:
- `alternate_phone`, `designation`, `employee_id`, `onboarding_wizard_completed`, `onboarding_completed_at`, `identity_type`, `identity_number`, `identity_document_url`, `identity_verified_at`

Current **ProfileRow** (database.type.ts:245-261):
```typescript
export interface ProfileRow {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  account_status: AccountStatus;
  municipality_id: string | null;
  department_id: string | null;
  force_password_reset: boolean;
  created_by: string | null;
  last_login_at: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}
```

**Impact:** Any code reading `profiles.alternate_phone` or `profiles.designation` would have no compile-time safety. The identity document upload for staff cannot store its results in typed columns.

**Files affected:** database.type.ts:245-261

---

### C2 — Missing RoleInviteRow and OnboardingWizardProgressRow Types

Schema defines:
1. `role_invites` table (Supabase_Schema.sql:307-325) — 17 columns: id, email, phone, token, role, municipality_id, department_id, staff_role, additional_data, invited_by, expires_at, used_at, is_used, is_revoked, revoked_at, created_at
2. `onboarding_wizard_progress` table (Supabase_Schema.sql:330-341) — 11 columns: id, profile_id, current_step, step1-4_completed, wizard_completed_at, created_at, updated_at

Neither has a TypeScript type, and neither is in the Database map.

**Files affected:** database.type.ts — missing types + missing map entries at lines 889 area

---

### C3 — `app.ts` ACCOUNT_STATUS Constant Outdated

Current constant (app.ts:38-42):
```typescript
export const ACCOUNT_STATUS = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  INACTIVE: 'inactive',    // <--- DOES NOT EXIST in schema
} as const;
```

Schema enum `onboarding_status` has: `invited`, `pending_onboarding`, `active`, `expired`, `suspended` — `inactive` is not in the enum.

**Impact:** The `ACCOUNT_STATUS` constant is used throughout the codebase for middleware checks and status updates. It cannot reference `invited`, `pending_onboarding`, or `expired` statuses, which blocks the entire onboarding flow.

**Files affected:** app.ts:38-42

---

### C4 — `auth.service.ts` Hardcodes `account_status: "active"` on User Creation

`loginService` (auth.service.ts:93-101):
```typescript
const { error: insertProfileErr } = await supabaseAdmin.from("profiles").upsert({
  ...
  account_status: "active",       // <--- SHOULD be "pending_onboarding" for staff/dept head/muni head
});
```

`createUserService` (auth.service.ts:254-267) creates auth users via `supabaseAdmin.auth.admin.createUser()` which triggers the `handle_new_user` DB trigger (Supabase_Schema.sql:1050-1059). The trigger sets `account_status` via `raw_user_meta_data->>'account_status'` which is never passed, so it defaults to... the trigger always inserts without account_status, so the DB default `'invited'` applies. But then line 101 in `loginService` overwrites it to `'active'`.

Wait — let me check the trigger more carefully. The handle_new_user function at line 1050 inserts:
```sql
INSERT INTO public.profiles (id, email, full_name, phone, role, municipality_id, department_id)
```
Without specifying `account_status` — but the schema default is `'invited'` (line 148: `account_status onboarding_status NOT NULL DEFAULT 'invited'`). So the trigger creates it as `'invited'`, but then `loginService` overwrites to `'active'`.

**Impact:** ALL users — including staff, department heads, and municipality heads — bypass the onboarding process entirely and are immediately ACTIVE.

**Files affected:** auth.service.ts:101

---

### C5 — No RoleInviteService — Staff Created Directly

The PLAN (Phase 6-7) requires invite-based creation:
1. Admin inputs email/phone → system generates invite token
2. Token emailed to user
3. User clicks link → accepts invite → wizard starts

Current `createUserService` (auth.service.ts:235-303):
- Creates auth user immediately with `email_confirm: true`
- Sets `onboarded_at` immediately
- Password is provided by the admin, not the user
- No invite token, no acceptance step, no wizard initiation

Both `municipality.controller.ts:createStaff` (line 253) and `department.controller.ts:createStaff` (line 175) use `createUserService` directly.

**Impact:** No first-login onboarding possible. Users are active before they've set their own password or completed any profile.

**Files affected:** auth.service.ts:235-303, municipality.controller.ts:253-288, department.controller.ts:175-244

---

### C6 — No Onboarding Guard Middleware

The PLAN (Phase 12, 31) requires middleware that:
- Blocks `invited` accounts (must accept invite first)
- Blocks `pending_onboarding` accounts except for `/api/onboarding/*` routes
- Blocks `expired` accounts
- Blocks `suspended` accounts

Current middleware (all files) only checks:
```typescript
profile.account_status !== "active"  // rejects ALL non-active statuses
```

This means if we fix the status to use `pending_onboarding`, EVERYTHING breaks — users can't even access the wizard because middleware rejects them. There's no whitelist for `/api/onboarding/*` routes.

**Files affected:**
- municipality.middleware.ts:31
- department.middleware.ts:31
- staff.middleware.ts:27
- superadmin.routes.ts:35

---

### C7 — No Onboarding Wizard Endpoints

The PLAN (Phase 13) requires 5+ wizard endpoints:
- `GET /api/onboarding/status` — current step
- `POST /api/onboarding/step1` — credentials + MFA
- `POST /api/onboarding/step2` — personal details
- `POST /api/onboarding/step3` — identity upload
- `POST /api/onboarding/step4` — finalize
- `GET /api/onboarding/required-fields` — tier-specific fields

None exist. No `onboarding` module folder, no routes, no controller, no service.

---

### C8 — No Public Invite Acceptance Endpoints

The PLAN (Phase 9) requires:
- `GET /api/public/invite/validate?token=` — validate invite
- `POST /api/public/invite/accept` — accept invite, create auth user, start wizard

No public module routes for invite handling exist.

---

### C9 — No Staff Identity Upload

Citizen identity upload exists (citizen.service.ts:538-597) with:
- Front + back image upload to `identity-documents` bucket
- KYC status management
- Duplicate identity number check

Staff identity upload does not exist at all. The plan requires:
- Identity document upload to `staff-identity-documents` bucket
- Identity verification by municipality head / super admin
- Different identity types per role (citizenship, national_id, official_id, staff_badge)

---

### C10 — No Invite Expiry Cron or Wizard Timeout Handling

The PLAN (Phase 15, 33) requires:
- `InviteExpiryCron` — hourly: expire invites > 24h old
- Wizard timeout: reminder after 24h on same step, admin notify after 7 days, auto-expire after 30 days

None of this exists.

---

### C11 — No Onboarding Audit Trail

The PLAN (Phase 34) requires audit logging for:
- Each wizard step completion
- Invite sent/resend/expired
- Onboarding completed/reset

Current `AuditAction` type (database.type.ts:154-163) has: `LOGIN | LOGOUT | INSERT | UPDATE | DELETE | STATUS_CHANGE | ROLE_CHANGE | ASSIGN | EXPORT`. Missing: `ONBOARDING_STEP1_COMPLETED`, `ONBOARDING_COMPLETED`, `INVITE_SENT`, etc.

---

### C12 — No Invite Management Endpoints

The PLAN (Phase 31-32, 41-43) requires:
- `GET /api/v1/municipality/onboarding/pending` — pending staff
- `GET /api/v1/municipality/onboarding/expired` — expired invites
- `POST /api/v1/municipality/onboarding/:id/resend` — resend invite
- `POST /api/v1/municipality/onboarding/:id/cancel` — cancel
- `GET /api/v1/superadmin/onboarding/overview` — platform-wide
- `POST /api/v1/superadmin/onboarding/reset/:profileId` — reset wizard

None exist. Municipality controller has `updateUserStatus` but it's generic (municipality.repository.ts:314) and not invite-specific.

---

## Old Code Audit (per file with line numbers)

### 1. `src/types/database.type.ts`

| Lines | Issue |
|-------|-------|
| 12-17 | ✅ `AccountStatus` correctly has `invited | pending_onboarding | active | expired | suspended` |
| 245-261 | ❌ `ProfileRow`: missing 9 onboarding columns (`alternate_phone`, `designation`, `employee_id`, `onboarding_wizard_completed`, `onboarding_completed_at`, `identity_type`, `identity_number`, `identity_document_url`, `identity_verified_at`) |
| **MISSING** | ❌ No `RoleInviteRow` type |
| **MISSING** | ❌ No `OnboardingWizardProgressRow` type |
| **MISSING** | ❌ No `role_invites` entry in Database map |
| **MISSING** | ❌ No `onboarding_wizard_progress` entry in Database map |
| **MISSING** | ❌ `invite_purpose` missing from Enums block |
| 925-944 | ✅ `handoff_type`, `notification_type`, `notification_channel` already added |

### 2. `src/app.ts`

| Lines | Issue |
|-------|-------|
| 38-42 | ❌ `ACCOUNT_STATUS = { ACTIVE, SUSPENDED, INACTIVE }` — `INACTIVE` doesn't exist in schema; missing `INVITED`, `PENDING_ONBOARDING`, `EXPIRED` |

### 3. `src/modules/auth/services/auth.service.ts`

| Lines | Issue |
|-------|-------|
| 93-101 | ❌ `loginService` hardcodes `account_status: "active"` — overwrites DB default `'invited'` |
| 235-303 | ❌ `createUserService`: creates users directly with password, no invite token, `email_confirm: true`, `onboarded_at` set immediately |
| 282-289 | ❌ Sets `onboarded_at` for staff/dept head — should only happen after wizard completion |
| ALL | ❌ No invite creation, validation, or consumption logic |

### 4. `src/modules/municipality/controller/municipality.controller.ts`

| Lines | Issue |
|-------|-------|
| 253-288 | ❌ `createStaff` — direct user creation via `createUserService`, no invite flow |
| 336-355 | ❌ `onboardStaffProfile` — legacy direct staff table insert |
| 370-413 | ❌ `createUser` — generic user creation for dept head/staff |
| ALL | ❌ No invite management endpoints |

### 5. `src/modules/department/controller/department.controller.ts`

| Lines | Issue |
|-------|-------|
| 175-244 | ❌ `createStaff` — direct user creation via `createUserService`, no invite flow |

### 6. Middleware Files (all guard middleware)

| File | Lines | Issue |
|------|-------|-------|
| municipality.middleware.ts | 31 | ❌ Only checks `!== 'active'` — no `pending_onboarding` / `invited` handling |
| department.middleware.ts | 31 | ❌ Same |
| staff.middleware.ts | 27 | ❌ Same |
| superadmin.routes.ts | 35 | ❌ Same |

### 7. `src/modules/municipality/repository/municipality.repository.ts`

| Lines | Issue |
|-------|-------|
| 314 | ❌ `updateUserStatus` uses `status as any` — no type safety for onboarding statuses |

### 8. `src/modules/superadmin/middleware/superadmin.repository.ts`

| Lines | Issue |
|-------|-------|
| 91 | ❌ `update({ account_status: status })` — generic, no onboarding context |

---

## New Target Implementation (per PLAN-50 and Supabase_Schema.sql)

### Schema Already Complete ✅

| Phase | What | Schema Status |
|-------|------|:------------:|
| Phase 1 | `invited`, `pending_onboarding`, `expired` in status enum | ✅ `onboarding_status` already has all 5 values |
| Phase 2 | `role_invites` table | ✅ Exists at Supabase_Schema.sql:307 |
| Phase 3 | `onboarding_wizard_progress` table | ✅ Exists at Supabase_Schema.sql:330 |
| Phase 4 | Profile expansion columns | ✅ All 9 columns exist on `profiles` (alternate_phone, etc.) |
| Phase 5 | Identity documents storage bucket | ⚠️ Partially — citizen identity bucket exists, staff bucket doesn't |

### Target: Phase 6 — RoleInviteService
- `createInvite(invitedBy, email, role, context, additionalData?)`
- `validateInvite(token)` — check exists, not expired, not used, not revoked
- `consumeInvite(token, profileId)` — mark as used
- `revokeInvite(token, revokedBy)`, `resendInvite(inviteId)`
- `getPendingByRole(role, scopeId)` — list pending
- File: `src/service/role-invite.service.ts` (NEW)

### Target: Phase 7-8 — Rewrite Staff/Dept Head Creation to Use Invite
- Modify `POST /api/v1/municipality/staff/onboard` → return invite token, not password
- Modify `POST /api/v1/department/staff/create` → same
- Backward compat: `?skipInvite=true` for testing
- After department provisioning: generate invite for dept head

### Target: Phase 9 — Public Invite Endpoints
- `GET /api/public/invite/validate?token=`
- `POST /api/public/invite/accept` — creates auth user, status = PENDING_ONBOARDING, starts wizard

### Target: Phase 10 — Invite Email Dispatch
- Email templates per role (muni head, dept head, staff)
- Link: `https://admin.smartcivic.gov/accept-invite?token={token}`
- Auto-retry on send failure (max 3)

### Target: Phase 11 — OnboardingWizardService
- `getWizardState(profileId)`, `getRequiredFields(profileId, role)`
- `completeStep(profileId, stepNumber, data)` — validate + save + advance
- `finalizeOnboarding(profileId)` — set ACTIVE, log, notify admin
- File: `src/service/onboarding-wizard.service.ts` (NEW)

### Target: Phase 12 — Onboarding Guard Middleware
- Block: `invited` → "Accept your invitation first"
- Block: `pending_onboarding` except `/api/onboarding/*`
- Block: `expired` → "Invitation expired"
- Block: `suspended` → "Account suspended"
- Allow: `active`
- File: `src/middleware/onboarding-guard.ts` (NEW)

### Target: Phase 13 — Wizard API Endpoints
- `GET /api/onboarding/status`, `/api/onboarding/required-fields`
- `POST /api/onboarding/step1` (password + MFA)
- `POST /api/onboarding/step2` (personal details)
- `POST /api/onboarding/step3` (identity upload, multipart)
- `POST /api/onboarding/step4` (finalize)
- Files: `src/modules/onboarding/routes/onboarding.routes.ts`, controller, service

### Target: Phase 14-15 — Tier-Specific Config & Invite Expiry Cron
- Config: password min length (16/12), MFA mandatory/recommended, identity types per role
- `InviteExpiryCron`: hourly, expire invites > 24h, cleanup > 30 days
- Wizard timeout: reminder after 24h, notify admin after 7d, expire after 30d

### Target: Phase 16-20 — Step 1: Credentials & MFA
- Password setup against policy (16+ chars for muni/dept head, 12+ for staff)
- MFA enrollment (mandatory for muni/dept head, optional for staff)
- Emergency contact (alternate_phone) in step 2
- Designation/expertise based on role
- Step validation with rollback

### Target: Phase 21-25 — Step 3: Identity Proof
- Identity document upload to `staff-identity-documents` bucket
- Validation: file size (5MB), types (jpg/png/pdf), identity number format
- Identity verification by admin (municipality head for staff, super admin for heads)
- Document re-upload (max 3 attempts)
- Step 4: Review & Finalize → set ACTIVE

### Target: Phase 26-30 — Re-Verification
- Email/phone change triggers re-verification
- Profile edit with verification
- Identity re-upload post-onboarding
- `GET /api/auth/me` enhanced with onboarding status
- Admin profile view with onboarding progress

### Target: Phase 31-35 — Security & Oversight
- Onboarding guard middleware (full implementation)
- Pending onboarding admin panel
- Wizard timeout handling
- Onboarding audit trail (new AuditAction values)
- Onboarding analytics

### Target: Phase 36-40 — Frontend Wizard UI
- AcceptRoleInvite page
- WizardContainer with 4-step stepper
- Step 1-4 components (password/MFA, details, identity, review)
- Post-activation redirect to role-specific dashboard

### Target: Phase 41-45 — Frontend Admin Panels
- InviteManager (municipality head + department head)
- SuperAdmin OnboardingOverview
- Profile pages with re-verification UI
- Navigation updates for onboarding status

### Target: Phase 46-50 — Tests & Docs
- Backend tests: invite/activation, wizard steps, re-verification
- Frontend tests: accept invite, wizard, invite manager
- Documentation

---

## Old-to-New Mapping

| Old Component | New Component | Strategy |
|---------------|--------------|----------|
| `ProfileRow` (15 cols) | Extended `ProfileRow` (24 cols) | Add 9 onboarding columns |
| No `RoleInviteRow` | `RoleInviteRow` type + DB map entry | Create |
| No `OnboardingWizardProgressRow` | `OnboardingWizardProgressRow` type + DB map entry | Create |
| No `invite_purpose` in Enums | Add to Enums block | Create |
| `ACCOUNT_STATUS = { active, suspended, inactive }` | `ACCOUNT_STATUS = { invited, pending_onboarding, active, expired, suspended }` | Rewrite |
| `auth.service.ts:101` hardcodes `active` | Use `"pending_onboarding"` for invited staff/head roles | Fix |
| `createUserService` (direct creation) | RoleInviteService + invite acceptance flow | Rewrite |
| `municipality.controller.createStaff` (direct) | Invite-based creation (return token, not password) | Rewrite |
| `department.controller.createStaff` (direct) | Invite-based creation | Rewrite |
| No `RoleInviteService` | Full invite service (create, validate, consume, revoke, resend) | Create |
| No `OnboardingWizardService` | Full wizard service (4 steps, tier config, finalize) | Create |
| No onboarding guard middleware | `onboardingGuardMiddleware` (whitelist `/api/onboarding/*`) | Create |
| Middleware: `!== 'active'` only | 5-state handling (invited, pending_onboarding, active, expired, suspended) | Fix all 4 middleware files |
| Status check: `status as any` | Type-safe onboarding status references | Fix |
| No wizard endpoints | 5+ endpoints in new `onboarding` module | Create |
| No public invite endpoints | 2 endpoints in `public` module | Create |
| Citizen identity upload exists | Staff identity upload + tier-specific validation + admin verification | Create |
| No invite expiry/wizard timeout | 2 cron jobs + reminder logic | Create |
| `AuditAction` missing onboarding events | Add `ONBOARDING_STEP1_COMPLETED`, `ONBOARDING_COMPLETED`, etc. | Extend |
| No invite management endpoints | 6+ endpoints across municipality + superadmin | Create |
| No frontend wizard | 5 pages + 4 step components | Create |
| No frontend admin panels | 3 pages (munic head invite, dept head invite, super admin overview) | Create |

---

## Sprint Plan (4 Sprints)

### Sprint 1 — Database & Types (Phases 1-5 — mostly done, fill gaps)
1. Add 9 onboarding columns to `ProfileRow` (alternate_phone, designation, employee_id, etc.)
2. Create `RoleInviteRow` type + Database map entry
3. Create `OnboardingWizardProgressRow` type + Database map entry
4. Add `invite_purpose` to Enums block
5. Fix `app.ts` `ACCOUNT_STATUS` constant (remove `inactive`, add `invited`, `pending_onboarding`, `expired`)
6. Fix `auth.service.ts:101` to use `"pending_onboarding"` for non-citizen roles
7. Create migration to create `staff-identity-documents` storage bucket

### Sprint 2 — Invite System & Public Endpoints (Phases 6-10, 15)
1. Create `RoleInviteService` (create, validate, consume, revoke, resend, getPending)
2. Create public invite endpoints (validate + accept)
3. Rewrite `createUserService` to work as invite-acceptance handler
4. Rewrite `municipality.controller.createStaff` to use invites
5. Rewrite `department.controller.createStaff` to use invites
6. Add invite-based dept head creation to department provisioning
7. Create invite email dispatch with role-specific templates
8. Create `InviteExpiryCron` (hourly)
9. Write invite tests

### Sprint 3 — Wizard Engine & Guard (Phases 11-20, 31-35)
1. Create `OnboardingWizardService` (getWizardState, completeStep, finalize)
2. Create tier-specific field configuration
3. Create onboarding guard middleware
4. Fix all 4 middleware files to handle 5 account statuses
5. Create `onboarding` module (routes, controller, service)
6. Create step 1 endpoint (password + MFA)
7. Create step 2 endpoint (personal details, emergency contact)
8. Create step 3 endpoint (identity upload, staff bucket)
9. Create step 4 endpoint (finalize → ACTIVE)
10. Create invite management endpoints (pending, expired, resend, cancel, reset)
11. Create wizard timeout handling (remind after 24h, admin notify at 7d, expire at 30d)
12. Add onboarding audit events to AuditAction type
13. Create onboarding analytics endpoints
14. Write wizard + guard tests

### Sprint 4 — Frontend UI & Documentation (Phases 36-50)
1. Create `AcceptRoleInvite.tsx` page
2. Create `WizardContainer.tsx` with 4-step stepper
3. Create step 1 component (password + MFA)
4. Create step 2 component (personal details)
5. Create step 3 component (identity upload)
6. Create step 4 component (review & submit)
7. Add post-activation redirect logic
8. Create `InviteManager.tsx` (municipality head)
9. Create `InviteManager.tsx` (department head, scoped)
10. Create `OnboardingOverview.tsx` (super admin)
11. Update profile pages with re-verification UI
12. Update navigation guards for account status
13. Write all frontend tests
14. Create documentation
15. Seed default onboarding field configs
16. Lint + typecheck all changed code

---

## Summary of Changes

| Category | Old | New |
|----------|-----|-----|
| **ProfileRow columns** | 15 | 24 (add altern_phone, designation, employee_id, wizard_completed, completed_at, identity_type/number/doc_url/verified_at) |
| **Types defined** | 0 onboarding-specific | 2 (RoleInviteRow, OnboardingWizardProgressRow) |
| **Database map entries** | 0 onboarding entries | 2 new entries |
| **Enums block** | Missing `invite_purpose` | Add `invite_purpose` |
| **ACCOUNT_STATUS constant** | `{ active, suspended, inactive }` | `{ invited, pending_onboarding, active, expired, suspended }` |
| **User creation default status** | `"active"` | `"pending_onboarding"` for staff/head roles |
| **Staff creation** | Direct with password (no invite) | Invite-based (admin → token → email → accept → wizard) |
| **RoleInviteService** | None | Full service: create, validate, consume, revoke, resend, list |
| **OnboardingWizardService** | None | 4-step wizard with tier-specific config, validation, finalize |
| **Guard middleware** | `!== 'active'` only (blocks all non-active) | 5-state routing (invited → error, pending_onboarding → whitelist, active → allow, etc.) |
| **Public invite endpoints** | None | 2 endpoints (validate + accept) |
| **Wizard endpoints** | None | 5+ endpoints in new `onboarding` module |
| **Invite management endpoints** | None | 6+ across municipality + superadmin |
| **Staff identity upload** | None | Upload with role-specific identity types, admin verification, re-upload |
| **Invite expiry** | None | Hourly cron (24h expiry) + wizard timeout (24h/7d/30d) |
| **Audit events** | `LOGIN, LOGOUT, ...` | Add `ONBOARDING_STEP_N_COMPLETED`, `ONBOARDING_COMPLETED`, `INVITE_SENT`, etc. |
| **Citizen identity upload** | Exists (front + back, KYC status) | Keep as-is (separate from staff identity system) |
| **Onboarding analytics** | None | Pending/completed/expired counts, avg completion time, completion rate |
| **Frontend wizard** | None | 5 pages (accept invite + 4 wizard steps) |
| **Frontend admin panels** | None | 3 pages (munic head invite, dept head invite, super admin overview) |
| **Profile re-verification UI** | None | Enhanced profile pages with MFA, email/phone badge, identity re-upload |
| **Tests** | 0 onboarding tests | 3 backend test files + 3 frontend test files |
