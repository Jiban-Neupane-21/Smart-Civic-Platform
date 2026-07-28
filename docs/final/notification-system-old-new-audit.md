# Notification System — Old vs New Audit

## Current State Summary

The codebase has **three competing notification implementations** and massive gaps vs the blueprint (Supabase_Schema.sql + PLAN-50-Phases-Notification-System.md):

| Component | Status |
|-----------|--------|
| **ACTIVE module** (`modules/notification/`) | Wired in `index.ts` at `/api/notifications`, 3 endpoints, broken queries |
| **ORPHANED module** (`modules/notifications/`) | Not wired, has better query patterns, 3 endpoints |
| **LEGACY service** (`service/notification.service.ts`) | Still used by citizen.service.ts for complaint flows |
| **Schema types** (`NotificationRow`, `NotificationReadRow`) | Severely incomplete — missing 8+ columns each |
| **Missing table types** | `notification_logs`, `notification_preferences`, `notification_templates`, `push_tokens` — no types at all |
| **Missing enums** | `notification_type`, `notification_channel` — not defined anywhere |
| **6 blueprint tables** | Only 2 have types (`notifications`, `notification_reads`), 4 have no types |
| **Delivery engine** | No notification service core, no dispatchers, no template engine |
| **Broadcast system** | No broadcast service, no permission matrix, no scheduled cron |
| **Automated triggers** | None implemented — 5 required trigger events all manual |

---

## Critical Issues

### C1 — NotificationRow Missing 8 Blueprint Columns

| Missing Column | Schema Definition | Impact |
|----------------|------------------|--------|
| `type` | `notification_type NOT NULL DEFAULT 'system'` | Cannot categorize notifications (system, broadcast, sla_warning, etc.) |
| `target_ward_id` | `UUID REFERENCES wards(id)` | Cannot target ward-specific citizens for broadcasts |
| `complaint_id` | `UUID REFERENCES complaints(co_uid)` | Cannot link notifications to complaints for deep linking |
| `channels` | `notification_channel[] NOT NULL DEFAULT '{in_app}'` | Cannot specify delivery channels per notification |
| `is_urgent` | `BOOLEAN NOT NULL DEFAULT FALSE` | Cannot mark urgent alerts for dashboard banners |
| `scheduled_for` | `TIMESTAMPTZ` | Cannot schedule future broadcasts |
| `sent_at` | `TIMESTAMPTZ` | Cannot track actual dispatch time |
| `delivery_status` | `JSONB` | Cannot track per-channel delivery outcome |

**Current NotificationRow** (database.type.ts:479-490):
```typescript
export interface NotificationRow {
  id: string;
  sender_id: string;
  audience: AudienceScope;
  target_municipality_id: string | null;
  target_department_id: string | null;
  target_team_id: string | null;
  target_profile_id: string | null;
  title: string;
  body: string;
  created_at: string;
}
```

**Files affected:** database.type.ts:479-490

---

### C2 — NotificationReadRow Missing `is_seen` and `is_clicked`

Schema defines:
- `is_seen BOOLEAN NOT NULL DEFAULT FALSE`
- `is_clicked BOOLEAN NOT NULL DEFAULT FALSE`

Current **NotificationReadRow** (database.type.ts:492-497):
```typescript
export interface NotificationReadRow {
  id: string;
  notification_id: string;
  profile_id: string;
  read_at: string;
}
```

**Impact:** Cannot track engagement analytics (open rate, click-through rate per notification type).

**Files affected:** database.type.ts:492-497

---

### C3 — Four Entire Table Types Missing in Database Map

No type definitions exist for:

| Table | Columns (from schema) |
|-------|----------------------|
| `notification_logs` | id, notification_id, profile_id, channel, status, error_message, sent_at, delivered_at, created_at |
| `notification_preferences` | id, profile_id, channel, is_enabled, disabled_types, quiet_hours_start, quiet_hours_end |
| `notification_templates` | id, trigger_event, title_template, body_template, channels, is_active, created_at, updated_at |
| `push_tokens` | id, profile_id, token, platform, created_at |

**Missing in Database map** (database.type.ts:710-721):
```typescript
// Only these exist:
notifications: { Row: NotificationRow; ... }
notification_reads: { Row: NotificationReadRow; ... }
// Missing:
// notification_logs: { Row: NotificationLogRow; ... }
// notification_preferences: { Row: NotificationPreferenceRow; ... }
// notification_templates: { Row: NotificationTemplateRow; ... }
// push_tokens: { Row: PushTokenRow; ... }
```

