# Smart Civic Platform — API Reference

Human-readable index for every HTTP endpoint. Interactive docs are generated from **`@swagger` JSDoc blocks** in `src/routes/*.ts` (not from `swagger.ts` itself).

| Resource | URL |
|----------|-----|
| Swagger UI | `http://localhost:3000/api/docs` |
| OpenAPI JSON | `http://localhost:3000/api/docs/swagger.json` |
| Root info | `GET /` |
| Default port | `3000` (`PORT` env overrides) |

---

## How Swagger fits together

```
src/config/swagger.ts          ← OpenAPI base (info, tags, shared schemas)
        │
        │  swagger-jsdoc scans ONLY:
        ▼
src/routes/*.ts                ← @swagger comments above each route
        │
        ▼
getSwaggerSpec()  →  /api/docs  +  /api/docs/swagger.json
```

**`swagger.ts` does not list endpoints.** It defines:

- API title, version, servers
- Tags: Health, Auth, Superadmin, Municipality, Department, Staff
- Reusable schemas: `LoginRequest`, `RegisterRequest`, `SuccessResponse`, etc.
- `getRouteApiFiles()` — discovers files in `src/routes` (dev) or `dist/routes` (prod)

**Where to add or edit an endpoint doc:** open the matching file under `src/routes/` and edit the `/** @swagger ... */` block directly above the `router.get/post/...` line.

### Route file → Swagger source map

| Route file | Mounted at | `@swagger` blocks |
|------------|------------|-------------------|
| `src/routes/health.routes.ts` | `/health` | line ~6 |
| `src/routes/auth.routes.ts` | `/api/auth` | lines ~17, 46, 74, 106, 136, 155, 191, 222 |
| `src/routes/superadmin.routes.ts` | `/api/superadmin` | lines ~12, 45, 89, 140, 181, 221, 266, 322 |
| `src/routes/municipality.routes.ts` | `/api/municipality` | lines ~10, 26, 58, 81, 97, 119, 148, 171, 187 |
| `src/routes/department.route.ts` | `/api/department` | lines ~81, 112, 148, 164, 180, 202 |
| `src/routes/staff.routes.ts` | `/api/staff` | lines ~14, 46, 92, 158, 222 |
| `src/routes/citizen.routes.ts` | `/api/citizen` | lines ~14, 28, 55, 88, 108, 136, 162, 186 |

**Note:** `src/modules/citizen/*` files are empty stubs. Citizen APIs are implemented in `src/controller/citizen.controller.ts` and wired via `src/routes/citizen.routes.ts`.

### If Swagger UI shows no endpoints

1. **Run in dev** — `yarn dev` / `npm run dev` (uses `tsx` on `src/`). On startup you should see:  
   `[swagger] Scanning 6 route file(s): ...` and `Swagger paths loaded: 32`.
2. **Production build** — `npm run build` compiles TypeScript but **does not copy `@swagger` comments** into useful JSDoc unless preserved. If you only run `npm start` without a populated `dist/routes` with comments, path count can be **0**. Prefer `npm run dev` for docs, or ensure route `.js` files in `dist/routes` still contain `@swagger` blocks.
3. **Working directory** — start the server from `Smart_Civic_Platform_Backend` so `src/routes` resolves.
4. **Verify JSON** — open `/api/docs/swagger.json` and check `"paths"` is non-empty.

---

## Conventions

### Authentication

Protected routes require:

```http
Authorization: Bearer <access_token>
```

Obtain `access_token` from `POST /api/auth/login` or `POST /api/auth/refresh`.

In Swagger UI, click **Authorize**, enter: `Bearer <your_token>` or just the token (depending on UI version).

### Response envelope

**Success:**

```json
{
  "success": true,
  "message": "Success",
  "data": { }
}
```

**Error:**

```json
{
  "success": false,
  "message": "Error description"
}
```

### Roles

| Role | Typical access |
|------|----------------|
| `citizen` | Register, login, public auth |
| `staff` | Staff complaint routes |
| `department_head` | Department routes + staff routes |
| `municipality_head` | Municipality routes + invite |
| `superadmin` | All admin routes |

Rate limit: **100 requests / 15 min / IP** (global).

---

## Endpoint index (38 paths)

### Health

| Method | Path | Auth | Swagger in |
|--------|------|------|------------|
| GET | `/health` | No | `health.routes.ts` ~6 |

**Response:** `{ "status": "ok", "timestamp": "<ISO>" }`

---

### Auth — prefix `/api/auth`

