import { Router } from "express";
import {
  authenticate,
  isMunicipalityStaff,
  isMunicipalityAdmin,
  belongsToMunicipality,
  belongsToDepartment,
  auditLogger,
  requestLogger,
  municipalityRateLimiter,
  publicRateLimiter,
  validateBody,
} from "../middleware";
import {
  MunicipalityController,
  DepartmentController,
  StaffController,
  ComplaintController,
  NoticeController,
  AuditLogController,
} from "../controller";

const router = Router();

// ─── Global Middleware ────────────────────────────────────────────────────────

router.use(requestLogger);

// ─── Municipality (superadmin-managed) ───────────────────────────────────────

/**
 * @swagger
 * /api/municipality:
 *   get:
 *     tags: [Municipality]
 *     summary: List all municipalities
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 *   post:
 *     tags: [Municipality]
 *     summary: Create a municipality
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
 *               - code
 *               - email
 *               - province
 *               - district
 *               - address
 *     responses:
 *       201:
 *         description: Created
 */
router.get(
  "/",
  municipalityRateLimiter,
  authenticate,
  isMunicipalityAdmin,
  MunicipalityController.list,
);

router.post(
  "/",
  municipalityRateLimiter,
  authenticate,
  isMunicipalityAdmin,
  auditLogger,
  validateBody(["name", "code", "email", "province", "district", "address"]),
  MunicipalityController.create,
);

/**
 * @swagger
 * /api/municipality/{municipalityId}:
 *   get:
 *     tags: [Municipality]
 *     summary: Get municipality details
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
 *   patch:
 *     tags: [Municipality]
 *     summary: Update municipality data
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
 *     responses:
 *       200:
 *         description: Updated
 *   delete:
 *     tags: [Municipality]
 *     summary: Delete a municipality
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
 *         description: Deleted
 */
router.get(
  "/:municipalityId",
  municipalityRateLimiter,
  authenticate,
  isMunicipalityStaff,
  belongsToMunicipality,
  MunicipalityController.getById,
);

router.patch(
  "/:municipalityId",
  municipalityRateLimiter,
  authenticate,
  isMunicipalityAdmin,
  belongsToMunicipality,
  auditLogger,
  MunicipalityController.update,
);

router.delete(
  "/:municipalityId",
  municipalityRateLimiter,
  authenticate,
  isMunicipalityAdmin,
  auditLogger,
  MunicipalityController.delete,
);

/**
 * @swagger
 * /api/municipality/{municipalityId}/stats:
 *   get:
 *     tags: [Municipality]
 *     summary: Get municipality statistics
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
  "/:municipalityId/stats",
  municipalityRateLimiter,
  authenticate,
  isMunicipalityStaff,
  belongsToMunicipality,
  MunicipalityController.stats,
);

// ─── Departments ──────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/municipality/{municipalityId}/departments:
 *   get:
 *     tags: [Department]
 *     summary: List departments in a municipality
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
  "/:municipalityId/departments",
  municipalityRateLimiter,
  authenticate,
  isMunicipalityStaff,
  belongsToMunicipality,
  DepartmentController.list,
);

/**
 * @swagger
 * /api/municipality/{municipalityId}/departments:
 *   post:
 *     tags: [Department]
 *     summary: Create a department in a municipality
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
 *               - code
 *     responses:
 *       201:
 *         description: Created
 */
router.post(
  "/:municipalityId/departments",
  municipalityRateLimiter,
  authenticate,
  isMunicipalityAdmin,
  belongsToMunicipality,
  auditLogger,
  validateBody(["name", "code"]),
  DepartmentController.create,
);

