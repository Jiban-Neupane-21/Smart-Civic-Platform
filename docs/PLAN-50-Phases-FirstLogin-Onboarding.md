# First-Login Self-Onboarding & Profile Activation — 50-Phase Plan

## Blueprint Overview: Forced Profile Wizard

```text
              [ INVITATION DISPATCH ] (Admin inputs Email/Phone only)
                                 │
                                 ▼
          [ UNIQUE Cryptographic Activation Link Sent ]
                                 │
                                 ▼
                   [ FIRST-TIME SIGN-IN DETECTED ]
                                 │
                [ FORCED PROFILE WIZARD INTERCEPT ]
              (Account Status: PENDING_ONBOARDING)
                                 │
       ┌─────────────────────────┼─────────────────────────┐
       ▼                         ▼                         ▼
[ STEP 1: CREDENTIALS ]   [ STEP 2: DETAILS ]       [ STEP 3: KYC PROOF ]
• Password creation       • Full legal name         • Govt ID / Staff Badge
• Mandatory MFA Setup     • Emergency Contact       • Document Upload
       │                         │                         │
       └─────────────────────────┼─────────────────────────┘
                                 │
                                 ▼
              [ SYSTEM VALIDATION & COMPLIANCE CHECK ]
                                 │
                [ ACCOUNT STATUS: ACTIVE / VERIFIED ]
                    (Full Workspace Unlocked)
```

### Onboarding State Machine
```
INVITED ──► PENDING_ONBOARDING ──► ACTIVE ──► (normal operations)
  │            │                       │
  │ (expires   │ (wizard incomplete)   └── SUSPENDED (compliance)
  │  24h)      │                          │
  └── EXPIRED  └── re-trigger via admin   └── REACTIVATED
```

### Tier-Specific Customization
| Step | Muni Head | Dept Head | Staff |
|------|-----------|-----------|-------|
| MFA | Mandatory | Mandatory | Recommended |
| Identity | National ID / Citizenship | National ID / Official ID | Staff Badge / National ID |
| Context | Entire Municipality | Specific Department | Department & Ward |

---

## WHAT EXISTS (current state)

- **Staff created** via `/api/v1/municipality/staff/onboard` and `/api/v1/department/staff/create` — direct creation, no invite flow
- **Department head created** as part of department provisioning — direct creation
- **Profiles table**: full_name, email, phone, role, municipality_id, department_id, account_status
- **Staff table**: employee_id, expertise, contact_number, gender, DOB, personal_address, employee_status
- **No invite/accept flow** exists for non-citizen roles
- **No PENDING_ONBOARDING state** — accounts go directly to ACTIVE
- **No profile wizard UI** exists
- MFA enforcement from Super Admin plan exists but is not integrated here

---

## DOMAIN A — Database: Onboarding Schema (Phases 1–5)

### Phase 1: Add `PENDING_ONBOARDING` to Account Status Enum
- Current: `active | inactive | suspended`
- Add: `invited`, `pending_onboarding`, `expired`
- Migration: `ALTER TYPE account_status ADD VALUE 'invited'`
- Migration: `ALTER TYPE account_status ADD VALUE 'pending_onboarding'`
- Migration: `ALTER TYPE account_status ADD VALUE 'expired'`

Files:
- `supabase/migrations/v8-onboarding-status-enum.sql` (NEW)
- `Smart_Civic_Platform_Backend/src/types/database.type.ts`

### Phase 2: Create `role_invites` Table (Unified Invite System)
```sql
CREATE TABLE role_invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL,
    phone TEXT,
    token TEXT NOT NULL UNIQUE,
    role user_role NOT NULL, -- municipality_head | department_head | staff
    municipality_id UUID REFERENCES municipalities(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    staff_role TEXT, -- field_inspector | office_staff | etc.
    additional_data JSONB, -- flexible: designation, expertise, etc.
    invited_by UUID NOT NULL REFERENCES profiles(id),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours',
    used_at TIMESTAMPTZ,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_role_invites_token ON role_invites(token);
CREATE INDEX idx_role_invites_email ON role_invites(email);
```

Files:
- `supabase/migrations/v8-role-invites.sql` (NEW)

### Phase 3: Create `onboarding_wizard_progress` Table
```sql
CREATE TABLE onboarding_wizard_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    current_step INTEGER NOT NULL DEFAULT 1, -- 1-4
    step1_completed BOOLEAN NOT NULL DEFAULT FALSE, -- credentials
    step2_completed BOOLEAN NOT NULL DEFAULT FALSE, -- details
    step3_completed BOOLEAN NOT NULL DEFAULT FALSE, -- KYC
    step4_completed BOOLEAN NOT NULL DEFAULT FALSE, -- review
    wizard_completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (profile_id)
);
```

Files:
- `supabase/migrations/v8-onboarding-progress.sql` (NEW)