**Impact:** Cannot build any feature that uses these 4 tables without type safety. Backend code will use `any` types.

**Files affected:** database.type.ts:710-721

---

### C4 — Missing `notification_type` and `notification_channel` Enums

Schema defines (Supabase_Schema.sql:55-56):
```sql
CREATE TYPE notification_type AS ENUM ('system', 'complaint_update', 'team_assignment', 'handoff', 'sla_warning', 'sla_escalation', 'broadcast');
CREATE TYPE notification_channel AS ENUM ('in_app', 'push', 'sms', 'email');
```

These enums are **not defined anywhere** in the TypeScript types. The `Enums` block (database.type.ts:776-792) lists: `user_role`, `account_status`, `employee_status`, `gender`, `notification_pref`, `local_level_type`, `department_category`, `record_type`, `complaint_status`, `assignment_status`, `priority`, `audience_scope`, `audit_action`, `severity`, `media_context`. No `notification_type` or `notification_channel`.

Also **`NotificationPref`** enum (line 781) is not aliased to match the standardized schema — it uses old values `email | sms | both | none` instead of the channel-level preference system.

**Impact:** Any code using NotificationRow.type would have no compile-time safety.

**Files affected:** database.type.ts:776-792

---

### C5 — Active Module Writes to Wrong Table (`announcements`)

Repository dispatchNotification (notification.repository.ts:11-18):
```typescript
await this.supabaseAdmin
  .from("announcements")     // <--- WRONG TABLE
  .insert([notificationPayload])
```

Should write to `notifications` table. The `announcements` table is a completely separate entity (used for pinned organizational announcements with `is_pinned`, `published_at`, `expires_at` fields).

**Impact:** Broadcast notifications are stored in the wrong table, making them invisible to the notification reading queries. Creates data fragmentation.

**Files affected:** notification.repository.ts:11-12

---

### C6 — Active Module Uses Wrong Column Name `user_id`

Repository getMyInboundNotifications (notification.repository.ts:22-27):
```typescript
await this.supabaseAdmin
  .from("notifications")
  .select("*")
  .eq("user_id", userId)     // <--- WRONG COLUMN — "user_id" does not exist on notifications table
```

The notifications table has `target_profile_id`, not `user_id`. This query silently returns empty results for all users.

Similarly, markAsRead (notification.repository.ts:34-41):
```typescript
await this.supabaseAdmin
  .from("notifications")
  .update({ read_status: true })     // <--- WRONG — "read_status" does not exist
  .eq("id", notificationId)
  .eq("user_id", userId)             // <--- WRONG — "user_id" does not exist
```

**Impact:** Both GET /inbound-queue and PATCH /:id/acknowledge are completely broken — they query non-existent columns that PostgreSQL will reject or silently match nothing.

**Files affected:** notification.repository.ts:24,26,36-39

---

### C7 — Active Module MarkAsRead Uses Wrong Approach

Instead of upserting into `notification_reads` table (which has `UNIQUE (notification_id, profile_id)`), the code:
1. Tries to `update` `read_status` column on the `notifications` table — but this column doesn't exist
2. Filters by `user_id` — but this column doesn't exist

**Correct approach** (as seen in orphaned module at notifications/controller/notification.controller.ts:42-45):
```typescript
await supabaseAdmin.from("notification_reads").upsert({
  notification_id: id,
  profile_id: userId,
  read_at: new Date().toISOString(),
});
```

Should also set `is_seen = true` per the extended schema.

**Files affected:** notification.repository.ts:34-41

---

### C8 — No Audience Resolution Logic

The PLAN requires audience-to-recipient resolution (PLAN-50: Phase 6):
- `individual` → single profile_id
- `team` → all team_members
- `department` → all staff in department
- `all_staff` → all staff in municipality
- `all_citizens` → all citizens in municipality
- `ward_citizens` → all citizens in specific ward

None of this exists. The active module just inserts a raw payload into `announcements` with no recipient expansion. The orphaned module has partial audience matching via SQL `.or()` filters but no proper resolution.

**Impact:** Notifications with `department`, `team`, or `ward_citizens` audience cannot be properly dispatched.

---

### C9 — No Channel Dispatchers