/**
 * @swagger
 * /api/municipality/{municipalityId}/departments/{departmentId}:
 *   get:
 *     tags: [Department]
 *     summary: Get department details in a municipality
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
  "/:municipalityId/departments/:departmentId",
  municipalityRateLimiter,
  authenticate,
  isMunicipalityStaff,
  belongsToMunicipality,
  DepartmentController.getById,
);

/**
 * @swagger
 * /api/municipality/{municipalityId}/departments/{departmentId}:
 *   patch:
 *     tags: [Department]
 *     summary: Update department details in a municipality
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
 *         name: departmentId
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
  "/:municipalityId/departments/:departmentId",
  municipalityRateLimiter,
  authenticate,
  isMunicipalityAdmin,
  belongsToMunicipality,
  auditLogger,
  DepartmentController.update,
);

/**
 * @swagger
 * /api/municipality/{municipalityId}/departments/{departmentId}:
 *   delete:
 *     tags: [Department]
 *     summary: Delete a department in a municipality
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
 *         name: departmentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete(
  "/:municipalityId/departments/:departmentId",
  municipalityRateLimiter,
  authenticate,
  isMunicipalityAdmin,
  belongsToMunicipality,
  auditLogger,
  DepartmentController.delete,
);

// ─── Staff ────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/municipality/{municipalityId}/staff:
 *   get:
 *     tags: [Staff]
 *     summary: List staff in a municipality
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
  "/:municipalityId/staff",
  municipalityRateLimiter,
  authenticate,
  isMunicipalityAdmin,
  belongsToMunicipality,
  StaffController.list,
);

/**
 * @swagger
 * /api/municipality/{municipalityId}/staff:
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
  "/:municipalityId/staff",
  municipalityRateLimiter,
  authenticate,
  isMunicipalityAdmin,
  belongsToMunicipality,
  auditLogger,
  validateBody(["name", "email", "password", "role", "departmentId"]),
  StaffController.create,
);

/**
 * @swagger
 * /api/municipality/{municipalityId}/staff/{staffId}/status:
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
  "/:municipalityId/staff/:staffId/status",
  municipalityRateLimiter,
  authenticate,
  isMunicipalityAdmin,
  belongsToMunicipality,
  auditLogger,
  validateBody(["status"]),
  StaffController.updateStatus,
);

/**
 * @swagger
 * /api/municipality/{municipalityId}/staff/{staffId}:
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
  "/:municipalityId/staff/:staffId",
  municipalityRateLimiter,
  authenticate,
  isMunicipalityAdmin,
  belongsToMunicipality,
  auditLogger,
  StaffController.delete,
);

// ─── Complaints ───────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/municipality/{municipalityId}/complaints:
 *   get:
 *     tags: [Municipality]
 *     summary: List complaints for a municipality
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: municipalityId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: departmentId
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: OK
 */
router.get(
  "/:municipalityId/complaints",
  municipalityRateLimiter,
  authenticate,
  isMunicipalityStaff,
  belongsToMunicipality,
  ComplaintController.list,
);

/**
 * @swagger
 * /api/municipality/{municipalityId}/complaints:
 *   post:
 *     tags: [Municipality]
 *     summary: Submit a complaint for a municipality
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
 *               - citizenId
 *               - category
 *               - title
 *               - description
 *     responses:
 *       201:
 *         description: Created
 */
router.post(
  "/:municipalityId/complaints",
  publicRateLimiter, // citizens submit complaints — lighter auth
  authenticate,
  validateBody(["citizenId", "category", "title", "description"]),
  ComplaintController.create,
);

/**
 * @swagger
 * /api/municipality/{municipalityId}/complaints/{complaintId}:
 *   get:
 *     tags: [Municipality]
 *     summary: Get complaint details
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
 *         name: complaintId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: OK
 */
router.get(
  "/:municipalityId/complaints/:complaintId",
  municipalityRateLimiter,
  authenticate,
  isMunicipalityStaff,
  belongsToMunicipality,
  ComplaintController.getById,
);

/**
 * @swagger
 * /api/municipality/{municipalityId}/complaints/{complaintId}:
 *   patch:
 *     tags: [Municipality]
 *     summary: Update a complaint
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
 *         name: complaintId
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
  "/:municipalityId/complaints/:complaintId",
  municipalityRateLimiter,
  authenticate,
  isMunicipalityStaff,
  belongsToMunicipality,
  auditLogger,
  ComplaintController.update,
);

// ─── Notices (announcements table) ────────────────────────────────────────────

/**
 * @swagger
 * /api/municipality/{municipalityId}/notices:
 *   get:
 *     tags: [Municipality]
 *     summary: List notices for a municipality
 *     parameters:
 *       - in: path
 *         name: municipalityId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 */
router.get(
  "/:municipalityId/notices",
  publicRateLimiter,
  NoticeController.list, // public — citizens can read notices
);

