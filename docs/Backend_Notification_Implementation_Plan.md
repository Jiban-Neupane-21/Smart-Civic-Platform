# Backend Notification Implementation Plan

## Overview
This plan details the complete notification system architecture for the Smart Civic Platform backend, covering all existing implemented features and identified enhancement areas. The system uses Express.js, TypeScript, and Supabase (PostgreSQL) with a dual-service layer architecture.

## 1. Existing Implementation Status ✅

### 1.1 Routes (`Smart_Civic_Platform_Backend/src/modules/notification/routes/notification.routes.ts`)
All notification endpoints are fully implemented:

| Endpoint | Method | Description |
|---|---|---|
| `GET /api/notifications` | Get | Fetch my notification feed |
| `GET /api/notifications/inbound-queue` | Get | Same as above (alias) |
| `GET /api/notifications/unread-count` | Get | Get unread notification count badge |
| `PATCH /api/notifications/read-all` | PATCH | Mark all notifications as read |
| `PATCH /api/notifications/{id}/read` | PATCH | Mark single notification as read |
| `PATCH /api/notifications/{notificationId}/acknowledge` | PATCH | Same as above (alias) |
| `POST /api/notifications/broadcast` | Post | Dispatch targeted broadcast notification |

**Authentication:** All routes require Bearer token + forcePasswordReset middleware.

### 1.2 Controller (`Smart_Civic_Platform_Backend/src/modules/notification/controller/notification.controller.ts`)
All controller methods are fully implemented:

| Method | Function |
|---|---|
| `sendAlert` | Broadcast administrative alert |
| `fetchMyAlerts` | Fetch inbound notifications for user |
| `getUnreadCount` | Get unread count badge |
| `readAlert` | Mark single notification as read |
| `readAllAlerts` | Mark all notifications as read |

### 1.3 Service Layer

**`notification.service.ts`** - Main service:
- `broadcastAdministrativeAlert()` - Creates broadcast via BroadcastService
- `listInboundQueue()` - Gets inbound notifications
- `getUnreadCount()` - Counts unread notifications
- `acknowledgeAlertReceipt()` / `acknowledgeAllAlerts()` - Mark as read

**`broadcast.service.ts`** - Broadcast dispatch:
- `createBroadcast()` - Inserts notification, resolves audience, pre-seeds `notification_reads`
- Enforces role-based permissions (dept heads restricted in audience scope)

### 1.4 Repository (`notification.repository.ts`)
All methods fully implemented:

| Method | Function |
|---|---|
| `dispatchNotification()` | Insert notification record into DB |
| `getMyInboundNotifications()` | Fetches notifications + read status from `notification_reads` |
| `markAsRead()` | Update `notification_reads` for single notification |
| `markAllAsRead()` | Update `notification_reads` for all user notifications |

### 1.5 Database Schema
Key tables and their purposes:

| Table | Key Columns |
|---|---|
| `notifications` | `id`, `sender_id`, `type`, `audience`, `target_municipality_id`, `target_department_id`, `target_team_id`, `target_profile_id`, `target_ward_id`, `complaint_id`, `title`, `body`, `channels` (jsonb array), `is_urgent`, `scheduled_for`, `sent_at`, `delivery_status`, `created_at` |
| `notification_reads` | `id`, `notification_id`, `profile_id`, `is_seen`, `is_clicked`, `read_at` (UNIQUE: notification_id+profile_id) |
| `notification_logs` | `id`, `notification_id`, `profile_id`, `channel`, `status`, `error_message`, `sent_at`, `delivered_at` |
| `notification_preferences` | `id`, `profile_id`, `channel`, `is_enabled`, `disabled_types` (jsonb array), `quiet_hours_start/end` |
| `push_tokens` | `id`, `profile_id`, `token`, `platform` (UNIQUE: profile_id+token) |
| `notification_templates` | `id`, `trigger_event`, `title_template`, `body_template`, `channels`, `is_active`, `created_at` |

**ENUM Types:**
- `notification_type`: `system`, `broadcast`, `sla_warning`, `sla_escalation`, `handoff`, `assignment`, `complaint_update`
- `notification_channel`: `in_app`, `push`, `sms`, `email`
- `audience_scope`: `individual`, `team`, `department`, `all_staff`, `all_citizens`, `everyone`

