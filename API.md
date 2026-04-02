Here's your complete API structure for the Smart Civic Platform.

---

## Project Structure First

```
src/
├── config/
│   └── supabase.js          # Supabase client init
├── middleware/
│   ├── auth.js              # verify JWT, attach user
│   ├── role.js              # role guard middleware
│   └── validate.js          # request body validation
├── modules/
│   ├── auth/
│   ├── municipalities/
│   ├── departments/
│   ├── staff/
│   ├── citizens/
│   ├── teams/
│   ├── complaints/
│   ├── assignments/
│   ├── garbage-routes/
│   ├── budgets/
│   ├── notifications/
│   ├── announcements/
│   ├── feedback/
│   └── audit/
├── app.js
└── server.js
```

Each module has:
```
modules/complaints/
├── complaints.routes.js
├── complaints.controller.js
├── complaints.service.js
└── complaints.validation.js
```

---

## Full API List & Structure

---

### 🔐 Auth — `/api/auth`

| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/signup` | Citizen self-registration | Public |
| POST | `/login` | Login for all roles | Public |
| POST | `/logout` | Invalidate session | Authenticated |
| POST | `/refresh` | Refresh access token | Authenticated |
| POST | `/forgot-password` | Send reset email | Public |
| POST | `/reset-password` | Reset with token | Public |
| GET | `/me` | Get current user profile | Authenticated |
| PATCH | `/me` | Update own profile | Authenticated |

---

### 👑 Superadmin — `/api/superadmin`

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/municipalities` | List all municipalities | Superadmin |
| POST | `/municipalities` | Create municipality | Superadmin |
| PATCH | `/municipalities/:id` | Update municipality | Superadmin |
| DELETE | `/municipalities/:id` | Soft delete municipality | Superadmin |
| POST | `/municipalities/:id/assign-head` | Assign municipality head | Superadmin |
| POST | `/staff/create` | Create staff account (any role) | Superadmin |

---

### 🏛️ Municipalities — `/api/municipalities`

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/:id` | Get municipality details | Staff+ |
| GET | `/:id/dashboard` | Stats overview | Municipality Head |
| GET | `/:id/departments` | List departments | Staff+ |
| GET | `/:id/staff` | List all staff | Municipality Head |
| GET | `/:id/complaints` | All complaints in municipality | Municipality Head |
| GET | `/:id/sla-breaches` | View SLA breaches | Municipality Head |
| GET | `/:id/budgets` | List budgets | Municipality Head |
| PATCH | `/:id/settings` | Update municipality settings | Municipality Head |

---

### 🏢 Departments — `/api/departments`

| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/` | Create department | Municipality Head |
| GET | `/:id` | Get department details | Staff+ |
| PATCH | `/:id` | Update department | Municipality Head |
| DELETE | `/:id` | Soft delete department | Municipality Head |
| POST | `/:id/assign-head` | Assign department head | Municipality Head |
| GET | `/:id/teams` | List teams in dept | Dept Head+ |
| GET | `/:id/staff` | List staff in dept | Dept Head+ |
| GET | `/:id/complaints` | Complaints for dept | Dept Head+ |
| GET | `/:id/workload` | Team workload summary | Dept Head+ |
| GET | `/:id/budgets` | Dept budgets | Dept Head+ |

---

### 👷 Staff — `/api/staff`

| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/` | Create staff member | Municipality/Dept Head |
| GET | `/` | List staff (filtered by caller) | Dept Head+ |
| GET | `/:id` | Get staff details | Dept Head+ |
| PATCH | `/:id` | Update staff details | Municipality/Dept Head |
| DELETE | `/:id` | Soft delete staff | Municipality Head |
| PATCH | `/:id/status` | Change employee status | Municipality Head |
| GET | `/:id/assignments` | Staff assignment history | Staff+ |

---

### 👤 Citizens — `/api/citizens`

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/me` | Own citizen profile | Citizen |
| PATCH | `/me` | Update own citizen profile | Citizen |
| GET | `/me/complaints` | Own complaints | Citizen |
| GET | `/me/feedback` | Own feedback history | Citizen |
| GET | `/:id` | Get citizen details | Staff+ |
| GET | `/` | List citizens in municipality | Municipality Head |

---

### 👥 Teams — `/api/teams`

| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/` | Create team | Dept Head |
| GET | `/:id` | Get team details | Staff+ |
| PATCH | `/:id` | Update team | Dept Head |
| DELETE | `/:id` | Soft delete team | Dept Head |
| POST | `/:id/members` | Add member to team | Dept Head |
| DELETE | `/:id/members/:staffId` | Remove member | Dept Head |
| PATCH | `/:id/members/:staffId` | Change member role | Dept Head |
| GET | `/:id/assignments` | Team assignments | Staff+ |
| GET | `/:id/workload` | Workload stats | Dept Head+ |
| PATCH | `/:id/availability` | Toggle availability | Dept Head |

---

### 📋 Complaints — `/api/complaints`

| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/` | Submit complaint | Citizen |
| GET | `/` | List complaints (role-filtered) | All |
| GET | `/:id` | Get complaint details | All |
| PATCH | `/:id` | Update complaint | Citizen (pending only) |
| DELETE | `/:id` | Soft delete | Citizen/Staff |
| PATCH | `/:id/status` | Change status | Staff+ |
| POST | `/:id/assign` | Assign to team/staff | Dept Head+ |
| GET | `/:id/assignments` | Assignment history | Staff+ |
| GET | `/:id/media` | Get attached media | All |
| POST | `/:id/media` | Upload media | Citizen/Staff |
| DELETE | `/:id/media/:mediaId` | Delete media | Owner |
| GET | `/:id/feedback` | Get complaint feedback | Staff+ |

---

### 📌 Assignments — `/api/assignments`

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/` | List assignments (filtered) | Staff+ |
| GET | `/:id` | Get assignment details | Staff+ |
| PATCH | `/:id` | Update assignment details | Staff+ |
| PATCH | `/:id/status` | Update status | Staff+ |
| POST | `/:id/proof` | Upload completion proof (media) | Staff |
| DELETE | `/:id` | Soft delete | Dept Head+ |

---

### 🗺️ Garbage Routes — `/api/garbage-routes`

| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/` | Create route | Dept Head |
| GET | `/` | List routes (filtered) | Staff+ |
| GET | `/:id` | Get route details | Staff+ |
| PATCH | `/:id` | Update route | Dept Head |
| DELETE | `/:id` | Soft delete | Dept Head |
| PATCH | `/:id/status` | Start/complete route | Staff |
| GET | `/:id/stops` | List stops | Staff+ |
| POST | `/:id/stops` | Add stop | Dept Head |
| PATCH | `/:id/stops/:stopId` | Update stop status | Staff |
| DELETE | `/:id/stops/:stopId` | Remove stop | Dept Head |
| POST | `/:id/stops/:stopId/proof` | Upload stop proof | Staff |

---

### 💰 Budgets — `/api/budgets`

| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/` | Create budget | Municipality Head |
| GET | `/` | List budgets | Dept Head+ |
| GET | `/:id` | Get budget details | Dept Head+ |
| PATCH | `/:id` | Update budget | Municipality Head |
| DELETE | `/:id` | Soft delete | Municipality Head |
| PATCH | `/:id/status` | Approve/reject budget | Municipality Head |
| GET | `/:id/utilisation` | Spending summary | Dept Head+ |
| GET | `/:id/spending` | List spending logs | Dept Head+ |
| POST | `/:id/spending` | Log a spend | Staff+ |
| PATCH | `/spending/:slId` | Update spending entry | Dept Head+ |
| DELETE | `/spending/:slId` | Soft delete entry | Dept Head+ |

---

### 🔔 Notifications — `/api/notifications`

| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/` | Send notification | Staff+ |
| GET | `/` | Get my notifications | Authenticated |
| GET | `/:id` | Get notification detail | Authenticated |
| PATCH | `/:id/read` | Mark as read | Authenticated |
| PATCH | `/read-all` | Mark all as read | Authenticated |
| DELETE | `/:id` | Remove from inbox | Authenticated |
| GET | `/unread-count` | Get unread count | Authenticated |

---

### 📢 Announcements — `/api/announcements`

| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/` | Create announcement | Dept Head+ |
| GET | `/` | List announcements | All |
| GET | `/:id` | Get announcement | All |
| PATCH | `/:id` | Update announcement | Creator |
| DELETE | `/:id` | Soft delete | Creator/Muni Head |
| PATCH | `/:id/publish` | Publish draft | Creator |
| POST | `/:id/media` | Attach media | Creator |

---

### ⭐ Feedback — `/api/feedback`

| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/` | Submit feedback | Citizen |
| GET | `/` | List feedback (filtered) | Staff+ |
| GET | `/:id` | Get feedback detail | Staff+ |
| DELETE | `/:id` | Soft delete | Citizen (own) |

---

### 📊 Audit — `/api/audit`

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/` | List audit logs (filtered) | Municipality Head+ |
| GET | `/:id` | Get single log entry | Municipality Head+ |

---

## Middleware Stack Per Request

```
Request
  → auth.js        (verifies Supabase JWT, attaches req.user)
  → role.js        (checks req.user.role against allowed roles)
  → validate.js    (validates req.body with Zod/Joi)
  → controller     (calls service)
  → service        (talks to Supabase)
  → response
```

---

## Standard Response Shape

```js
// Success
{
  "success": true,
  "data": { ... },
  "message": "Complaint created successfully"
}

// Error
{
  "success": false,
  "error": "UNAUTHORIZED",
  "message": "You do not have access to this resource"
}

// Paginated
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 143,
    "totalPages": 8
  }
}
```

---

That's the full API surface — **~80 endpoints** across 13 modules. 

Which module do you want me to build out fully first with controller + service + validation + route code?