### Phase 4: Add Profile Expansion Columns for Onboarding
- Add to `profiles`:
  - `alternate_phone TEXT` — emergency contact
  - `designation TEXT` — job title/role within org
  - `employee_id TEXT` — moved from staff table for unified access
  - `onboarding_wizard_completed BOOLEAN NOT NULL DEFAULT FALSE`
  - `onboarding_completed_at TIMESTAMPTZ`
  - `identity_type TEXT` — citizenship | national_id | passport | official_id | staff_badge
  - `identity_number TEXT`
  - `identity_document_url TEXT` — uploaded document
  - `identity_verified_at TIMESTAMPTZ`

Files:
- `supabase/migrations/v8-profile-onboarding-columns.sql` (NEW)

### Phase 5: Create `identity_documents` Storage Bucket
- Supabase bucket: `staff-identity-documents`
- Path pattern: `{municipality_id}/{profile_id}/{type}-{uuid}.{ext}`
- Policies: user can upload own, super admin and municipality head can read
- Max file size: 5MB
- Accepted: jpg, png, pdf

Files:
- `supabase/migrations/v8-identity-storage.sql` (NEW)

---

## DOMAIN B — Backend: Invite & Activation System (Phases 6–10)

### Phase 6: Create Unified Invite Service
- `RoleInviteService`:
  - `createInvite(invitedBy, email, role, context, additionalData?)` — generate token, store
    - Token: `crypto.randomBytes(24).toString('hex')` — 48-char hex
    - Expiry: 24 hours from now
    - Context: municipality_id ± department_id depending on role
  - `validateInvite(token)` — check exists, not expired, not used, not revoked
  - `consumeInvite(token, profileId)` — mark as used
  - `revokeInvite(token, revokedBy)` — revoke before use
  - `resendInvite(inviteId)` — regenerate token, reset expiry, re-send email
  - `getPendingByRole(role, scopeId)` — list pending invites for a municipality/department

Files:
- `Smart_Civic_Platform_Backend/src/service/role-invite.service.ts` (NEW)

### Phase 7: Rewrite Staff Creation to Use Invite
- Current: staff created directly with password → account is ACTIVE
- New flow:
  1. Admin creates staff → system generates invite token
  2. Token emailed to staff email
  3. Staff clicks link → enters password → wizard starts
  4. Account transitions: INVITED → PENDING_ONBOARDING → ACTIVE
- Modify: `POST /api/v1/municipality/staff/onboard` — return invite token instead of password
- Modify: `POST /api/v1/department/staff/create` — same
- Backward compat: keep direct creation for testing (add `?skipInvite=true`)

Files:
- `Smart_Civic_Platform_Backend/src/modules/municipality/controller/municipality.controller.ts`
- `Smart_Civic_Platform_Backend/src/modules/department/controller/department.controller.ts`
- `Smart_Civic_Platform_Backend/src/modules/auth/services/auth.service.ts`

### Phase 8: Rewrite Department Head Creation to Use Invite
- Current: dept head created directly during department provisioning
- New flow: same invite-based approach
- After department is created and dept head profile created:
  - Generate invite token
  - Send activation email
  - Dept head status = INVITED until they complete wizard
- Modify department provisioning endpoint

Files:
- `Smart_Civic_Platform_Backend/src/modules/municipality/controller/municipality.controller.ts`

### Phase 9: Add Public Invite Acceptance Endpoint
- `GET /api/public/invite/validate?token=` — validate invite
  - Returns: `{ valid, email, role, municipality_name, department_name?, expires_at }`
- `POST /api/public/invite/accept` — accept invite
  - Accept: `{ token }`
  - Creates auth user with temp password
  - Creates profile with role + org context (status = PENDING_ONBOARDING)
  - Consumes invite token
  - Returns: JWT (limited scope — only wizard access)
  - Redirect: user is sent to `/onboarding/wizard`

Files:
- `Smart_Civic_Platform_Backend/src/modules/public/routes/public.routes.ts`
- `Smart_Civic_Platform_Backend/src/modules/public/controller/public.controller.ts`
- `Smart_Civic_Platform_Backend/src/modules/public/services/public.service.ts`

### Phase 10: Add Invite Email Dispatch
- On invite creation: send email with activation link
- Link format: `https://admin.smartcivic.gov/accept-invite?token={token}`
- Templates per role:
  - Municipality Head: "You have been appointed as Municipality Head of [Name]. Click to activate."
  - Department Head: "You have been appointed as Department Head of [Dept] in [Muni]. Click to activate."
  - Staff: "You have been registered as [Staff Role] in [Dept], [Muni]. Click to activate."
- Auto-retry on send failure (max 3)

Files:
- `Smart_Civic_Platform_Backend/src/service/role-invite.service.ts`
- `Smart_Civic_Platform_Backend/src/service/dispatchers/email.dispatcher.ts`

---

## DOMAIN C — Backend: 3-Step Wizard Engine & State Machine (Phases 11–15)

### Phase 11: Create Onboarding Wizard Service
- `OnboardingWizardService`:
  - `getWizardState(profileId)` — return current step + completion status
  - `getRequiredFields(profileId, role)` — return tier-specific field list
  - `completeStep(profileId, stepNumber, data)` — validate + save + advance
  - `getWizardStatus(profileId)` — step1..4 completed booleans
  - `finalizeOnboarding(profileId)` — set ACTIVE, log completion, notify admin
