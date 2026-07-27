# Automated & Manual Notification System — 50-Phase Plan

## Blueprint Overview

```text
                          [ NOTIFICATION ENGINE ]
                                     │
           ┌─────────────────────────┴─────────────────────────┐
           ▼                                                   ▼
[ AUTOMATED EVENT TRIGGERS ]                        [ MANUAL BROADCAST ENGINE ]
• Staff Onboarded ──► Dept Alert                    • Municipality ──► Citizens / Staff
• Team Assigned ──► Staff Alert                     • Dept Head ──► Department Staff
• Ticket Registered ──► Dept & Municipality Alert    • Channels: Push, SMS, Email
• Ticket Assigned ──► Team/Staff Alert
• Ticket Resolved ──► Citizen, Dept & Municipality
```

### 5 Automated Triggers
| # | Event | Recipients | Channel |
|---|-------|-----------|---------|
| 1 | New Staff Created | Dept Head + New Staff | Email + In-App |
| 2 | Team Formation / Staff Assignment | Assigned Staff / Team | Push + In-App |
| 3 | New Grievance Registered & Auto-Routed | Dept Head + Municipality Head | Dashboard Alert |
| 4 | Grievance Assigned to Team/Staff | Field Inspector / Team | Push + SMS |
| 5 | Grievance Resolved | Citizen + Dept Head + Muni Head | Push + SMS + Email |

### Manual Broadcast Matrix
| Sender | Target Audience | Use Cases | Channels |
|--------|----------------|-----------|----------|
| Municipality Head | All Citizens, Ward-specific Citizens, All Staff | Power outages, disaster alerts, town hall, policy | Push + SMS + Banner |
| Department Head | Dept Staff, Specific Teams, Field Inspectors | Shift changes, safety guidelines, field meetings | Push + In-App |

---

## WHAT EXISTS (current state)

- **`notifications` table**: sender_id, audience (enum), target_* columns, title, body
- **`notification_reads` table**: notification_id, profile_id, read_at
- **`audience_scope` enum**: individual, team, department, all_staff, all_citizens, everyone
- **No dedicated notification service** — no central dispatch logic
- **No SMS/email integration** for notifications
- **Frontend Notification.tsx** (citizen): uses **mock data**
- **Frontend munic_head Notification.tsx**: exists but basic
- **No manual broadcast UI** exists yet

---

## DOMAIN A — Database: Notification Schema Enhancements (Phases 1–5)

### Phase 1: Add Notification Type & Channel Columns
- Add to `notifications`:
  - `type TEXT NOT NULL DEFAULT 'system'` — enum: `system | broadcast | sla_warning | sla_escalation | handoff | assignment`
  - `channel TEXT[] NOT NULL DEFAULT '{in_app}'` — channels used: `in_app`, `push`, `sms`, `email`
  - `complaint_id UUID REFERENCES complaints(co_uid) ON DELETE CASCADE`
  - `ward_id UUID REFERENCES wards(id) ON DELETE SET NULL` — for ward-targeted broadcasts
  - `is_urgent BOOLEAN NOT NULL DEFAULT FALSE`
  - `scheduled_for TIMESTAMPTZ` — for scheduled broadcasts
  - `sent_at TIMESTAMPTZ` — actual send time
  - `delivery_status JSONB` — per-channel status: `{ "sms": "sent", "email": "failed", "push": "sent" }`

Files:
- `supabase/migrations/v5-notification-enhancements.sql` (NEW)
- `Smart_Civic_Platform_Backend/src/types/database.type.ts`

### Phase 2: Create `notification_templates` Table
```sql
CREATE TABLE notification_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trigger_event TEXT NOT NULL UNIQUE, -- staff_onboarded, ticket_assigned, ticket_resolved, etc.
    title_template TEXT NOT NULL, -- e.g. "New Grievance: {{title}}"
    body_template TEXT NOT NULL, -- e.g. "A new {{category}} complaint has been registered in Ward {{ward_number}}."
    channel TEXT[] NOT NULL DEFAULT '{in_app}',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```
- Seed all 5 trigger templates + manual broadcast template
- Allows superadmin to customize notification messages

Files:
- `supabase/migrations/v5-notification-templates.sql` (NEW)

### Phase 3: Add Notification Logs Table (Delivery History)
```sql
CREATE TABLE notification_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    channel TEXT NOT NULL, -- sms | email | push | in_app
    status TEXT NOT NULL DEFAULT 'pending', -- pending | sent | delivered | failed | bounced
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notif_logs_profile ON notification_logs(profile_id, status);
CREATE INDEX idx_notif_logs_notification ON notification_logs(notification_id);
```

Files:
- `supabase/migrations/v5-notification-logs.sql` (NEW)