The PLAN (Phase 7) requires 4 dispatchers:
- `InAppDispatcher` — insert into notifications + notification_reads
- `PushDispatcher` — stub for Firebase/WebSocket
- `SmsDispatcher` — use SmsService
- `EmailDispatcher` — use existing email service

None exist. The legacy service (service/notification.service.ts:33-45) calls `SmsService.sendSMS()` directly inside `notifyProfile`, mixing concerns.

**Impact:** Every notification goes to in-app only. No push, SMS, or email delivery possible.

---

### C10 — No Template Engine

The PLAN (Phase 8) requires a TemplateEngine that:
- Fetches templates from `notification_templates` table
- Renders `{{variable}}` placeholders
- Supports 5 trigger event templates

Nothing exists. All notification titles/bodies are hardcoded in service calls.

---

### C11 — No Broadcast Service

The PLAN (Phase 16) requires a BroadcastService with:
- `createBroadcast(senderId, audience, targetIds, title, body, channels, scheduledFor?)`
- `validateAudienceScope(senderRole, audience, targetIds)` — permission enforcement
- `scheduleBroadcast(broadcastId, scheduledFor)` — deferred dispatch
- `cancelBroadcast(broadcastId)` — cancellation

None of this exists. The current `POST /api/notifications/broadcast` just inserts a row with no permission checking, no audience validation, and no scheduling.

---

### C12 — No Channel Preference Filter

The PLAN (Phase 9) requires checking `notification_preferences` before dispatching. The schema includes:
- `is_enabled` per channel
- `disabled_types` array
- `quiet_hours_start` / `quiet_hours_end`

Nothing exists. The legacy service sends SMS without any opt-out check.

---

### C13 — No Automated Triggers (5 Required)

The PLAN (Phases 11-15) defines 5 automated trigger events:

| Trigger | Current Status |
|---------|---------------|
| **Staff Onboarded** → Dept Head + New Staff | Not implemented |
| **Team Formation / Staff Assignment** → Team Members | Not implemented |
| **Grievance Registered & Auto-Routed** → Dept Head + Muni Head | Partially — citizen.service.ts calls legacy notifyDepartment |
| **Grievance Assigned to Staff/Team** → Assigned Staff | Not implemented |
| **Grievance Resolved** → Citizen + Dept Head + Muni Head | Not implemented (reopened sends via legacy service) |

The only existing trigger flows use the legacy service directly: citizen.service.ts:141-142 calls `notifyDepartment` when a grievance is submitted, and citizen.service.ts:241-242 calls it when reopened. These use hardcoded titles/bodies, no templates, no channel selection.

**Files affected:** citizen.service.ts:141-142,241-242

---

### C14 — Two Competing Modules With No Cohesion

| Module | Status | Endpoints | Table Usage |
|--------|--------|-----------|-------------|
| `modules/notification/` | **ACTIVE** | POST /broadcast, GET /inbound-queue, PATCH /:id/acknowledge | `announcements` (insert), `notifications` (select/update with wrong cols) |
| `modules/notifications/` | **ORPHANED** | GET /, GET /unread-count, PATCH /:id/read | `notifications` (select with correct cols), `notification_reads` (upsert) |

The orphaned module actually has better SQL patterns but is completely disconnected. The active module has broken queries. This creates confusion about which code to fix vs. replace.

**Files affected:**
- notification.repository.ts (active, broken)
- notification.service.ts (active, thin wrapper)
- notification.controller.ts (active, basic)
- notification.routes.ts (active, 3 routes)
- notifications/controller/notification.controller.ts (orphaned, better queries)
- notifications/routes/notification.routes.ts (orphaned, not wired)

---

## Old Code Audit (per file with line numbers)

### 1. `src/types/database.type.ts`

| Lines | Issue |
|-------|-------|
| 479-490 | `NotificationRow`: missing `type`, `target_ward_id`, `complaint_id`, `channels`, `is_urgent`, `scheduled_for`, `sent_at`, `delivery_status` |
| 492-497 | `NotificationReadRow`: missing `is_seen`, `is_clicked` |
| 710-721 | Database map only has `notifications` and `notification_reads` — missing `notification_logs`, `notification_preferences`, `notification_templates`, `push_tokens` |
| 776-792 | Enums block missing `notification_type` and `notification_channel` |
| 781 | `NotificationPref` uses old values (`email\|sms\|both\|none`) — not aligned with channel-preference model |

