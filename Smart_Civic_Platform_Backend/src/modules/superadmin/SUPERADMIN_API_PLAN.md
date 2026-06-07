# Superadmin API Plan

## Overview

This document describes how the `src/modules/superadmin` API is built, including routes, controllers, services, shared middleware, and Supabase interactions.

The superadmin module is mounted in `src/index.ts` at:
- `app.use("/api/superadmin", superadminRoutes);`

All routes require JWT authentication and the `superadmin` role.

## Files

- `src/modules/superadmin/routes/superadmin.routes.ts`
  - Defines all route endpoints for `/api/superadmin`
  - Applies global middleware and Swagger comments
- `src/modules/superadmin/controller/superadmin.controller.ts`
  - Implements controller handlers for all route actions
  - Uses a shared `asyncHandler` wrapper with centralized error handling
  - Includes a pagination helper used by multiple controllers
- `src/modules/superadmin/services/superadmin.services.ts`
  - Implements reusable business logic and Supabase queries
  - Contains services for users, admins, stats, audit logs, and feature flags
- `src/modules/superadmin/controller/index.ts`
  - Re-exports controller classes for route imports
- `src/modules/superadmin/middleware/index.ts`
  - Re-exports shared middleware from `src/modules/shared/moduleMiddleware`

## Global Middleware

In `superadmin.routes.ts`, every route uses:

- `superadminRateLimiter`
  - Limits requests to 100 per 15 minutes for superadmin endpoints
- `requestLogger`
  - Logs request timing and request metadata
- `authenticate`
  - Verifies JWT and attaches authenticated user data to `req.user`
- `isSuperadmin`
  - Enforces that the authenticated user has the `superadmin` role

Additional per-route middleware:

- `auditLogger`
  - Logs sensitive actions to the audit system
- `validateBody([fields])`
  - Ensures required request body fields are present

## Route Summary

### Stats

- `GET /api/superadmin/stats`
  - Controller: `StatsController.overview`
  - Service: `StatsService.getDashboardStats`
  - Returns platform-wide statistics for profiles, municipalities, complaints, and pending invitations

### Users

- `GET /api/superadmin/users`
  - Controller: `UserController.list`
  - Service: `UserService.listUsers`
  - Supports `page`, `limit`, and `search` query parameters
- `GET /api/superadmin/users/:id`
  - Controller: `UserController.getById`
  - Service: `UserService.getUserById`
  - Returns user profile plus recent audit entries
- `PATCH /api/superadmin/users/:id/status`
  - Controller: `UserController.updateStatus`
  - Service: `UserService.updateUserStatus`
  - Requires body `{ status }`
  - Audit logged
  - Prevents status changes on other superadmins
- `DELETE /api/superadmin/users/:id`
  - Controller: `UserController.delete`
  - Service: `UserService.deleteUser`
  - Soft-deletes the profile and marks it inactive
  - Audit logged
  - Prevents deleting another superadmin
- `POST /api/superadmin/users/:id/impersonate`
  - Controller: `UserController.impersonate`
  - Service: `UserService.impersonateUser`
  - Generates a Supabase magic link for impersonation
  - Audit logged
  - Prevents impersonating another superadmin

### Admins

- `GET /api/superadmin/admins`
  - Controller: `AdminController.list`
  - Service: `AdminService.listAdmins`
  - Lists all active `superadmin` accounts
- `POST /api/superadmin/admins`
  - Controller: `AdminController.create`
  - Service: `AdminService.createAdmin`
  - Requires body `{ name, email, password }`
  - Creates Supabase auth user and updates profile
  - Audit logged

### Audit Logs

- `GET /api/superadmin/audit-logs`
  - Controller: `AuditLogController.list`
  - Service: `AuditLogService.listLogs`
  - Supports `page` and `limit`
  - Returns paginated audit log entries

### Feature Flags

- `GET /api/superadmin/feature-flags`
  - Controller: `FeatureFlagController.list`
  - Service: `FeatureFlagService.listFlags`
  - Returns an empty stub list
- `PATCH /api/superadmin/feature-flags/:id/toggle`
  - Controller: `FeatureFlagController.toggle`
  - Service: `FeatureFlagService.toggleFlag`
  - Requires body `{ enabled }`
  - Currently raises `NotFoundError` because feature flags are not defined in schema
  - Audit logged

### Municipalities

- `GET /api/superadmin/municipalities`
  - Controller: `MunicipalityController.list`
  - Fetches active municipalities and resolves head profile data
- `POST /api/superadmin/municipalities`
  - Controller: `MunicipalityController.create`
  - Creates a municipality row, Supabase auth user for the head, and staff link
  - Requires body `{ name, email, region, head_name, head_email, head_password }`
  - Ensures `head_email` is not already active
  - Soft-deletes stale previous profile and auth user if present
  - Audit logged
- `PATCH /api/superadmin/municipalities/:id`
  - Controller: `MunicipalityController.update`
  - Updates municipality details like name, region, email, and `is_active`
- `DELETE /api/superadmin/municipalities/:id`
  - Controller: `MunicipalityController.delete`
  - Soft-deletes the municipality and its head user/profile/staff record
  - Hard-deletes the Supabase Auth head user so the email can be reused

## Implementation Notes

- Most non-municipality actions use a service layer in `superadmin.services.ts`.
- Municipality CRUD is implemented directly in `superadmin.controller.ts`, not through a dedicated municipality service class.
- Shared errors used across controllers and services:
  - `NotFoundError`
  - `ForbiddenError`
  - `ConflictError`
- Controllers use `asyncHandler` to catch errors and return structured JSON responses.
- Pagination is standardized via `getPagination(req)` in the controller file.

## Important Details

- The route file includes inline Swagger/OpenAPI annotations for documentation.
- The superadmin module uses shared middleware exports from `src/modules/shared/moduleMiddleware`.
- `FeatureFlagService` is a placeholder; the route exists for compatibility but no real `feature_flags` table logic exists.
- The superadmin module is designed to manage platform-wide state across users, admins, municipalities, audit logs, and stats.