### Phase 4: Add Notification Preferences Table Per Profile
```sql
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    channel TEXT NOT NULL, -- sms | email | push | in_app
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (profile_id, channel)
);
```
- Default: all channels enabled for all profiles
- Citizens can opt out of SMS/email from profile settings
- Staff can configure push vs in-app preferences

Files:
- `supabase/migrations/v5-notification-preferences.sql` (NEW)

### Phase 5: Add Indexes for Notification Performance
- `idx_notifications_type_status` on `(type, sent_at)` for broadcast queries
- `idx_notifications_audience_ward` on `(audience, ward_id)` for ward targeting
- `idx_notifications_created_at` for recent-notification queries
- Update `idx_notification_reads_profile` to include notification type

Files:
- `supabase/migrations/v5-notification-indexes.sql` (NEW)

---

## DOMAIN B — Backend: Notification Service & Delivery Engine (Phases 6–10)

### Phase 6: Create Core Notification Service
- `NotificationService`:
  - `send(recipients, title, body, type, channels, metadata)` — main dispatch method
  - `resolveRecipients(audience, targetIds)` — convert audience_scope + targets to profile IDs
    - `individual` → single profile_id
    - `team` → all team_members
    - `department` → all staff in department
    - `all_staff` → all staff in municipality
    - `all_citizens` → all citizens in municipality
    - `ward_citizens` → all citizens in specific ward
  - `dispatchToChannel(profileId, channel, title, body)` — route to channel provider
  - `logDelivery(notificationId, profileId, channel, status)` — insert to notification_logs

Files:
- `Smart_Civic_Platform_Backend/src/service/notification.service.ts` (NEW)

### Phase 7: Create Channel Dispatchers
- `InAppDispatcher` — insert into `notifications` + `notification_reads` tables
- `PushDispatcher` — stub for future Firebase/WebSocket integration (logs to console in dev)
- `SmsDispatcher` — use existing SMS service (Phase 7 of Citizen Registration plan)
- `EmailDispatcher` — use existing email service (from auth module)
- Each dispatcher: `send(profile, title, body) → { success, error? }`
- Fallback chain: if push fails, fall back to SMS; if SMS fails, fall back to in-app

Files:
- `Smart_Civic_Platform_Backend/src/service/dispatchers/in-app.dispatcher.ts` (NEW)
- `Smart_Civic_Platform_Backend/src/service/dispatchers/push.dispatcher.ts` (NEW)
- `Smart_Civic_Platform_Backend/src/service/dispatchers/sms.dispatcher.ts` (NEW)
- `Smart_Civic_Platform_Backend/src/service/dispatchers/email.dispatcher.ts` (NEW)

### Phase 8: Implement Template Engine
- `TemplateEngine`:
  - `render(template, variables)` — replace `{{variable}}` placeholders
  - `getTemplate(triggerEvent)` — fetch from `notification_templates`
  - `renderFromEvent(eventName, variables)` — one-call render
- Variables per trigger:
  - `staff_onboarded`: `{{staff_name}}`, `{{department_name}}`, `{{municipality_name}}`
  - `ticket_registered`: `{{tracking_id}}`, `{{category}}`, `{{ward_number}}`, `{{title}}`
  - `ticket_assigned`: `{{tracking_id}}`, `{{staff_name}}`, `{{title}}`
  - `ticket_resolved`: `{{tracking_id}}`, `{{title}}`, `{{resolution_note}}`
  - `team_assigned`: `{{team_name}}`, `{{department_name}}`

Files:
- `Smart_Civic_Platform_Backend/src/service/template-engine.service.ts` (NEW)

### Phase 9: Implement Channel Preference Filter
- Before dispatching: check `notification_preferences` table
- If profile has opted out of SMS → skip SMS channel
- If profile has opted out of email → skip email channel
- Default: all channels enabled
- Cache preferences in-memory for performance (5-minute TTL)

Files:
- `Smart_Civic_Platform_Backend/src/service/notification.service.ts`

### Phase 10: Add Notification Queue & Retry Logic
- Failed deliveries: retry up to 3 times with exponential backoff (5s, 30s, 5min)
- `FailedDeliveryCron` — runs every 15 minutes
  - Query `notification_logs WHERE status = 'failed' AND retry_count < 3`
  - Re-attempt delivery
  - After 3 failures: mark as `bounced`, log error
- Background queue: use in-process queue (bull/queue optional for future)

Files:
- `Smart_Civic_Platform_Backend/src/service/retry-queue.service.ts` (NEW)

---

## DOMAIN C — Backend: Automated Event Triggers (Phases 11–15)