### 2. `src/modules/notification/repository/notification.repository.ts`

| Lines | Issue |
|-------|-------|
| 11-12 | `dispatchNotification` writes to `announcements` table instead of `notifications` |
| 24-26 | `getMyInboundNotifications` queries `.eq("user_id", userId)` — column `user_id` does not exist on notifications table (should be `target_profile_id`) |
| 36-39 | `markAsRead` updates `{ read_status: true }` — column `read_status` does not exist; uses `.eq("user_id", userId)` — column `user_id` does not exist |
| 8-9 | Method accepts `notificationPayload: any` — no type safety |

### 3. `src/modules/notification/service/notification.service.ts`

| Lines | Issue |
|-------|-------|
| 9-12 | Uses `Database["public"]["Tables"]["notifications"]["Insert"]` type but sends to `announcements` table — type mismatch |
| All | Thin pass-through layer with no business logic — no audience resolution, no channel dispatch, no template rendering |

### 4. `src/modules/notification/controller/notification.controller.ts`

| Lines | Issue |
|-------|-------|
| 9-10 | Validates only `audience_type`, `title`, `body` — no audience scope validation, no channel validation, no schedule validation |
| 19-21 | Passes entire `req.body` as payload — no sanitization, no transformation |
| All | Uses `req: any` — no typed request |

### 5. `src/modules/notification/routes/notification.routes.ts`

| Lines | Issue |
|-------|-------|
| 5-20 | Inline `requireAuth` duplicated — should use centralized auth middleware |
| 50 | `POST /broadcast` — no role-based access control (any authenticated user can broadcast) |
| 67 | `GET /inbound-queue` — non-standard endpoint name (should be `/api/notifications`) |
| 91 | `PATCH /:notificationId/acknowledge` — non-standard (should be `/:id/read`) |

### 6. `src/modules/notifications/controller/notification.controller.ts` (orphaned)

| Lines | Issue |
|-------|-------|
| 5-20 | `getMyNotifications` queries `.or(target_profile_id.eq..., audience.eq.all_citizens, audience.eq.all_staff)` — missing `department`, `team`, `individual` audience expansion |
| 37-52 | `markAsRead` uses `notification_reads` correctly but missing `is_seen` field |

### 7. `src/service/notification.service.ts` (legacy, still used)

| Lines | Issue |
|-------|-------|
| 16-24 | `notifyProfile` hardcodes `audience: "individual"`, no `type` field, no `channels` field |
| 33-45 | SMS logic mixed into notification service — should be handled by SmsDispatcher |
| 40 | `SmsService.sendSMS(phone, \`${title}: ${body}\`)` — no template rendering, no opt-out check |
| 53-67 | `notifyDepartment` hardcodes `audience: "department"`, no `type`, no channels, no delivery tracking |

### 8. `src/modules/citizen/services/citizen.service.ts`

| Lines | Issue |
|-------|-------|
| 10 | Imports legacy `NotificationService` from `service/notification.service.ts` |
| 141-142 | Creates `new NotificationService(supabaseAdmin)` inline and calls `notifyDepartment` — should use centralized notification service |
| 241-242 | Same inline pattern for reopened grievance flow |

---

## New Target Implementation (per PLAN-50 and Supabase_Schema.sql)

### Target: Phase 1 — Add Notification Type & Channel Columns
- Add to `NotificationRow`: `type`, `target_ward_id`, `complaint_id`, `channels`, `is_urgent`, `scheduled_for`, `sent_at`, `delivery_status`
- Add enums: `NotificationType`, `NotificationChannel` to Types
- Migration: `v5-notification-enhancements.sql` (NEW)

### Target: Phase 2 — notification_templates Table
- Type: `NotificationTemplateRow`
- Database map entry: `notification_templates`
- Migration: `v5-notification-templates.sql` (NEW)

### Target: Phase 3 — notification_logs Table
- Type: `NotificationLogRow`
- Database map entry: `notification_logs`
- Migration: `v5-notification-logs.sql` (NEW)

### Target: Phase 4 — notification_preferences Table
- Type: `NotificationPreferenceRow` (with `disabled_types`, `quiet_hours_start`, `quiet_hours_end`)
- Database map entry: `notification_preferences`
- Migration: `v5-notification-preferences.sql` (NEW)