- Steps:
  1. Credentials (password set, MFA enrolled — MFA mandatory for muni/dept head)
  2. Personal Details (name, phone, emergency contact, designation)
  3. Identity Proof (document type, number, upload)
  4. Review & Submit

Files:
- `Smart_Civic_Platform_Backend/src/service/onboarding-wizard.service.ts` (NEW)

### Phase 12: Add Wizard State Machine Middleware
- Middleware: `onboardingGuardMiddleware`:
  - If `req.user.account_status === 'pending_onboarding'`:
    - Allow: `/api/onboarding/*`, `/api/auth/*` (logout, MFA)
    - Block: everything else → 403 "Complete profile setup before accessing this resource."
  - If `req.user.account_status === 'invited'`:
    - Block all API access → 403 "Please accept your invitation first."
  - If `req.user.account_status === 'expired'`:
    - Block all API access → 403 "Your invitation has expired. Contact your administrator."

Files:
- `Smart_Civic_Platform_Backend/src/middleware/onboarding-guard.ts` (NEW)

### Phase 13: Add Wizard API Endpoints
- `GET /api/onboarding/status` — current step + progress
- `POST /api/onboarding/step1` — complete step 1 (password + MFA)
  - Accept: `{ password, mfa_code? }`
- `POST /api/onboarding/step2` — complete step 2 (personal details)
  - Accept: `{ full_name, phone, alternate_phone?, designation? }`
- `POST /api/onboarding/step3` — complete step 3 (identity proof)
  - Accept: multipart — `{ identity_type, identity_number, document }`
- `POST /api/onboarding/step4` — final review & submit
- `GET /api/onboarding/required-fields` — tier-specific field list

Files:
- `Smart_Civic_Platform_Backend/src/modules/onboarding/routes/onboarding.routes.ts` (NEW)
- `Smart_Civic_Platform_Backend/src/modules/onboarding/controller/onboarding.controller.ts` (NEW)
- `Smart_Civic_Platform_Backend/src/modules/onboarding/services/onboarding.service.ts` (NEW)

### Phase 14: Add Tier-Specific Field Configuration
- Muni Head:
  - Step 1: Password (16+ chars), MFA (mandatory)
  - Step 2: full_name, phone, alternate_phone, designation ("Municipality Head")
  - Step 3: identity_type (citizenship|national_id), identity_number, document
- Dept Head:
  - Step 1: Password (16+ chars), MFA (mandatory)
  - Step 2: full_name, phone, alternate_phone, designation
  - Step 3: identity_type (citizenship|national_id|official_id), identity_number, document
- Staff:
  - Step 1: Password (12+ chars), MFA (recommended, skippable)
  - Step 2: full_name, phone, alternate_phone?, designation, expertise
  - Step 3: identity_type (staff_badge|national_id), identity_number, document

Files:
- `Smart_Civic_Platform_Backend/src/config/onboarding-fields.ts` (NEW)

### Phase 15: Add Invite Expiry Cron
- `InviteExpiryCron` — runs every hour
  - Query: `SELECT FROM role_invites WHERE expires_at < NOW() AND is_used = FALSE AND is_revoked = FALSE`
  - For each: mark as expired, log to audit
  - Notify: if any pending staff invites expired, notify the inviting admin
- Auto-cleanup: delete invites older than 30 days

Files:
- `Smart_Civic_Platform_Backend/src/service/invite-expiry.service.ts` (NEW)

---

## DOMAIN D — Backend: Step 1 — Credentials & MFA (Phases 16–20)

### Phase 16: Integrate Password Setup in Wizard Step 1
- `POST /api/onboarding/step1` with password:
  - Validate against password policy (16+ for muni/dept head, 12+ for staff)
  - Set password on auth user
  - Update `password_updated_at`
  - Mark `step1_completed = TRUE` in wizard progress
- Integrate existing `PasswordPolicyService` from Super Admin plan

Files:
- `Smart_Civic_Platform_Backend/src/modules/onboarding/services/onboarding.service.ts`
- `Smart_Civic_Platform_Backend/src/service/password-policy.service.ts`

### Phase 17: Add MFA Enrollment in Wizard Step 1
- If role is municipality_head or department_head:
  - Step 1 requires MFA setup before proceeding
  - Call TOTP service to generate secret + QR code
  - User scans QR, enters code to verify
  - On success: mark MFA as enabled
- If role is staff:
  - Step 1 shows MFA as optional — "Set up now or skip"
  - "Skip" → `mfa_enabled = FALSE`, step1 still completes
- Integrate existing TOTP service from Super Admin plan

Files:
- `Smart_Civic_Platform_Backend/src/modules/onboarding/controller/onboarding.controller.ts`
- `Smart_Civic_Platform_Backend/src/service/totp.service.ts`

### Phase 18: Add Emergency Contact in Step 2
- Fields: `alternate_phone` (required for muni/dept head, optional for staff)
- Validate: alternate phone is different from primary phone
- Store in `profiles.alternate_phone`
- Use case: emergency escalation contact for SLA breaches