### Phase 11: Trigger 1 — New Staff Created Notification
- When staff is created (in auth.service or staff creation):
  - Recipient 1: Department Head → "New staff [Name] has been onboarded to your department."
  - Recipient 2: New Staff → "Welcome to [Department Name], [Municipality]. Your account is ready."
- Channels: Email + In-App
- Template: `staff_onboarded`

Files:
- `Smart_Civic_Platform_Backend/src/modules/auth/services/auth.service.ts`
- `Smart_Civic_Platform_Backend/src/service/notification.service.ts`

### Phase 12: Trigger 2 — Team Formation / Staff Assignment
- When Dept Head creates a team or assigns member to team:
  - Recipient: All team members
  - "You have been added to team [Team Name] in [Department Name]."
- When staff is assigned to a team:
  - Recipient: The assigned staff
  - "You have been assigned to [Team Name] as a new member."
- Channels: Push + In-App

Files:
- `Smart_Civic_Platform_Backend/src/modules/department/services/department.service.ts`

### Phase 13: Trigger 3 — New Grievance Registered & Auto-Routed
- When citizen submits complaint and auto-routing completes:
  - Recipient 1: Department Head of assigned dept
    - "New [Category] grievance received in Ward [Ward No]. Tracking ID: [ID]."
  - Recipient 2: Municipality Head (summary)
    - "New grievance registered: [Title] — routed to [Department Name]."
- Channels: Dashboard Alert (In-App)
- Template: `ticket_registered`

Files:
- `Smart_Civic_Platform_Backend/src/modules/citizen/services/citizen.service.ts`
- `Smart_Civic_Platform_Backend/src/service/routing-engine.service.ts`

### Phase 14: Trigger 4 — Grievance Assigned to Staff/Team
- When Dept Head assigns ticket to staff member or team:
  - Recipient: Assigned staff member (or all team members)
    - "New ticket assigned: [Title]. Location: Ward [No]. Deadline: [SLA time remaining]."
    - Include: map pin link, citizen evidence
  - Channels: Push (primary) + SMS (fallback for low-connectivity)
- If assigned to team: send to all team members, designate primary assignee

Files:
- `Smart_Civic_Platform_Backend/src/modules/department/services/department.service.ts`
- `Smart_Civic_Platform_Backend/src/service/assignment.service.ts`

### Phase 15: Trigger 5 — Grievance Resolved
- When staff marks ticket as RESOLVED with proof photos:
  - Recipient 1: Citizen
    - "Your grievance [Title] has been resolved. View resolution proof and rate our service."
    - Channels: Push + SMS + Email
  - Recipient 2: Department Head
    - "Ticket [ID] resolved by [Staff Name]."
    - Channels: In-App
  - Recipient 3: Municipality Head (daily digest)
    - "X complaints resolved today in [Department]."
    - Channels: Dashboard Alert

Files:
- `Smart_Civic_Platform_Backend/src/modules/staff/services/staff.service.ts`
- `Smart_Civic_Platform_Backend/src/service/lifecycle.service.ts`

---

## DOMAIN D — Backend: Manual Broadcast & Announcement System (Phases 16–20)

### Phase 16: Create Broadcast Service
- `BroadcastService`:
  - `createBroadcast(senderId, audience, targetIds, title, body, channels, scheduledFor?)`
  - `validateAudienceScope(senderRole, audience, targetIds)` — enforce permission matrix
  - `scheduleBroadcast(broadcastId, scheduledFor)` — deferred dispatch
  - `cancelBroadcast(broadcastId)` — cancel scheduled broadcast
- Permission matrix:
  - Municipality Head: `all_citizens`, `ward_citizens`, `all_staff`
  - Department Head: `department`, `team`, `individual` (staff only)

Files:
- `Smart_Civic_Platform_Backend/src/service/broadcast.service.ts` (NEW)

### Phase 17: Add Broadcast Creation Endpoint
- `POST /api/municipality/:mid/broadcasts` — Municipality Head creates broadcast
  - Accept: `{ audience, ward_id?, department_id?, team_id?, title, body, channels, scheduled_for? }`
- `POST /api/v1/department/broadcasts` — Department Head creates broadcast
  - Accept: `{ audience, team_id?, title, body, channels, scheduled_for? }`
- Both validate audience scope against sender role

Files:
- `Smart_Civic_Platform_Backend/src/modules/municipality/routes/municipality.routes.ts`
- `Smart_Civic_Platform_Backend/src/modules/municipality/controller/municipality.controller.ts`
- `Smart_Civic_Platform_Backend/src/modules/department/routes/department.route.ts`
- `Smart_Civic_Platform_Backend/src/modules/department/controller/department.controller.ts`

