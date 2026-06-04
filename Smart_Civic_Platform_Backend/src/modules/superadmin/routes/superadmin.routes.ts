import { Router } from "express";
import {
  authenticate,
  isSuperadmin,
  auditLogger,
  requestLogger,
  superadminRateLimiter,
  validateBody,
} from "../middleware";
import {
  UserController,
  AdminController,
  StatsController,
  AuditLogController,
  FeatureFlagController,
} from "../controller";

const router = Router();

// ─── Global Middleware (applied to ALL superadmin routes) ─────────────────────

router.use(superadminRateLimiter); // rate limit: 100 req / 15 min
router.use(requestLogger); // log every request with timing
router.use(authenticate); // verify JWT
router.use(isSuperadmin); // enforce superadmin role

// ─── Stats ────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/superadmin/stats:
 *   get:
 *     tags: [Superadmin]
 *     summary: Platform-wide dashboard statistics
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 */
router.get("/stats", StatsController.overview);

// ─── Users ────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/superadmin/users:
 *   get:
 *     tags: [Superadmin]
 *     summary: List users for superadmin
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 */
router.get("/users", UserController.list);

/**
 * @swagger
 * /api/superadmin/users/{id}:
 *   get:
 *     tags: [Superadmin]
 *     summary: Get a user by id
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: OK
 */
router.get("/users/:id", UserController.getById);

/**
 * @swagger
 * /api/superadmin/users/{id}/status:
 *   patch:
 *     tags: [Superadmin]
 *     summary: Update user status
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *     responses:
 *       200:
 *         description: Updated
 */
router.patch(
  "/users/:id/status",
  auditLogger,
  validateBody(["status"]),
  UserController.updateStatus,
);

/**
 * @swagger
 * /api/superadmin/users/{id}:
 *   delete:
 *     tags: [Superadmin]
 *     summary: Permanently delete a user account
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete("/users/:id", auditLogger, UserController.delete);

/**
 * @swagger
 * /api/superadmin/users/{id}/impersonate:
 *   post:
 *     tags: [Superadmin]
 *     summary: Generate an impersonation token for a user
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Impersonation token created
 */
router.post("/users/:id/impersonate", auditLogger, UserController.impersonate);

// ─── Admins ───────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/superadmin/admins:
 *   get:
 *     tags: [Superadmin]
 *     summary: List admin and superadmin accounts
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 */
router.get("/admins", AdminController.list);

/**
 * @swagger
 * /api/superadmin/admins:
 *   post:
 *     tags: [Superadmin]
 *     summary: Create a new admin account
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *     responses:
 *       201:
 *         description: Created
 */
router.post(
  "/admins",
  auditLogger,
  validateBody(["name", "email", "password"]),
  AdminController.create,
);

// ─── Audit Logs ───────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/superadmin/audit-logs:
 *   get:
 *     tags: [Superadmin]
 *     summary: List superadmin audit logs
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: OK
 */
router.get("/audit-logs", AuditLogController.list);

// ─── Feature Flags ────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/superadmin/feature-flags:
 *   get:
 *     tags: [Superadmin]
 *     summary: List feature flags
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 */
router.get("/feature-flags", FeatureFlagController.list);

/**
 * @swagger
 * /api/superadmin/feature-flags/{id}/toggle:
 *   patch:
 *     tags: [Superadmin]
 *     summary: Toggle a feature flag
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - enabled
 *             properties:
 *               enabled:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Updated
 */
router.patch(
  "/feature-flags/:id/toggle",
  auditLogger,
  validateBody(["enabled"]),
  FeatureFlagController.toggle,
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
