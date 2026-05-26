import { Router } from "express";
import {
  authenticate,
  isSuperadmin,
  isMunicipalityAdmin,
  isMunicipalityStaff,
  belongsToMunicipality,
  belongsToDepartment,
  auditLogger,
  requestLogger,
  municipalityRateLimiter,
  validateBody,
} from "../middleware";
import { StaffController } from "../controller/staff.controller";

const router = Router();

// ─── Global Middleware (applied to ALL staff routes) ─────────────────────────

router.use(requestLogger);
router.use(municipalityRateLimiter);
router.use(authenticate);

// ─── Self-service routes (staff managing their own account) ──────────────────
// These don't require municipalityId in URL - extracted from JWT

/**
 * @swagger
 * /api/staff/me:
 *   get:
 *     tags: [Staff]
 *     summary: Get current staff profile
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 */
router.get("/me", isMunicipalityStaff, StaffController.getMe);

/**
 * @swagger
 * /api/staff/me:
 *   patch:
 *     tags: [Staff]
 *     summary: Update own staff profile
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Updated
 */
router.patch(
  "/me",
  isMunicipalityStaff,
  validateBody([]), // empty array = no required fields, but validates body exists
  StaffController.updateMe,
);

/**
 * @swagger
 * /api/staff/change-password:
 *   post:
 *     tags: [Staff]
 *     summary: Change own staff password
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *     responses:
 *       200:
 *         description: Password changed
 */
router.post(
  "/change-password",
  isMunicipalityStaff,
  validateBody(["currentPassword", "newPassword"]),
  StaffController.changePassword,
);

// ─── Standalone Staff Routes (municipalityId from query) ─────────────────────

/**
 * @swagger
 * /api/staff:
 *   get:
 *     tags: [Staff]
 *     summary: List staff members
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: municipalityId
 *         schema:
 *           type: string
 *           format: uuid
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
 *       - in: query
 *         name: departmentId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 */
router.get("/", isMunicipalityAdmin, StaffController.list);

/**
 * @swagger
 * /api/staff/export:
 *   get:
 *     tags: [Staff]
 *     summary: Export staff list
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: municipalityId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 */
router.get("/export", isMunicipalityAdmin, StaffController.export);

/**
 * @swagger
 * /api/staff/{staffId}:
 *   get:
 *     tags: [Staff]
 *     summary: Get a staff member
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: staffId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: municipalityId
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: OK
 */
router.get(
  "/:staffId",
  isMunicipalityStaff,
  belongsToMunicipality,
  StaffController.getById,
);

/**
 * @swagger
 * /api/staff:
 *   post:
 *     tags: [Staff]
 *     summary: Create a new staff member
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
 *               - role
 *               - departmentId
 *     responses:
 *       201:
 *         description: Created
 */
router.post(
  "/",
  isMunicipalityAdmin,
  auditLogger,
  validateBody(["name", "email", "password", "role", "departmentId"]),
  StaffController.create,
);

/**
 * @swagger
 * /api/staff/{staffId}:
 *   patch:
 *     tags: [Staff]
 *     summary: Update a staff profile
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: staffId
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
 *     responses:
 *       200:
 *         description: Updated
 */
router.patch(
  "/:staffId",
  isMunicipalityAdmin,
  belongsToMunicipality,
  auditLogger,
  StaffController.update,
);
/**
 * @swagger
 * /api/staff/{staffId}/status:
 *   patch:
 *     tags: [Staff]
 *     summary: Update staff status
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: staffId
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
  "/:staffId/status",
  isMunicipalityAdmin,
  belongsToMunicipality,
  auditLogger,
  validateBody(["status"]),
  StaffController.updateStatus,
);

/**
 * @swagger
 * /api/staff/{staffId}/reset-password:
 *   post:
 *     tags: [Staff]
 *     summary: Reset a staff member's password
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: staffId
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
 *     responses:
 *       200:
 *         description: Password reset
 */