### Phase 18: Add Scheduled Broadcast Cron
- `ScheduledBroadcastCron` — runs every 5 minutes
  - Query: `SELECT FROM notifications WHERE scheduled_for <= NOW() AND sent_at IS NULL`
  - For each: resolve recipients, dispatch via selected channels
  - Mark `sent_at = NOW()`
- Allow cancellation up to 1 minute before scheduled time

Files:
- `Smart_Civic_Platform_Backend/src/service/scheduled-broadcast.service.ts` (NEW)

### Phase 19: Add Broadcast History Endpoints
- `GET /api/municipality/:mid/broadcasts` — list all broadcasts by munic head
- `GET /api/v1/department/broadcasts` — list all broadcasts by dept head
- `GET /api/municipality/:mid/broadcasts/:id/stats` — delivery stats:
  - `total_recipients`, `delivered_count`, `failed_count`, `channel_breakdown`
- Include filters: date range, audience type, channel

Files:
- `Smart_Civic_Platform_Backend/src/modules/municipality/repository/municipality.repository.ts`
- `Smart_Civic_Platform_Backend/src/modules/department/repository/department.repository.ts`

### Phase 20: Add Broadcast Templates (Pre-written Messages)
- Seed common broadcast templates:
  - "Scheduled Power Outage: [Area] on [Date] from [Time] to [Time]."
  - "Emergency Disaster Alert: [Type] in [Area]. Please take precautions."
  - "Town Hall Meeting: [Date] at [Time] at [Venue]."
  - "Shift Change Notice: [Details] effective [Date]."
  - "Safety Guidelines: [Message]."
- Department head can save custom templates
- `GET /api/municipality/:mid/broadcast-templates` — list templates
- `POST /api/municipality/:mid/broadcast-templates` — save custom template

Files:
- `Smart_Civic_Platform_Backend/src/modules/municipality/controller/municipality.controller.ts`
- `Smart_Civic_Platform_Backend/src/service/broadcast.service.ts`

---

## DOMAIN E — Backend: SMS & Email Channel Integration (Phases 21–25)

### Phase 21: Integrate SMS Provider for Notifications
- Use existing SMS service (from Citizen Registration plan)
- Provider: Sparrow SMS / NTC SMS (Nepal-compatible)
- `POST /api/sms/send` — internal service endpoint
- Rate limit: max 1000 SMS per hour per municipality (configurable)
- Queue SMS deliveries in `notification_logs` for retry

Files:
- `Smart_Civic_Platform_Backend/src/config/sms.ts`
- `Smart_Civic_Platform_Backend/src/service/dispatchers/sms.dispatcher.ts`

### Phase 22: Integrate Email Provider for Notifications
- Use existing email service (Supabase or SMTP)
- Templates for each trigger:
  - Staff onboarding: formal welcome email with credentials
  - Ticket resolved: resolution summary with link to proof
  - Broadcast: raw message body
- `POST /api/email/send` — internal service endpoint
- Track bounces and hard failures

Files:
- `Smart_Civic_Platform_Backend/src/service/dispatchers/email.dispatcher.ts`

### Phase 23: Add SMS/Email Opt-Out Handling
- Each SMS/email includes: "Reply STOP to unsubscribe" or link
- `POST /api/notifications/opt-out` — profile can opt out of channel
- `POST /api/notifications/opt-in` — re-enable
- Check `notification_preferences` before every SMS/email dispatch
- Admin override: municipality head can force-send urgent alerts even if opted out

Files:
- `Smart_Civic_Platform_Backend/src/modules/notifications/routes/notification.routes.ts`
- `Smart_Civic_Platform_Backend/src/service/notification.service.ts`

### Phase 24: Add In-App Dashboard Banner for Urgent Alerts
- When broadcast is marked `is_urgent = TRUE`:
  - Create dashboard banner (persistent until dismissed)
  - Banner shows on top of all pages for target audience
  - "🚨 [Title] — [Message]. Dismiss"
- `GET /api/notifications/active-banners` — returns active urgent banners
- `POST /api/notifications/banners/:id/dismiss` — dismiss banner

Files:
- `Smart_Civic_Platform_Backend/src/modules/notifications/controller/notification.controller.ts`

### Phase 25: Add Notification Digest (Daily/Weekly)
- For non-urgent notifications: batch into digest
- Citizen daily digest: "Your complaints summary: 2 in progress, 1 resolved."
- Dept head daily digest: "New tickets: 3. Resolved today: 5. SLA warnings: 1."
- Munic head weekly digest: "This week: 45 complaints, 38 resolved, 3 escalated."
- Configurable interval per profile

Files:
- `Smart_Civic_Platform_Backend/src/service/digest.service.ts` (NEW)

---

## DOMAIN F — Backend: Notification Preferences & Opt-Out (Phases 26–30)

