# Frontend Notification Implementation Plan

## Overview
This plan details the complete notification system architecture for the Smart Civic Platform frontend, covering all existing implemented features and identified enhancement areas. The system uses React, Vite, TypeScript, and Material-UI with HTTP polling-based notification retrieval.

## 1. Existing Implementation Status ✅

### 1.1 API Module (`Smart_Civic_Platform_Frontend/src/api/modules/notifications.api.ts`)
All API methods are fully implemented:

| Method | Endpoint | Description |
|---|---|---|
| `getNotifications(params)` | `GET /notifications` | Fetch notifications with filters (type, is_read, page, limit) |
| `getUnreadCount()` | `GET /notifications/unread-count` | Get unread notification count badge |
| `markAsRead(id)` | `PATCH /notifications/{id}/read` | Mark single notification as read |
| `markAllAsRead()` | `GET + PATCH /notifications` | Mark all notifications as read (iterates per-item) |

**Note:** `markAllAsRead` currently fetches all unread notifications and marks each individually rather than using the backend `PATCH /notifications/read-all` bulk endpoint (observation noted in CODEBASE_FLOW_OVERVIEW.md:183).

### 1.2 Hook (`Smart_Civic_Platform_Frontend/src/hooks/useNotificationPolling.tsx`)
Fully implemented with the following features:

| Feature | Description |
|---|---|
| Polling interval | Default 30 seconds (`intervalMs` prop configurable) |
| Visibility handling | Pauses when tab inactive (`document.visibilityState === 'visible'`) |
| Dual fetching | `Promise.all([getUnreadCount(), getNotifications({limit: 10})])` |
| Optimistic updates | `markAsRead` and `markAllAsRead` update local state immediately |
| Event listeners | `visibilitychange` event for tab switching |
| Cleanup | Clears interval and removes listeners on unmount |
| Context exposure | `NotificationContextType` with: `unreadCount`, `notifications`, `loading`, `refresh`, `markAsRead`, `markAllAsRead` |

### 1.3 Components

#### 1.3.1 `NotificationInbox.tsx`
Full inbox view with complete functionality:

| Feature | Description |
|---|---|
| Tabs | All / Unread / System / Broadcast / Alerts |
| "Mark all as read" button | Disabled when `unreadCount === 0` |
| Per-notification "Mark read" action | Available on each unread item |
| Notification filtering | By type per tab selection |
| Icon mapping | Type-based icons (sla_* = alert, assignment/handoff/complaint_update = check, system/broadcast = info) |
| Color coding | Type-specific colors (error for SLA, success for assignment, primary for others) |
| Timestamp display | `formatDistanceToNow` from date-fns |
| Loading state | CircularProgress during fetch |
| Empty state | "No notifications found - You're all caught up!" |

#### 1.3.2 `NotificationDropdown.tsx`
Navbar dropdown component:

| Feature | Description |
|---|---|
| Badge | Shows `unreadCount` with max=99, red color |
| "Mark all as read" | Visible when unreadCount > 0 |
| "View all notifications" | Redirects to `/${role}/notification` |
| Limited display | Shows last 5-10 notifications in dropdown |
| Role-aware | Accepts `role` prop for correct navigation |
| Icon mapping | Same as NotificationInbox |
| Hover state | Background highlight on unread items |

#### 1.3.3 `NotificationToast.tsx`
Top-right toast notifications:

| Feature | Description |
|---|---|
| Trigger condition | New unread notifications where `!n.is_urgent` |
| Display duration | 5 seconds (`autoHideDuration={5000}`) |
| Slide animation | Slide up from bottom-right |
| Content | Shows title and body from latest unread non-urgent notification |
| ID tracking | `prevNotifIds` Set to prevent duplicate toasts |

### 1.4 Pages/Views

| Page | Role | Description |
|---|---|---|
| `pages/citizen/Notification.tsx` | citizen | Uses `NotificationInbox` component |
| `pages/staff/Notification.tsx` | staff | Uses `NotificationInbox` component |
| `pages/munic_head/Notification.tsx` | municipality_head | Uses `NotificationInbox` component |
| `pages/dept_head/Notification.tsx` | department_head | Uses `NotificationInbox` component |

All role-specific notification pages are minimal wrappers around the shared `NotificationInbox` component.

### 1.5 Types (`src/api/types/notifications.types.ts`)
Fully defined type system:

| Type | Description |
|---|---|
| `NotificationType` | Union: `system`, `broadcast`, `sla_warning`, `sla_escalation`, `handoff`, `assignment`, `complaint_update` |
| `NotificationRow` | Complete notification shape with: id, sender, audience, targets, title, body, type, channel array, is_urgent, complaint_id, ward_id, created_at, sent_at, read_at |
| `NotificationFilter` | Query filters: `type`, `is_read`, `page`, `limit` |

### 1.6 Notification Provider (`src/main.tsx` / `src/App.tsx`)
- `App.tsx` wraps application routing in `NotificationProvider`
- Provider default interval: 30000ms (30 seconds)
- Polling runs while tab is visible
- Cross-role compatibility (all roles share the same notification context)

## 2. Enhancement Opportunities 📋

### 2.1 API Optimization

#### 2.1.1 Bulk Mark-as-Read
**Current:** `markAllAsRead()` in `notifications.api.ts` iterates through each notification with individual `markAsRead()` calls.
**Issue:** Inefficient HTTP overhead (n+1 requests).
**Fix:** Use backend `PATCH /notifications/read-all` endpoint directly:
```typescript
markAllAsRead: async (): Promise<ApiResponse<void>> => {
  const response = await apiClient.patch<ApiResponse<void>>('/notifications/read-all');
  return response.data;
},
```

