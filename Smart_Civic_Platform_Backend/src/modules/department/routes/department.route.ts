import { Router } from "express";
import {
  authenticate,
  isSuperadmin,
  isMunicipalityAdmin,
  isMunicipalityStaff,
  belongsToMunicipality,
  auditLogger,
  requestLogger,
  municipalityRateLimiter,
  validateBody,
} from "../middleware";
import { DepartmentController } from "../controller/department.controller";

const router = Router();

// ─── Global Middleware ────────────────────────────────────────────────────────

router.use(requestLogger);
router.use(municipalityRateLimiter);
router.use(authenticate);

// ─── Standalone Department Routes ─────────────────────────────────────────────

/**
 * @swagger
 * /api/department:
 *   get:
 *     tags: [Department]
 *     summary: List all departments
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
 *     responses:
 *       200:
 *         description: OK
 *   post:
 *     tags: [Department]
 *     summary: Create a new department
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
 *     responses:
 *       201:
 *         description: Created
 */
router.get("/", isMunicipalityStaff, DepartmentController.list);

/**
 * @swagger
 * /api/department/select-list:
 *   get:
 *     tags: [Department]
 *     summary: Get simplified department list for dropdowns
 *     security:
 *       - BearerAuth: []
 *     parameters:
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
  "/select-list",
  isMunicipalityStaff,
  DepartmentController.getSelectList,
);

/**
 * @swagger
 * /api/department/export:
 *   get:
 *     tags: [Department]
 *     summary: Export departments
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
router.get("/export", isMunicipalityAdmin, DepartmentController.export);

/**
 * @swagger
 * /api/department/{departmentId}:
 *   get:
 *     tags: [Department]
 *     summary: Get department details
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: departmentId
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
  "/:departmentId",
  isMunicipalityStaff,
  belongsToMunicipality,
  DepartmentController.getById,
);

/**
 * @swagger
 * /api/department/{departmentId}/stats:
 *   get:
 *     tags: [Department]
 *     summary: Get department statistics
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: departmentId
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
  "/:departmentId/stats",
  isMunicipalityStaff,
  belongsToMunicipality,
  DepartmentController.getStats,
);

/**
 * @swagger
 * /api/department:
 *   post:
 *     tags: [Department]
 *     summary: Create a new department
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
 *     responses:
 *       201:
 *         description: Created
 */
router.post(
  "/",
  isMunicipalityAdmin,
  auditLogger,
  validateBody(["name", "code"]),
  DepartmentController.create,
);

/**
 * @swagger
 * /api/department/reassign-staff:
 *   post:
 *     tags: [Department]
 *     summary: Reassign staff between departments
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fromDepartmentId
 *               - toDepartmentId
 *     responses:
 *       200:
 *         description: OK
 */
router.post(
  "/reassign-staff",
  isMunicipalityAdmin,
  auditLogger,
  validateBody(["fromDepartmentId", "toDepartmentId"]),
  DepartmentController.reassignStaff,
);

/**
 * @swagger
 * /api/department/{departmentId}:
 *   patch:
 *     tags: [Department]
 *     summary: Update a department
 *     security:
 *       - BearerAuth: []
 *     parameters:
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
  "/:departmentId",
  isMunicipalityAdmin,
  belongsToMunicipality,
  auditLogger,
  DepartmentController.update,
);

/**
 * @swagger
 * /api/department/{departmentId}:
 *   delete:
 *     tags: [Department]
 *     summary: Delete a department
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: departmentId
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
  "/:departmentId",
  isMunicipalityAdmin,
  belongsToMunicipality,
  auditLogger,
  DepartmentController.delete,
);

// ─── Municipality-scoped Department Routes ────────────────────────────────────

/**
 * All routes below follow: /municipalities/:municipalityId/departments/...
 */

/**
 * @swagger
 * /api/department/municipalities/{municipalityId}/departments:
 *   get:
 *     tags: [Department]
 *     summary: List departments for a municipality
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
  "/municipalities/:municipalityId/departments",
  isMunicipalityStaff,
  belongsToMunicipality,
  DepartmentController.list,
);

/**
 * @swagger
 * /api/department/municipalities/{municipalityId}/departments/select-list:
 *   get:
 *     tags: [Department]
 *     summary: Get municipal department dropdown list
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
  "/municipalities/:municipalityId/departments/select-list",
  isMunicipalityStaff,
  belongsToMunicipality,
  DepartmentController.getSelectList,
);

/**
 * @swagger
 * /api/department/municipalities/{municipalityId}/departments/export:
 *   get:
 *     tags: [Department]
 *     summary: Export municipal departments
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
  "/municipalities/:municipalityId/departments/export",
  isMunicipalityAdmin,
  belongsToMunicipality,
  DepartmentController.export,
);

/**
 * @swagger
 * /api/department/municipalities/{municipalityId}/departments/{departmentId}:
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
  "/municipalities/:municipalityId/departments/:departmentId",
  isMunicipalityStaff,
  belongsToMunicipality,
  DepartmentController.getById,
);

/**
 * @swagger
 * /api/department/municipalities/{municipalityId}/departments/{departmentId}/stats:
 *   get:
 *     tags: [Department]
 *     summary: Get department stats in a municipality
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
  "/municipalities/:municipalityId/departments/:departmentId/stats",
  isMunicipalityStaff,
  belongsToMunicipality,
  DepartmentController.getStats,
);

/**
 * @swagger
 * /api/department/municipalities/{municipalityId}/departments:
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
  "/municipalities/:municipalityId/departments",
  isMunicipalityAdmin,
  belongsToMunicipality,
  auditLogger,
  validateBody(["name", "code"]),
  DepartmentController.create,
);

/**
 * @swagger
 * /api/department/municipalities/{municipalityId}/departments/reassign-staff:
 *   post:
 *     tags: [Department]
 *     summary: Reassign department staff in a municipality
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
 *               - fromDepartmentId
 *               - toDepartmentId
 *     responses:
 *       200:
 *         description: OK
 */