### Phase 26: Add Notification Preferences Endpoint
- `GET /api/notifications/preferences` — get current preferences
- `PUT /api/notifications/preferences` — update preferences
  - Accept: `{ channels: { sms: boolean, email: boolean, push: boolean, in_app: boolean } }`
- `PUT /api/notifications/preferences/:channel` — toggle single channel
- Default: all enabled for new profiles

Files:
- `Smart_Civic_Platform_Backend/src/modules/notifications/routes/notification.routes.ts`
- `Smart_Civic_Platform_Backend/src/modules/notifications/controller/notification.controller.ts`
- `Smart_Civic_Platform_Backend/src/modules/notifications/services/notification.service.ts` (NEW)

### Phase 27: Add Per-Trigger-Type Opt-Out
- Users can opt out of specific notification types (not just channels)
- "Don't send me SLA warning notifications"
- Store as JSONB column in `notification_preferences`: `disabled_types: string[]`
- Check before dispatching: skip if type is in disabled_types list

Files:
- `Smart_Civic_Platform_Backend/src/service/notification.service.ts`

### Phase 28: Add Quiet Hours Configuration
- Users can set quiet hours: "Don't send SMS between 10PM and 7AM"
- Store: `quiet_hours_start TIME`, `quiet_hours_end TIME` in notification_preferences
- During quiet hours: buffer non-urgent notifications, deliver when over
- Urgent alerts (SLA breach, disaster broadcast) bypass quiet hours

Files:
- `Smart_Civic_Platform_Backend/src/service/dispatchers/sms.dispatcher.ts`
- `Smart_Civic_Platform_Backend/src/types/database.type.ts`

### Phase 29: Add Read Receipts & Seen Status
- Extend `notification_reads` with:
  - `is_seen BOOLEAN NOT NULL DEFAULT FALSE` — notification appeared in UI
  - `is_clicked BOOLEAN NOT NULL DEFAULT FALSE` — user clicked on it
- `POST /api/notifications/:id/seen` — mark as seen
- `POST /api/notifications/:id/clicked` — mark as clicked
- Analytics: track open rates per notification type

Files:
- `Smart_Civic_Platform_Backend/src/modules/notifications/controller/notification.controller.ts`

### Phase 30: Add Notification Analytics for Admins
- `GET /api/municipality/:mid/notifications/analytics` — stats:
  - Total sent this month
  - Channel breakdown (SMS vs Email vs Push vs In-App)
  - Delivery success rate per channel
  - Average open rate
  - Most triggered event type
- `GET /api/v1/department/notifications/analytics` — dept-level stats

Files:
- `Smart_Civic_Platform_Backend/src/modules/municipality/repository/municipality.repository.ts`
- `Smart_Civic_Platform_Backend/src/modules/department/repository/department.repository.ts`

---

## DOMAIN G — Backend: Notification API Endpoints (Phases 31–35)

### Phase 31: Create Notifications Module (Full CRUD)
- `GET /api/notifications` — paginated list for current user
  - Filters: type, is_read, date_from, date_to
  - Sorted by created_at DESC
- `GET /api/notifications/unread-count` — fast badge count
- `PATCH /api/notifications/:id/read` — mark single as read
- `PATCH /api/notifications/read-all` — mark all as read
- `DELETE /api/notifications/:id` — soft delete (is_deleted flag)
- `DELETE /api/notifications/clear-all` — clear all (soft delete)

Files:
- `Smart_Civic_Platform_Backend/src/modules/notifications/routes/notification.routes.ts`
- `Smart_Civic_Platform_Backend/src/modules/notifications/controller/notification.controller.ts`
- `Smart_Civic_Platform_Backend/src/modules/notifications/services/notification.service.ts`

### Phase 32: Add Real-Time WebSocket Events (Future-Proof)
- Create WebSocket hub: `NotificationHub`
- Events:
  - `notification:new` — new notification for user
  - `notification:unread_count` — updated count
  - `broadcast:urgent` — urgent banner for all online users in scope
- Stub for now: fall back to polling every 60s
- Configurable polling interval per user role

Files:
- `Smart_Civic_Platform_Backend/src/service/notification-hub.service.ts` (NEW)
- `Smart_Civic_Platform_Backend/src/config/websocket.ts` (NEW)

### Phase 33: Add Push Notification Token Registration
- `POST /api/notifications/push-token` — register device token
  - Accept: `{ token, platform: 'web' | 'android' | 'ios' }`
- `DELETE /api/notifications/push-token/:token` — unregister
- Store in `push_tokens` table (new: profile_id, token, platform, created_at)
- Used when Push Dispatcher is integrated with Firebase

Files:
- `Smart_Civic_Platform_Backend/src/modules/notifications/controller/notification.controller.ts`