### Target: Phase 5 — Notification Indexes
- `idx_notifications_type_status` on `(type, sent_at)`
- `idx_notifications_audience_ward` on `(audience, ward_id)`
- `idx_notifications_created_at`
- Update `idx_notification_reads_profile`
- Migration: `v5-notification-indexes.sql` (NEW)

### Target: Phase 6 — Core NotificationService
- `send(recipients, title, body, type, channels, metadata)` — main dispatch
- `resolveRecipients(audience, targetIds)` — audience expansion
- `dispatchToChannel(profileId, channel, title, body)` — route to dispatcher
- `logDelivery(notificationId, profileId, channel, status)` — insert to notification_logs
- File: `src/service/notification.service.ts` (REWRITE)

### Target: Phase 7 — Channel Dispatchers
- `InAppDispatcher` — insert into notifications + notification_reads
- `PushDispatcher` — stub for Firebase/WebSocket
- `SmsDispatcher` — use SmsService
- `EmailDispatcher` — use existing email service
- Fallback chain: Push → SMS → Email → In-App (always succeeds)

### Target: Phase 8 — TemplateEngine
- `render(template, variables)` — replace `{{variable}}`
- `getTemplate(triggerEvent)` — fetch from notification_templates
- `renderFromEvent(eventName, variables)` — one-call render
- File: `src/service/template-engine.service.ts` (NEW)

### Target: Phase 9 — Channel Preference Filter
- Check `notification_preferences` before dispatch
- Skip opted-out channels
- Cache preferences in-memory (5-min TTL)

### Target: Phase 10 — Retry Queue
- Failed deliveries → retry up to 3× (5s, 30s, 5min backoff)
- `FailedDeliveryCron` — runs every 15 minutes
- Dead-letter queue after 3 failures
- File: `src/service/retry-queue.service.ts` (NEW)

### Target: Phases 11-15 — Automated Triggers
- **Trigger 1** (Phase 11): Staff onboarded → Dept Head + New Staff (Email + In-App)
- **Trigger 2** (Phase 12): Team/assignment → Team members (Push + In-App)
- **Trigger 3** (Phase 13): Grievance registered → Dept Head + Muni Head (Dashboard Alert)
- **Trigger 4** (Phase 14): Grievance assigned → Staff/Team (Push + SMS)
- **Trigger 5** (Phase 15): Grievance resolved → Citizen + Dept Head + Muni Head (Push + SMS + Email)

### Target: Phases 16-20 — Manual Broadcast
- `BroadcastService` with permission matrix:
  - Municipality Head: `all_citizens`, `ward_citizens`, `all_staff`
  - Department Head: `department`, `team`, `individual`
- Broadcast endpoints: `POST /api/municipality/:mid/broadcasts`, `POST /api/v1/department/broadcasts`
- Scheduled broadcast cron (every 5 min)
- Broadcast history with delivery stats
- Broadcast templates (pre-written messages)

### Target: Phases 21-25 — SMS & Email Integration
- SMS provider integration (Sparrow SMS / NTC)
- Email provider (Supabase / SMTP)
- Opt-out handling (Reply STOP, opt-in/opt-out endpoints)
- In-app dashboard banner for urgent alerts
- Notification digest (daily/weekly)

### Target: Phases 26-30 — Preferences & Analytics
- Notification preferences endpoints (GET/PUT)
- Per-trigger-type opt-out
- Quiet hours configuration
- Read receipts (is_seen, is_clicked)
- Notification analytics for admins

### Target: Phases 31-35 — API Endpoints
- CRUD: GET /, GET /unread-count, PATCH /:id/read, PATCH /read-all, DELETE /:id, DELETE /clear-all
- WebSocket stub (polling fallback)
- Push token registration
- Notification middleware (auto-log actions)
- Dead-letter queue management

### Target: Phases 36-40 — Frontend UI
- NotificationDropdown (bell icon with badge)
- Notification list page (replace mocks)
- UrgentBanner component
- NotificationToast component
- NotificationPreferences UI

### Target: Phases 41-45 — Broadcast UI
- BroadcastComposer (municipality head + department head)
- BroadcastHistory page
- BroadcastTemplates manager
- Navigation updates for all roles

### Target: Phases 46-50 — Testing & Docs
- Backend tests: notification service, triggers, broadcast/scheduling
- Frontend tests: dropdown, broadcast composer, urgent banner
- Documentation: `docs/notification-system.md`
- Seed notification_templates

---