Files:
- `Smart_Civic_Platform_Backend/src/modules/onboarding/controller/onboarding.controller.ts`

### Phase 19: Add Designation & Expertise in Step 2
- Municipality Head: pre-filled "Municipality Head" (read-only)
- Department Head: pre-filled "[Department Name] Department Head" (read-only)
- Staff: dropdown or text input — field_inspector, office_staff, data_entry, etc.
- Staff only: expertise/ specialization textarea
- Store in `profiles.designation` and `staff.expertise`

Files:
- `Smart_Civic_Platform_Backend/src/modules/onboarding/controller/onboarding.controller.ts`
- `Smart_Civic_Platform_Backend/src/modules/onboarding/services/onboarding.service.ts`

### Phase 20: Add Step Validation & Rollback
- Each step is validated before marking complete
- If step fails: return specific field errors, do NOT advance
- If step succeeds: mark completed, save data, advance to next step
- Rollback: admin can reset a user's wizard if they get stuck
  - `POST /api/v1/superadmin/onboarding/reset/:profileId` — resets wizard to step 1
  - Requires dual-control for super admin actions

Files:
- `Smart_Civic_Platform_Backend/src/service/onboarding-wizard.service.ts`

---

## DOMAIN E — Backend: Step 3 — Identity Proof & Document Upload (Phases 21–25)

### Phase 21: Create Identity Document Upload Handler
- `POST /api/onboarding/step3` — multipart upload
  - Accept: `identity_type`, `identity_number`, `document` (file)
  - Validate: identity_type is valid for role (per tier config)
  - Validate: identity_number is unique across profiles
  - Upload to `staff-identity-documents` storage bucket
  - Store URL in `profiles.identity_document_url`
  - Store type + number in `profiles.identity_type`, `profiles.identity_number`

Files:
- `Smart_Civic_Platform_Backend/src/modules/onboarding/services/onboarding.service.ts`
- `Smart_Civic_Platform_Backend/src/service/storage.service.ts`

### Phase 22: Add Document Validation Rules
- File size: max 5MB
- Accepted types: `image/jpeg`, `image/png`, `application/pdf`
- Identity number format validation:
  - Citizenship: 8-10 digit alphanumeric (Nepal format)
  - National ID: 10-12 digit numeric
  - Passport: 7-9 digit alphanumeric
  - Staff badge: org-specific format (configurable)
- Duplicate check: identity_number unique across all profiles
- Image resolution: minimum 300x300 pixels

Files:
- `Smart_Civic_Platform_Backend/src/validation/onboarding.validation.ts` (NEW)

### Phase 23: Add Identity Verification Status
- After upload: `identity_verified_at` stays NULL
- Municipality head can verify staff identity documents
- Super admin can verify muni head and dept head identity documents
- `PATCH /api/v1/superadmin/onboarding/verify-identity/:profileId`
  - Accept: `{ verified: boolean, rejection_reason? }`
  - If verified: set `identity_verified_at = NOW()`
  - If rejected: set status back to PENDING_ONBOARDING, notify user to re-upload

Files:
- `Smart_Civic_Platform_Backend/src/modules/superadmin/controller/superadmin.controller.ts`
- `Smart_Civic_Platform_Backend/src/modules/municipality/controller/municipality.controller.ts`

### Phase 24: Add Document Re-Upload Flow
- If identity is rejected: user can re-upload
- `POST /api/onboarding/step3` — if identity_verified_at is NULL and step3_completed:
  - Allow re-upload: delete old document, upload new
  - Reset identity_verified_at to NULL
- Max 3 upload attempts, then lock for manual admin review

Files:
- `Smart_Civic_Platform_Backend/src/modules/onboarding/controller/onboarding.controller.ts`
- `Smart_Civic_Platform_Backend/src/modules/onboarding/services/onboarding.service.ts`

### Phase 25: Add Step 4 — Review & Finalize
- `POST /api/onboarding/step4` — final review
  - Returns summary of all completed steps: "Review your information before finalizing."
  - Accept: `{ confirmed: true }`
  - On confirmation:
    - Set `account_status = 'active'`
    - Set `onboarding_wizard_completed = TRUE`
    - Set `onboarding_completed_at = NOW()`
    - Mark wizard progress complete
    - Send notification to inviting admin: "[Name] has completed onboarding."
    - Log to audit: `action = 'ONBOARDING_COMPLETED'`
  - Token refresh: issue new JWT with full permissions

Files:
- `Smart_Civic_Platform_Backend/src/service/onboarding-wizard.service.ts`

---

## DOMAIN F — Backend: Re-Verification & Profile Changes (Phases 26–30)

### Phase 26: Add Re-Verification Trigger on Email/Phone Change
- When a user changes their primary email or phone:
  - Create lightweight verification token
  - Send verification to new email/phone
  - Mark field as `unverified` — does NOT lock account
  - Show banner: "Verify your new email/phone. [Resend]"
- `POST /api/auth/verify-email` — verify new email
- `POST /api/auth/verify-phone` — verify new phone (via OTP)
- If not verified within 7 days: revert to old email/phone

