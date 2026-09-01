# Notification API Testing Documentation

## Overview
This document outlines the testing and validation of the Notification module API endpoints for the Smart Civic Platform. The endpoints successfully handle broadcast distribution, feed fetching, unread counters, and acknowledging notifications.

## Test Environment
- **Base URL:** `http://localhost:3000/api`
- **Roles:** `superadmin` (for broadcasting), `citizen` (for receiving)
- **Authentication:** JWT via Supabase Auth

## Endpoints Tested

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `/notifications/broadcast` | POST | 201 Created | Successfully sends a broadcast notification. Requires staff or admin privileges. Payload supports `title`, `body`, and audience targeting (e.g., `all_citizens`). |
| `/notifications` | GET | 200 OK | Successfully retrieves the inbound notification feed for the authenticated user, properly sorting and joining with read status (`is_read` flag). |
| `/notifications/unread-count` | GET | 200 OK | Successfully calculates the number of unread notifications for the user by checking missing or null `read_at` timestamps in `notification_reads`. |
| `/notifications/{id}/read` | PATCH | 200 OK | Marks a single notification as read by creating/updating an entry in `notification_reads`. Properly decrements the unread count. |
| `/notifications/read-all` | PATCH | 200 OK | Marks all unread notifications in the user's feed as read in a single bulk upsert. |

## Resolved Bugs & Improvements
1. **`notification_reads` Unique Constraint Violation on `read-all`**
   - *Issue*: Calling `PATCH /notifications/read-all` when the user had some notifications already marked as read resulted in a HTTP 400 with a `notification_reads_notification_id_profile_id_key` unique constraint violation. The backend was performing an `.upsert(readRows)` without an explicit `onConflict` parameter, which caused Supabase to attempt an `INSERT` (failing on duplicate keys) instead of an `UPDATE`.
   - *Fix*: Modified the repository's `upsert` calls in both `markAsRead` and `markAllAsRead` to include the explicit conflict resolution parameter: `{ onConflict: "notification_id,profile_id" }`.

2. **Codebase Cleanup**
   - *Issue*: There were two redundant modules for notifications (`src/modules/notification` and `src/modules/notifications`), leading to confusion over which API was active.
   - *Fix*: Verified that `notification` was the active module (via `app.ts`) and completely removed the redundant `notifications` module.
