# Role Registration System — Smart Civic Platform Backend

> **Generated:** 2026-05-30  
> **Source:** `Smart_Civic_Platform_Backend/src/`  

---

## 1. Role Definitions

All roles are defined as a PostgreSQL `ENUM` type in the database and mirrored in TypeScript:

### Database (`smart_civic_platform.sql`)
```sql
CREATE TYPE user_role AS ENUM (
  'superadmin',
  'municipality_head',
  'department_head',
  'staff',
  'citizen'
);
```

### TypeScript (`src/types/database.type.ts`)
```typescript
export type UserRole =
  | "superadmin"
  | "municipality_head"
  | "department_head"
  | "staff"
  | "citizen";
```

### Role Hierarchy (`src/app.ts`)
```
citizen → staff → department_head → municipality_head → superadmin
   (lowest privilege)                                  (highest privilege)
```

---

## 2. Role-by-Role Registration Flow

### 🟢 Role: `citizen`
**Registration Method:** Public self-registration via API.

#### API Endpoint
```
POST /api/auth/register
```

#### Request Body (validated via Zod schema)
```json
{
  "first_name": "string",
  "last_name": "string",
  "email": "string (email format)",
  "password": "string (min 8 chars)",
  "phone": "string? (optional)",
  "full_address": "string? (optional)"
}
```

#### Step-by-Step Flow (`src/modules/auth/services/auth.service.ts → registerService`)

| Step | Action |
|------|--------|
| 1 | `POST /api/auth/register` hits `auth.routes.ts` |
| 2 | `validateBody(registerSchema)` validates input with Zod |
| 3 | `AuthController.register` calls `AuthService.registerService()` |
| 4 | `supabaseAdmin.auth.admin.createUser()` creates the user in **Supabase Auth** with `email_confirm: true` and `user_metadata: { full_name, first_name, last_name }` |
| 5 | The `handle_new_user()` DB trigger fires **automatically** on `auth.users` INSERT |
| 6 | Trigger reads `raw_user_meta_data->>'role'` — defaults to `'citizen'` since no role is passed |
| 7 | A row is inserted into `profiles` with `role = 'citizen'` |
| 8 | Trigger also inserts a row into `citizens` table (because `user_role = 'citizen'`) |
| 9 | If `phone` or `full_address` is provided, `auth.service.ts` updates `profiles.phone` / `citizens.home_address` |

#### Database Trigger (`smart_civic_platform.sql`)
```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  user_role text;
BEGIN
  user_role := COALESCE(new.raw_user_meta_data->>'role', 'citizen');  -- defaults to citizen

  INSERT INTO profiles (id, full_name, email, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Unknown'),
    new.email,
    user_role::user_role
  );

  IF user_role = 'citizen' THEN
    INSERT INTO citizens (id, first_name, last_name)   -- citizen-specific row
    VALUES (
      new.id,
      COALESCE(new.raw_user_meta_data->>'first_name', 'Unknown'),
      COALESCE(new.raw_user_meta_data->>'last_name', 'Unknown')
    );
  END IF;

  RETURN new;
END;
$$;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

#### No authentication required — this is a **public endpoint**.

---

### 🟡 Role: `superadmin`
**Registration Method:** Created programmatically by an existing `superadmin` via the Superadmin Admin API.

#### API Endpoint
```
POST /api/superadmin/admins
```
**Auth required:** Bearer JWT (must be `superadmin` role)

#### Request Body
```json
{
  "name": "string",
  "email": "string",
  "password": "string"
}
```

#### Step-by-Step Flow (`src/modules/superadmin/services/superadmin.services.ts → AdminService.createAdmin`)

| Step | Action |
|------|--------|
| 1 | `POST /api/superadmin/admins` hits `superadmin.routes.ts` |
| 2 | Global middleware chain: `superadminRateLimiter` → `requestLogger` → `authenticate` → `isSuperadmin` |
| 3 | `authenticate` middleware verifies JWT, fetches profile from DB, checks `account_status ≠ 'suspended'` |
| 4 | `isSuperadmin` middleware asserts `req.user.role === 'superadmin'` |
| 5 | `validateBody(["name", "email", "password"])` ensures required fields are present |
| 6 | `auditLogger` records the action in `audit_logs` |
| 7 | `AdminService.createAdmin()` checks if email already exists in `profiles` |
| 8 | `supabaseAdmin.auth.admin.createUser()` creates auth user with `user_metadata: { full_name, role: "superadmin" }` |
| 9 | `handle_new_user()` DB trigger fires — reads `role = 'superadmin'` from metadata → inserts `profiles` with `role = 'superadmin'` |
| 10 | Service then explicitly does `.update({ full_name, role: "superadmin" })` on `profiles` to ensure correctness |
| 11 | No `staff` row or `citizens` row is created for superadmin |

#### Middleware Stack for this Route
```
POST /api/superadmin/admins
  ├── superadminRateLimiter (100 req/15min)
  ├── requestLogger
  ├── authenticate          (JWT verification + profile lookup)
  ├── isSuperadmin          (role === 'superadmin')
  ├── auditLogger
  ├── validateBody(["name", "email", "password"])
  └── AdminController.create
