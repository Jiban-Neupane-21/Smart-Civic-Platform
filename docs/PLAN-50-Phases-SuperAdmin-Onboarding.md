# Super Admin Onboarding, Security Governance & Access Control — 50-Phase Plan

## Blueprint Overview: Zero-Trust Onboarding Pipeline

```text
                    [ SUPER ADMIN ONBOARDING PIPELINE ]
                                    │
        ┌───────────────────────────┴───────────────────────────┐
        ▼                                                       ▼
[ METHOD 1: BOOTSTRAP / CLI ]                       [ METHOD 2: INVITE PROTOCOL ]
• Initial deployment seeding                        • Existing Super Admin generates invite
• Command-line execution only                       • Secure, time-bound cryptographic token
• Bypasses web endpoints                            • Sent strictly to official domain email
        │                                                       │
        └───────────────────────────┬───────────────────────────┘
                                    ▼
                     [ MANDATORY SECURITY ENFORCEMENT ]
                     • Strong Password Policy (16+ chars)
                     • Mandatory MFA (TOTP / Hardware Key)
                     • IP / Network Perimeter Restriction
                                    ▼
                        [ ACCOUNT ACTIVATED ]
             (Instant Audit Alert sent to all Root Admins)
```

### 2 Onboarding Pathways
- **Method 1 — CLI/Seed**: Initial root account, command-line only, bypasses web
- **Method 2 — Invite**: Time-bound cryptographic tokens (15 min), domain email only

### 5-Step Invited Registration
1. Super Admin generates invite → audit logged
2. Invitee clicks link → token validated (not expired, not used, same IP?)
3. Profile setup → strong password enforced (16+ chars)
4. Mandatory MFA enrollment (TOTP)
5. Account activated → broadcast alert to all super admins

### Governance Safeguards
- Public registration rejects `role: super_admin`
- IP whitelisting for super admin login
- Dual-control for critical ops (delete municipality, create super admin)
- Instant security alerts to all active super admins

---

## WHAT EXISTS (current state)

- **Routes**: analytics, provision municipality, assign role, manage status, audit logs, create user, CRUD municipalities
- **No invite system**, **no CLI bootstrap**, **no MFA**, **no IP whitelist**, **no dual-control**
- Super admin can create `municipality_head` users directly via `/api/superadmin/users/create`
- Basic audit logging exists
- Frontend: ManageMuniciple.tsx + AuditLog.tsx pages exist

---

## DOMAIN A — Database: Super Admin & Security Schema (Phases 1–5)

### Phase 1: Create `superadmin_invites` Table
```sql
CREATE TABLE superadmin_invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    inviter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    designation TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_sa_invites_token ON superadmin_invites(token);
CREATE INDEX idx_sa_invites_email ON superadmin_invites(email);
```

Files:
- `supabase/migrations/v7-superadmin-invites.sql` (NEW)

### Phase 2: Create `mfa_tokens` Table
```sql
CREATE TABLE mfa_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    secret TEXT NOT NULL, -- TOTP secret
    method TEXT NOT NULL DEFAULT 'totp', -- totp | hardware_key | sms
    is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (profile_id, method)
);
```

Files:
- `supabase/migrations/v7-mfa-tokens.sql` (NEW)