Files:
- `Smart_Civic_Platform_Backend/src/modules/auth/controller/auth.controller.ts`
- `Smart_Civic_Platform_Backend/src/modules/auth/services/auth.service.ts`

### Phase 27: Add Profile Edit with Verification
- `PUT /api/auth/profile` — update profile fields
  - Allow: full_name, phone, alternate_phone, designation, expertise
  - If phone changes: trigger re-verification (Phase 26)
  - If email changes: trigger email verification
- Non-editable after activation: role, municipality_id, department_id (org context)
- Only super admin can change org context

Files:
- `Smart_Civic_Platform_Backend/src/modules/auth/controller/auth.controller.ts`

### Phase 28: Add Identity Re-Upload for Profile
- If user needs to update identity document post-onboarding:
  - `POST /api/auth/identity` — re-upload identity document
  - Sets `identity_verified_at = NULL`
  - Triggers re-verification by admin
- Admin notified: "[Name] has updated their identity document. Please verify."

Files:
- `Smart_Civic_Platform_Backend/src/modules/auth/controller/auth.controller.ts`

### Phase 29: Add Profile View Endpoint (Self)
- `GET /api/auth/me` — enhance with onboarding status
  - Return: `{ profile, onboarding_status, wizard_step, mfa_enabled, identity_verified }`
- `GET /api/auth/me/onboarding-status` — detailed onboarding progress
  - `{ account_status, wizard: { step1, step2, step3, step4 }, mfa_enabled, identity_verified }`

Files:
- `Smart_Civic_Platform_Backend/src/modules/auth/controller/auth.controller.ts`

### Phase 30: Add Admin Profile View (For Municipality/Super Admin)
- `GET /api/v1/municipality/staff/:id` — view staff profile (municipality head)
- `GET /api/v1/superadmin/users/:id` — view any profile (super admin)
- Include: onboarding status, wizard progress, MFA status, identity verification status
- `GET /api/v1/municipality/onboarding/pending` — list all pending onboarding users

Files:
- `Smart_Civic_Platform_Backend/src/modules/municipality/controller/municipality.controller.ts`
- `Smart_Civic_Platform_Backend/src/modules/superadmin/controller/superadmin.controller.ts`

---

## DOMAIN G — Backend: Security Enforcement & Admin Oversight (Phases 31–35)

### Phase 31: Create Onboarding Guard Middleware (Full Implementation)
- Middleware checks on every authenticated request:
  1. `account_status === 'invited'` → 403, "Accept your invitation first."
  2. `account_status === 'pending_onboarding'` → redirect to wizard
  3. `account_status === 'expired'` → 403, "Invitation expired."
  4. `account_status === 'suspended'` → 403, "Account suspended."
  5. `account_status === 'active'` → allow
- Whitelist: `/api/onboarding/*`, `/api/auth/logout`, `/api/auth/me`
- Skip for: citizen role (citizens use different registration flow)

Files:
- `Smart_Civic_Platform_Backend/src/middleware/onboarding-guard.ts`

### Phase 32: Add Pending Onboarding Admin Panel (Backend)
- `GET /api/v1/municipality/onboarding/pending` — list staff with status = pending_onboarding
  - Columns: name, email, role, days_pending, current_wizard_step
- `GET /api/v1/municipality/onboarding/expired` — list expired invites
- `POST /api/v1/municipality/onboarding/:id/resend` — resend invite
- `POST /api/v1/municipality/onboarding/:id/cancel` — cancel onboarding
- `GET /api/v1/superadmin/onboarding/overview` — all pending across all municipalities

Files:
- `Smart_Civic_Platform_Backend/src/modules/municipality/controller/municipality.controller.ts`
- `Smart_Civic_Platform_Backend/src/modules/superadmin/controller/superadmin.controller.ts`

### Phase 33: Add Wizard Timeout Handling
- If user stays on a single step for > 24 hours:
  - Send reminder email: "Complete your profile setup for [Role] in [Muni]."
  - After 7 days of inactivity: notify admin
  - After 30 days: auto-expire the invite
- `GET /api/v1/municipality/onboarding/stalled` — list users stuck > 24h on same step

Files:
- `Smart_Civic_Platform_Backend/src/service/onboarding-wizard.service.ts`
- `Smart_Civic_Platform_Backend/src/service/invite-expiry.service.ts`

### Phase 34: Add Onboarding Audit Trail
- Log every wizard step completion:
  - `action = 'ONBOARDING_STEP1_COMPLETED'`, `action = 'ONBOARDING_STEP2_COMPLETED'`, etc.
  - `action = 'ONBOARDING_COMPLETED'` — final activation
  - `action = 'ONBOARDING_RESET'` — admin resets wizard
  - `action = 'INVITE_SENT'`, `action = 'INVITE_RESENT'`, `action = 'INVITE_EXPIRED'`
- All with: profile_id, role, municipality_id, timestamp

Files:
- `Smart_Civic_Platform_Backend/src/middleware/auditlogger.ts`

### Phase 35: Add Onboarding Analytics for Admin
- `GET /api/v1/municipality/onboarding/analytics` — stats:
  - `total_invited`, `total_pending`, `total_completed`, `total_expired`
  - `avg_completion_time_hours` — average time from invite to ACTIVE
  - `completion_rate` — % who complete vs expired
  - `stuck_users` — count of users stalled > 24h