/**
 * @swagger
 * /api/municipality/{municipalityId}/notices/{noticeId}:
 *   get:
 *     tags: [Municipality]
 *     summary: Get a notice by ID
 *     parameters:
 *       - in: path
 *         name: municipalityId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: noticeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: OK
 */
router.get(
  "/:municipalityId/notices/:noticeId",
  publicRateLimiter,
  NoticeController.getById, // public
);

/**
 * @swagger
 * /api/municipality/{municipalityId}/notices:
 *   post:
 *     tags: [Municipality]
 *     summary: Create a notice in a municipality
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
 *               - title
 *               - body
 *               - category
 *     responses:
 *       201:
 *         description: Created
 */
router.post(
  "/:municipalityId/notices",
  municipalityRateLimiter,
  authenticate,
  isMunicipalityStaff,
  belongsToMunicipality,
  auditLogger,
  validateBody(["title", "body", "category"]),
  NoticeController.create,
);

/**
 * @swagger
 * /api/municipality/{municipalityId}/notices/{noticeId}:
 *   patch:
 *     tags: [Municipality]
 *     summary: Update a municipality notice
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
 *         name: noticeId
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
  "/:municipalityId/notices/:noticeId",
  municipalityRateLimiter,
  authenticate,
  isMunicipalityStaff,
  belongsToMunicipality,
  auditLogger,
  NoticeController.update,
);

/**
 * @swagger
 * /api/municipality/{municipalityId}/notices/{noticeId}:
 *   delete:
 *     tags: [Municipality]
 *     summary: Delete a municipality notice
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
 *         name: noticeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete(
  "/:municipalityId/notices/:noticeId",
  municipalityRateLimiter,
  authenticate,
  isMunicipalityAdmin,
  belongsToMunicipality,
  auditLogger,
  NoticeController.delete,
);

// ─── Audit Logs ───────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/municipality/{municipalityId}/audit-logs:
 *   get:
 *     tags: [Municipality]
 *     summary: Get audit logs for a municipality
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
  "/:municipalityId/audit-logs",
  municipalityRateLimiter,
  authenticate,
  isMunicipalityAdmin,
  belongsToMunicipality,
  AuditLogController.list,
);

export default router;

// ─── Route Summary ────────────────────────────────────────────────────────────
//
//  🔓 Public (no auth):
//  GET  /municipalities/:id/services
//  GET  /municipalities/:id/services/:serviceId
//  GET  /municipalities/:id/notices
//  GET  /municipalities/:id/notices/:noticeId
//
//  🔐 Municipality Staff (auth + role + belongsToMunicipality):
//  GET    /municipalities/:id
//  GET    /municipalities/:id/stats
//  GET    /municipalities/:id/departments
//  GET    /municipalities/:id/departments/:deptId
//  GET    /municipalities/:id/complaints
//  GET    /municipalities/:id/complaints/:complaintId
//  PATCH  /municipalities/:id/complaints/:complaintId   [audited]
//  POST   /municipalities/:id/notices                   [audited]
//  PATCH  /municipalities/:id/notices/:noticeId         [audited]
//
//  🔐 Municipality Admin (auth + admin role + belongsToMunicipality):
//  GET    /municipalities
//  PATCH  /municipalities/:id                           [audited]
//  POST   /municipalities/:id/departments               [audited]
//  PATCH  /municipalities/:id/departments/:deptId       [audited]
//  DELETE /municipalities/:id/departments/:deptId       [audited]
//  GET    /municipalities/:id/staff
//  POST   /municipalities/:id/staff                     [audited]
//  PATCH  /municipalities/:id/staff/:staffId/status     [audited]
//  DELETE /municipalities/:id/staff/:staffId            [audited]
//  POST   /municipalities/:id/services                  [audited]
//  PATCH  /municipalities/:id/services/:serviceId       [audited]
//  DELETE /municipalities/:id/services/:serviceId       [audited]
//  DELETE /municipalities/:id/notices/:noticeId         [audited]
//  GET    /municipalities/:id/audit-logs
//
//  🔐 Superadmin only:
//  POST   /municipalities                               [audited]
//  DELETE /municipalities/:id                           [audited]