#### 2.1.2 Add Pagination Support
**Current:** `getNotifications` uses `limit` but no `page` parameter is effectively handled.
**Enhancement:** Add proper pagination support with `page` parameter and total count in response.

#### 2.1.3 Add WebSocket/Realtime Subscription
**Current:** Relies entirely on 30-second HTTP polling.
**Enhancement:** Add Supabase realtime subscription as alternative or complement:
```typescript
// Optional realtime subscription
supabase.from('notifications').on('INSERT', { event: '*' }, (payload) => {
  // Trigger immediate update when new notification arrives
  refresh();
}).subscribe();
```

### 2.2 Component Enhancements

#### 2.2.1 Notification Search and Filtering
**Current:** Limited filtering by type per tab.
**Enhancement:** Add search bar and additional filters:
- Search by title/body text
- Filter by urgency (`is_urgent`)
- Filter by type chips (system, broadcast, complaint_update, etc.)
- Date range filter

#### 2.2.2 Role-Specific Notification Views
**Current:** All roles use the same `NotificationInbox` component.
**Enhancement:** Create role-specific views:
- **Citizen:** Show complaint-related notifications (SLA warnings, ticket updates)
- **Staff:** Show assignment notifications, team assignments
- **Department Head:** Show department queue, staff assignments
- **Municipality Head:** Show cross-department escalations, system-wide alerts
- **Superadmin:** Show system-wide broadcasts, audit-related notifications

#### 2.2.3 Urgent Banner Component
**Current:** `UrgentBanner.tsx` exists but may not be integrated.
**Enhancement:** Integrate urgent notification banner at top of inbox:
- Show when urgent notifications are available
- "View all urgent notifications" CTA
- Distinct visual styling (red/orange theme)

#### 2.2.4 Notification Preferences UI
**Current:** No frontend preferences management.
**Enhancement:** Create preferences page/component:
- Toggle channels: in_app, push, sms, email
- Type-specific disable options
- Quiet hours configuration
- Save and persist to backend API

### 2.3 Type Extensions

#### 2.3.1 Enhance NotificationRow Type
**Current:** Limited metadata in the type definition.
**Enhancement:** Add computed/derived fields:
```typescript
export interface NotificationRow {
  // existing fields...
  isUnread: boolean; // computed: !read_at
  timeAgo: string;   // computed: formatDistanceToNow(created_at)
  actionable: boolean; // whether notification has related action
  relatedEntity: {  // type-safe reference
    type: 'complaint' | 'assignment' | 'team' | null;
    id: string | null;
  };
}
```

#### 2.3.2 Action Metadata
**Enhancement:** Add action information to notification types:
```typescript
export interface NotificationAction {
  label: string;
  onClick: (id: string) => void;
  disabled?: boolean;
  // Role-specific actions
}
// e.g., assignment notifications have "Accept", "Start", "Complete"
// e.g., complaint updates have "View Complaint", "Add Note"
```

### 2.4 Accessibility and UX

#### 2.4.1 Screen Reader Support
**Current:** Limited ARIA labels in components.
**Enhancement:** Add proper ARIA labels:
- Announce notification counts
- Label "Mark all as read" button
- Describe notification content for screen readers
- Focus management on dropdown open/close

#### 2.4.2 High Contrast Mode
**Current:** Uses theme colors only.
**Enhancement:** Ensure notification colors meet WCAG contrast ratios.
- Add alternative text icons
- Ensure focus visible states on interactive elements

#### 2.4.3 Loading and Empty States
**Current:** Basic loading and empty states.
**Enhancement:** Improve UX:
- Skeleton loaders instead of CircularProgress
- Engaging empty state illustrations/microcopy
- "Get started" or "No new notifications" with CTAs

## 3. Implementation Roadmap

### Phase 1: API & Performance (Already Complete)
- [x] Core API methods (getNotifications, getUnreadCount, markAsRead, markAllAsRead)
- [x] Polling hook with visibility handling
- [x] Core components (NotificationInbox, NotificationDropdown, NotificationToast)
- [x] Type definitions
- [x] Notification provider integration

### Phase 2: Core Enhancements
- [ ] **Bulk mark-as-read** - Use backend `PATCH /notifications/read-all` endpoint
- [ ] **Pagination support** - Add page parameter and proper pagination
- [ ] **Role-specific notification views** - Customize inbox per role
- [ ] **Urgent banner integration** - Display urgent notifications prominently
- [ ] **Search and filtering** - Add search bar and type filters

### Phase 3: Advanced UX
- [ ] **WebSocket realtime** - Add Supabase subscription as polling alternative
- [ ] **Notification preferences** - Frontend UI + backend API for preference management
- [ ] **Action handlers** - Role-specific click actions on notifications
- [ ] **Accessibility improvements** - ARIA labels, keyboard navigation, focus management

### Phase 4: Polish and Optimization
- [ ] **Skeleton loaders** - Replace spinners during fetch
- [ ] **Engaging empty states** - Better "no notifications" UX
- [ ] **High contrast support** - WCAG compliance verification
- [ ] **Cross-browser testing** - Ensure consistent behavior
- [ ] **Performance optimization** - Debounce, memoization, batch updates

### Phase 5: Future Features (Post-MVP)
- [ ] **Push notification integration** - Register push tokens, receive real-time alerts
- [ ] **Template-driven notifications** - Variable resolution UI
- [ ] **Notification analytics** - View notification history and open rates
- [ ] **Multi-channel delivery** - User preferences for push/sms/email