- `GET /api/v1/superadmin/onboarding/analytics` — platform-wide stats

Files:
- `Smart_Civic_Platform_Backend/src/modules/municipality/repository/municipality.repository.ts`
- `Smart_Civic_Platform_Backend/src/modules/superadmin/services/superadmin.services.ts`

---

## DOMAIN H — Frontend: 3-Step Wizard UI (Phases 36–40)

### Phase 36: Create Invite Acceptance Page
- New: `pages/auth/AcceptRoleInvite.tsx`
- Route: `/accept-invite?token=...`
- On mount: call `GET /api/public/invite/validate?token=...`
  - Valid: show welcome screen with role + org context
  - Invalid/expired/used: show appropriate error
- "Accept Invitation & Continue" button → calls `POST /api/public/invite/accept`
- On success: redirect to `/onboarding/wizard`

Files:
- `Smart_Civic_Platform_Frontend/src/pages/auth/AcceptRoleInvite.tsx` (NEW)
- `Smart_Civic_Platform_Frontend/src/routes/AppRoutes.tsx`

### Phase 37: Build Wizard Container & Step Navigation
- New: `pages/onboarding/WizardContainer.tsx`:
  - Stepper header: 4 steps with labels + current step highlighted
  - Step 1: Credentials (password + MFA)
  - Step 2: Personal Details (form)
  - Step 3: Identity Proof (upload)
  - Step 4: Review & Submit
  - "Back" and "Next" buttons
  - Progress indicator: "Step X of 4"
  - Role badge: shows which account type is being set up
  - Pre-populated org info: municipality name, department name (if applicable)

Files:
- `Smart_Civic_Platform_Frontend/src/pages/onboarding/WizardContainer.tsx` (NEW)
- `Smart_Civic_Platform_Frontend/src/routes/AppRoutes.tsx`

### Phase 38: Build Step 1 — Credentials UI
- `OnboardingStep1.tsx`:
  - Password input with strength meter (16+ chars indicator)
  - Confirm password input
  - MFA section (if mandatory):
    - QR code display
    - Secret key (copyable)
    - 6-digit code input for verification
    - "Verify & Continue" button
  - If MFA optional (staff):
    - "Set up MFA now" (QR + verify) OR "Skip for now"
    - "Skip" stores preference to remind later
  - On complete: auto-advance to step 2

Files:
- `Smart_Civic_Platform_Frontend/src/pages/onboarding/OnboardingStep1.tsx` (NEW)
- `Smart_Civic_Platform_Frontend/src/pages/onboarding/OnboardingStep2.tsx` (NEW)
- `Smart_Civic_Platform_Frontend/src/pages/onboarding/OnboardingStep3.tsx` (NEW)
- `Smart_Civic_Platform_Frontend/src/pages/onboarding/OnboardingStep4.tsx` (NEW)

### Phase 39: Build Steps 2, 3 & 4 UI
- Step 2 — Personal Details:
  - Full name (input, pre-filled from profile if already set)
  - Phone (input, pre-filled from invite)
  - Alternate phone (emergency contact)
  - Designation (pre-filled for muni/dept head, dropdown for staff)
  - Expertise (textarea, staff only)
- Step 3 — Identity Proof:
  - Identity type dropdown (filtered by role per tier config)
  - Identity number input
  - File upload zone (drag & drop, preview)
  - Accepted format hint: "JPG, PNG, or PDF up to 5MB"
- Step 4 — Review & Submit:
  - Summary card with all entered info
  - Section per step with "Edit" button
  - "Confirm & Activate Account" button
  - Loading state while finalizing

Files:
- Same as Phase 38

### Phase 40: Add Post-Activation Redirect
- After step 4 completes:
  - Show success animation/checkmark
  - "Your account is now active!"
  - Role-specific redirect:
    - Municipality Head → `/municipality_head/dashboard`
    - Department Head → `/department_head/dashboard`
    - Staff → `/staff/dashboard`
  - Show brief tooltip: "You now have full access to [Role] features."
  - Issue new JWT with full permissions

Files:
- `Smart_Civic_Platform_Frontend/src/pages/onboarding/WizardContainer.tsx`

---

## DOMAIN I — Frontend: Admin Invite Management & Pending Onboarding Panel (Phases 41–45)

### Phase 41: Create Invite Management UI (Municipality Head)
- New: `pages/munic_head/InviteManager.tsx`:
  - **Invite Staff** form:
    - Role selector: "Department Head" or "Staff"
    - Email input + optional Phone input
    - Department dropdown (if creating staff)
    - Staff role/designation dropdown (if staff)
    - "Send Invitation" button
  - **Pending Invites** table:
    - Email, role, department, sent date, expiry, status (pending/expired)
    - "Resend" button per row
    - "Revoke" button per row
  - **Onboarding Progress** table:
    - Name, email, role, current step, days in progress
    - "View Progress" tooltip with detailed step status

