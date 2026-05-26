import { Router } from 'express';
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
} from '../middleware';
import {
  MunicipalityController,
  DepartmentController,
  StaffController,
  ComplaintController,
  NoticeController,
  AuditLogController,
} from '../controller';

const router = Router();

// ─── Global Middleware ────────────────────────────────────────────────────────

router.use(requestLogger);

// ─── Municipality (superadmin-managed) ───────────────────────────────────────

/**
 * GET  /municipalities              → list all (superadmin)
 * POST /municipalities              → create (superadmin)
 */
router.get(
  '/',
  municipalityRateLimiter,
  authenticate,
  isMunicipalityAdmin,
  MunicipalityController.list
);

router.post(
  '/',
  municipalityRateLimiter,
  authenticate,
  isMunicipalityAdmin,
  auditLogger,
  validateBody(['name', 'code', 'email', 'province', 'district', 'address']),
  MunicipalityController.create
);

/**
 * GET    /municipalities/:municipalityId          → get details
 * PATCH  /municipalities/:municipalityId          → update
 * DELETE /municipalities/:municipalityId          → delete (superadmin)
 */
router.get(
  '/:municipalityId',
  municipalityRateLimiter,
  authenticate,
  isMunicipalityStaff,
  belongsToMunicipality,
  MunicipalityController.getById
);

router.patch(
  '/:municipalityId',
  municipalityRateLimiter,
  authenticate,
  isMunicipalityAdmin,
  belongsToMunicipality,
  auditLogger,
  MunicipalityController.update
);

router.delete(
  '/:municipalityId',
  municipalityRateLimiter,
  authenticate,
  isMunicipalityAdmin,
  auditLogger,
  MunicipalityController.delete
);

/**
 * GET /municipalities/:municipalityId/stats
 */
router.get(
  '/:municipalityId/stats',
  municipalityRateLimiter,
  authenticate,
  isMunicipalityStaff,
  belongsToMunicipality,
  MunicipalityController.stats
);

// ─── Departments ──────────────────────────────────────────────────────────────

/**
 * GET  /municipalities/:municipalityId/departments
 * POST /municipalities/:municipalityId/departments
 */
router.get(
  '/:municipalityId/departments',
  municipalityRateLimiter,
  authenticate,
  isMunicipalityStaff,
  belongsToMunicipality,
  DepartmentController.list
);

router.post(
  '/:municipalityId/departments',
  municipalityRateLimiter,
  authenticate,
  isMunicipalityAdmin,
  belongsToMunicipality,
  auditLogger,
  validateBody(['name', 'code']),
  DepartmentController.create
);

/**
 * GET    /municipalities/:municipalityId/departments/:departmentId
 * PATCH  /municipalities/:municipalityId/departments/:departmentId
 * DELETE /municipalities/:municipalityId/departments/:departmentId
 */
router.get(
  '/:municipalityId/departments/:departmentId',
  municipalityRateLimiter,
  authenticate,
  isMunicipalityStaff,
  belongsToMunicipality,
  DepartmentController.getById
);

router.patch(
  '/:municipalityId/departments/:departmentId',
  municipalityRateLimiter,
  authenticate,
  isMunicipalityAdmin,
  belongsToMunicipality,
  auditLogger,
  DepartmentController.update
);

router.delete(
  '/:municipalityId/departments/:departmentId',
  municipalityRateLimiter,
  authenticate,
  isMunicipalityAdmin,
  belongsToMunicipality,
  auditLogger,
  DepartmentController.delete
);

// ─── Staff ────────────────────────────────────────────────────────────────────

/**
 * GET  /municipalities/:municipalityId/staff
 * POST /municipalities/:municipalityId/staff
 */
router.get(
  '/:municipalityId/staff',
  municipalityRateLimiter,
  authenticate,
  isMunicipalityAdmin,
  belongsToMunicipality,
  StaffController.list
);

router.post(
  '/:municipalityId/staff',
  municipalityRateLimiter,
  authenticate,
  isMunicipalityAdmin,
  belongsToMunicipality,
  auditLogger,
  validateBody(['name', 'email', 'password', 'role', 'departmentId']),
  StaffController.create
);

/**
 * PATCH  /municipalities/:municipalityId/staff/:staffId/status
 * DELETE /municipalities/:municipalityId/staff/:staffId
 */
router.patch(
  '/:municipalityId/staff/:staffId/status',
  municipalityRateLimiter,
  authenticate,
  isMunicipalityAdmin,
  belongsToMunicipality,
  auditLogger,
  validateBody(['status']),
  StaffController.updateStatus
);

router.delete(
  '/:municipalityId/staff/:staffId',
  municipalityRateLimiter,
  authenticate,
  isMunicipalityAdmin,
  belongsToMunicipality,
  auditLogger,
  StaffController.delete
);

// ─── Complaints ───────────────────────────────────────────────────────────────

/**
 * GET  /municipalities/:municipalityId/complaints          ?status= ?departmentId=
 * POST /municipalities/:municipalityId/complaints
 */
router.get(
  '/:municipalityId/complaints',
  municipalityRateLimiter,
  authenticate,
  isMunicipalityStaff,
  belongsToMunicipality,
  ComplaintController.list
);

router.post(
  '/:municipalityId/complaints',
  publicRateLimiter,                  // citizens submit complaints — lighter auth
  authenticate,
  validateBody(['citizenId', 'category', 'title', 'description']),
  ComplaintController.create
);

/**
 * GET   /municipalities/:municipalityId/complaints/:complaintId
 * PATCH /municipalities/:municipalityId/complaints/:complaintId
 */
router.get(
  '/:municipalityId/complaints/:complaintId',
  municipalityRateLimiter,
  authenticate,
  isMunicipalityStaff,
  belongsToMunicipality,
  ComplaintController.getById
);

router.patch(
  '/:municipalityId/complaints/:complaintId',
  municipalityRateLimiter,
  authenticate,
  isMunicipalityStaff,
  belongsToMunicipality,
  auditLogger,
  ComplaintController.update
);

// ─── Notices (announcements table) ────────────────────────────────────────────

/**
 * GET  /municipalities/:municipalityId/notices     → public   ?category=
 * POST /municipalities/:municipalityId/notices     → staff+
 */
router.get(
  '/:municipalityId/notices',
  publicRateLimiter,
  NoticeController.list                              // public — citizens can read notices
);

router.get(
  '/:municipalityId/notices/:noticeId',
  publicRateLimiter,
  NoticeController.getById                           // public
);

router.post(
  '/:municipalityId/notices',
  municipalityRateLimiter,
  authenticate,
  isMunicipalityStaff,
  belongsToMunicipality,
  auditLogger,
  validateBody(['title', 'body', 'category']),
  NoticeController.create
);

router.patch(
  '/:municipalityId/notices/:noticeId',
  municipalityRateLimiter,
  authenticate,
  isMunicipalityStaff,
  belongsToMunicipality,
  auditLogger,
  NoticeController.update
);

router.delete(
  '/:municipalityId/notices/:noticeId',
  municipalityRateLimiter,
  authenticate,
  isMunicipalityAdmin,
  belongsToMunicipality,
  auditLogger,
  NoticeController.delete
);

// ─── Audit Logs ───────────────────────────────────────────────────────────────

/**
 * GET /municipalities/:municipalityId/audit-logs
 */
router.get(
  '/:municipalityId/audit-logs',
  municipalityRateLimiter,
  authenticate,
  isMunicipalityAdmin,
  belongsToMunicipality,
  AuditLogController.list
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