router.post(
  "/:staffId/reset-password",
  isMunicipalityAdmin,
  belongsToMunicipality,
  auditLogger,
  StaffController.resetPassword,
);
/**
 * @swagger
 * /api/staff/{staffId}/audit-logs:
 *   get:
 *     tags: [Staff]
 *     summary: Get audit logs for a staff member
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: staffId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
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
router.get(
  "/:staffId/audit-logs",
  isMunicipalityAdmin,
  belongsToMunicipality,
  StaffController.getAuditLogs,
);

/**
 * @swagger
 * /api/staff/{staffId}:
 *   delete:
 *     tags: [Staff]
 *     summary: Delete a staff member
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: staffId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: permanent
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete(
  "/:staffId",
  isMunicipalityAdmin,
  belongsToMunicipality,
  auditLogger,
  StaffController.delete,
);
// ─── Municipality-scoped Staff Routes (municipalityId in URL) ────────────────

/**
 * All routes below follow the pattern:
 * /municipalities/:municipalityId/staff/...
 */

/**
 * @swagger
 * /api/staff/municipalities/{municipalityId}/staff:
 *   get:
 *     tags: [Staff]
 *     summary: List staff members in a municipality
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: municipalityId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: OK
 */
router.get(
  "/municipalities/:municipalityId/staff",
  isMunicipalityStaff,
  belongsToMunicipality,
  StaffController.list,
);

/**
 * @swagger
 * /api/staff/municipalities/{municipalityId}/staff/export:
 *   get:
 *     tags: [Staff]
 *     summary: Export staff list for a municipality
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: municipalityId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: OK
 */
router.get(
  "/municipalities/:municipalityId/staff/export",
  isMunicipalityAdmin,
  belongsToMunicipality,
  StaffController.export,
);

/**
 * @swagger
 * /api/staff/municipalities/{municipalityId}/staff/{staffId}:
 *   get:
 *     tags: [Staff]
 *     summary: Get a staff member in a municipality
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: municipalityId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: staffId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: OK
 */
router.get(
  "/municipalities/:municipalityId/staff/:staffId",
  isMunicipalityStaff,
  belongsToMunicipality,
  StaffController.getById,
);

/**
 * @swagger
 * /api/staff/municipalities/{municipalityId}/staff:
 *   post:
 *     tags: [Staff]
 *     summary: Create a staff member in a municipality
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: municipalityId
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
 *               - name
 *               - email
 *               - password
 *               - role
 *               - departmentId
 *     responses:
 *       201:
 *         description: Created
 */
router.post(
  "/municipalities/:municipalityId/staff",
  isMunicipalityAdmin,
  belongsToMunicipality,
  auditLogger,
  validateBody(["name", "email", "password", "role", "departmentId"]),
  StaffController.create,
);

/**
 * @swagger
 * /api/staff/municipalities/{municipalityId}/staff/{staffId}:
 *   patch:
 *     tags: [Staff]
 *     summary: Update a staff member in a municipality
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: municipalityId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: staffId
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
 *     responses:
 *       200:
 *         description: Updated
 */
router.patch(
  "/municipalities/:municipalityId/staff/:staffId",
  isMunicipalityAdmin,
  belongsToMunicipality,
  auditLogger,
  StaffController.update,
);

/**
 * @swagger
 * /api/staff/municipalities/{municipalityId}/staff/{staffId}/status:
 *   patch:
 *     tags: [Staff]
 *     summary: Update staff status in a municipality
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: municipalityId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: staffId
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
  "/municipalities/:municipalityId/staff/:staffId/status",
  isMunicipalityAdmin,
  belongsToMunicipality,
  auditLogger,
  validateBody(["status"]),
  StaffController.updateStatus,
);

/**
 * @swagger
 * /api/staff/municipalities/{municipalityId}/staff/{staffId}/reset-password:
 *   post:
 *     tags: [Staff]
 *     summary: Reset a staff password in a municipality
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: municipalityId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: staffId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Password reset
 */
router.post(
  "/municipalities/:municipalityId/staff/:staffId/reset-password",
  isMunicipalityAdmin,
  belongsToMunicipality,
  auditLogger,
  StaffController.resetPassword,
);
/**
 * @swagger
 * /api/staff/municipalities/{municipalityId}/staff/{staffId}/audit-logs:
 *   get:
 *     tags: [Staff]
 *     summary: Get staff audit logs in a municipality
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: municipalityId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: staffId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: OK
 */
router.get(
  "/municipalities/:municipalityId/staff/:staffId/audit-logs",
  isMunicipalityAdmin,
  belongsToMunicipality,
  StaffController.getAuditLogs,
);