```

---

### 🔵 Role: `municipality_head` / `department_head` / `staff`
**Registration Method:** Invitation-only flow — cannot self-register.

These three staff roles are all registered through the **same 2-step invitation system**:

---

#### Step 1 — Send Invitation

```
POST /api/auth/invite
```
**Auth required:** Bearer JWT  
**Authorized roles:** `superadmin`, `municipality_head`, `department_head`

> **Note:** `department_head` can only invite `staff` (enforced at DB RLS level).

##### Invitation Request Body (validated via Zod `inviteSchema`)
```json
{
  "target_email": "string (email)",
  "target_role": "municipality_head | department_head | staff",
  "department_id": "uuid? (optional)"
}
```

##### Invitation Flow (`auth.service.ts → inviteStaffService`)

| Step | Action |
|------|--------|
| 1 | `POST /api/auth/invite` → `authenticate` → `authorize("superadmin", "municipality_head", "department_head")` |
| 2 | `validateBody(inviteSchema)` validates input (Zod) |
| 3 | `inviteStaffService()` checks if email already exists in `profiles` |
| 4 | `supabaseAdmin.rpc("expire_stale_invitations")` cleans up expired invitations |
| 5 | Generates a cryptographically secure random token: `crypto.randomBytes(32).toString("hex")` |
| 6 | Hashes the token with SHA-256 — only the hash is stored |
| 7 | Inserts a row into `staff_invitations` table with: `token_hash`, `target_email`, `target_role`, `municipality_id` (from JWT), `department_id`, `invited_by` (from JWT), `status: "pending"` |
| 8 | Sends invitation email with the raw token using `sendInviteEmail()` |
| 9 | The token expires after **72 hours** (set by DB default) |

##### `municipality_id` Source
The `municipality_id` is taken directly from `req.user!.municipality_id` (from JWT/profile). The inviting user cannot specify a different municipality.

---

#### Step 2 — Accept Invitation

```
POST /api/auth/accept-invite
```
**No authentication required** — token in body acts as the credential.

##### Accept Invite Request Body (validated via Zod `acceptInviteSchema`)
```json
{
  "token": "string (raw token from email)",
  "full_name": "string",
  "password": "string (min 8 chars)",
  "phone": "string? (optional)"
}
```

##### Accept Invite Flow (`auth.service.ts → acceptInviteService`)

| Step | Action |
|------|--------|
| 1 | `POST /api/auth/accept-invite` → `validateBody(acceptInviteSchema)` |
| 2 | `acceptInviteService()` hashes the incoming token with SHA-256 |
| 3 | Calls `expire_stale_invitations()` RPC to clean stale records |
| 4 | Looks up `staff_invitations` by `token_hash` WHERE `status = 'pending'` |
| 5 | Checks that `expires_at > now()` |
| 6 | `supabaseAdmin.auth.admin.createUser()` creates the Supabase Auth user with `email_confirm: true`, `user_metadata: { full_name, role: invite.target_role }` |
| 7 | `handle_new_user()` trigger fires → inserts `profiles` row with the invited `target_role` |
| 8 | Service then explicitly updates `profiles` with: `full_name`, `role` (target_role), `municipality_id`, `department_id`, `phone`, `invited_by`, `force_password_reset: false` |
| 9 | Inserts a row into `staff` table: `profile_id`, `municipality_id`, `department_id`, `staff_role` (= target_role), `invited_at`, `onboarded_at` |
| 10 | Updates `staff_invitations` to `status: "accepted"`, sets `accepted_at` |

##### Resulting DB Records After `accept-invite`

```
profiles
  ├── id           = new user UUID
  ├── role         = municipality_head | department_head | staff
  ├── municipality_id
  ├── department_id
  └── invited_by   = UUID of the inviter

staff
  ├── profile_id   = new user UUID
  ├── staff_role   = municipality_head | department_head | staff
  ├── municipality_id
  └── department_id

staff_invitations
  └── status = 'accepted', accepted_at = NOW()