### Phase 34: Add Notification Middleware (Auto-Log Actions)
- Middleware: `notificationMiddleware(action, metadata)`
- Auto-calls notification service on:
  - `complaint.created` → Trigger 3
  - `complaint.assigned` → Trigger 4
  - `complaint.resolved` → Trigger 5
  - `staff.created` → Trigger 1
  - `team.member_added` → Trigger 2
- Reduces manual notify calls in controllers

Files:
- `Smart_Civic_Platform_Backend/src/middleware/notification-middleware.ts` (NEW)

### Phase 35: Add Retry & Dead-Letter Queue for Failed Notifications
- Failed deliveries after 3 retries → move to dead-letter queue
- `GET /api/municipality/:mid/notifications/failed` — view failed deliveries
- `POST /api/municipality/:mid/notifications/failed/:id/retry` — manual retry
- `GET /api/municipality/:mid/notifications/failed/stats` — failure rate by channel

Files:
- `Smart_Civic_Platform_Backend/src/modules/notifications/controller/notification.controller.ts`

---

## DOMAIN H — Frontend: Notification UI Components (Phases 36–40)

### Phase 36: Create In-App Notification Dropdown Component
- `NotificationDropdown.tsx` — bell icon in navbar:
  - Shows last 10 notifications
  - Each: icon (by type), title, message preview, time ago, read/unread dot
  - "Mark all as read" link
  - "View all" link → full notification page
  - Unread count badge (red circle)
  - Loading skeleton while fetching

Files:
- `Smart_Civic_Platform_Frontend/src/components/NotificationDropdown.tsx` (NEW)
- `Smart_Civic_Platform_Frontend/src/components/layout/AppNavbar.tsx`

### Phase 37: Create Full Notification List Page
- Replace mock `Notification.tsx` with API-connected version:
  - Paginated list with infinite scroll
  - Filter tabs: All, Unread, System, Broadcast, SLA
  - Each item: type icon, title, message, timestamp, read/unread
  - Click → navigate to relevant entity (complaint detail, etc.)
  - "Mark as read" on hover
  - "Clear all" button
  - Empty state: "No notifications yet"

Files:
- `Smart_Civic_Platform_Frontend/src/pages/citizen/Notification.tsx`
- `Smart_Civic_Platform_Frontend/src/pages/munic_head/Notification.tsx`
- `Smart_Civic_Platform_Frontend/src/pages/dept_head/Notification.tsx` (NEW)
- `Smart_Civic_Platform_Frontend/src/pages/staff/Notification.tsx` (NEW)

### Phase 38: Create Urgent Alert Banner Component
- `UrgentBanner.tsx`:
  - Slides in from top of page
  - Red/orange background for urgent alerts
  - Icon: warning triangle / megaphone
  - Title + message
  - "Dismiss" button (marks as seen)
  - Auto-dismiss after 30 seconds (configurable)
  - Persistent until dismissed for critical alerts
- Fetches from `GET /api/notifications/active-banners`

Files:
- `Smart_Civic_Platform_Frontend/src/components/UrgentBanner.tsx` (NEW)
- `Smart_Civic_Platform_Frontend/src/components/layout/MainLayout.tsx`

### Phase 39: Create Toast Notification Component
- `NotificationToast.tsx`:
  - Slides in from bottom-right
  - Types: success (green), warning (yellow), error (red), info (blue)
  - Auto-dismiss after 5 seconds
  - Click → navigate to related page
  - Stack multiple toasts
- Triggered by:
  - SLA warning
  - New assignment
  - Handoff received
  - Resolution confirmation

Files:
- `Smart_Civic_Platform_Frontend/src/components/NotificationToast.tsx` (NEW)
- `Smart_Civic_Platform_Frontend/src/hooks/useNotificationPolling.ts` (NEW)

### Phase 40: Add Notification Preferences UI (All Roles)
- `NotificationPreferences.tsx`:
  - Toggle switches per channel: SMS, Email, Push, In-App
  - Toggle switches per notification type: system, broadcast, sla_warning, assignment, handoff
  - Quiet hours: time picker (start / end)
  - "Save Preferences" button
  - "Reset to Defaults" link
- Accessible from profile settings page for all roles

Files:
- `Smart_Civic_Platform_Frontend/src/pages/citizen/ProfilePage.tsx`
- `Smart_Civic_Platform_Frontend/src/pages/munic_head/ProfilePage.tsx`
- `Smart_Civic_Platform_Frontend/src/pages/dept_head/ProfilePage.tsx`
- `Smart_Civic_Platform_Frontend/src/pages/staff/ProfilePage.tsx`
- `Smart_Civic_Platform_Frontend/src/components/NotificationPreferences.tsx` (NEW)

---

## DOMAIN I — Frontend: Manual Broadcast UI (Phases 41–45)

