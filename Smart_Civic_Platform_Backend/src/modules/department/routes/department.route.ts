import { Router } from 'express';
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
} from '../middleware';
import { DepartmentController } from '../controller/department.controller';

const router = Router();

// ─── Global Middleware ────────────────────────────────────────────────────────

router.use(requestLogger);
router.use(municipalityRateLimiter);
router.use(authenticate);

// ─── Standalone Department Routes ─────────────────────────────────────────────

/**
 * GET /departments?municipalityId=xxx&page=1&limit=20&search=
 * List all departments (staff+ can view)
 */
router.get(
  '/',
  isMunicipalityStaff,
  DepartmentController.list
);

/**
 * GET /departments/select-list?municipalityId=xxx
 * Get simplified list for dropdowns (staff+ can view)
 */
router.get(
  '/select-list',
  isMunicipalityStaff,
  DepartmentController.getSelectList
);

/**
 * GET /departments/export?municipalityId=xxx&format=csv
 * Export departments (admin only)
 */
router.get(
  '/export',
  isMunicipalityAdmin,
  DepartmentController.export
);

/**
 * GET /departments/:departmentId?municipalityId=xxx
 * Get department details (staff+ can view)
 */
router.get(
  '/:departmentId',
  isMunicipalityStaff,
  belongsToMunicipality,
  DepartmentController.getById
);

/**
 * GET /departments/:departmentId/stats
 * Get department statistics (staff+ can view)
 */
router.get(
  '/:departmentId/stats',
  isMunicipalityStaff,
  belongsToMunicipality,
  DepartmentController.getStats
);

/**
 * POST /departments
 * Create new department (admin only)
 * Body: { municipalityId, name, code, description?, headName?, headEmail?, headPhone? }
 */
router.post(
  '/',
  isMunicipalityAdmin,
  auditLogger,
  validateBody(['name', 'code']),
  DepartmentController.create
);

/**
 * POST /departments/reassign-staff
 * Reassign staff from one department to another (admin only)
 * Body: { municipalityId, fromDepartmentId, toDepartmentId }
 */
router.post(
  '/reassign-staff',
  isMunicipalityAdmin,
  auditLogger,
  validateBody(['fromDepartmentId', 'toDepartmentId']),
  DepartmentController.reassignStaff
);

/**
 * PATCH /departments/:departmentId
 * Update department (admin only)
 */
router.patch(
  '/:departmentId',
  isMunicipalityAdmin,
  belongsToMunicipality,
  auditLogger,
  DepartmentController.update
);

/**
 * DELETE /departments/:departmentId?permanent=false
 * Delete department (admin only)
 */
router.delete(
  '/:departmentId',
  isMunicipalityAdmin,
  belongsToMunicipality,
  auditLogger,
  DepartmentController.delete
);

// ─── Municipality-scoped Department Routes ────────────────────────────────────

/**
 * All routes below follow: /municipalities/:municipalityId/departments/...
 */

/**
 * GET /municipalities/:municipalityId/departments
 * List departments in a municipality
 */
router.get(
  '/municipalities/:municipalityId/departments',
  isMunicipalityStaff,
  belongsToMunicipality,
  DepartmentController.list
);

/**
 * GET /municipalities/:municipalityId/departments/select-list
 * Get dropdown list
 */
router.get(
  '/municipalities/:municipalityId/departments/select-list',
  isMunicipalityStaff,
  belongsToMunicipality,
  DepartmentController.getSelectList
);

/**
 * GET /municipalities/:municipalityId/departments/export
 * Export departments
 */
router.get(
  '/municipalities/:municipalityId/departments/export',
  isMunicipalityAdmin,
  belongsToMunicipality,
  DepartmentController.export
);

/**
 * GET /municipalities/:municipalityId/departments/:departmentId
 * Get department details
 */
router.get(
  '/municipalities/:municipalityId/departments/:departmentId',
  isMunicipalityStaff,
  belongsToMunicipality,
  DepartmentController.getById
);

/**
 * GET /municipalities/:municipalityId/departments/:departmentId/stats
 * Get department stats
 */
router.get(
  '/municipalities/:municipalityId/departments/:departmentId/stats',
  isMunicipalityStaff,
  belongsToMunicipality,
  DepartmentController.getStats
);

/**
 * POST /municipalities/:municipalityId/departments
 * Create department
 */
router.post(
  '/municipalities/:municipalityId/departments',
  isMunicipalityAdmin,
  belongsToMunicipality,
  auditLogger,
  validateBody(['name', 'code']),
  DepartmentController.create
);

/**
 * POST /municipalities/:municipalityId/departments/reassign-staff
 * Reassign staff
 */
router.post(
  '/municipalities/:municipalityId/departments/reassign-staff',
  isMunicipalityAdmin,
  belongsToMunicipality,
  auditLogger,
  validateBody(['fromDepartmentId', 'toDepartmentId']),
  DepartmentController.reassignStaff
);

/**
 * PATCH /municipalities/:municipalityId/departments/:departmentId
 * Update department
 */
router.patch(
  '/municipalities/:municipalityId/departments/:departmentId',
  isMunicipalityAdmin,
  belongsToMunicipality,
  auditLogger,
  DepartmentController.update
);

/**
 * DELETE /municipalities/:municipalityId/departments/:departmentId
 * Delete department
 */
router.delete(
  '/municipalities/:municipalityId/departments/:departmentId',
  isMunicipalityAdmin,
  belongsToMunicipality,
  auditLogger,
  DepartmentController.delete
);

// ─── Superadmin-only Department Routes ────────────────────────────────────────

/**
 * GET /superadmin/departments
 * Superadmin can view all departments across all municipalities
 */
router.get(
  '/superadmin/departments',
  isSuperadmin,
  DepartmentController.list
);

/**
 * GET /superadmin/departments/:departmentId
 * Superadmin can view any department
 */
router.get(
  '/superadmin/departments/:departmentId',
  isSuperadmin,
  DepartmentController.getById
);

/**
 * GET /superadmin/departments/:departmentId/stats
 * Superadmin can view any department stats
 */
router.get(
  '/superadmin/departments/:departmentId/stats',
  isSuperadmin,
  DepartmentController.getStats
);

/**
 * PATCH /superadmin/departments/:departmentId
 * Superadmin can update any department
 */
router.patch(
  '/superadmin/departments/:departmentId',
  isSuperadmin,
  auditLogger,
  DepartmentController.update
);

/**
 * DELETE /superadmin/departments/:departmentId
 * Superadmin can delete any department
 */
router.delete(
  '/superadmin/departments/:departmentId',
  isSuperadmin,
  auditLogger,
  DepartmentController.delete
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