```

---

## 3. Who Can Invite Whom

| Inviter Role | Can Invite | Restricted To |
|---|---|---|
| `superadmin` | `municipality_head`, `department_head`, `staff` | Any municipality |
| `municipality_head` | `department_head`, `staff` | Their own municipality |
| `department_head` | `staff` only | Their own department (enforced by DB RLS) |
| `citizen` | ❌ Cannot invite | — |
| `staff` | ❌ Cannot invite | — |

> **DB-Level Enforcement:** RLS policy `"department_head manages own department invitations"` in `smart_civic_platform.sql` restricts `department_head` to only set `target_role = 'staff'`.

---

## 4. Authentication Flow (All Roles)

Once registered, all roles log in via the same endpoint:

```
POST /api/auth/login
```

### Login Request Body
```json
{
  "email": "string",
  "password": "string"
}
```

### Login Flow (`auth.service.ts → loginService`)

| Step | Action |
|------|--------|
| 1 | `supabaseAdmin.auth.signInWithPassword()` authenticates credentials |
| 2 | Fetches `profiles` row: `id, full_name, email, role, municipality_id, department_id, account_status, force_password_reset` |
| 3 | Checks `account_status !== 'suspended'` |
| 4 | Updates `profiles.last_login_at` |
| 5 | Generates SHA-256 hash of Supabase refresh token |
| 6 | Stores hashed token in `refresh_tokens` table with 30-day expiry |
| 7 | Returns `access_token`, `refresh_token`, `expires_in`, `profile` |

---

## 5. Request Authentication Middleware (`src/middleware/authenticate.ts`)

All protected endpoints use `authenticate` middleware, which:

1. Reads `Authorization: Bearer <token>` header
2. Creates a per-request Supabase client with the user's token
3. Calls `client.auth.getUser()` to verify the JWT
4. Fetches the user's profile from `profiles` table using `supabaseAdmin`
5. Checks `account_status !== 'suspended'`
6. Attaches `req.user: AuthUser` to the request:
```typescript
interface AuthUser {
  id: string;
  userId: string;
  email: string;
  role: string;
  municipality_id: string | null;
  municipalityId: string | null;
  department_id: string | null;
  departmentId: string | null;
  full_name: string;
}
```

---

## 6. Role Authorization Middleware

### General `authorize()` (`src/middleware/authorize.ts`)
Used in citizen and auth routes:
```typescript
export const authorize = (...allowedRoles: string[]) =>
  (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return sendError(res, `Access denied. Required roles: ${allowedRoles.join(', ')}`, 403);
    }
    next();
  };
```

### Module-Level Guards (Superadmin / Municipality / Staff modules)
Each module has its own middleware (e.g., `isSuperadmin`, `isMunicipalityAdmin`, `isMunicipalityStaff`, `belongsToMunicipality`, `belongsToDepartment`) that combine role checks with scope checks (same municipality/department).

---

## 7. Database-Level Row Level Security (RLS) Summary

| Table | Policy |
|---|---|
| `municipalities` | `superadmin` full access; authenticated users can read active ones |
| `departments` | `municipality_head` full access for own municipality; staff can read |
| `staff` | `municipality_head` full access for own municipality; `department_head` full access for own department; staff can read own record |
| `citizens` | Citizens own their row; staff roles can read all |
| `profiles` | Users own their row; staff can read profiles in their municipality |
| `complaints` | Citizens manage own; staff can read/update in their municipality |
| `staff_invitations` | `superadmin` all; `municipality_head` own municipality; `department_head` own department (staff-only invites) |
| `refresh_tokens` | Users manage own; `superadmin` manages all |

---

## 8. Token & Security Configuration (`src/app.ts`)

```typescript
export const TOKEN_CONFIG = {
  ACCESS_TOKEN_EXPIRY: '15m',           // JWT access token
  REFRESH_TOKEN_EXPIRY_DAYS: 7,         // refresh token validity in app.ts (30 days in practice - see auth.service.ts)
  INVITE_TOKEN_EXPIRY_HOURS: 72,        // staff invite expiry (also enforced by DB default)
  PASSWORD_RESET_EXPIRY_MINUTES: 60,    // reset link expiry
};
```

---

## 9. Complete Route Reference

### Auth Routes (`/api/auth`)

| Method | Endpoint | Auth | Roles | Description |
|--------|----------|------|-------|-------------|
| `POST` | `/register` | ❌ Public | — | Citizen self-registration |
| `POST` | `/login` | ❌ Public | — | Login (all roles) |
| `POST` | `/refresh` | ❌ Public | — | Refresh access token |
| `POST` | `/logout` | ✅ Required | All | Revoke refresh token |
| `GET` | `/me` | ✅ Required | All | Get current user profile |
| `POST` | `/invite` | ✅ Required | `superadmin`, `municipality_head`, `department_head` | Send staff invite |
| `POST` | `/accept-invite` | ❌ Public | — | Accept invite, set password |
| `POST` | `/forgot-password` | ❌ Public | — | Trigger password reset email |

### Superadmin Routes (`/api/superadmin`)

All require: JWT auth + `superadmin` role + rate limiting.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/stats` | Platform-wide statistics |
| `GET` | `/users` | List all users |
| `GET` | `/users/:id` | Get user by ID |
| `PATCH` | `/users/:id/status` | Change user account status |
| `DELETE` | `/users/:id` | Soft-delete a user |
| `POST` | `/users/:id/impersonate` | Generate impersonation link |
| `GET` | `/admins` | List superadmin accounts |
| `POST` | `/admins` | **Create new superadmin account** |
| `GET` | `/audit-logs` | List audit logs |
| `GET` | `/feature-flags` | List feature flags |
| `PATCH` | `/feature-flags/:id/toggle` | Toggle a feature flag |