**RLS Policies:**
- `notifications_select` - Users see notifications targeting them or superadmin
- `notifications_insert_admins` - Only sender can insert their own notifications
- `notification_reads_own` - Users manage their own read status
- `notification_templates_read` - Public read access
- `notification_templates_write` - Superadmin only

**Indexes:**
- `idx_notifications_municipality`, `idx_notifications_department`, `idx_notifications_profile`
- `idx_notifications_type_sent`, `idx_notifications_created_at`, `idx_notifications_audience_ward`
- `idx_notification_reads_profile`, `idx_notif_logs_profile`, `idx_notif_logs_channel_status`

## 2. Enhancement Opportunities 📋

### 2.1 Backend Optimizations

#### 2.1.1 Unread Count Optimization
**Current:** `getUnreadCount()` fetches all notifications and filters client-side (repository line 33-36).
**Issue:** Inefficient for users with many notifications.
**Fix:** Add a dedicated count query in repository:
```sql
SELECT COUNT(*) FROM notifications n
WHERE n.audience IN ('all_citizens', 'all_staff')
   OR n.target_profile_id = $1
   OR n.target_department_id IN (
     SELECT department_id FROM profiles WHERE id = $1
   )
   OR n.target_team_id IN (
     SELECT team_id FROM team_members WHERE profile_id = $1
   )
   AND NOT EXISTS (
     SELECT 1 FROM notification_reads nr
     WHERE nr.notification_id = n.id AND nr.profile_id = $1 AND nr.is_seen = true
   );
```

#### 2.1.2 Broadcast API Enhancement
**Current:** `POST /api/notifications/broadcast` requires `title` and `body` only.
**Enhancement:** Add support for notification templates and variable resolution:
- Add optional `template_id` parameter
- Add `variables` map for `{{placeholder}}` resolution
- Support scheduled broadcasting with `scheduled_for` timestamp

#### 2.1.3 Notification Priority Processing
**Current:** `is_urgent` flag exists but no backend processing.
**Enhancement:** Add scheduled job to process urgent notifications:
- Mark urgent notifications for immediate delivery
- Push/SMS priority routing
- Escalation timeline tracking

### 2.2 Missing Functionalities

#### 2.2.1 Push Notification Delivery
**Status:** `push_tokens` table exists but no active push service.
**Required:**
1. Create push notification service (FCM/APNs integration)
2. API endpoint to register push tokens: `POST /api/notifications/push-token`
3. Background worker to process pending push notifications
4. Update `notification_logs` on delivery status

#### 2.2.2 Email Notification Service
**Status:** `email` channel supported in templates but no email service.
**Required:**
1. SES or SendGrid integration
2. API endpoint to register email preferences
3. Template rendering with Handlebars/Mustache

#### 2.2.3 Notification Preference Service
**Status:** `notification_preferences` table exists but no API endpoints.
**Required:**
1. `GET /api/notifications/preferences` - Get user preferences
2. `PATCH /api/notifications/preferences` - Update user preferences
3. Channel-specific enable/disable (in_app, push, sms, email)
4. Type-based filtering (`disabled_types` jsonb)

#### 2.2.4 Scheduled Notifications
**Status:** `scheduled_for` column exists but no cron job integration.
**Required:**
1. Node-cron or bull queue for scheduled notification delivery
2. Background process to check and send scheduled notifications
3. Update `sent_at` when delivered

#### 2.2.5 Comprehensive Audit Logging
**Status:** Basic logging exists via `notification_logs` table.
**Enhancement:**
1. Add correlation IDs for notification chains
2. Log delivery attempts with timestamps
3. Track A/B test variations for template efficacy

## 3. Implementation Roadmap

### Phase 1: Foundation (Already Complete)
- [x] Core routes and controllers
- [x] Repository with DB operations
- [x] Service layer with broadcast logic
- [x] Database schema and RLS policies
- [x] Notification read tracking

### Phase 2: Delivery Enhancements
- [ ] Push notification service integration
- [ ] Email notification service integration
- [ ] Notification preferences API
- [ ] Scheduled notification cron job

### Phase 3: Advanced Features
- [ ] Template variable resolution
- [ ] Notification analytics dashboard
- [ ] A/B testing framework
- [ ] Cross-platform notification tracking

### Phase 4: Optimization
- [ ] Unread count SQL optimization
- [] Batch mark-as-read improvements
- [] Real-time subscription alternative to polling
- [] Performance indexing and caching