## Old-to-New Mapping

| Old Component | New Component | Strategy |
|---------------|--------------|----------|
| `NotificationRow` (8 cols) | Extended `NotificationRow` (16 cols) | Add columns + types |
| `NotificationReadRow` (5 cols) | Extended `NotificationReadRow` (7 cols) | Add `is_seen`, `is_clicked` |
| Missing types ×4 | `NotificationLogRow`, `NotificationPreferenceRow`, `NotificationTemplateRow`, `PushTokenRow` | Create new types |
| Missing enums ×2 | `NotificationType`, `NotificationChannel` | Create new enums |
| `modules/notification/` (active, broken) | Complete rewrite of all 4 files | Replace with proper implementation |
| `modules/notifications/` (orphaned) | Remove or merge code patterns | Discard orphaned module |
| `service/notification.service.ts` (legacy) | Core `NotificationService` | Rewrite with dispatch logic |
| citizen.service.ts:141-142 (inline notif) | Centralized trigger via middleware | Replace inline calls with events |
| No dispatchers | 4 dispatchers (InApp, Push, Sms, Email) | Create from scratch |
| No template engine | `TemplateEngine` service | Create from scratch |
| No broadcast service | `BroadcastService` | Create from scratch |
| No scheduled cron | `ScheduledBroadcastCron` | Create from scratch |
| No retry queue | `FailedDeliveryCron` + retry logic | Create from scratch |
| No WebSocket | `NotificationHub` stub | Create from scratch |
| No frontend notification UI | 5 new components | Create from scratch |
| No broadcast UI | 3 new pages + components | Create from scratch |

---

## Sprint Plan (5 Sprints, 25 phases per audit scope)

### Sprint 1 — Database & Types (Phases 1-5)
1. Add `notification_type` and `notification_channel` enums to `database.type.ts`
2. Extend `NotificationRow` with all 8 missing columns
3. Extend `NotificationReadRow` with `is_seen`, `is_clicked`
4. Create `NotificationLogRow` type + Database map entry
5. Create `NotificationPreferenceRow` type + Database map entry
6. Create `NotificationTemplateRow` type + Database map entry
7. Create `PushTokenRow` type + Database map entry
8. Create migration `v5-notification-enhancements.sql` (add type, channels, complaint_id, ward_id, is_urgent, scheduled_for, sent_at, delivery_status)
9. Create migration `v5-notification-templates.sql` (create table + seed 5 triggers)
10. Create migration `v5-notification-logs.sql` (create table + indexes)
11. Create migration `v5-notification-preferences.sql` (create table + defaults)
12. Create migration `v5-notification-indexes.sql` (add all indexes)

### Sprint 2 — Core Engine (Phases 6-10)
1. Rewrite `service/notification.service.ts` — core `send()`, `resolveRecipients()`, `dispatchToChannel()`, `logDelivery()`
2. Create `dispatchers/in-app.dispatcher.ts`
3. Create `dispatchers/push.dispatcher.ts` (stub)
4. Create `dispatchers/sms.dispatcher.ts`
5. Create `dispatchers/email.dispatcher.ts`
6. Create `service/template-engine.service.ts` — `render()`, `getTemplate()`, `renderFromEvent()`
7. Add preference filter to core service
8. Create `service/retry-queue.service.ts` with exponential backoff
9. Create `FailedDeliveryCron` (every 15 min)
10. Write tests for core service

### Sprint 3 — Automated Triggers & Broadcast (Phases 11-20)
1. Add Trigger 1: staff created → notif to dept head + staff (auth.service.ts)
2. Add Trigger 2: team/assignment → notif to members (department.service.ts)
3. Add Trigger 3: grievance registered → notif to dept head + muni head (citizen.service.ts)
4. Add Trigger 4: grievance assigned → notif to staff (department.service.ts)
5. Add Trigger 5: grievance resolved → notif to citizen + dept head + muni head (staff.service.ts)
6. Create `BroadcastService` with permission matrix
7. Create `POST /api/municipality/:mid/broadcasts` endpoint
8. Create `POST /api/v1/department/broadcasts` endpoint
9. Create `ScheduledBroadcastCron` (every 5 min)
10. Create broadcast history endpoints with delivery stats
11. Add broadcast templates CRUD
12. Replace legacy inline NotificationService calls in citizen.service.ts
13. Write tests for triggers + broadcast