### Phase 3: Create `ip_whitelist` Table
```sql
CREATE TABLE ip_whitelist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cidr TEXT NOT NULL, -- e.g. 10.0.0.0/8 or 203.0.113.0/24
    label TEXT, -- e.g. "Office VPN", "Admin Network"
    created_by UUID NOT NULL REFERENCES profiles(id),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Files:
- `supabase/migrations/v7-ip-whitelist.sql` (NEW)

### Phase 4: Create `dual_control_requests` Table
```sql
CREATE TABLE dual_control_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action TEXT NOT NULL, -- create_superadmin | delete_municipality | system_setting_change
    target_id UUID,
    payload JSONB, -- full request payload
    requested_by UUID NOT NULL REFERENCES profiles(id),
    approved_by UUID REFERENCES profiles(id),
    status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    rejection_reason TEXT
);
```

Files:
- `supabase/migrations/v7-dual-control.sql` (NEW)

### Phase 5: Add Super Admin Audit Columns to `profiles`
- Add to `profiles`:
  - `last_login_ip INET`
  - `last_login_at TIMESTAMPTZ`
  - `mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE`
  - `password_updated_at TIMESTAMPTZ`
  - `force_mfa BOOLEAN NOT NULL DEFAULT FALSE` — can superadmin force MFA for all?
- Add `password_policy` table:
  ```sql
  CREATE TABLE password_policy (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      min_length INTEGER NOT NULL DEFAULT 16,
      require_uppercase BOOLEAN NOT NULL DEFAULT TRUE,
      require_lowercase BOOLEAN NOT NULL DEFAULT TRUE,
      require_number BOOLEAN NOT NULL DEFAULT TRUE,
      require_special BOOLEAN NOT NULL DEFAULT TRUE,
      max_age_days INTEGER NOT NULL DEFAULT 90,
      prevent_reuse_count INTEGER NOT NULL DEFAULT 5,
      updated_by UUID REFERENCES profiles(id),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  -- Seed default policy
  INSERT INTO password_policy (min_length) VALUES (16);
  ```

Files:
- `supabase/migrations/v7-security-columns.sql` (NEW)

---

## DOMAIN B — Backend: CLI Bootstrap & Seed (Method 1) (Phases 6–10)

### Phase 6: Create CLI Bootstrap Script
- New script: `scripts/bootstrap-superadmin.ts`
- Purpose: create the initial root super admin account
- Behavior:
  - Checks if any super admin already exists → aborts if yes
  - Reads config from environment variables or prompts:
    - `SUPERADMIN_EMAIL`, `SUPERADMIN_PASSWORD`, `SUPERADMIN_NAME`
  - Creates auth user via Supabase Admin API
  - Creates profile with `role = 'superadmin'`, `account_status = 'active'`
  - Sets `mfa_enforced = FALSE` for bootstrap account (MFA setup on first login)
  - Logs to console: "Root Super Admin [email] created successfully."
- Usage: `npx ts-node scripts/bootstrap-superadmin.ts`

Files:
- `scripts/bootstrap-superadmin.ts` (NEW)
- `package.json` — add script: `"bootstrap:superadmin": "ts-node scripts/bootstrap-superadmin.ts"`

### Phase 7: Create Database Seed Script
- New script: `scripts/seed.ts`
- Seeds:
  - Default `password_policy` (16 chars, all requirements enabled)
  - Default `notification_templates` (all 5 automated triggers)
  - Default `complaint_categories` (12 categories from Supabase_Schema)
  - Default `system_settings` (maintenance mode off, default SLA hours)
- Idempotent: checks for existing data before inserting

Files:
- `scripts/seed.ts` (NEW)

### Phase 8: Add Password Policy Enforcer
- `PasswordPolicyService`:
  - `validatePassword(password)` — check against `password_policy` table
  - Returns: `{ valid: boolean, errors: string[] }`
    - "Must be at least 16 characters"
    - "Must contain uppercase letter"
    - "Must contain lowercase letter"
    - "Must contain number"
    - "Must contain special character"
  - `checkPasswordAge(profileId)` — warn if password > max_age_days
  - `preventReuse(profileId, newPassword)` — check against hashed history
- Integrate into: user registration, password change, super admin invite acceptance

Files:
- `Smart_Civic_Platform_Backend/src/service/password-policy.service.ts` (NEW)

### Phase 9: Add First-Login MFA Enforcement
- On first login after bootstrap: check if MFA is enrolled
- If not enrolled: redirect to MFA setup page
- Block access to all other pages until MFA is completed
- `GET /api/auth/mfa-required` — check if current user needs MFA setup
- `POST /api/auth/skip-mfa` — disabled for super admin (cannot skip)
- For citizen/staff: MFA is optional; for super admin: mandatory

Files:
- `Smart_Civic_Platform_Backend/src/modules/auth/controller/auth.controller.ts`
- `Smart_Civic_Platform_Backend/src/middleware/mfa-enforcement.ts` (NEW)

### Phase 10: Add Public Route Guard (Reject Super Admin Registration)
- Modify public `/api/auth/register` endpoint:
  - If payload contains `role: 'superadmin'` → reject with 403
  - "Public registration of Super Admin accounts is strictly prohibited."
- Modify `/api/superadmin/users/create`:
  - Current: can only create `municipality_head`
  - Enhance: allow `role: 'superadmin'` only via invite system (not this endpoint)
- Add middleware: `rejectSuperAdminRegistration`

Files:
- `Smart_Civic_Platform_Backend/src/modules/auth/services/auth.service.ts`
- `Smart_Civic_Platform_Backend/src/middleware/route-guards.ts` (NEW)

---

## DOMAIN C — Backend: Invite System (Method 2) (Phases 11–15)

### Phase 11: Create Invite Service
- `SuperAdminInviteService`:
  - `generateInvite(inviterId, email, designation)` — create token, store in DB
    - Token: `crypto.randomBytes(32).toString('hex')` → 64-char hex
    - Expiry: 15 minutes from now
    - Log: inviter ID, IP, timestamp to audit
  - `validateInvite(token)` — check token exists, not expired, not used, not revoked
    - Returns: `{ valid, invite }` or `{ valid: false, reason }`
  - `consumeInvite(token, newUserId)` — mark as used
  - `revokeInvite(token, revokedBy)` — revoke before use
  - `getActiveInvites()` — list all pending invites

Files:
- `Smart_Civic_Platform_Backend/src/service/superadmin-invite.service.ts` (NEW)

### Phase 12: Add Invite Endpoints (Super Admin Only)
- `POST /api/v1/superadmin/invites/create` — generate invite
  - Accept: `{ email, designation? }`
  - Validate: email domain is official (configurable)
  - Returns: `{ success, data: { token, expires_at } }` — frontend shows token/link
  - In production: sends email with link instead of returning token
- `GET /api/v1/superadmin/invites` — list active invites
- `DELETE /api/v1/superadmin/invites/:id` — revoke invite
- `GET /api/v1/superadmin/invites/history` — past invite usage

Files:
- `Smart_Civic_Platform_Backend/src/modules/superadmin/routes/superadmin.routes.ts`
- `Smart_Civic_Platform_Backend/src/modules/superadmin/controller/superadmin.controller.ts`

### Phase 13: Add Public Invite Acceptance Endpoints
- `GET /api/public/invite/validate?token=` — validate invite link (no auth required)
  - Returns: `{ valid, email, expires_at }` or `{ valid: false, error }`
- `POST /api/public/invite/accept` — accept invite (no auth required)
  - Accept: `{ token, full_name, password, mfa_code? }`
  - Validate: token valid, password meets policy, MFA code if provided
  - Create auth user + profile with `role = 'superadmin'`
  - Consume invite token
  - Return: redirect to MFA setup

Files:
- `Smart_Civic_Platform_Backend/src/modules/public/routes/public.routes.ts`
- `Smart_Civic_Platform_Backend/src/modules/public/controller/public.controller.ts`
- `Smart_Civic_Platform_Backend/src/modules/public/services/public.service.ts`

### Phase 14: Add Invite Email Dispatch
- When invite is created: send email to target with secure link
- Link format: `https://admin.smartcivic.gov/accept-invite?token={token}`
- Email template: "You have been invited to become a Super Admin. Click here to complete registration. This link expires in 15 minutes."
- Fallback: display token in admin panel for development
- Use existing email service

Files:
- `Smart_Civic_Platform_Backend/src/service/superadmin-invite.service.ts`
- `Smart_Civic_Platform_Backend/src/service/dispatchers/email.dispatcher.ts`

### Phase 15: Add Security Audit for Invite Lifecycle
- Log every invite event to `audit_logs`:
  - `action = 'INSERT'`, `table_name = 'superadmin_invites'` — invite created
  - `action = 'UPDATE'`, `table_name = 'superadmin_invites'` — invite consumed
  - `action = 'DELETE'`, `table_name = 'superadmin_invites'` — invite revoked
- Include: inviter email, target email, IP address, timestamp
- `GET /api/v1/superadmin/audit/invites` — filtered invite audit log

Files:
- `Smart_Civic_Platform_Backend/src/middleware/auditlogger.ts`

---

## DOMAIN D — Backend: MFA & Strong Password Enforcement (Phases 16–20)

### Phase 16: Create TOTP Service
- `TOTPService`:
  - `generateSecret()` — create 32-byte base32 secret
  - `generateQRCodeURI(secret, email)` — `otpauth://totp/SmartCivic:{email}?secret={secret}&issuer=SmartCivic`
  - `verifyTOTP(secret, code)` — validate 6-digit TOTP code
  - `generateBackupCodes()` — generate 8 single-use backup codes (8 alphanumeric chars each)
- Use `otplib` library for TOTP implementation

Files:
- `Smart_Civic_Platform_Backend/src/service/totp.service.ts` (NEW)
- `package.json` — add `otplib` dependency

### Phase 17: Add MFA Enrollment Endpoints
- `POST /api/auth/mfa/setup` — initiate MFA setup
  - Returns: `{ secret, qr_code_url, backup_codes }`
- `POST /api/auth/mfa/verify` — verify TOTP code to complete enrollment
  - Accept: `{ code }`
  - Validate code against secret → enable MFA
- `POST /api/auth/mfa/disable` — disable MFA (requires current code + super admin approval for other super admins)
- `POST /api/auth/mfa/backup` — regenerate backup codes
- `POST /api/auth/mfa/recover` — recover account using backup code (bypasses MFA once)

Files:
- `Smart_Civic_Platform_Backend/src/modules/auth/routes/auth.routes.ts`
- `Smart_Civic_Platform_Backend/src/modules/auth/controller/auth.controller.ts`
- `Smart_Civic_Platform_Backend/src/modules/auth/services/auth.service.ts`

### Phase 18: Add MFA Login Challenge
- When super admin logs in with email + password:
  - If MFA enabled: return `{ mfa_required: true, mfa_session: "temp_token" }`
  - `POST /api/auth/mfa/challenge` — complete MFA challenge
    - Accept: `{ mfa_session, code }`
    - Verify: code matches TOTP secret
    - Return: full JWT token
  - Rate limit: max 5 MFA attempts before temporary lockout (15 min)

Files:
- `Smart_Civic_Platform_Backend/src/modules/auth/services/auth.service.ts`

### Phase 19: Add Password Change Enforcement
- `GET /api/auth/password-status` — check if password change is required
  - Returns: `{ days_since_change, max_age, change_required, warnings }`
- `POST /api/auth/change-password` — change password
  - Validate: old password correct, new password meets policy, not in last 5 history
  - Update `password_updated_at`
  - If change required: force redirect to change-password page
- Password history: store last 5 hashed passwords per user

Files:
- `Smart_Civic_Platform_Backend/src/modules/auth/controller/auth.controller.ts`
- `Smart_Civic_Platform_Backend/src/modules/auth/services/auth.service.ts`

### Phase 20: Add MFA Enforcement Middleware
- `mfaEnforcementMiddleware`:
  - If profile is super admin AND `mfa_enabled = FALSE`:
    - Block all requests except MFA setup endpoints
    - Return 403: "MFA enrollment required before accessing this resource."
  - If profile is super admin AND password is older than max_age_days:
    - Block all requests except password change endpoint
  - Skip for: login, MFA setup, password change routes

Files:
- `Smart_Civic_Platform_Backend/src/middleware/mfa-enforcement.ts`

---

## DOMAIN E — Backend: Security Governance (Phases 21–25)

### Phase 21: Create IP Whitelist Service
- `IPWhitelistService`:
  - `isAllowed(ip)` — check if IP matches any whitelisted CIDR
  - `addRule(cidr, label, createdBy)` — add whitelist entry
  - `removeRule(id)` — remove whitelist entry
  - `getRules()` — list all active whitelist rules
- Use `ip-cidr` or `netmask` library for CIDR matching

Files:
- `Smart_Civic_Platform_Backend/src/service/ip-whitelist.service.ts` (NEW)

### Phase 22: Add IP Whitelist Endpoints
- `GET /api/v1/superadmin/security/ip-whitelist` — list rules
- `POST /api/v1/superadmin/security/ip-whitelist` — add rule
  - Accept: `{ cidr, label }`
- `DELETE /api/v1/superadmin/security/ip-whitelist/:id` — remove rule
- `GET /api/v1/superadmin/security/ip-whitelist/check` — test if current IP is allowed
- `PATCH /api/v1/superadmin/security/ip-whitelist/toggle` — enable/disable whitelist enforcement

Files:
- `Smart_Civic_Platform_Backend/src/modules/superadmin/routes/superadmin.routes.ts`
- `Smart_Civic_Platform_Backend/src/modules/superadmin/controller/superadmin.controller.ts`

### Phase 23: Add IP Whitelist Middleware for Super Admin Routes
- Middleware: `ipWhitelistMiddleware`:
  - Check `ip_whitelist` table for active rules
  - If rules exist: compare request IP against whitelist
  - If not whitelisted: return 403 "Access restricted to authorized network."
  - If no rules: allow all (default until configured)
- Applied to all super admin API routes

Files:
- `Smart_Civic_Platform_Backend/src/middleware/ip-whitelist.ts` (NEW)

### Phase 24: Create Dual-Control Service
- `DualControlService`:
  - `requestApproval(action, targetId, payload, requesterId)` — create dual_control_request
  - `approveRequest(requestId, approverId)` — mark approved, execute action
  - `rejectRequest(requestId, approverId, reason)` — mark rejected
  - `getPendingRequests()` — list pending for current super admin
  - `isActionAuthorized(action, requesterId)` — check if action needs dual-control
- Actions requiring dual-control:
  - `create_superadmin` — creating another super admin
  - `delete_municipality` — permanently removing a municipality
  - `system_setting_change` — modifying global system settings

Files:
- `Smart_Civic_Platform_Backend/src/service/dual-control.service.ts` (NEW)

### Phase 25: Add Dual-Control Endpoints
- `GET /api/v1/superadmin/dual-control/pending` — list pending requests
- `POST /api/v1/superadmin/dual-control/request` — create approval request
  - Accept: `{ action, target_id, payload }`
- `POST /api/v1/superadmin/dual-control/approve/:id` — approve
- `POST /api/v1/superadmin/dual-control/reject/:id` — reject with reason
- `GET /api/v1/superadmin/dual-control/history` — past requests
- Integrate: `deleteMunicipality` and `createSuperAdmin` check dual-control first

Files:
- `Smart_Civic_Platform_Backend/src/modules/superadmin/routes/superadmin.routes.ts`
- `Smart_Civic_Platform_Backend/src/modules/superadmin/controller/superadmin.controller.ts`

---

## DOMAIN F — Backend: Super Admin Account Management (Phases 26–30)

### Phase 26: Add Super Admin CRUD Endpoints
- `GET /api/v1/superadmin/admins` — list all super admins
  - Columns: name, email, last_login, mfa_status, account_status, created_at
- `GET /api/v1/superadmin/admins/:id` — single super admin detail
- `PATCH /api/v1/superadmin/admins/:id` — update super admin profile
- `PATCH /api/v1/superadmin/admins/:id/status` — suspend/activate another super admin
  - Validation: cannot suspend self, cannot suspend last active super admin
  - Requires dual-control if suspending is restricted

Files:
- `Smart_Civic_Platform_Backend/src/modules/superadmin/routes/superadmin.routes.ts`
- `Smart_Civic_Platform_Backend/src/modules/superadmin/controller/superadmin.controller.ts`

### Phase 27: Add Last Super Admin Protection
- Service: `LastAdminGuard`:
  - `canChangeRole(targetUserId)` — check if target is the last active super admin
  - `canSuspend(targetUserId)` — same check
  - `canDelete(targetUserId)` — same check
- Prevent:
  - Changing the last super admin's role away from `superadmin`
  - Suspending the last super admin
  - Deleting the last super admin's profile
  - Returns: 409 "Cannot modify the last remaining Super Admin account."

Files:
- `Smart_Civic_Platform_Backend/src/service/last-admin-guard.service.ts` (NEW)

### Phase 28: Add Session Management for Super Admin
- `GET /api/v1/superadmin/sessions` — list all active super admin sessions
  - Columns: profile_id, name, ip_address, user_agent, logged_in_at, last_active_at
- `DELETE /api/v1/superadmin/sessions/:id` — revoke a session (force logout)
- `DELETE /api/v1/superadmin/sessions` — revoke all other sessions (except current)
- Store session info in `refresh_tokens` table (ip_address, user_agent already exist)

Files:
- `Smart_Civic_Platform_Backend/src/modules/superadmin/controller/superadmin.controller.ts`

### Phase 29: Add System Settings Management
- `GET /api/v1/superadmin/settings` — list all system settings
- `PATCH /api/v1/superadmin/settings/:key` — update setting value
  - Requires dual-control for sensitive settings
- Settings:
  - `maintenance_mode` (boolean) — disable all citizen-facing features
  - `allow_public_registration` (boolean) — toggle citizen registration
  - `default_sla_hours` (number) — global default SLA
  - `max_complaints_per_day` (number) — rate limit
  - `force_mfa_for_all` (boolean) — require MFA for all users

Files:
- `Smart_Civic_Platform_Backend/src/modules/superadmin/controller/superadmin.controller.ts`

### Phase 30: Add Maintenance Mode Middleware
- Middleware: `maintenanceModeMiddleware`:
  - Check `system_settings` for `maintenance_mode`
  - If enabled: block all non-super-admin requests
  - Return 503: "System is under maintenance. Please try again later."
  - Super admin requests continue through for testing
- Bypass: health check endpoints, login page

Files:
- `Smart_Civic_Platform_Backend/src/middleware/maintenance-mode.ts` (NEW)

---

## DOMAIN G — Backend: Security Alerts & Notifications (Phases 31–35)

### Phase 31: Create Security Alert Service
- `SecurityAlertService`:
  - `notifyNewSuperAdmin(newAdminName, newAdminEmail, inviterName)` — broadcast to all super admins
  - `notifySuspiciousLogin(profileId, ip, userAgent)` — alert on unusual location
  - `notifyFailedMFA(profileId, attempts, ip)` — alert on repeated MFA failures
  - `notifyDualControlRequest(action, requesterName)` — alert approvers
  - `notifyMaintenanceModeChange(enabled, toggledBy)` — broadcast
- Channels: In-App (forced urgent) + Email (SMTP)

Files:
- `Smart_Civic_Platform_Backend/src/service/security-alert.service.ts` (NEW)

### Phase 32: Add Security Alert Endpoints
- `GET /api/v1/superadmin/security/alerts` — list security alerts (past 90 days)
  - Filter by type, severity, date range
- `POST /api/v1/superadmin/security/alerts/:id/acknowledge` — mark as acknowledged
- `GET /api/v1/superadmin/security/alerts/unacknowledged-count` — badge count
- Alert types: `new_admin`, `suspicious_login`, `failed_mfa`, `dual_control`, `maintenance_mode`

Files:
- `Smart_Civic_Platform_Backend/src/modules/superadmin/controller/superadmin.controller.ts`

### Phase 33: Add Broadcast Alert on Super Admin Activation
- When invite is accepted and MFA enrolled:
  - Trigger: `SecurityAlertService.notifyNewSuperAdmin(name, email, inviterName)`
  - Message: "Security Notice: New Super Admin account [Name] ([Email]) successfully activated by [Inviter Name] at [Timestamp]."
  - Recipients: ALL active super admins
  - Channels: In-App (urgent banner) + Email
  - Log to audit: `action = 'SUPERADMIN_ACTIVATED'`

Files:
- `Smart_Civic_Platform_Backend/src/modules/auth/services/auth.service.ts`
- `Smart_Civic_Platform_Backend/src/service/security-alert.service.ts`

### Phase 34: Add Suspicious Login Detection
- On super admin login:
  - Record IP and user agent
  - Compare to previous login IP/location
  - If different country/unusual IP: trigger suspicious login alert
- `GET /api/v1/superadmin/security/login-history` — all super admin logins
  - Columns: name, ip, user_agent, timestamp, success, mfa_used
- `POST /api/v1/superadmin/security/login-history/:id/confirm` — mark as legitimate

Files:
- `Smart_Civic_Platform_Backend/src/modules/superadmin/controller/superadmin.controller.ts`
- `Smart_Civic_Platform_Backend/src/service/security-alert.service.ts`

### Phase 35: Add Security Dashboard Stats
- `GET /api/v1/superadmin/security/dashboard` — security overview:
  - `total_super_admins`, `mfa_enabled_count`, `mfa_disabled_count`
  - `pending_invites`, `expired_invites`
  - `ip_whitelist_enabled`, `whitelist_rule_count`
  - `pending_dual_control_requests`
  - `unacknowledged_alerts`
  - `recent_logins` — last 10 super admin logins with IP

Files:
- `Smart_Civic_Platform_Backend/src/modules/superadmin/services/superadmin.services.ts`

---

## DOMAIN H — Frontend: Invited Registration Flow (Phases 36–40)

### Phase 36: Create Invite Registration Page
- New page: `pages/auth/AcceptInvite.tsx`
- Route: `/accept-invite?token=...`
- On mount: call `GET /api/public/invite/validate?token=...`
  - If valid: show registration form
  - If expired: show "This invite link has expired. Contact your administrator."
  - If used: show "This invite has already been used."
  - If revoked: show "This invite has been revoked."
- Registration form:
  - Email (pre-filled, read-only from invite)
  - Full name input
  - Password input with strength meter (16+ chars)
  - Confirm password
  - "Accept Invite & Create Account" button

Files:
- `Smart_Civic_Platform_Frontend/src/pages/auth/AcceptInvite.tsx` (NEW)
- `Smart_Civic_Platform_Frontend/src/routes/AppRoutes.tsx`

### Phase 37: Create MFA Enrollment Page
- New page: `pages/auth/MfaSetup.tsx`
- Step 1: QR Code display + manual secret key
  - "Scan with Google Authenticator / Authy / 1Password"
  - Instructions with numbered steps
- Step 2: Verification code input (6 digits)
  - "Enter the 6-digit code from your authenticator app"
  - Verify button → calls `POST /api/auth/mfa/verify`
- Step 3: Backup codes display
  - Show 8 single-use backup codes
  - "Download these codes and store them securely."
  - "If you lose access to your authenticator app, use a backup code to log in."
  - "I have saved my backup codes" checkbox → continue

Files:
- `Smart_Civic_Platform_Frontend/src/pages/auth/MfaSetup.tsx` (NEW)
- `Smart_Civic_Platform_Frontend/src/routes/AppRoutes.tsx`

### Phase 38: Add MFA Challenge to Login Page
- Enhance `pages/auth/Login.tsx`:
  - After email + password success:
    - If `mfa_required: true`: show MFA challenge step
  - MFA challenge:
    - "Enter your 6-digit authentication code"
    - Code input (6 boxes)
    - "Verify" button
    - "Use backup code instead" link
  - Backup code flow:
    - Single input for backup code
    - "Recover Access" button
  - Rate limit: show "Too many attempts. Try again in 15 minutes."

Files:
- `Smart_Civic_Platform_Frontend/src/pages/auth/Login.tsx`

### Phase 39: Create Invite Management UI (Super Admin)
- New: `pages/superadmin/InviteManager.tsx`:
  - **Create Invite** card:
    - Email input + Designation input
    - "Generate Invite Link" button
    - Result: show link (copyable) + expiry countdown
  - **Active Invites** table:
    - Email, designation, created, expires in, status (pending/used/expired)
    - "Revoke" button for active invites
  - **Invite History** table:
    - All past invites with status and accepted timestamp

Files:
- `Smart_Civic_Platform_Frontend/src/pages/superadmin/InviteManager.tsx` (NEW)
- `Smart_Civic_Platform_Frontend/src/routes/AppRoutes.tsx`

### Phase 40: Create Security Alert Center (Super Admin)
- New: `pages/superadmin/SecurityCenter.tsx`:
  - **Security Dashboard** card: MFA stats, invite stats, IP whitelist status, dual-control pending
  - **Alerts Feed**: list of security alerts with acknowledge button
  - **Login History**: table of super admin logins with IP, user agent, timestamp
  - **Recent Activity**: audit log filtered to security-relevant actions

Files:
- `Smart_Civic_Platform_Frontend/src/pages/superadmin/SecurityCenter.tsx` (NEW)
- `Smart_Civic_Platform_Frontend/src/routes/AppRoutes.tsx`

---

## DOMAIN I — Frontend: Super Admin Security Settings & Governance UI (Phases 41–45)

### Phase 41: Create IP Whitelist Management UI
- New: `pages/superadmin/IpWhitelist.tsx`:
  - **Current Rules** table: CIDR, label, status, created by, created date
  - "Add Rule" button → inline form: CIDR input + label input
  - "Remove" button per rule with confirmation
  - **Enforcement Toggle**: enable/disable IP whitelist
  - **Test IP** section: input IP → check if allowed
  - Validation: CIDR format validation on input

Files:
- `Smart_Civic_Platform_Frontend/src/pages/superadmin/IpWhitelist.tsx` (NEW)

### Phase 42: Create Dual-Control Approval UI
- New: `pages/superadmin/DualControl.tsx`:
  - **Pending Requests** list:
    - Action type (create_superadmin, delete_municipality, etc.)
    - Requester name, timestamp
    - Target summary (municipality name, new admin email, etc.)
    - "Approve" / "Reject" buttons with reason input
  - **Request History** table: past requests with status
  - **Configuration**: toggle which actions require dual-control

Files:
- `Smart_Civic_Platform_Frontend/src/pages/superadmin/DualControl.tsx` (NEW)

### Phase 43: Create System Settings UI
- New: `pages/superadmin/SystemSettings.tsx`:
  - **Maintenance Mode** toggle card with confirmation
  - **Registration Toggle**: allow/disallow public registration
  - **Default SLA Hours** number input
  - **Rate Limits**: max complaints per day per citizen
  - **MFA Enforcement**: require MFA for all users toggle
  - **Password Policy** editor:
    - Min length, require upper/lower/number/special checkboxes
    - Max age (days), prevent reuse count
  - Save per-setting with "Save" button
  - Sensitive settings require dual-control approval

Files:
- `Smart_Civic_Platform_Frontend/src/pages/superadmin/SystemSettings.tsx` (NEW)

### Phase 44: Create Super Admin Profile & Password Management
- New: `pages/superadmin/ProfilePage.tsx`:
  - View/edit: full name, email (read-only), designation
  - **Security Section**:
    - MFA status (enabled/disabled) with "Setup" or "Disable" button
    - Password age indicator: "Last changed X days ago"
    - "Change Password" button → password change form
    - Session management: "Active Sessions" list with "Revoke" button
  - **Activity Log**: recent actions taken by this super admin

Files:
- `Smart_Civic_Platform_Frontend/src/pages/superadmin/ProfilePage.tsx` (NEW)
- `Smart_Civic_Platform_Frontend/src/routes/AppRoutes.tsx`

### Phase 45: Add Super Admin Navigation & Sidebar Updates
- Update navbar config for super admin:
  - Dashboard
  - Municipalities (existing ManageMuniciple)
  - Invites (new)
  - Security Center (new)
  - IP Whitelist (new)
  - Dual Control (new)
  - System Settings (new)
  - Audit Logs (existing)
  - Profile (new)
- Role-based sidebar: only super admin sees these items
- Notification bell with security alert badge count

Files:
- `Smart_Civic_Platform_Frontend/src/config/navbar.config.tsx`
- `Smart_Civic_Platform_Frontend/src/components/layout/AppNavbar.tsx`

---

## DOMAIN J — Testing, Documentation & Deployment (Phases 46–50)

### Phase 46: Backend Tests — Invite System
- Test: Generate invite → token stored in DB with 15-min expiry
- Test: Validate valid token → returns success
- Test: Validate expired token → returns error
- Test: Validate used token → returns error
- Test: Validate revoked token → returns error
- Test: Accept invite → creates super admin account + consumes token
- Test: Revoke invite → mark as revoked

Files:
- `Smart_Civic_Platform_Backend/tests/superadmin-invite.test.ts` (NEW)

### Phase 47: Backend Tests — MFA & Password Policy
- Test: TOTP secret generation returns valid QR URI
- Test: Verify TOTP code matches secret
- Test: MFA login challenge → valid code returns JWT
- Test: MFA login challenge → invalid code returns error
- Test: Password policy enforcement (16+ chars, uppercase, etc.)
- Test: Password reuse prevention (last 5)
- Test: MFA required middleware blocks non-MFA super admin
- Test: Backup code recovery flow

Files:
- `Smart_Civic_Platform_Backend/tests/superadmin-mfa.test.ts` (NEW)

### Phase 48: Backend Tests — Security Governance
- Test: IP whitelist CIDR matching
- Test: IP whitelist middleware blocks non-whitelisted IP
- Test: Dual-control creates pending request
- Test: Dual-control approve executes action
- Test: Dual-control reject does not execute
- Test: Last super admin protection prevents role change
- Test: Public registration rejects super_admin role
- Test: Maintenance mode blocks non-admin requests

Files:
- `Smart_Civic_Platform_Backend/tests/superadmin-security.test.ts` (NEW)

### Phase 49: Frontend Tests — Invite & MFA UI
- Test: AcceptInvite page validates token on mount
- Test: AcceptInvite form submits registration
- Test: Expired/used/revoked invite shows correct error
- Test: MfaSetup renders QR code
- Test: MfaSetup verify button calls API
- Test: Login page shows MFA challenge step
- Test: MFA challenge with valid code logs in
- Test: Backup code recovery works
- Test: InviteManager shows invite list

Files:
- `Smart_Civic_Platform_Frontend/src/__tests__/AcceptInvite.test.tsx` (NEW)
- `Smart_Civic_Platform_Frontend/src/__tests__/MfaSetup.test.tsx` (NEW)
- `Smart_Civic_Platform_Frontend/src/__tests__/LoginMfa.test.tsx` (NEW)

### Phase 50: Documentation & Cleanup
- Create `docs/superadmin-onboarding-security.md`:
  - Two onboarding pathways (CLI seed + invite)
  - 5-step invited registration workflow
  - Security architecture: IP whitelist, MFA, dual-control
  - Password policy configuration
  - Governance safeguards (last admin protection, maintenance mode, public route guard)
- Update `Supabase_Schema.sql` with all new tables
- Seed default password policy and notification templates
- Add `bootstrap:superadmin` and `seed` to package.json scripts
- Update `AGENT.md` and `Smart_Civic_Platform_Backend/CLAUDE.md`
- Lint + typecheck all changed code

Files:
- `Smart_Civic_Platform/docs/superadmin-onboarding-security.md` (NEW)
- `Supabase_Schema.sql`
- `AGENT.md`
- `Smart_Civic_Platform_Backend/CLAUDE.md`

---

## Summary: 10 Domains × 5 Phases = 50 Phases

| Domain | Phases | Focus |
|--------|--------|-------|
| **A** | 1–5 | Database: Security Schema (invites, MFA tokens, IP whitelist, dual-control, password policy) |
| **B** | 6–10 | Backend: CLI Bootstrap (Method 1) + Seed Script + Password Policy + Public Route Guard |
| **C** | 11–15 | Backend: Invite System (Method 2) — generate, validate, consume, email, audit |
| **D** | 16–20 | Backend: MFA & Password (TOTP service, enrollment, login challenge, change enforcement, middleware) |
| **E** | 21–25 | Backend: Security Governance (IP whitelist, dual-control service, endpoints, middleware, approval) |
| **F** | 26–30 | Backend: Admin Management (CRUD, last admin protection, sessions, system settings, maintenance mode) |
| **G** | 31–35 | Backend: Security Alerts (alert service, broadcast on activation, suspicious login detection, security dashboard) |
| **H** | 36–40 | Frontend: Invite & MFA UI (accept invite page, MFA setup, login challenge, invite manager, security center) |
| **I** | 41–45 | Frontend: Governance UI (IP whitelist, dual-control, system settings, profile page, sidebar navigation) |
| **J** | 46–50 | Testing, Documentation & Deployment |

---

## Key Architecture Decisions

### Onboarding Pathways
```
Method 1: CLI Bootstrap
  └── npx ts-node scripts/bootstrap-superadmin.ts
  └── Checks: no existing super admin → creates root account
  └── MFA: enforced on first login (redirect to MFA setup)

Method 2: Invite Protocol
  └── Existing Super Admin generates invite via web UI
  └── Token: crypto.randomBytes(32).toString('hex') — 64 char hex
  └── Expiry: 15 minutes (configurable)
  └── Email sent to target with secure link
  └── 5-step flow: Validate → Setup Profile → MFA Bind → Activate → Alert
```

### Security Enforcement Order
```
1. Public Route Guard → reject super_admin role in /register
2. Password Policy → 16+ chars, complexity, history check
3. IP Whitelist → check request IP against CIDR rules
4. MFA Enforcement → block non-MFA super admins
5. Dual-Control → critical actions need secondary approval
6. Last Admin Guard → prevent orphaned system state
7. Maintenance Mode → block public during maintenance
```

### Dual-Control Required Actions
| Action | Approver | Notes |
|--------|----------|-------|
| `create_superadmin` | Another super admin | Prevents rogue admin creation |
| `delete_municipality` | Another super admin | Irreversible data loss |
| `system_setting_change` | Another super admin | Global impact |
| `suspend_superadmin` | Another super admin | Cannot suspend self |

### MFA Flow
```
Login → Password Valid → MFA Required? → No → JWT issued
                                │ Yes
                                ▼
                        Challenge: 6-digit TOTP
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
               Code Valid             Code Invalid
                    │                       │
                    ▼                       ▼
               JWT issued           Retry (max 5 → lockout 15min)
                                        │
                                   Backup Code? → Yes → JWT issued
```