### Phase 41: Create Broadcast Composer (Municipality Head)
- `BroadcastComposer.tsx`:
  - Step 1 — Audience:
    - Radio: "All Citizens", "Citizens in specific Ward" (→ ward dropdown), "All Municipal Staff"
    - Show estimated recipient count
  - Step 2 — Message:
    - Title input
    - Body textarea (rich text)
    - Template selector dropdown (pre-written templates)
  - Step 3 — Channels:
    - Checkboxes: Push, SMS, Email, Dashboard Banner
    - Show channel cost estimate (SMS credits, email count)
  - Step 4 — Schedule:
    - "Send Now" or "Schedule for Later" (date/time picker)
  - Review & Confirm step
  - "Send" button → POST to broadcast endpoint

Files:
- `Smart_Civic_Platform_Frontend/src/pages/munic_head/BroadcastComposer.tsx` (NEW)
- `Smart_Civic_Platform_Frontend/src/routes/AppRoutes.tsx`

### Phase 42: Create Broadcast Composer (Department Head)
- Same as Phase 41 but scoped audience:
  - Radio: "All Department Staff", "Specific Team" (→ team dropdown), "Individual Staff" (→ staff selector)
  - No SMS channel option (dept head cannot send SMS broadcasts)
  - Channels: Push, In-App Banner only

Files:
- `Smart_Civic_Platform_Frontend/src/pages/dept_head/BroadcastComposer.tsx` (NEW)
- `Smart_Civic_Platform_Frontend/src/routes/AppRoutes.tsx`

### Phase 43: Create Broadcast History & Analytics Page
- `BroadcastHistory.tsx`:
  - Table: title, audience, channels, sent date, delivery stats
  - Click row → detail view:
    - Delivery breakdown: X sent, Y delivered, Z failed
    - Channel-wise stats: SMS delivered %, Email open %
    - Recipient list (paginated)
    - Retry failed deliveries button
  - Filters: date range, channel, audience type
  - Export as CSV

Files:
- `Smart_Civic_Platform_Frontend/src/pages/munic_head/BroadcastHistory.tsx` (NEW)
- `Smart_Civic_Platform_Frontend/src/pages/dept_head/BroadcastHistory.tsx` (NEW)
- `Smart_Civic_Platform_Frontend/src/routes/AppRoutes.tsx`

### Phase 44: Add Broadcast Template Manager
- `BroadcastTemplates.tsx`:
  - List of saved templates (name, title, body, last used)
  - "Use Template" → fills BroadcastComposer
  - "Edit Template" / "Delete Template"
  - "Save as Template" button on BroadcastComposer
- Pre-seeded templates (read-only):
  - Power Outage Notice
  - Emergency Disaster Alert
  - Town Hall Meeting
  - Water Supply Disruption
  - Shift Change Notice

Files:
- `Smart_Civic_Platform_Frontend/src/pages/munic_head/BroadcastTemplates.tsx` (NEW)
- `Smart_Civic_Platform_Frontend/src/pages/dept_head/BroadcastTemplates.tsx` (NEW)

### Phase 45: Add Notification Center Navigation
- Update sidebar/navbar for all roles:
  - Citizen: Notification bell + "Notifications" in sidebar
  - Municipality Head: Notification bell + "Broadcast" menu (Compose, History, Templates) + "Notifications"
  - Department Head: Notification bell + "Broadcast" menu (Compose, History) + "Notifications"
  - Staff: Notification bell + "Notifications"
- Unread count badge on bell icon
- Broadcast menu only visible to authorized roles

Files:
- `Smart_Civic_Platform_Frontend/src/components/layout/AppNavbar.tsx`
- `Smart_Civic_Platform_Frontend/src/config/navbar.config.tsx`

---

## DOMAIN J — Testing, Documentation & Deployment (Phases 46–50)

### Phase 46: Backend Tests — Notification Service
- Test: send notification to individual → creates row + delivers
- Test: send to department → all members notified
- Test: send to ward citizens → only citizens in that ward
- Test: channel preference filtering (opted out → skipped)
- Test: template rendering with variables
- Test: notification read/seen tracking

Files:
- `Smart_Civic_Platform_Backend/tests/notification-service.test.ts` (NEW)

### Phase 47: Backend Tests — Automated Triggers
- Test: staff created → notif sent to dept head + staff
- Test: complaint submitted → notif sent to dept head
- Test: complaint assigned → notif sent to staff
- Test: complaint resolved → notif sent to citizen + dept head
- Test: team member added → notif sent to member

Files:
- `Smart_Civic_Platform_Backend/tests/notification-triggers.test.ts` (NEW)