/**
 * @swagger
 * /api/staff/municipalities/{municipalityId}/staff/{staffId}:
 *   delete:
 *     tags: [Staff]
 *     summary: Delete a staff member in a municipality
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: municipalityId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: staffId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete(
  "/municipalities/:municipalityId/staff/:staffId",
  isMunicipalityAdmin,
  belongsToMunicipality,
  auditLogger,
  StaffController.delete,
);
// ─── Department-scoped Staff Routes (restricted to department access) ────────

/**
 * @swagger
 * /api/staff/departments/{departmentId}/staff:
 *   get:
 *     tags: [Staff]
 *     summary: List staff in a department
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: departmentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: OK
 */
router.get(
  "/departments/:departmentId/staff",
  isMunicipalityStaff,
  belongsToDepartment,
  StaffController.listByDepartment,
);

/**
 * @swagger
 * /api/staff/departments/{departmentId}/staff/{staffId}:
 *   get:
 *     tags: [Staff]
 *     summary: Get a staff member in a department
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: departmentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: staffId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: OK
 */
router.get(
  "/departments/:departmentId/staff/:staffId",
  isMunicipalityStaff,
  belongsToDepartment,
  StaffController.getById,
);

/**
 * @swagger
 * /api/staff/departments/{departmentId}/staff/export:
 *   get:
 *     tags: [Staff]
 *     summary: Export department staff list
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: departmentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: OK
 */
router.get(
  "/departments/:departmentId/staff/export",
  isMunicipalityAdmin,
  belongsToMunicipality,
  StaffController.export,
);

// ─── Superadmin-only Staff Routes ────────────────────────────────────────────

/**
 * @swagger
 * /api/staff/superadmin/staff:
 *   get:
 *     tags: [Staff]
 *     summary: Superadmin list of all staff
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 */
router.get("/superadmin/staff", isSuperadmin, StaffController.listAll);

/**
 * @swagger
 * /api/staff/superadmin/staff/{staffId}:
 *   get:
 *     tags: [Staff]
 *     summary: Superadmin get any staff member
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: staffId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: OK
 */
router.get("/superadmin/staff/:staffId", isSuperadmin, StaffController.getById);

/**
 * @swagger
 * /api/staff/superadmin/staff/{staffId}/role:
 *   patch:
 *     tags: [Staff]
 *     summary: Change staff role as superadmin
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: staffId
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
 *               - role
 *     responses:
 *       200:
 *         description: Updated
 */
router.patch(
  "/superadmin/staff/:staffId/role",
  isSuperadmin,
  auditLogger,
  validateBody(["role"]),
  StaffController.changeRole,
);
/**
 * @swagger
 * /api/staff/superadmin/staff/{staffId}:
 *   delete:
 *     tags: [Staff]
 *     summary: Superadmin delete a staff member permanently
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: staffId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete(
  "/superadmin/staff/:staffId",
  isSuperadmin,
  auditLogger,
  StaffController.deletePermanent,
);

export default router;

// ─── Route Summary ────────────────────────────────────────────────────────────
//
//  🔓 Self-service (any authenticated staff):
//  GET    /staff/me
//  PATCH  /staff/me
//  POST   /staff/change-password
//
//  🔐 Municipality Admin:
//  GET    /staff?municipalityId=xxx
//  GET    /staff/export
//  POST   /staff                                    [audited]
//  GET    /staff/:staffId
//  PATCH  /staff/:staffId                           [audited]
//  PATCH  /staff/:staffId/status                    [audited]
//  POST   /staff/:staffId/reset-password            [audited]
//  GET    /staff/:staffId/audit-logs
//  DELETE /staff/:staffId                           [audited]
//
//  🔐 Municipality-scoped (same as above with URL param):
//  GET    /municipalities/:id/staff
//  GET    /municipalities/:id/staff/export
//  POST   /municipalities/:id/staff                 [audited]
//  GET    /municipalities/:id/staff/:staffId
//  PATCH  /municipalities/:id/staff/:staffId        [audited]
//  PATCH  /municipalities/:id/staff/:staffId/status [audited]
//  POST   /municipalities/:id/staff/:staffId/reset-password [audited]
//  GET    /municipalities/:id/staff/:staffId/audit-logs
//  DELETE /municipalities/:id/staff/:staffId        [audited]
//
//  🔐 Department-scoped:
//  GET    /departments/:id/staff
//  GET    /departments/:id/staff/:staffId
//  GET    /departments/:id/staff/export
//
//  🔐 Superadmin:
//  GET    /superadmin/staff
//  GET    /superadmin/staff/:staffId
//  PATCH  /superadmin/staff/:staffId/role           [audited]
//  DELETE /superadmin/staff/:staffId                [audited]