Files:
- `Smart_Civic_Platform_Frontend/src/pages/munic_head/InviteManager.tsx` (NEW)
- `Smart_Civic_Platform_Frontend/src/routes/AppRoutes.tsx`

### Phase 42: Create Invite Management UI (Department Head)
- New: `pages/dept_head/InviteManager.tsx`:
  - Scoped: can only invite staff to own department
  - Same layout as Phase 41 but restricted:
    - No Department Head option (cannot create another dept head)
    - No department selector (auto-set to own dept)
    - Staff role dropdown only

Files:
- `Smart_Civic_Platform_Frontend/src/pages/dept_head/InviteManager.tsx` (NEW)
- `Smart_Civic_Platform_Frontend/src/routes/AppRoutes.tsx`

### Phase 43: Create Super Admin Onboarding Overview
- New: `pages/superadmin/OnboardingOverview.tsx`:
  - **Platform-wide stats**: total invited, pending, completed, expired
  - **Per-municipality breakdown**: expandable rows with completion rates
  - **Stalled users** tab: users stuck > 24h on same step
  - **Expired invites** tab: list with "Resend" button
  - **Reset wizard** button: for users stuck in PENDING_ONBOARDING
  - Dual-control for reset action

Files:
- `Smart_Civic_Platform_Frontend/src/pages/superadmin/OnboardingOverview.tsx` (NEW)
- `Smart_Civic_Platform_Frontend/src/routes/AppRoutes.tsx`

### Phase 44: Add Profile Page with Re-Verification UI
- Enhance existing profile pages for all roles:
  - **Profile Info** section: view/edit name, phone, alternate phone, designation
  - **Security Section**:
    - MFA status with "Setup" / "Disable" button
    - Password age indicator + "Change Password"
    - Email verification badge (verified/unverified)
    - Phone verification badge
  - **Identity Section**:
    - Current document with preview
    - "Re-upload" button (triggers re-verification)
    - Verification status badge
  - Show re-verification banner if: email/phone recently changed

Files:
- `Smart_Civic_Platform_Frontend/src/pages/munic_head/ProfilePage.tsx`
- `Smart_Civic_Platform_Frontend/src/pages/dept_head/ProfilePage.tsx`
- `Smart_Civic_Platform_Frontend/src/pages/staff/ProfilePage.tsx`

### Phase 45: Update Navigation & Role-Based Routing
- Update route guards to check `account_status`:
  - If `pending_onboarding` → redirect to `/onboarding/wizard`
  - If `invited` → redirect to `/accept-invite?token=...` or error page
  - If `expired` → show "Contact administrator" page
- Add onboarding routes to public/unauthenticated router
- Active users: normal routing to dashboards
- Add `/onboarding/*` routes to route config

Files:
- `Smart_Civic_Platform_Frontend/src/routes/AppRoutes.tsx`
- `Smart_Civic_Platform_Frontend/src/routes/ProtectedRoute.tsx`

---

## DOMAIN J — Testing, Documentation & Deployment (Phases 46–50)

### Phase 46: Backend Tests — Invite & Activation
- Test: Create invite → token stored with 24h expiry
- Test: Validate valid invite → returns role + org context
- Test: Validate expired invite → returns error
- Test: Accept invite → creates auth user + profile with PENDING_ONBOARDING
- Test: Second accept on same token → fails
- Test: Resend invite → new token, reset expiry
- Test: Revoke invite → cannot be used

Files:
- `Smart_Civic_Platform_Backend/tests/onboarding-invite.test.ts` (NEW)

### Phase 47: Backend Tests — Wizard Steps
- Test: Step 1 sets password and (optionally) MFA
- Test: Step 2 saves personal details
- Test: Step 3 uploads identity document
- Test: Step 4 finalizes → account status = ACTIVE
- Test: Cannot skip steps (must complete in order)
- Test: Wizard guard blocks non-onboarded users from other endpoints
- Test: Role-specific field validation (mfa mandatory for muni head, optional for staff)

Files:
- `Smart_Civic_Platform_Backend/tests/onboarding-wizard.test.ts` (NEW)

### Phase 48: Backend Tests — Re-Verification & Edge Cases
- Test: Phone change triggers re-verification
- Test: Email change triggers email verification
- Test: Identity re-upload resets verified_at
- Test: Expired invite after 24h
- Test: Stalled wizard (>24h on step) triggers reminder
- Test: Admin can reset stuck user's wizard
- Test: Profile edit preserves non-editable fields

Files:
- `Smart_Civic_Platform_Backend/tests/onboarding-reverify.test.ts` (NEW)

### Phase 49: Frontend Tests — Wizard UI
- Test: AcceptInvite renders correct role + org info
- Test: Expired invite shows error message
- Test: Wizard shows correct steps for role
- Test: Step 1 MFA mandatory flow (muni head)
- Test: Step 1 MFA optional flow (staff, skip works)
- Test: Step 2 form validation (required fields)
- Test: Step 3 file upload + preview
- Test: Step 4 review shows all data
- Test: Post-activation redirects to correct dashboard
- Test: InviteManager shows pending invites

