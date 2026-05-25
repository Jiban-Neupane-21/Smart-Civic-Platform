import { Router } from 'express';
import {
  authenticate,
  isSuperadmin,
  auditLogger,
  requestLogger,
  superadminRateLimiter,
  validateBody,
} from '../middleware';
import {
  UserController,
  AdminController,
  StatsController,
  AuditLogController,
  FeatureFlagController,
} from '../controller';

const router = Router();

// ─── Global Middleware (applied to ALL superadmin routes) ─────────────────────

router.use(superadminRateLimiter); // rate limit: 100 req / 15 min
router.use(requestLogger);         // log every request with timing
router.use(authenticate);          // verify JWT
router.use(isSuperadmin);          // enforce superadmin role

// ─── Stats ────────────────────────────────────────────────────────────────────

/**
 * GET /superadmin/stats
 * Platform-wide dashboard statistics (users, growth, admins).
 */
router.get('/stats', StatsController.overview);

// ─── Users ────────────────────────────────────────────────────────────────────

/**
 * GET /superadmin/users?page=1&limit=20&search=john
 * Paginated list of all users.
 */
router.get('/users', UserController.list);

/**
 * GET /superadmin/users/:id
 * Full profile for a single user including audit history.
 */
router.get('/users/:id', UserController.getById);

/**
 * PATCH /superadmin/users/:id/status
 * Ban, suspend, or reactivate a user.
 * Required body: { status: 'banned' | 'suspended' | 'active', reason?: string }
 */
router.patch(
  '/users/:id/status',
  auditLogger,
  validateBody(['status']),
  UserController.updateStatus
);

/**
 * DELETE /superadmin/users/:id
 * Permanently delete a user account (irreversible).
 */
router.delete('/users/:id', auditLogger, UserController.delete);

/**
 * POST /superadmin/users/:id/impersonate
 * Generate a 30-minute impersonation token for debugging/support.
 */
router.post('/users/:id/impersonate', auditLogger, UserController.impersonate);

// ─── Admins ───────────────────────────────────────────────────────────────────

/**
 * GET /superadmin/admins
 * List all admin and superadmin accounts.
 */
router.get('/admins', AdminController.list);

/**
 * POST /superadmin/admins
 * Create a new admin account.
 * Required body: { name, email, password, role? }
 */
router.post(
  '/admins',
  auditLogger,
  validateBody(['name', 'email', 'password']),
  AdminController.create
);

// ─── Audit Logs ───────────────────────────────────────────────────────────────

/**
 * GET /superadmin/audit-logs?page=1&limit=20
 * Paginated superadmin audit log.
 */
router.get('/audit-logs', AuditLogController.list);

// ─── Feature Flags ────────────────────────────────────────────────────────────

/**
 * GET /superadmin/feature-flags
 * List all feature flags with their current state.
 */
router.get('/feature-flags', FeatureFlagController.list);

/**
 * PATCH /superadmin/feature-flags/:id/toggle
 * Enable or disable a feature flag.
 * Required body: { enabled: boolean }
 */
router.patch(
  '/feature-flags/:id/toggle',
  auditLogger,
  validateBody(['enabled']),
  FeatureFlagController.toggle
);

export default router;

// ─── Route Summary ────────────────────────────────────────────────────────────
//
//  All routes require: JWT auth + superadmin role + rate limiting
//
//  GET    /superadmin/stats
//
//  GET    /superadmin/users
//  GET    /superadmin/users/:id
//  PATCH  /superadmin/users/:id/status        [audited]
//  DELETE /superadmin/users/:id               [audited]
//  POST   /superadmin/users/:id/impersonate   [audited]
//
//  GET    /superadmin/admins
//  POST   /superadmin/admins                  [audited]
//
//  GET    /superadmin/audit-logs
//
//  GET    /superadmin/feature-flags
//  PATCH  /superadmin/feature-flags/:id/toggle [audited]