router.post(
  "/municipalities/:municipalityId/departments/reassign-staff",
  isMunicipalityAdmin,
  belongsToMunicipality,
  auditLogger,
  validateBody(["fromDepartmentId", "toDepartmentId"]),
  DepartmentController.reassignStaff,
);

/**
 * @swagger
 * /api/department/municipalities/{municipalityId}/departments/{departmentId}:
 *   patch:
 *     tags: [Department]
 *     summary: Update a department in a municipality
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
  "/municipalities/:municipalityId/departments/:departmentId",
  isMunicipalityAdmin,
  belongsToMunicipality,
  auditLogger,
  DepartmentController.update,
);

/**
 * @swagger
 * /api/department/municipalities/{municipalityId}/departments/{departmentId}:
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
  "/municipalities/:municipalityId/departments/:departmentId",
  isMunicipalityAdmin,
  belongsToMunicipality,
  auditLogger,
  DepartmentController.delete,
);

// ─── Superadmin-only Department Routes ────────────────────────────────────────

/**
 * @swagger
 * /api/department/superadmin/departments:
 *   get:
 *     tags: [Department]
 *     summary: Superadmin list of departments
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 */
router.get("/superadmin/departments", isSuperadmin, DepartmentController.list);

/**
 * @swagger
 * /api/department/superadmin/departments/{departmentId}:
 *   get:
 *     tags: [Department]
 *     summary: Superadmin get department details
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
  "/superadmin/departments/:departmentId",
  isSuperadmin,
  DepartmentController.getById,
);

/**
 * @swagger
 * /api/department/superadmin/departments/{departmentId}/stats:
 *   get:
 *     tags: [Department]
 *     summary: Superadmin get department stats
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
  "/superadmin/departments/:departmentId/stats",
  isSuperadmin,
  DepartmentController.getStats,
);

/**
 * @swagger
 * /api/department/superadmin/departments/{departmentId}:
 *   patch:
 *     tags: [Department]
 *     summary: Superadmin update department
 *     security:
 *       - BearerAuth: []
 *     parameters:
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
  "/superadmin/departments/:departmentId",
  isSuperadmin,
  auditLogger,
  DepartmentController.update,
);

/**
 * @swagger
 * /api/department/superadmin/departments/{departmentId}:
 *   delete:
 *     tags: [Department]
 *     summary: Superadmin delete department
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
 *         description: Deleted
 */
router.delete(
  "/superadmin/departments/:departmentId",
  isSuperadmin,
  auditLogger,
  DepartmentController.delete,
);

export default router;

// ─── Route Summary ────────────────────────────────────────────────────────────
//
//  🔐 Municipality Staff (view only):
//  GET    /departments
//  GET    /departments/select-list
//  GET    /departments/:id
//  GET    /departments/:id/stats
//  GET    /municipalities/:id/departments
//  GET    /municipalities/:id/departments/select-list
//  GET    /municipalities/:id/departments/:deptId
//  GET    /municipalities/:id/departments/:deptId/stats
//
//  🔐 Municipality Admin (full CRUD):
//  GET    /departments/export
//  POST   /departments                                   [audited]
//  POST   /departments/reassign-staff                    [audited]
//  PATCH  /departments/:id                               [audited]
//  DELETE /departments/:id                               [audited]
//  POST   /municipalities/:id/departments                [audited]
//  POST   /municipalities/:id/departments/reassign-staff [audited]
//  PATCH  /municipalities/:id/departments/:deptId        [audited]
//  DELETE /municipalities/:id/departments/:deptId        [audited]
//
//  🔐 Superadmin (cross-municipality):
//  GET    /superadmin/departments
//  GET    /superadmin/departments/:id
//  GET    /superadmin/departments/:id/stats
//  PATCH  /superadmin/departments/:id                    [audited]
//  DELETE /superadmin/departments/:id                    [audited]