Files:
- `Smart_Civic_Platform_Frontend/src/__tests__/AcceptRoleInvite.test.tsx` (NEW)
- `Smart_Civic_Platform_Frontend/src/__tests__/OnboardingWizard.test.tsx` (NEW)
- `Smart_Civic_Platform_Frontend/src/__tests__/InviteManager.test.tsx` (NEW)

### Phase 50: Documentation & Cleanup
- Create `docs/first-login-onboarding.md`:
  - Onboarding state machine diagram (INVITED → PENDING_ONBOARDING → ACTIVE)
  - 4-step wizard breakdown per role (tier-specific matrix)
  - Invite lifecycle (create → accept → expire)
  - Re-verification triggers (email/phone change, identity re-upload)
  - Admin oversight: pending panel, resend, reset, analytics
- Update `Supabase_Schema.sql` with all new tables/enums/columns
- Update `AGENT.md` and `Smart_Civic_Platform_Backend/CLAUDE.md`
- Remove old direct-creation code paths (replace with invite)
- Seed default onboarding field configs
- Lint + typecheck all changed code

Files:
- `Smart_Civic_Platform/docs/first-login-onboarding.md` (NEW)
- `Supabase_Schema.sql`
- `AGENT.md`
- `Smart_Civic_Platform_Backend/CLAUDE.md`

---

## Summary: 10 Domains × 5 Phases = 50 Phases

| Domain | Phases | Focus |
|--------|--------|-------|
| **A** | 1–5 | Database: Onboarding Schema (status enum, role_invites, wizard progress, profile columns, storage bucket) |
| **B** | 6–10 | Backend: Invite & Activation (unified invite service, staff/dept head invite rewrite, public accept endpoint, email dispatch) |
| **C** | 11–15 | Backend: Wizard Engine (state machine, guard middleware, API endpoints, tier-specific config, invite expiry cron) |
| **D** | 16–20 | Backend: Step 1 Credentials (password setup, MFA enrollment, emergency contact, designation, step validation) |
| **E** | 21–25 | Backend: Step 3 Identity (document upload, validation rules, verification status, re-upload, step 4 finalize) |
| **F** | 26–30 | Backend: Re-Verification (email/phone change trigger, profile edit with re-verify, identity re-upload, profile view, admin view) |
| **G** | 31–35 | Backend: Security & Oversight (onboarding guard middleware, pending panel, timeout handling, audit trail, analytics) |
| **H** | 36–40 | Frontend: Wizard UI (invite acceptance, container + navigation, step 1-4 components, post-activation redirect) |
| **I** | 41–45 | Frontend: Admin Panels (munic head invite manager, dept head invite manager, super admin overview, profile re-verify, routing) |
| **J** | 46–50 | Testing, Documentation & Deployment |

---

## Key Architecture Decisions

### Onboarding State Machine
```
INVITED ──(accept invite)──► PENDING_ONBOARDING
PENDING_ONBOARDING ──(step 1)──► PENDING_ONBOARDING (step1_complete)
PENDING_ONBOARDING ──(step 2)──► PENDING_ONBOARDING (step2_complete)
PENDING_ONBOARDING ──(step 3)──► PENDING_ONBOARDING (step3_complete)
PENDING_ONBOARDING ──(step 4)──► ACTIVE

INVITED ──(24h expiry)──► EXPIRED
EXPIRED ──(admin resend)──► INVITED
ACTIVE ──(admin suspend)──► SUSPENDED
SUSPENDED ──(admin reactivate)──► ACTIVE
PENDING_ONBOARDING ──(admin reset)──► INVITED
```

### Tier-Specific Field Matrix
| Field | Muni Head | Dept Head | Staff |
|-------|-----------|-----------|-------|
| Password min length | 16 | 16 | 12 |
| MFA | Mandatory | Mandatory | Recommended |
| Alternate phone | Required | Required | Optional |
| Designation | Pre-filled | Pre-filled | Selectable |
| Expertise | Hidden | Hidden | Shown |
| Identity type | Citizenship, National ID | Citizenship, National ID, Official ID | Staff Badge, National ID |
| Identity verification | Super Admin | Super Admin | Muni Head |

### Route Interception Logic
```
Request → Authenticated?
  ├── No → redirect to login
  └── Yes → Check account_status
        ├── 'invited' → 403 "Accept invitation first"
        ├── 'pending_onboarding'
        │     ├── Request path starts with /api/onboarding/ → allow
        │     └── Otherwise → 403 "Complete profile setup"
        ├── 'expired' → 403 "Invitation expired"
        ├── 'suspended' → 403 "Account suspended"
        └── 'active' → allow (continue to controller)
```

### Invite Token Flow
```
Admin creates staff → POST /api/v1/municipality/staff/onboard
  → role_invites.insert({ email, token, role, muni_id, dept_id })
  → Email sent: "Click here to activate your account"
  → User clicks link → /accept-invite?token=abc123
  → Token validated (exists? expired? used? revoked?)
  → Auth user created (status = pending_onboarding)
  → Profile created (with org context from invite)
  → Token consumed
  → Redirect to /onboarding/wizard
  → 4-step wizard
  → Status = active
```