### Sprint 4 — API Endpoints & Preferences (Phases 21-35)
1. Rewrite active `modules/notification/` module:
   - Rewrite `notification.repository.ts` — use correct columns and tables
   - Rewrite `notification.service.ts` — use core engine
   - Rewrite `notification.controller.ts` — typed requests, proper validation
   - Rewrite `notification.routes.ts` — RESTful endpoints, role-based access
2. Create notification CRUD endpoints: GET /, GET /unread-count, PATCH /:id/read, PATCH /read-all, DELETE /:id
3. Add SMS/email opt-out endpoints
4. Add in-app banner endpoints (GET /active-banners, POST /banners/:id/dismiss)
5. Create notification preferences endpoints (GET /preferences, PUT /preferences)
6. Add quiet hours configuration
7. Add read receipts (POST /:id/seen, POST /:id/clicked)
8. Create notification middleware (auto-log actions)
9. Create push token registration endpoints
10. Add dead-letter queue management
11. Create notification analytics endpoints
12. Create WebSocket hub stub with polling fallback
13. Remove orphaned `modules/notifications/` directory
14. Write tests for API endpoints
15. Remove `NotificationPref` enum, migrate to channel-preference model

### Sprint 5 — Frontend UI & Documentation (Phases 36-50)
1. Create `NotificationDropdown.tsx` — bell icon, last 10, unread badge
2. Create full notification list pages (citizen, munic_head, dept_head, staff)
3. Create `UrgentBanner.tsx`
4. Create `NotificationToast.tsx`
5. Create `NotificationPreferences.tsx`
6. Create `BroadcastComposer.tsx` (municipality head)
7. Create `BroadcastComposer.tsx` (department head, scoped)
8. Create `BroadcastHistory.tsx` (municipality head + department head)
9. Create `BroadcastTemplates.tsx`
10. Update sidebar/navbar for all roles
11. Write frontend tests for all new components
12. Create `docs/notification-system.md`
13. Seed `notification_templates` with 5 trigger templates
14. Update `Supabase_Schema.sql` with all new tables/columns
15. Update `AGENTS.md`/`CLAUDE.md`
16. Remove mock notification data
17. Lint + typecheck all changed code

---

## Summary of Changes

| Category | Old | New |
|----------|-----|-----|
| **Types defined** | 2 types (NotificationRow, NotificationReadRow) | 6 types (add NotificationLogRow, NotificationPreferenceRow, NotificationTemplateRow, PushTokenRow) |
| **Database map entries** | 2 (notifications, notification_reads) | 6 (add notification_logs, notification_preferences, notification_templates, push_tokens) |
| **Enums** | 0 notification enums | 2 (NotificationType, NotificationChannel) |
| **NotificationRow columns** | 8 | 16 (add type, target_ward_id, complaint_id, channels, is_urgent, scheduled_for, sent_at, delivery_status) |
| **NotificationReadRow columns** | 5 | 7 (add is_seen, is_clicked) |
| **Active module files** | 4 (all broken or incomplete) | 4 (fully rewritten with correct queries, types, role-based access) |
| **Orphaned module** | 2 files, not wired | Remove entirely (patterns merged into active module) |
| **Legacy service** | 1 file, 2 methods, mixed concerns | Rewrite as core engine with proper dispatch architecture |
| **Dispatchers** | 0 | 4 (InApp, Push, Sms, Email) with fallback chain |
| **Template engine** | 0 | 1 (renders {{variable}}, fetches from notification_templates) |
| **Broadcast service** | 0 | 1 with permission matrix + scheduling |
| **Automated triggers** | 0 (manual inline calls in citizen.service.ts) | 5 triggers via middleware/event system |
| **API endpoints** | 3 (broken) | 15+ (full CRUD, preferences, analytics, push tokens, broadcast, dead-letter) |
| **Cron jobs** | 0 | 2 (ScheduledBroadcastCron, FailedDeliveryCron) |
| **WebSocket** | 0 | 1 (NotificationHub stub with polling fallback) |
| **Frontend components** | 0 dedicated notification components | 5+ (Dropdown, List, Banner, Toast, Preferences) |
| **Frontend broadcast UI** | 0 | 3 pages (Composer, History, Templates) |
| **Tests** | 0 | Backend tests ×3 files, Frontend tests ×3 files |
| **Migrations** | 0 | 5 (enhancements, templates, logs, preferences, indexes) |