### Phase 48: Backend Tests — Broadcast & Scheduling
- Test: munic head creates broadcast to all citizens → delivered
- Test: dept head creates broadcast to team → delivered
- Test: dept head cannot send to all citizens (permission denied)
- Test: scheduled broadcast → sent at correct time
- Test: broadcast cancelled before send → not sent
- Test: SMS fallback chain on failure

Files:
- `Smart_Civic_Platform_Backend/tests/notification-broadcast.test.ts` (NEW)

### Phase 49: Frontend Tests — Notification & Broadcast UI
- Test: NotificationDropdown renders bell with unread count
- Test: Notification list loads from API
- Test: Mark as read updates UI
- Test: UrgentBanner shows and can be dismissed
- Test: BroadcastComposer audience selection
- Test: BroadcastComposer channel selection
- Test: Template fills composer fields
- Test: NotificationPreferences toggles save correctly

Files:
- `Smart_Civic_Platform_Frontend/src/__tests__/NotificationDropdown.test.tsx` (NEW)
- `Smart_Civic_Platform_Frontend/src/__tests__/BroadcastComposer.test.tsx` (NEW)
- `Smart_Civic_Platform_Frontend/src/__tests__/UrgentBanner.test.tsx` (NEW)

### Phase 50: Documentation & Cleanup
- Create `docs/notification-system.md`:
  - Automated triggers reference table (5 events)
  - Manual broadcast permission matrix
  - Channel delivery strategy (tiered model)
  - Template variable reference
  - Opt-out & quiet hours configuration
- Seed `notification_templates` with all 5 trigger templates
- Update `Supabase_Schema.sql` with all new tables/columns
- Update `AGENT.md` and `Smart_Civic_Platform_Backend/CLAUDE.md`
- Remove mock notification data from frontend
- Lint + typecheck all changed code

Files:
- `Smart_Civic_Platform/docs/notification-system.md` (NEW)
- `Supabase_Schema.sql`
- `AGENT.md`
- `Smart_Civic_Platform_Backend/CLAUDE.md`

---

## Summary: 10 Domains × 5 Phases = 50 Phases

| Domain | Phases | Focus |
|--------|--------|-------|
| **A** | 1–5 | Database: Notification Schema (type, channels, templates, logs, preferences, indexes) |
| **B** | 6–10 | Backend: Core Engine (notification service, dispatchers, template engine, preferences filter, retry queue) |
| **C** | 11–15 | Backend: Automated Triggers (5 events: staff onboarded, team assigned, grievance registered, ticket assigned, ticket resolved) |
| **D** | 16–20 | Backend: Manual Broadcast (broadcast service, create endpoint, scheduled cron, history, templates) |
| **E** | 21–25 | Backend: SMS & Email Channels (provider integration, opt-out handling, in-app banners, digest) |
| **F** | 26–30 | Backend: Preferences & Analytics (per-type opt-out, quiet hours, read receipts, admin analytics) |
| **G** | 31–35 | Backend: API Endpoints (CRUD, WebSocket stub, push tokens, middleware, dead-letter queue) |
| **H** | 36–40 | Frontend: Notification UI (dropdown, full list, urgent banner, toasts, preferences page) |
| **I** | 41–45 | Frontend: Broadcast UI (composer for munic/dept head, history, templates, navigation) |
| **J** | 46–50 | Testing, Documentation & Deployment |

---

## Key Architecture Decisions

### Event → Template → Channel Mapping
```text
Trigger Event             Template                   Primary Channels
──────────────────────────────────────────────────────────────────────
staff_onboarded           "Welcome to {dept}..."     Email + In-App
team_assigned             "Added to team {name}..."  Push + In-App
ticket_registered         "New {category} in Ward..." Dashboard Alert
ticket_assigned           "Ticket assigned: {title}" Push + SMS
ticket_resolved           "Resolved: {title}"        Push + SMS + Email
```

### Broadcast Permission Matrix
| Sender | Can Send To | Channels Allowed |
|--------|------------|-----------------|
| Municipality Head | All Citizens, Ward Citizens, All Staff | Push, SMS, Email, In-App, Banner |
| Department Head | Dept Staff, Specific Teams, Individuals | Push, In-App, Banner |

### Delivery Channel Strategy
```
Push Notification ──→ Success? ──→ Done
    │ Failed
    ▼
SMS ──→ Success? ──→ Done
    │ Failed
    ▼
Email ──→ Success? ──→ Done
    │ Failed
    ▼
In-App ──→ Always succeeds (falls back to dashboard)
```

### Preference Hierarchy
```
Global Opt-Out (entire channel disabled)
  └── Per-Type Opt-Out (specific event type disabled)
        └── Quiet Hours (time-based suppression for non-urgent)
              └── Urgent Override (forced delivery for critical alerts)
```
