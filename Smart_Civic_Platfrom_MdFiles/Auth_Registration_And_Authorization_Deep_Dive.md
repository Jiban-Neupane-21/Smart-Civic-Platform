# 🏛️ Smart Civic Platform — Auth, Registration & Authorization Deep Dive

> **Last reviewed:** 2026-05-30  
> **SQL file:** `smart_civic_platform.sql`  
> **Backend:** `Smart_Civic_Platform_Backend/src`

---

## Table of Contents

1. [Role Hierarchy Overview](#1-role-hierarchy-overview)
2. [Database Schema — Auth-Critical Tables](#2-database-schema--auth-critical-tables)
3. [How Registration Works Per Role](#3-how-registration-works-per-role)
   - [3.1 Citizen — Self Registration](#31-citizen--self-registration)
   - [3.2 Staff / Department Head / Municipality Head — Invite Flow](#32-staff--department-head--municipality-head--invite-flow)
   - [3.3 Superadmin — Direct Creation](#33-superadmin--direct-creation)
4. [The `handle_new_user` Trigger (Heart of Registration)](#4-the-handle_new_user-trigger-heart-of-registration)
5. [Authentication Flow — How Login Works](#5-authentication-flow--how-login-works)
6. [Authorization Architecture](#6-authorization-architecture)
   - [6.1 Middleware Layer](#61-middleware-layer)
   - [6.2 Row Level Security (RLS) — Database Layer](#62-row-level-security-rls--database-layer)
   - [6.3 Helper SQL Functions](#63-helper-sql-functions)
7. [RLS Policy Table — Who Can Do What](#7-rls-policy-table--who-can-do-what)
8. [Token System](#8-token-system)
9. [Issues Found & Recommended Improvements](#9-issues-found--recommended-improvements)
10. [Invitation Flow — Complete In-Depth Guide](#10-invitation-flow--complete-in-depth-guide)
    - [10.1 Overview & Why Invite-Only for Staff](#101-overview--why-invite-only-for-staff)
    - [10.2 Who Can Invite Whom — Permission Matrix](#102-who-can-invite-whom--permission-matrix)
    - [10.3 Full Sequence Diagram](#103-full-sequence-diagram)
    - [10.4 Step-by-Step: Sending an Invitation](#104-step-by-step-sending-an-invitation)
    - [10.5 Step-by-Step: Accepting an Invitation](#105-step-by-step-accepting-an-invitation)
    - [10.6 Invitation Token Security Design](#106-invitation-token-security-design)
    - [10.7 Invitation State Machine](#107-invitation-state-machine)
    - [10.8 Database State at Each Stage](#108-database-state-at-each-stage)
    - [10.9 Invitation Expiry & Cleanup](#109-invitation-expiry--cleanup)
    - [10.10 RLS on `staff_invitations`](#1010-rls-on-staff_invitations)
    - [10.11 Edge Cases & Failure Scenarios](#1011-edge-cases--failure-scenarios)
    - [10.12 Invitation Flow Issues & Improvements](#1012-invitation-flow-issues--improvements)

---

## 1. Role Hierarchy Overview

```
superadmin
    └── municipality_head
            └── department_head
                    └── staff
                            └── citizen
```

| Role | Scope | Registered Via |
|------|-------|----------------|
| `superadmin` | Entire platform | Direct DB / `POST /api/superadmin/admins` |
| `municipality_head` | One municipality | Staff invitation flow |
| `department_head` | One department within a municipality | Staff invitation flow |
| `staff` | One department within a municipality | Staff invitation flow |
| `citizen` | Self-service | `POST /api/auth/register` |

---

## 2. Database Schema — Auth-Critical Tables

### `profiles` (base identity row for EVERY user)

```sql
id                uuid PRIMARY KEY  → references auth.users(id)
full_name         text NOT NULL
email             text NOT NULL UNIQUE
phone             text
role              user_role NOT NULL DEFAULT 'citizen'
account_status    account_status NOT NULL DEFAULT 'active'
municipality_id   uuid → references municipalities(m_uid)   -- NULL for citizen/superadmin
department_id     uuid → references departments(d_uid)      -- NULL unless dept role
profile_picture   text
last_login_at     timestamptz
force_password_reset boolean DEFAULT false                  -- set on invite
invited_by        uuid → references profiles(id)
email_verified_at timestamptz
is_deleted        boolean DEFAULT false
```

> **Key point:** Every single user, regardless of role, gets a `profiles` row.  
> This is the source of truth for `role`, `municipality_id`, and `department_id`.

---

### `citizens` (extra detail for citizen role only)

```sql
id              uuid PK → references profiles(id)   -- same UUID as profile
first_name      text NOT NULL
middle_name     text
last_name       text NOT NULL
date_of_birth   date
gender          gender
home_address    text
permanent_address text
ward_number     text
notification_pref notification_pref DEFAULT 'email'
```

---

### `staff` (extra detail for municipality_head / department_head / staff)

```sql
s_uid           uuid PK
profile_id      uuid UNIQUE → references profiles(id)
municipality_id uuid → references municipalities(m_uid)
department_id   uuid → references departments(d_uid)
employee_id     text UNIQUE
staff_role      user_role CHECK (staff_role IN ('municipality_head','department_head','staff'))
shift_start     time
shift_end       time
employee_status employee_status DEFAULT 'active'
joined_date     date
invited_at      timestamptz
onboarded_at    timestamptz
```

> **Note:** `municipality_head` is ALLOWED in the `staff` table but does NOT
> require a `department_id`. `department_head` and `staff` SHOULD have one.

---

### `staff_invitations` (invite lifecycle tracking)

```sql
inv_uid         uuid PK
token_hash      text UNIQUE      -- SHA-256 of the raw token emailed
target_email    text NOT NULL
target_role     user_role CHECK (target_role IN ('staff','department_head','municipality_head'))
municipality_id uuid NOT NULL
department_id   uuid             -- optional, but required for dept_head/staff
invited_by      uuid NOT NULL
status          text DEFAULT 'pending'  -- pending|accepted|expired|revoked
accepted_at     timestamptz
expires_at      timestamptz DEFAULT now() + interval '72 hours'
```

---

### `refresh_tokens` (server-side session revocation)

```sql
rt_uid      uuid PK
profile_id  uuid → references profiles(id)
token_hash  text UNIQUE    -- SHA-256 of raw refresh token
issued_at   timestamptz
expires_at  timestamptz
is_revoked  boolean DEFAULT false
revoked_at  timestamptz
ip_address  inet
user_agent  text
```

---

## 3. How Registration Works Per Role

---

### 3.1 Citizen — Self Registration

**Endpoint:** `POST /api/auth/register`  
**Auth required:** ❌ None  
**Validation:** `registerSchema` (Zod)

#### Request Body

```json
{
  "first_name": "Ram",
  "last_name":  "Sharma",
  "email":      "ram@example.com",
  "password":   "SecurePass123",
  "phone":      "+977-9800000000",     // optional
  "full_address": "Kathmandu, Ward 5"  // optional
}
```

> When no `role` is provided, it defaults to `"citizen"`.

#### Step-by-Step Flow

```
POST /api/auth/register
        │
        ▼
validateBody(registerSchema)
  ├── Zod validates all fields
  ├── role defaults to "citizen"
  └── NO municipality_id / department_id required for citizen
        │
        ▼
AuthController.register()
        │
        ▼
registerService(body)
  │
  ├─ supabaseAdmin.auth.admin.createUser({
  │     email, password,
  │     email_confirm: true,         ← skips email verification step
  │     user_metadata: {
  │       full_name: "Ram Sharma",
  │       first_name: "Ram",
  │       last_name: "Sharma",
  │       role: "citizen"            ← NEW: now passed in metadata
  │     }
  │  })
  │
  │  ⬇ Supabase inserts into auth.users
  │  ⬇ DB trigger fires: handle_new_user()
  │
  ├─ Trigger inserts into profiles:
  │    { id, full_name, email, role: 'citizen',
  │      municipality_id: NULL, department_id: NULL }
  │
  ├─ Trigger inserts into citizens:
  │    { id, first_name: 'Ram', last_name: 'Sharma' }
  │
  ├─ If phone provided → UPDATE profiles SET phone = ...
  └─ If full_address provided → UPDATE citizens SET home_address = ...

Response: 201 { id, email }
```

#### Tables Written To

| Table | Action |
|-------|--------|
| `auth.users` | INSERT (by Supabase) |
| `profiles` | INSERT (by trigger) |
| `citizens` | INSERT (by trigger) |

---

### 3.2 Staff / Department Head / Municipality Head — Invite Flow

> Staff roles **cannot** self-register. They MUST be invited by a higher-level user.

#### Step A — Send Invitation

**Endpoint:** `POST /api/auth/invite`  
**Auth required:** ✅ Bearer token  
**Authorized roles:** `superadmin`, `municipality_head`, `department_head`

```json
{
  "target_email": "dept_head@municipality.gov",
  "target_role":  "department_head",
  "department_id": "uuid-of-department"   // required for dept_head/staff
}
```

**Flow:**

```
POST /api/auth/invite
        │
        ▼
authenticate middleware
  └─ Validates JWT → loads profile from DB → sets req.user
        │
        ▼
authorize("superadmin", "municipality_head", "department_head")
  └─ Checks req.user.role is allowed
        │
        ▼
validateBody(inviteSchema)
  └─ Validates target_email, target_role (must be staff-level only)
        │
        ▼
inviteStaffService({
    target_email, target_role,
    municipality_id: req.user.municipality_id,  ← taken from INVITER's profile
    department_id (from body, optional),
    invited_by: req.user.id
})
  │
  ├─ Check: no existing profile with target_email
  ├─ expire_stale_invitations()  ← SQL function, marks old tokens expired
  ├─ Generate rawToken = crypto.randomBytes(32).hex()
  ├─ tokenHash = SHA-256(rawToken)
  ├─ INSERT into staff_invitations {
  │    token_hash, target_email, target_role,
  │    municipality_id, department_id, invited_by,
  │    status: 'pending', expires_at: now()+72h
  │  }
  └─ sendInviteEmail(target_email, rawToken)  ← email contains RAW token
```

**RLS enforcement at DB level (what roles can invite what):**

| Inviter role | DB RLS policy allows |
|---|---|
| `superadmin` | All invitations, any municipality |
| `municipality_head` | Invitations within their `municipality_id` |
| `department_head` | Only `target_role = 'staff'` in their own `department_id` |

---

#### Step B — Accept Invitation (Staff Completes Registration)

**Endpoint:** `POST /api/auth/accept-invite`  
**Auth required:** ❌ None (token IS the credential)

```json
{
  "token":     "raw-64-hex-chars-from-email",
  "full_name": "Sita Rai",
  "password":  "StrongPass456",
  "phone":     "+977-9811111111"   // optional
}
```

**Flow:**

```
POST /api/auth/accept-invite
        │
        ▼
validateBody(acceptInviteSchema)
        │
        ▼
acceptInviteService(body)
  │
  ├─ tokenHash = SHA-256(body.token)
  ├─ expire_stale_invitations()
  ├─ SELECT * FROM staff_invitations
  │    WHERE token_hash = tokenHash AND status = 'pending'
  │  → throws "Invalid or expired invitation token" if not found
  ├─ Check invite.expires_at > now()
  │
  ├─ supabaseAdmin.auth.admin.createUser({
  │     email: invite.target_email,
  │     password: body.password,
  │     email_confirm: true,
  │     user_metadata: {
  │       full_name: body.full_name,
  │       role: invite.target_role     ← e.g. 'department_head'
  │     }
  │  })
  │
  │  ⬇ Trigger handle_new_user() fires:
  │    → profiles INSERT with role, municipality_id, department_id from metadata
  │    → staff INSERT (since role is in staff roles)  ← NEW after SQL update
  │
  ├─ UPDATE profiles SET {
  │    full_name, role, municipality_id, department_id,
  │    phone, invited_by, force_password_reset: false
  │  } WHERE id = uid
  │
  ├─ INSERT into staff {    ← ⚠️ DUPLICATE of trigger (see Issues section)
  │    profile_id, municipality_id, department_id, staff_role,
  │    invited_at, onboarded_at
  │  }
  │
  └─ UPDATE staff_invitations
       SET status='accepted', accepted_at=now()
       WHERE token_hash = tokenHash

Response: 200 { message: "Account created successfully." }
```

#### Tables Written To

| Table | Action |
|-------|--------|
| `auth.users` | INSERT (by Supabase) |
| `profiles` | INSERT (trigger) + UPDATE (service) |
| `staff` | INSERT (trigger) + ⚠️ INSERT again (service) → **CONFLICT** |
| `staff_invitations` | UPDATE status to `accepted` |

---

### 3.3 Superadmin — Direct Creation

**Endpoint:** `POST /api/superadmin/admins`  
**Auth required:** ✅ Superadmin token  
**Guard:** `isSuperadmin` middleware in superadmin router

Superadmins are created by existing superadmins through the admin panel.  
No public self-registration. No invite token needed.

---

## 4. The `handle_new_user` Trigger (Heart of Registration)

This PostgreSQL trigger fires on **every** `INSERT` into `auth.users`.

### Current Trigger Logic (after SQL update)

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_role            text;
  v_municipality_id uuid;
  v_department_id   uuid;
BEGIN
  v_role            := COALESCE(new.raw_user_meta_data->>'role', 'citizen');
  v_municipality_id := (new.raw_user_meta_data->>'municipality_id')::uuid;
  v_department_id   := (new.raw_user_meta_data->>'department_id')::uuid;

  -- 1. Always insert base profile row
  INSERT INTO profiles (id, full_name, email, role, municipality_id, department_id)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Unknown'),
    new.email,
    v_role::user_role,
    v_municipality_id,
    v_department_id
  );

  -- 2. Branch by role
  IF v_role = 'citizen' THEN
    INSERT INTO citizens (id, first_name, last_name)
    VALUES (
      new.id,
      COALESCE(new.raw_user_meta_data->>'first_name', 'Unknown'),
      COALESCE(new.raw_user_meta_data->>'last_name', 'Unknown')
    );

  ELSIF v_role IN ('municipality_head', 'department_head', 'staff') THEN
    INSERT INTO staff (profile_id, municipality_id, department_id, staff_role)
    VALUES (new.id, v_municipality_id, v_department_id, v_role::user_role);

  -- superadmin: only profile row needed
  END IF;

  RETURN new;
END;
$$;
```

### What the Trigger Does per Role

| Role passed in metadata | Profile INSERT | Citizens INSERT | Staff INSERT |
|---|---|---|---|
| `citizen` (or missing) | ✅ | ✅ | ❌ |
| `municipality_head` | ✅ | ❌ | ✅ (no dept_id) |
| `department_head` | ✅ | ❌ | ✅ (with dept_id) |
| `staff` | ✅ | ❌ | ✅ (with dept_id) |
| `superadmin` | ✅ | ❌ | ❌ |

---

## 5. Authentication Flow — How Login Works

**Endpoint:** `POST /api/auth/login`

```
POST /api/auth/login { email, password }
        │
        ▼
loginService(email, password)
  │
  ├─ supabaseAdmin.auth.signInWithPassword({ email, password })
  │  → returns access_token + refresh_token (Supabase session)
  │
  ├─ SELECT profile: id, full_name, email, role,
  │    municipality_id, department_id, account_status, force_password_reset
  │  WHERE id = user.id
  │
  ├─ if account_status === 'suspended' → throw error
  │
  ├─ UPDATE profiles SET last_login_at = now()
  │
  ├─ tokenHash = SHA-256(refresh_token)
  ├─ INSERT into refresh_tokens { profile_id, token_hash, expires_at: +30 days }
  │
  └─ Return { access_token, refresh_token, expires_in, profile }
```

### Token Lifecycle

```
Login → access_token (15min) + refresh_token (30 days, stored in refresh_tokens)
                │
                ▼
          POST /api/auth/refresh
          ├─ Lookup refresh_token by hash
          ├─ Check not revoked, not expired
          ├─ Supabase refreshSession()
          ├─ Revoke old token (is_revoked=true)
          └─ Insert new token → return new pair

          POST /api/auth/logout
          └─ Mark refresh_token is_revoked=true
```

> **Note:** `app.ts` sets `ACCESS_TOKEN_EXPIRY: '15m'` and `REFRESH_TOKEN_EXPIRY_DAYS: 7`
> but `loginService` inserts with `+30 days`. These are **inconsistent** (see Issues).

---

## 6. Authorization Architecture

### 6.1 Middleware Layer

Three middleware functions form the TypeScript auth chain:

#### `authenticate` (verify identity)

```
Request with Authorization: Bearer <jwt>
        │
        ▼
1. Extract token from header
2. createUserClient(token).auth.getUser()  ← validates JWT with Supabase
3. supabaseAdmin.from('profiles').select(...)  ← loads role/municipality/dept
4. Check account_status !== 'suspended'
5. Sets req.user = { id, email, role, municipality_id, department_id, full_name }
6. Sets req.userClient = supabase client scoped to this user's JWT (RLS-aware)
```

**`AuthUser` interface:**
```typescript
{
  id: string;
  userId: string;        // duplicate of id (camelCase alias)
  email: string;
  role: string;
  municipality_id: string | null;
  municipalityId: string | null;  // duplicate of municipality_id
  department_id: string | null;
  departmentId: string | null;    // duplicate of department_id
  full_name: string;
}
```

#### `authorize(...roles)` (verify permission)

```typescript
authorize("superadmin", "municipality_head")
// Checks: req.user.role must be one of the listed roles
// Returns 403 if not
```

Simple, flat role check. No hierarchy awareness.

#### Superadmin-specific in `superadmin.routes.ts`

```
router.use(superadminRateLimiter)  // 100 req / 15 min
router.use(requestLogger)          // logs request with timing
router.use(authenticate)           // verify JWT
router.use(isSuperadmin)           // custom: must be superadmin
```

All 4 applied to every superadmin route automatically.

---

### 6.2 Row Level Security (RLS) — Database Layer

RLS is the **second layer** of authorization that runs inside PostgreSQL itself.  
Even if your TypeScript code is bypassed, the DB enforces access control.

**RLS-enabled tables:**
```
municipalities, departments, staff, citizens, profiles,
complaints, assignments, teams, team_members, budgets,
spending_logs, announcements, notifications,
notification_reads, feedback, audit_logs,
staff_invitations, refresh_tokens
```

### 6.3 Helper SQL Functions

These are called inside RLS policies:

```sql
auth_role()             → returns your role from profiles
auth_municipality_id()  → returns your municipality_id from profiles
auth_department_id()    → returns your department_id from profiles
```

All run with `SECURITY DEFINER` (bypass RLS themselves to read the profiles table).

---

## 7. RLS Policy Table — Who Can Do What

### `municipalities`

| Actor | Permission | Condition |
|---|---|---|
| `superadmin` | ALL (CRUD) | always |
| Any authenticated user | SELECT | `is_active = true AND is_deleted = false` |

---

### `departments`

| Actor | Permission | Condition |
|---|---|---|
| `municipality_head` | ALL (CRUD) | own municipality only |
| Any staff | SELECT | own municipality OR own department |

> ⚠️ **Issue:** `department_head` and `staff` have no explicit SELECT policy on departments — they only get it via the "staff can read own department" policy which checks municipality_id match.

---

### `staff`

| Actor | Permission | Condition |
|---|---|---|
| `municipality_head` | ALL | own municipality only |
| `department_head` | ALL | own department only |
| `staff` | SELECT | own record only (`profile_id = auth.uid()`) |

---

### `citizens`

| Actor | Permission | Condition |
|---|---|---|
| Citizen (self) | ALL | `id = auth.uid()` |
| `superadmin`, `municipality_head`, `department_head`, `staff` | SELECT | always (any citizen) |

> ⚠️ **Issue:** Staff roles can read ALL citizens across ALL municipalities, not just their own municipality's citizens. This may be intentional but is worth noting.

---

### `profiles`

| Actor | Permission | Condition |
|---|---|---|
| Self | SELECT | `id = auth.uid()` |
| Self | UPDATE | `id = auth.uid()` |
| `superadmin`, `municipality_head`, `department_head`, `staff` | SELECT | own municipality OR self |

> ⚠️ **Issue:** Two overlapping SELECT policies exist — the "users read own profile" and "staff can read profiles in municipality" policy both allow SELECT. If a staff user queries profiles, they might get results from BOTH policies (PostgreSQL ORs them), which is correct, but could cause confusion.

---

### `complaints`

| Actor | Permission | Condition |
|---|---|---|
| Citizen (self) | ALL | `citizen_id = auth.uid()` |
| All staff roles | SELECT | own municipality AND `is_deleted = false` |
| `department_head`, `staff`, `municipality_head` | UPDATE | own municipality |

> ⚠️ **Issue:** `staff` has no explicit INSERT/DELETE on complaints. Anonymous complaint handling relies on `is_anonymous` flag only — the `citizen_id` still links to the citizen even for anonymous complaints.

---

### `staff_invitations`

| Actor | Permission | Condition |
|---|---|---|
| `superadmin` | ALL | always |
| `municipality_head` | ALL | own municipality |
| `department_head` | ALL (insert constrained) | own department; `target_role = 'staff'` only |

---

### `refresh_tokens`

| Actor | Permission | Condition |
|---|---|---|
| Self | ALL | `profile_id = auth.uid()` |
| `superadmin` | ALL | always |

---

## 8. Token System

### Access Token
- Issued by Supabase on login / refresh
- JWT format, verified by `createUserClient(token).auth.getUser()`
- Short-lived: **15 minutes** (per `app.ts` config)

### Refresh Token
- Issued by Supabase alongside access token
- Also stored hashed in `refresh_tokens` table (server-side control)
- Used at `POST /api/auth/refresh`
- On refresh: old token marked `is_revoked=true`, new token inserted
- Allows server-side session invalidation (unlike pure JWT)

### Invite Token
- `rawToken = crypto.randomBytes(32).toString('hex')` — 64 hex chars
- Never stored in DB; only `SHA-256(rawToken)` stored as `token_hash`
- Valid for **72 hours** from creation
- One-time use (status flips to `accepted`)

---

## 9. Issues Found & Recommended Improvements

---

### 🔴 CRITICAL: Duplicate `staff` INSERT on Accept-Invite

**Where:** `acceptInviteService` (lines 230–237) + `handle_new_user` trigger

**Problem:**  
After the recent SQL trigger update, the trigger now inserts a row into `staff` when the role is a staff role. But `acceptInviteService` **also** does a manual `staff` INSERT. This will throw a **unique constraint violation** on `staff.profile_id` because it's `UNIQUE`.

**Fix:** Remove the manual `staff` INSERT from `acceptInviteService` since the trigger handles it. OR keep the TypeScript insert and remove the staff insert from the trigger for invite-based registrations.

**Recommended approach (keep trigger lean):**

```typescript
// In acceptInviteService — REMOVE this block:
await supabaseAdmin.from("staff").insert({
  profile_id: uid,
  municipality_id: invite.municipality_id,
  department_id: invite.department_id,
  staff_role: invite.target_role,
  invited_at: new Date().toISOString(),
  onboarded_at: new Date().toISOString(),
});

// Instead, UPDATE the staff row the trigger already created:
await supabaseAdmin.from("staff").update({
  invited_at: new Date().toISOString(),
  onboarded_at: new Date().toISOString(),
}).eq("profile_id", uid);
```

---

### 🔴 CRITICAL: `registerService` Does NOT Pass Role/Municipality/Department to Metadata

**Where:** `auth.service.ts` — `registerService` function

**Problem:**  
Even though `registerSchema` now accepts `role`, `municipality_id`, and `department_id`, the `registerService` does **not** pass them to `user_metadata` in `createUser()`. So the trigger will always get `role = null` (defaults to `citizen`).

**Current code:**
```typescript
user_metadata: {
  full_name: `${body.first_name} ${body.last_name}`,
  first_name: body.first_name,
  last_name: body.last_name,
  // ← role, municipality_id, department_id missing!
}
```

**Fix:**
```typescript
user_metadata: {
  full_name: `${body.first_name} ${body.last_name}`,
  first_name: body.first_name,
  last_name: body.last_name,
  role: body.role ?? 'citizen',
  municipality_id: body.municipality_id ?? null,
  department_id: body.department_id ?? null,
},
```

---

### 🟡 MEDIUM: Refresh Token Expiry Inconsistency

**Where:** `app.ts` (config) vs `auth.service.ts` (runtime)

**Config says:**
```typescript
REFRESH_TOKEN_EXPIRY_DAYS: 7   // app.ts
```
**Service inserts:**
```typescript
expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)  // 30 days!
```

**Fix:** Use the constant from `app.ts` in the service, or define a shared constant.

---

### 🟡 MEDIUM: `AuthUser` Has Duplicate Fields

**Where:** `authenticate.ts` — `AuthUser` interface

```typescript
id: string;
userId: string;          // ← same as id
municipality_id: string | null;
municipalityId: string | null;  // ← same as municipality_id (camelCase)
department_id: string | null;
departmentId: string | null;    // ← same as department_id (camelCase)
```

These duplicates can cause confusion. Pick one convention (snake_case since it matches the DB) and stick to it.

---

### 🟡 MEDIUM: `scopeguard.ts`, `auditlogger.ts`, `rateLimiter.ts`, `forcePasswordReset.ts` Are Empty

These middleware files exist but are **completely empty** (0 bytes). They are referenced in routes (e.g. `superadmin.routes.ts` imports `auditLogger`, `superadminRateLimiter`), which means those imports are coming from elsewhere (the superadmin middleware folder). But these global middleware files in `src/middleware/` are placeholders.

**This means:**
- `forcePasswordReset` flag on `profiles` is never checked
- Global audit logging is not implemented
- Global rate limiting relies only on the `express-rate-limit` in `index.ts`

---

### 🟡 MEDIUM: Open Registration for Staff Roles is a Security Risk

**Where:** `registerSchema` + `registerService`

**Problem:**  
The updated `/api/auth/register` endpoint allows anyone to register as `municipality_head`, `department_head`, or `staff` by simply providing a `role` field. This bypasses the entire invite-and-approval flow.

**There are two valid designs:**
1. **Keep `/register` citizen-only** — reject any non-citizen `role` at the validation level
2. **Allow staff self-registration but require approval** — add `account_status: 'inactive'` until a superadmin approves

**Current state is dangerous:** anyone can claim to be a `municipality_head` for any municipality UUID they happen to know.

**Quick fix in `registerSchema`:**
```typescript
role: z.literal('citizen').optional().default('citizen'),
// Remove municipality_id and department_id from registerSchema entirely
```

---

### 🟡 MEDIUM: `inviteSchema` Does Not Enforce `department_id` for Dept-Level Roles

**Where:** `auth.validation.ts` — `inviteSchema`

```typescript
export const inviteSchema = z.object({
  target_email: z.string().email(),
  target_role: z.enum(["municipality_head", "department_head", "staff"]),
  department_id: z.string().uuid().optional(),  // ← not required for dept_head/staff!
});
```

If `target_role` is `department_head` or `staff` but `department_id` is missing, the invitation is created without a `department_id`. The invited user then ends up in the `staff` table with `department_id = NULL`, breaking department-scoped RLS.

**Fix:**
```typescript
export const inviteSchema = z.object({
  target_email: z.string().email(),
  target_role: z.enum(["municipality_head", "department_head", "staff"]),
  department_id: z.string().uuid().optional(),
}).superRefine((data, ctx) => {
  if (['department_head', 'staff'].includes(data.target_role) && !data.department_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'department_id is required for department_head and staff roles',
      path: ['department_id'],
    });
  }
});
```

---

### 🟢 MINOR: `ProfileRow` Has `full_address: Address` but DB Column is `text`

**Where:** `database.type.ts` — `ProfileRow`

```typescript
full_address: Address;  // TypeScript type
```

But in `smart_civic_platform.sql`, the `profiles` table has **no** `full_address` column. Address data for citizens lives in `citizens.home_address` (type `text`). For the profile there is only `phone`. This type is incorrect and misleading.

---

### 🟢 MINOR: `ward_number` in `citizens` is `text` but Could Be `int`

Ward numbers in Nepal are typically 1–33. Using `text` is fine for flexibility but consider adding a CHECK constraint if you want validation.

---

### 🟢 MINOR: No `email_verified_at` Populate

`profiles.email_verified_at` column exists but is never SET anywhere in the codebase. Since `email_confirm: true` bypasses email verification, this field stays `NULL` for everyone. Either populate it on creation or remove it.

---

## Summary — Registration Flow Comparison

| | Citizen | Staff/DeptHead/MunHead | Superadmin |
|---|---|---|---|
| **Endpoint** | `POST /api/auth/register` | `POST /api/auth/invite` → `accept-invite` | `POST /api/superadmin/admins` |
| **Auth to start** | None | Inviter must be authenticated | Superadmin token |
| **Email verification** | Skipped (`email_confirm: true`) | Skipped | Skipped |
| **Profile row** | Trigger | Trigger + service UPDATE | Trigger |
| **Detail row** | `citizens` (trigger) | `staff` (trigger + service — ⚠️ duplicate) | None |
| **Token issued** | None (login separately) | None (login separately) | None |
| **Invite token** | N/A | 72h expiry, SHA-256 hashed | N/A |
| **force_password_reset** | false | false (set in accept-invite) | TBD |

---

## 10. Invitation Flow — Complete In-Depth Guide

---

### 10.1 Overview & Why Invite-Only for Staff

In Smart Civic Platform, **only citizens can self-register**. Every staff-level account (`staff`, `department_head`, `municipality_head`) must be **invited** by a higher-privileged user. This is a deliberate security design:

- Prevents unauthorized users from claiming staff/admin roles
- Ties every staff account to a specific municipality and optionally a department **from creation**
- Provides a full audit trail (who invited whom, when, from which organization)
- Tokens expire after 72 hours — no dangling open registrations

The flow has **two independent HTTP calls** separated in time:

```
Call 1 (Inviter):  POST /api/auth/invite        → creates invitation + sends email
Call 2 (Invitee):  POST /api/auth/accept-invite  → creates account using token from email
```

---

### 10.2 Who Can Invite Whom — Permission Matrix

Enforced at **two layers**: TypeScript `authorize()` middleware + PostgreSQL RLS.

| Inviter Role | Can Invite | Allowed Target Roles | Scope Restriction |
|---|---|---|---|
| `superadmin` | ✅ Anyone | `municipality_head`, `department_head`, `staff` | No scope restriction |
| `municipality_head` | ✅ | `municipality_head`, `department_head`, `staff` | Only within **their own** `municipality_id` |
| `department_head` | ✅ (limited) | `staff` **only** | Only within **their own** `department_id` |
| `staff` | ❌ | — | Cannot invite anyone |
| `citizen` | ❌ | — | Cannot invite anyone |

> **Note:** The inviter's `municipality_id` is taken from `req.user.municipality_id` (their profile),
> NOT from the request body. This means a `municipality_head` can never invite someone
> into a different municipality even if they try to pass a different UUID.

**TypeScript route guard:**
```typescript
router.post(
  "/invite",
  authenticate,
  authorize("superadmin", "municipality_head", "department_head"),
  validateBody(inviteSchema),
  AuthController.inviteStaff,
);
```

**DB RLS policy (additional enforcement):**
```sql
-- department_head can only create invitations for 'staff' role
create policy "department_head manages own department invitations"
  on staff_invitations for all
  using (auth_role() = 'department_head' and department_id = auth_department_id())
  with check (
    auth_role() = 'department_head'
    and department_id = auth_department_id()
    and target_role = 'staff'   -- ← hard-coded restriction
  );
```

---

### 10.3 Full Sequence Diagram

```
 INVITER                  BACKEND                   DATABASE              INVITEE (email)
    │                        │                          │                       │
    │  POST /api/auth/invite  │                          │                       │
    │  { target_email,        │                          │                       │
    │    target_role,         │                          │                       │
    │    department_id? }     │                          │                       │
    │───────────────────────▶│                          │                       │
    │                        │ authenticate()            │                       │
    │                        │  └─ validate JWT          │                       │
    │                        │  └─ load profile          │                       │
    │                        │ authorize(roles)          │                       │
    │                        │  └─ check role allowed    │                       │
    │                        │ validateBody(inviteSchema)│                       │
    │                        │  └─ Zod validation        │                       │
    │                        │                          │                       │
    │                        │ inviteStaffService()      │                       │
    │                        │  ├─ check no existing     │                       │
    │                        │  │  user with that email  │                       │
    │                        │  │──SELECT profiles──────▶│                       │
    │                        │  │                        │                       │
    │                        │  ├─ expire_stale_invitations()                    │
    │                        │  │──UPDATE staff_invitations (expired)───────────▶│
    │                        │  │                        │                       │
    │                        │  ├─ generate rawToken (32 random bytes)           │
    │                        │  ├─ tokenHash = SHA-256(rawToken)                 │
    │                        │  │                        │                       │
    │                        │  ├─ INSERT staff_invitations ─────────────────────▶│
    │                        │  │  { token_hash, target_email,                   │
    │                        │  │    target_role, municipality_id,               │
    │                        │  │    department_id, invited_by,                  │
    │                        │  │    status: 'pending',                          │
    │                        │  │    expires_at: now()+72h }                     │
    │                        │  │                        │                       │
    │                        │  └─ sendInviteEmail(target_email, rawToken)       │
    │                        │      └─ email contains invite link with rawToken  │
    │◀──────────────────────│  201 { message: "Invitation sent" }               │
    │                        │                          │                       │
    │                        │                          │  (invitee receives email)
    │                        │                          │       clicks link     │
    │                        │                          │                       │
    │                        │◀──── POST /api/auth/accept-invite ───────────────│
    │                        │      { token: rawToken,  │                       │
    │                        │        full_name,         │                       │
    │                        │        password, phone? } │                       │
    │                        │                          │                       │
    │                        │ validateBody(acceptInviteSchema)                  │
    │                        │                          │                       │
    │                        │ acceptInviteService()     │                       │
    │                        │  ├─ tokenHash = SHA-256(rawToken)                 │
    │                        │  ├─ expire_stale_invitations()                    │
    │                        │  │                        │                       │
    │                        │  ├─ SELECT staff_invitations                      │
    │                        │  │  WHERE token_hash = ?  │                       │
    │                        │  │  AND status = 'pending'│                       │
    │                        │  │◀───────────────────────│                       │
    │                        │  │  → throws if not found │                       │
    │                        │  │                        │                       │
    │                        │  ├─ check invite.expires_at > now()               │
    │                        │  │                        │                       │
    │                        │  ├─ createUser(email, password, metadata)         │
    │                        │  │──INSERT auth.users────▶│                       │
    │                        │  │                        │                       │
    │                        │  │              ┌─────────┴──────────┐            │
    │                        │  │              │ handle_new_user()   │            │
    │                        │  │              │ TRIGGER fires       │            │
    │                        │  │              │  ├─ INSERT profiles  │            │
    │                        │  │              │  └─ INSERT staff     │            │
    │                        │  │              └────────────────────┘            │
    │                        │  │                        │                       │
    │                        │  ├─ UPDATE profiles SET   │                       │
    │                        │  │  { full_name, role,    │                       │
    │                        │  │    municipality_id,    │                       │
    │                        │  │    department_id,phone,│                       │
    │                        │  │    invited_by,         │                       │
    │                        │  │    force_password_reset: false }               │
    │                        │  │──────────────────────▶│                       │
    │                        │  │                        │                       │
    │                        │  ├─ ⚠️ INSERT staff (DUPLICATE of trigger)       │
    │                        │  │──────────────────────▶│ ← UNIQUE VIOLATION    │
    │                        │  │                        │                       │
    │                        │  └─ UPDATE staff_invitations                      │
    │                        │     SET status='accepted',                        │
    │                        │         accepted_at=now()                         │
    │                        │──────────────────────────▶│                      │
    │                        │                          │                       │
    │                        │─── 200 "Account created" ────────────────────────▶│
    │                        │                          │              can now login
```

---

### 10.4 Step-by-Step: Sending an Invitation

**Endpoint:** `POST /api/auth/invite`  
**File:** `src/modules/auth/services/auth.service.ts` → `inviteStaffService()`

#### Request

```json
{
  "target_email": "dept.head@municipality.gov.np",
  "target_role":  "department_head",
  "department_id": "d1234567-89ab-cdef-0123-456789abcdef"
}
```

> `municipality_id` is **NOT** in the body — it is always pulled from the **inviter's own profile** (`req.user.municipality_id`). This prevents scope escalation.

#### Validation Schema (`inviteSchema`)

```typescript
z.object({
  target_email: z.string().email(),
  target_role: z.enum(["municipality_head", "department_head", "staff"]),
  department_id: z.string().uuid().optional(),  // ⚠️ not enforced as required
})
```

#### What Happens Inside `inviteStaffService`

```typescript
// 1. Guard: No existing user with that email
const { data: existing } = await supabaseAdmin
  .from("profiles")
  .select("id")
  .eq("email", body.target_email)
  .maybeSingle();
if (existing) throw new Error("A user with this email already exists");

// 2. Clean up expired invitations before creating a new one
await supabaseAdmin.rpc("expire_stale_invitations");

// 3. Generate cryptographically secure token
const rawToken = crypto.randomBytes(32).toString("hex");  // 64-char hex string
const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

// 4. Persist the invitation (hash only, never raw token)
await supabaseAdmin.from("staff_invitations").insert({
  token_hash:       tokenHash,
  target_email:     body.target_email,
  target_role:      body.target_role,
  municipality_id:  body.municipality_id,   // from req.user, not request body
  department_id:    body.department_id ?? null,
  invited_by:       body.invited_by,        // inviter's profile id
  status:           "pending",
  // expires_at defaults to now() + interval '72 hours' in SQL
});

// 5. Send email with the RAW token
await sendInviteEmail(body.target_email, rawToken);
```

#### What the Invitee Email Contains

The email contains a link like:
```
https://your-app.com/accept-invite?token=<64-char-hex-rawToken>
```

The **frontend** parses this URL and submits the token to `POST /api/auth/accept-invite`.

---

### 10.5 Step-by-Step: Accepting an Invitation

**Endpoint:** `POST /api/auth/accept-invite`  
**Auth required:** ❌ None — the token itself is the credential  
**File:** `src/modules/auth/services/auth.service.ts` → `acceptInviteService()`

#### Request

```json
{
  "token":     "a3f9e2...64hexchars...b7c1d8",
  "full_name": "Sita Rai",
  "password":  "SecurePass456",
  "phone":     "+977-9811111111"
}
```

#### Internal Steps (annotated)

```typescript
// Step 1: Reconstruct the hash from the submitted token
const tokenHash = crypto.createHash("sha256").update(body.token).digest("hex");

// Step 2: Mark any stale invitations as expired
await supabaseAdmin.rpc("expire_stale_invitations");

// Step 3: Look up the invitation — ONLY valid pending ones
const { data: invite } = await supabaseAdmin
  .from("staff_invitations")
  .select("*")
  .eq("token_hash", tokenHash)
  .eq("status", "pending")
  .single();
// → If not found: "Invalid or expired invitation token"

// Step 4: Double-check expiry (paranoia check, expire_stale_invitations may race)
if (new Date(invite.expires_at) < new Date()) {
  throw new Error("Invitation has expired");
}

// Step 5: Create the Supabase auth user
const { data: authData } = await supabaseAdmin.auth.admin.createUser({
  email: invite.target_email,
  password: body.password,
  email_confirm: true,           // no email verification step
  user_metadata: {
    full_name: body.full_name,
    role: invite.target_role,    // e.g. 'department_head'
    // ⚠️ municipality_id and department_id NOT passed here
    // → trigger will create staff row WITHOUT dept info
  },
});
// → DB trigger fires: handle_new_user()
//   inserts profiles row + staff row (after SQL update)

// Step 6: Fix up the profile with full invite context
await supabaseAdmin.from("profiles").update({
  full_name:            body.full_name,
  role:                 invite.target_role,
  municipality_id:      invite.municipality_id,
  department_id:        invite.department_id,
  phone:                body.phone ?? null,
  invited_by:           invite.invited_by,
  force_password_reset: false,
}).eq("id", uid);

// Step 7: ⚠️ DUPLICATE — insert staff row (trigger already did this)
await supabaseAdmin.from("staff").insert({
  profile_id:      uid,
  municipality_id: invite.municipality_id,
  department_id:   invite.department_id,
  staff_role:      invite.target_role,
  invited_at:      new Date().toISOString(),
  onboarded_at:    new Date().toISOString(),
});
// → Will THROW unique constraint error because trigger already inserted profile_id

// Step 8: Mark the invitation consumed
await supabaseAdmin.from("staff_invitations").update({
  status:      "accepted",
  accepted_at: new Date().toISOString(),
}).eq("token_hash", tokenHash);
```

---

### 10.6 Invitation Token Security Design

```
┌──────────────────────────────────────────────────────────────────┐
│                    TOKEN SECURITY MODEL                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Generation:  rawToken = crypto.randomBytes(32).hex()            │
│               = 256 bits of entropy                              │
│               = brute-force practically impossible               │
│                                                                   │
│  Storage:     tokenHash = SHA-256(rawToken)                      │
│               Only the HASH is stored in staff_invitations        │
│               The raw token NEVER touches the database           │
│                                                                   │
│  Delivery:    rawToken sent in email link to invitee ONLY        │
│                                                                   │
│  Verification: On accept, SHA-256(submitted_token) must match    │
│                stored token_hash                                  │
│                                                                   │
│  Invalidation: One-time use — status flips to 'accepted'         │
│               72-hour expiry — status flips to 'expired'         │
│               Can be revoked — status flips to 'revoked'         │
│                                                                   │
│  Why hash?    If DB is compromised, attacker cannot reconstruct  │
│               invite URLs. SHA-256 is one-way.                   │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

**Comparison with common alternatives:**

| Approach | Risk | Used Here? |
|---|---|---|
| Store raw token in DB | DB breach exposes all invite links | ❌ No |
| Store hashed token | DB breach useless without raw token | ✅ Yes |
| UUID as token | Only 122 bits entropy, no hash needed | ❌ No |
| JWT invite token | Stateless, harder to revoke | ❌ No |
| Email OTP (6 digits) | Easy to brute-force | ❌ No |

---

### 10.7 Invitation State Machine

```
                    ┌─────────────┐
                    │             │
    POST /invite    │   PENDING   │
   ───────────────▶│             │
                    └──────┬──────┘
                           │
           ┌───────────────┼────────────────┐
           │               │                │
           ▼               ▼                ▼
    ┌─────────────┐ ┌──────────────┐ ┌──────────────┐
    │             │ │              │ │              │
    │  ACCEPTED   │ │   EXPIRED    │ │   REVOKED    │
    │             │ │              │ │              │
    └─────────────┘ └──────────────┘ └──────────────┘
          ▲                ▲                ▲
          │                │                │
  /accept-invite   expire_stale_     Manual revoke
  called with      invitations()     (superadmin/
  valid token      SQL function      municipality_head)
```

**State transitions:**

| From | To | Trigger |
|---|---|---|
| `pending` | `accepted` | `/accept-invite` called with valid, non-expired token |
| `pending` | `expired` | `expire_stale_invitations()` SQL function runs and `expires_at < now()` |
| `pending` | `revoked` | Admin manually updates the record |
| `accepted` | — | Terminal state, no further transitions |
| `expired` | — | Terminal state |
| `revoked` | — | Terminal state |

---

### 10.8 Database State at Each Stage

#### After `POST /api/auth/invite` is called:

```
Table: staff_invitations
┌─────────────────────────────────────────────────────────────────┐
│ inv_uid        │ NEW UUID                                        │
│ token_hash     │ SHA-256(rawToken)  ← only hash stored          │
│ target_email   │ "dept.head@example.com"                        │
│ target_role    │ "department_head"                              │
│ municipality_id│ <inviter's municipality uuid>                  │
│ department_id  │ <uuid> or NULL                                 │
│ invited_by     │ <inviter's profile uuid>                       │
│ status         │ "pending"                                      │
│ accepted_at    │ NULL                                           │
│ expires_at     │ now() + 72 hours                               │
│ created_at     │ now()                                          │
└─────────────────────────────────────────────────────────────────┘

Table: auth.users     → NOT YET CREATED
Table: profiles       → NOT YET CREATED
Table: staff          → NOT YET CREATED
```

#### After `POST /api/auth/accept-invite` succeeds:

```
Table: auth.users
┌─────────────────────────────────────────────────────────────────┐
│ id             │ NEW UUID (same as profiles.id)                  │
│ email          │ invite.target_email                            │
│ raw_user_meta_data │ { full_name, role }                        │
└─────────────────────────────────────────────────────────────────┘

Table: profiles  (trigger creates, service updates)
┌─────────────────────────────────────────────────────────────────┐
│ id             │ same as auth.users.id                          │
│ full_name      │ body.full_name                                 │
│ email          │ invite.target_email                            │
│ role           │ invite.target_role (e.g. 'department_head')    │
│ municipality_id│ invite.municipality_id                         │
│ department_id  │ invite.department_id                           │
│ phone          │ body.phone or NULL                             │
│ invited_by     │ invite.invited_by                              │
│ force_password_reset │ false                                    │
│ account_status │ 'active'                                       │
└─────────────────────────────────────────────────────────────────┘

Table: staff  (trigger creates — service INSERT causes conflict)
┌─────────────────────────────────────────────────────────────────┐
│ s_uid          │ NEW UUID                                        │
│ profile_id     │ same as profiles.id  ← UNIQUE constraint        │
│ municipality_id│ from invite                                     │
│ department_id  │ from invite                                     │
│ staff_role     │ invite.target_role                             │
│ employee_status│ 'active'                                        │
│ invited_at     │ NULL (trigger doesn't set this)                │
│ onboarded_at   │ NULL (trigger doesn't set this)                │
└─────────────────────────────────────────────────────────────────┘

Table: staff_invitations  (updated)
┌─────────────────────────────────────────────────────────────────┐
│ status         │ "accepted"                                      │
│ accepted_at    │ now()                                           │
└─────────────────────────────────────────────────────────────────┘
```

---

### 10.9 Invitation Expiry & Cleanup

There is a SQL helper function to mark stale invitations:

```sql
CREATE OR REPLACE FUNCTION expire_stale_invitations()
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE staff_invitations
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < now();
$$;
```

**When is it called?**
- Before sending a **new invitation** (in `inviteStaffService`)
- Before **accepting** an invitation (in `acceptInviteService`)

**What it does NOT do:**
- It is NOT called on a schedule/cron job — only on demand
- It does NOT delete expired rows — they remain for audit purposes

> ⚠️ If no invitations are sent or accepted for a long time, many `pending` rows
> may accumulate in the table. Consider adding a scheduled cleanup or a pg_cron job:
> ```sql
> SELECT cron.schedule('expire-invitations', '0 * * * *',
>   'SELECT expire_stale_invitations()');
> ```

---

### 10.10 RLS on `staff_invitations`

Three policies control who can read/write invitations at the database level:

```sql
-- Policy 1: superadmin has full access to all invitations
CREATE POLICY "superadmin manages all invitations"
  ON staff_invitations FOR ALL
  USING (auth_role() = 'superadmin')
  WITH CHECK (auth_role() = 'superadmin');

-- Policy 2: municipality_head manages invitations for their municipality
CREATE POLICY "municipality_head manages own municipality invitations"
  ON staff_invitations FOR ALL
  USING (
    auth_role() = 'municipality_head'
    AND municipality_id = auth_municipality_id()
  )
  WITH CHECK (
    auth_role() = 'municipality_head'
    AND municipality_id = auth_municipality_id()
  );

-- Policy 3: department_head manages invitations for their department
-- BUT can ONLY create invitations with target_role = 'staff'
CREATE POLICY "department_head manages own department invitations"
  ON staff_invitations FOR ALL
  USING (
    auth_role() = 'department_head'
    AND department_id = auth_department_id()
  )
  WITH CHECK (
    auth_role() = 'department_head'
    AND department_id = auth_department_id()
    AND target_role = 'staff'   -- ← critical restriction
  );
```

**Key observations:**
- The `accept-invite` endpoint uses the **service role** (bypasses RLS entirely)
- No public `SELECT` policy exists — anonymous users cannot list or read invitation records
- The token hash lookup in `acceptInviteService` uses `supabaseAdmin` (service key), so RLS is bypassed deliberately for token validation

---

### 10.11 Edge Cases & Failure Scenarios

| Scenario | What Happens | Current Handling |
|---|---|---|
| Email already registered | `inviteStaffService` checks `profiles` table first | ✅ Handled — throws error |
| Token submitted twice | Second call: `status = 'accepted'`, not `'pending'` → SELECT returns nothing | ✅ Handled — throws "Invalid or expired" |
| Token expired (72h passed) | `expire_stale_invitations()` marks it `expired` → SELECT fails | ✅ Handled |
| Token tampered (wrong hash) | SHA-256 won't match any `token_hash` → SELECT returns nothing | ✅ Handled |
| Inviter account suspended after invite | Invitation still valid — invitee can still accept | ⚠️ Not handled |
| Same email invited twice | Second insert will succeed (first may still be `pending`) → two active invitations | ⚠️ Not guarded — duplicate invites possible |
| `department_id` NULL for `department_head` role | Invite created, accepted — staff row has `NULL department_id` | ⚠️ RLS breaks for that user |
| Accept with correct token but wrong password strength | `createUser` may fail; invitation NOT marked accepted; user can retry | ✅ Handled (atomic failure) |
| Trigger inserts `staff`, service also inserts `staff` | UNIQUE constraint on `profile_id` → 500 error | 🔴 Bug — crashes accept-invite |

---

### 10.12 Invitation Flow Issues & Improvements

#### 🔴 Bug 1: Duplicate `staff` INSERT crashes `accept-invite`

See [Section 9 — Issues](#9-issues-found--recommended-improvements) for the fix.  
**Short version:** Change the TypeScript `staff` INSERT in `acceptInviteService` to an **UPDATE** since the trigger already inserted the row:

```typescript
// BEFORE (broken):
await supabaseAdmin.from("staff").insert({ profile_id: uid, ... });

// AFTER (correct):
await supabaseAdmin.from("staff")
  .update({ invited_at: now, onboarded_at: now })
  .eq("profile_id", uid);
```

---

#### 🔴 Bug 2: `municipality_id`/`department_id` NOT Passed to Trigger via Metadata

In `acceptInviteService`, when `createUser()` is called, only `full_name` and `role` are in `user_metadata`. The trigger (`handle_new_user`) therefore creates the `staff` row with `municipality_id = NULL` and `department_id = NULL`. The subsequent `UPDATE profiles` in Step 6 fixes the profile, but the `staff` row (created by trigger) still has NULLs.

**Fix:** Pass municipality and department in metadata:
```typescript
user_metadata: {
  full_name:       body.full_name,
  role:            invite.target_role,
  municipality_id: invite.municipality_id,  // ← add this
  department_id:   invite.department_id,    // ← add this
},
```

---

#### ⚠️ Issue 3: Duplicate Invitations Possible for Same Email

The check at the start of `inviteStaffService` only checks `profiles` for an existing user.  
If someone is invited but hasn't accepted yet, they can be invited **again** — creating two `pending` entries with different tokens.

**Fix:** Also check `staff_invitations` for a pending record:
```typescript
const { data: pendingInvite } = await supabaseAdmin
  .from("staff_invitations")
  .select("inv_uid")
  .eq("target_email", body.target_email)
  .eq("status", "pending")
  .maybeSingle();
if (pendingInvite) throw new Error("A pending invitation already exists for this email");
```

---

#### ⚠️ Issue 4: `inviteSchema` Does Not Require `department_id` for Dept Roles

```typescript
// Current — department_id is always optional:
department_id: z.string().uuid().optional()

// Fix — require it for dept-scoped roles:
.superRefine((data, ctx) => {
  if (['department_head', 'staff'].includes(data.target_role) && !data.department_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'department_id is required for department_head and staff roles',
      path: ['department_id'],
    });
  }
})
```

---

#### ⚠️ Issue 5: No Way to Re-send an Invitation

There is no `POST /api/auth/invite/resend` endpoint. If the invitee loses the email or the token expires, the only option is to create a **new** invitation (which creates a new entry). Old expired entries are never cleaned up automatically.

**Suggested:** Add a resend endpoint that:
1. Looks up the existing pending invitation by email
2. Revokes the old token
3. Creates a fresh invitation with new token and 72h expiry

---

#### 🟢 Minor: `invited_at` vs `onboarded_at` Semantics

In the `staff` table:
- `invited_at` — when the invite was sent (should be set at `POST /invite`)
- `onboarded_at` — when they completed registration (should be set at `accept-invite`)

Currently, **both** are set to `new Date()` at accept-invite time. `invited_at` should actually be set from `staff_invitations.created_at` to be semantically accurate.

```typescript
// More accurate:
await supabaseAdmin.from("staff").update({
  invited_at:   invite.created_at,       // ← when invite was originally sent
  onboarded_at: new Date().toISOString() // ← when they accepted
}).eq("profile_id", uid);
```

---

*Document generated by Antigravity AI — Smart Civic Platform analysis*