| Method | Path | Auth | Roles | Swagger in |
|--------|------|------|-------|------------|
| POST | `/register` | No | — | `auth.routes.ts` ~17 |
| POST | `/login` | No | — | ~46 |
| POST | `/refresh` | No | — | ~74 |
| POST | `/logout` | Bearer | any logged-in | ~106 |
| GET | `/me` | Bearer | any logged-in | ~136 |
| POST | `/invite` | Bearer | superadmin, municipality_head, department_head | ~155 |
| POST | `/accept-invite` | No | — | ~191 |
| POST | `/forgot-password` | No | — | ~222 |

#### `POST /api/auth/register` — Citizen signup

**Body (Zod: `registerSchema`):**

```json
{
  "first_name": "string",
  "last_name": "string",
  "email": "user@example.com",
  "password": "min 8 chars",
  "phone": "optional",
  "ward_number": "optional"
}
```

**201** — `{ id, email }` in `data`.

#### `POST /api/auth/login`

**Body:**

```json
{ "email": "user@example.com", "password": "string" }
```

**200** — `data`: `{ access_token, refresh_token, expires_in, profile }`.

#### `POST /api/auth/refresh`

**Body:** `{ "refresh_token": "..." }`

**200** — new tokens in `data`.

#### `POST /api/auth/logout`

**Body:** `{ "refresh_token": "..." }` — revokes refresh token.

#### `GET /api/auth/me`

**200** — `data` is current user profile from JWT middleware.

#### `POST /api/auth/invite`

**Body:**

```json
{
  "target_email": "staff@example.com",
  "target_role": "municipality_head | department_head | staff",
  "department_id": "uuid (optional, required for staff/dept head)"
}
```

Uses inviter’s `municipality_id` from token.

#### `POST /api/auth/accept-invite`

**Body:**

```json
{
  "token": "invite token from email",
  "full_name": "string",
  "password": "min 8 chars",
  "phone": "optional"
}
```

#### `POST /api/auth/forgot-password`

**Body:** `{ "email": "user@example.com" }`  
Always returns success-style message (no email enumeration).

---

### Superadmin — prefix `/api/superadmin`

**Middleware:** `authenticate` + `authorize("superadmin")` on all routes.

| Method | Path | Swagger in |
|--------|------|------------|
| GET | `/municipalities` | `superadmin.routes.ts` ~12 |
| POST | `/municipalities` | ~45 |
| PATCH | `/municipalities/:id` | ~89 |
| DELETE | `/municipalities/:id` | ~140 (soft delete) |
| GET | `/stats` | ~181 |
| GET | `/profiles` | ~221 |
| PATCH | `/profiles/:id/status` | ~266 |
| GET | `/audit-logs` | ~322 |

#### `GET /api/superadmin/profiles`

**Query:** `role`, `municipality_id` (optional filters).

#### `PATCH /api/superadmin/profiles/:id/status`

**Body:**

```json
{ "account_status": "active | suspended | inactive" }
```

#### `GET /api/superadmin/audit-logs`

**Query:** `page` (default 1), 50 items per page.

#### `POST /api/superadmin/municipalities`

**Body:** municipality fields (inserted as-is); server adds `registration_code` like `MUN-<timestamp>`.

---

### Municipality — prefix `/api/municipality`

**Middleware:** `authenticate` + `authorize("municipality_head", "superadmin")`.

| Method | Path | Swagger in |
|--------|------|------------|
| GET | `/complaints` | `municipality.routes.ts` ~10 |
| PATCH | `/complaints/:id/assign` | ~26 |
| PATCH | `/complaints/:id/reject` | ~58 |
| GET | `/departments` | ~81 |
| POST | `/departments` | ~97 |
| PATCH | `/departments/:id` | ~119 |
| DELETE | `/departments/:id` | ~148 |
| GET | `/sla-breaches` | ~171 |
| GET | `/invitations` | ~187 |

#### `GET /api/municipality/complaints`

**Query (implementation):** `status`, `priority`, `page`, `limit` (default page 1, limit 20).

#### `PATCH /api/municipality/complaints/:id/assign`

**Body:**

```json
{
  "department_id": "uuid",
  "remark": "optional"
}
```

#### `PATCH /api/municipality/complaints/:id/reject`

**Body:** `{ "reason": "string" }` (required by service).

#### `POST /api/municipality/departments`

**Body:**

```json
{
  "dept_name": "required",
  "department_type": "optional",
  "dept_email": "optional",
  "dept_contact": "optional"
}
```

---

### Department — prefix `/api/department`

**Middleware:** `authenticate` + `authorize("department_head", "superadmin")`.

| Method | Path | Swagger in |
|--------|------|------------|
| GET | `/complaints` | `department.route.ts` ~81 |
| PATCH | `/complaints/:id/assign` | ~112 |
| GET | `/staff` | ~148 |
| GET | `/teams` | ~164 |
| POST | `/teams` | ~180 |
| GET | `/workload` | ~202 |

#### `GET /api/department/complaints`

**Query:** `status`, `page`, `limit`.