---

## 10. Registration Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                     ROLE REGISTRATION PATHS                         │
│                                                                     │
│  🌐 PUBLIC             👤 CITIZEN                                   │
│  ──────────           POST /api/auth/register                       │
│                        ↓                                            │
│                       Supabase Auth createUser (no role in meta)   │
│                        ↓                                            │
│                       handle_new_user() TRIGGER                     │
│                        ↓ role defaults to 'citizen'                │
│                       profiles INSERT (role='citizen')              │
│                        ↓                                            │
│                       citizens INSERT                               │
│                                                                     │
│  🔐 INVITE ONLY       👥 STAFF ROLES                               │
│  ──────────           Step 1: POST /api/auth/invite                 │
│                        ↓ (by superadmin/municipality_head/dept_head)│
│                       staff_invitations INSERT (status='pending')   │
│                        ↓ email sent with token                      │
│                                                                     │
│                       Step 2: POST /api/auth/accept-invite          │
│                        ↓ (by invitee using token from email)        │
│                       Supabase Auth createUser (role in metadata)   │
│                        ↓                                            │
│                       handle_new_user() TRIGGER                     │
│                        ↓ role = target_role from invitation         │
│                       profiles INSERT + UPDATE (role, municipality)│
│                        ↓                                            │
│                       staff INSERT                                  │
│                        ↓                                            │
│                       staff_invitations UPDATE (status='accepted')  │
│                                                                     │
│  🛡️ SUPERADMIN        🔑 SUPERADMIN ONLY                          │
│  ──────────           POST /api/superadmin/admins                   │
│                        ↓ (by existing superadmin)                   │
│                       Supabase Auth createUser (role='superadmin') │
│                        ↓                                            │
│                       handle_new_user() TRIGGER + profiles UPDATE   │
│                        ↓                                            │
│                       profiles.role = 'superadmin'                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 11. Key Files Reference

| File | Purpose |
|------|---------|
| [`src/modules/auth/routes/auth.routes.ts`](../Smart_Civic_Platform_Backend/src/modules/auth/routes/auth.routes.ts) | Auth endpoint definitions |
| [`src/modules/auth/services/auth.service.ts`](../Smart_Civic_Platform_Backend/src/modules/auth/services/auth.service.ts) | Register, login, invite, accept-invite logic |
| [`src/modules/auth/controller/auth.controller.ts`](../Smart_Civic_Platform_Backend/src/modules/auth/controller/auth.controller.ts) | Auth HTTP handlers |
| [`src/modules/superadmin/routes/superadmin.routes.ts`](../Smart_Civic_Platform_Backend/src/modules/superadmin/routes/superadmin.routes.ts) | Superadmin endpoint definitions |
| [`src/modules/superadmin/services/superadmin.services.ts`](../Smart_Civic_Platform_Backend/src/modules/superadmin/services/superadmin.services.ts) | AdminService.createAdmin() |
| [`src/middleware/authenticate.ts`](../Smart_Civic_Platform_Backend/src/middleware/authenticate.ts) | JWT auth middleware |
| [`src/middleware/authorize.ts`](../Smart_Civic_Platform_Backend/src/middleware/authorize.ts) | Role-based access control middleware |
| [`src/types/database.type.ts`](../Smart_Civic_Platform_Backend/src/types/database.type.ts) | TypeScript role types |
| [`src/validation/auth.validation.ts`](../Smart_Civic_Platform_Backend/src/validation/auth.validation.ts) | Zod validation schemas |
| [`src/app.ts`](../Smart_Civic_Platform_Backend/src/app.ts) | Role constants and token config |
| [`smart_civic_platform.sql`](../smart_civic_platform.sql) | DB schema, enums, triggers, RLS |