#### `PATCH /api/department/complaints/:id/assign`

**Body:**

```json
{
  "staff_id": "uuid (required)",
  "remark": "optional"
}
```

#### `POST /api/department/teams`

**Body:** `{ "team_name": "required", "specialty": "optional" }`

---

### Staff — prefix `/api/staff`

**Middleware:** `authenticate` + `authorize("staff", "department_head", "municipality_head")`.

| Method | Path | Swagger in |
|--------|------|------------|
| GET | `/complaints` | `staff.routes.ts` ~14 |
| GET | `/complaints/:id` | ~46 |
| PATCH | `/complaints/:id/status` | ~92 |
| POST | `/complaints/:id/proof` | ~158 |
| GET | `/profile` | ~222 |

#### `PATCH /api/staff/complaints/:id/status`

**Body:**

```json
{
  "status": "in_progress | resolved",
  "note": "optional",
  "citizen_message": "optional (on resolve)"
}
```

Resolved status calls RPC `resolve_complaint`.

#### `POST /api/staff/complaints/:id/proof`

**Body:**

```json
{
  "file_url": "string",
  "file_name": "string",
  "file_type": "string",
  "file_size_bytes": 12345
}
```

---

## Shared OpenAPI schemas (`swagger.ts`)

Defined under `components.schemas` — reference in route JSDoc with `$ref`:

| Schema | Used by |
|--------|---------|
| `SuccessResponse` | Most 200/201 responses |
| `ErrorResponse` | 400/401 errors |
| `LoginRequest` | `/api/auth/login` |
| `RegisterRequest` | `/api/auth/register` |
| `RefreshRequest` | `/api/auth/refresh`, `/logout` |
| `InviteRequest` | `/api/auth/invite` |
| `AcceptInviteRequest` | `/api/auth/accept-invite` |
| `ForgotPasswordRequest` | `/api/auth/forgot-password` |

Security scheme: **`BearerAuth`** (HTTP bearer JWT).

---

## Application entry (`src/index.ts`)

```text
GET  /
GET  /health              → health.routes
POST /api/auth/*          → auth.routes
*    /api/superadmin/*    → superadmin.routes
*    /api/municipality/*  → municipality.routes
*    /api/department/*    → department.route
*    /api/staff/*         → staff.routes
*    /api/citizen/*       → citizen.routes
GET  /api/docs            → Swagger UI
GET  /api/docs/swagger.json
```

---

## Adding a new documented endpoint

1. Add handler in the appropriate `src/routes/<name>.routes.ts`.
2. Paste a `/** @swagger ... */` block **immediately above** the route (copy style from a sibling route).
3. Use full path including mount prefix, e.g. `/api/auth/my-route`.
4. Restart dev server; confirm `Swagger paths loaded` count increased.
5. Update this `API.md` index table if you maintain it manually.

Example minimal block:

```js
/**
 * @swagger
 * /api/auth/example:
 *   get:
 *     tags: [Auth]
 *     summary: Short description
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/example', handler);
```

---

### Citizen — prefix `/api/citizen`

| Method | Path | Auth | Roles | Swagger in |
|--------|------|------|-------|------------|
| GET | `/municipalities` | No | — | `citizen.routes.ts` ~14 |
| GET | `/municipalities/:municipalityId/categories` | No | — | ~28 |
| POST | `/complaints` | Bearer | citizen | ~55 |
| GET | `/complaints` | Bearer | citizen | ~88 |
| GET | `/complaints/:id` | Bearer | citizen | ~108 |
| GET | `/complaints/:id/history` | Bearer | citizen | ~136 |
| POST | `/complaints/:id/feedback` | Bearer | citizen | ~162 |

#### `POST /api/citizen/complaints`

**Body:**

```json
{
  "municipality_id": "uuid",
  "title": "string",
  "description": "string",
  "category_id": "uuid (optional)",
  "priority": "low | medium | high | urgent (optional)",
  "address_hint": "optional",
  "latitude": 0,
  "longitude": 0,
  "is_anonymous": false
}
```

#### `POST /api/citizen/complaints/:id/feedback`

**Body:** `{ "rating": 1-5, "comment": "optional", "is_anonymous": false }`  
Only allowed when complaint `status` is `resolved`.

---

## Legacy / unused module stubs

`src/modules/citizen/*` and other `src/modules/**` route files are **empty**. Use `src/routes/citizen.routes.ts` instead (same pattern as auth, staff, etc.).

---

## Quick test commands

```bash
# Health
curl http://localhost:3000/health

# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"first_name":"A","last_name":"B","email":"a@b.com","password":"password1"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"a@b.com","password":"password1"}'

# Me (replace TOKEN)
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer TOKEN"
```

---

*Generated from codebase audit. Swagger path count in dev: **38**. Last aligned with `src/routes` as of project state.*
