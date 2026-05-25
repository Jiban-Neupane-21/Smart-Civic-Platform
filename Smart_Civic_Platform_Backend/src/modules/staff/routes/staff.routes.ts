import { Router } from 'express';
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
} from '../middleware';
import { StaffController } from '../controller/staff.controller';

const router = Router();

// ─── Global Middleware (applied to ALL staff routes) ─────────────────────────

router.use(requestLogger);
router.use(municipalityRateLimiter);
router.use(authenticate);

// ─── Self-service routes (staff managing their own account) ──────────────────
// These don't require municipalityId in URL - extracted from JWT

/**
 * GET /staff/me
 * Get currently logged-in staff member's profile.
 */
router.get('/me', isMunicipalityStaff, StaffController.getMe);

/**
 * PATCH /staff/me
 * Update own profile (limited fields: name, phone, address).
 */
router.patch(
  '/me',
  isMunicipalityStaff,
  validateBody([]), // empty array = no required fields, but validates body exists
  StaffController.updateMe
);

/**
 * POST /staff/change-password
 * Staff member changes their own password.
 * Body: { currentPassword: string, newPassword: string }
 */
router.post(
  '/change-password',
  isMunicipalityStaff,
  validateBody(['currentPassword', 'newPassword']),
  StaffController.changePassword
);

// ─── Standalone Staff Routes (municipalityId from query) ─────────────────────

/**
 * GET /staff?municipalityId=xxx&page=1&limit=20&search=&departmentId=&role=&status=
 * List all staff members (admin only).
 */
router.get(
  '/',
  isMunicipalityAdmin,
  StaffController.list
);

/**
 * GET /staff/export?municipalityId=xxx&format=csv
 * Export staff list to CSV/Excel (admin only).
 */
router.get(
  '/export',
  isMunicipalityAdmin,
  StaffController.export
);

/**
 * GET /staff/:staffId?municipalityId=xxx
 * Get detailed information about a specific staff member.
 */
router.get(
  '/:staffId',
  isMunicipalityStaff,
  belongsToMunicipality,
  StaffController.getById
);

/**
 * POST /staff?municipalityId=xxx
 * Create a new staff account (admin only).
 * Body: { name, email, password, role, departmentId, phone?, designation?, address? }
 */
router.post(
  '/',
  isMunicipalityAdmin,
  auditLogger,
  validateBody(['name', 'email', 'password', 'role', 'departmentId']),
  StaffController.create
);

/**
 * PATCH /staff/:staffId
 * Update staff profile (admin only).
 * Body: { name?, phone?, designation?, address?, departmentId?, role? }
 */
router.patch(
  '/:staffId',
  isMunicipalityAdmin,
  belongsToMunicipality,
  auditLogger,
  StaffController.update
);

/**
 * PATCH /staff/:staffId/status
 * Activate or deactivate a staff member.
 * Body: { status: 'active' | 'inactive', reason?: string }
 */
router.patch(
  '/:staffId/status',
  isMunicipalityAdmin,
  belongsToMunicipality,
  auditLogger,
  validateBody(['status']),
  StaffController.updateStatus
);

/**
 * POST /staff/:staffId/reset-password
 * Reset staff password (admin initiated).
 * Body: { newPassword?: string }
 */
router.post(
  '/:staffId/reset-password',
  isMunicipalityAdmin,
  belongsToMunicipality,
  auditLogger,
  StaffController.resetPassword
);

/**
 * GET /staff/:staffId/audit-logs?page=1&limit=20
 * Get audit trail for a specific staff member.
 */
router.get(
  '/:staffId/audit-logs',
  isMunicipalityAdmin,
  belongsToMunicipality,
  StaffController.getAuditLogs
);

/**
 * DELETE /staff/:staffId?permanent=false
 * Remove a staff member (soft delete by default).
 */
router.delete(
  '/:staffId',
  isMunicipalityAdmin,
  belongsToMunicipality,
  auditLogger,
  StaffController.delete
);

// ─── Municipality-scoped Staff Routes (municipalityId in URL) ────────────────

/**
 * All routes below follow the pattern:
 * /municipalities/:municipalityId/staff/...
 */

/**
 * GET /municipalities/:municipalityId/staff
 * List all staff members in a municipality.
 */
router.get(
  '/municipalities/:municipalityId/staff',
  isMunicipalityStaff,
  belongsToMunicipality,
  StaffController.list
);

/**
 * GET /municipalities/:municipalityId/staff/export
 * Export staff list for a municipality.
 */
router.get(
  '/municipalities/:municipalityId/staff/export',
  isMunicipalityAdmin,
  belongsToMunicipality,
  StaffController.export
);

/**
 * GET /municipalities/:municipalityId/staff/:staffId
 * Get specific staff member in a municipality.
 */
router.get(
  '/municipalities/:municipalityId/staff/:staffId',
  isMunicipalityStaff,
  belongsToMunicipality,
  StaffController.getById
);

/**
 * POST /municipalities/:municipalityId/staff
 * Create new staff account in a municipality.
 */
router.post(
  '/municipalities/:municipalityId/staff',
  isMunicipalityAdmin,
  belongsToMunicipality,
  auditLogger,
  validateBody(['name', 'email', 'password', 'role', 'departmentId']),
  StaffController.create
);

/**
 * PATCH /municipalities/:municipalityId/staff/:staffId
 * Update staff profile in a municipality.
 */
router.patch(
  '/municipalities/:municipalityId/staff/:staffId',
  isMunicipalityAdmin,
  belongsToMunicipality,
  auditLogger,
  StaffController.update
);

/**
 * PATCH /municipalities/:municipalityId/staff/:staffId/status
 * Update staff status.
 */
router.patch(
  '/municipalities/:municipalityId/staff/:staffId/status',
  isMunicipalityAdmin,
  belongsToMunicipality,
  auditLogger,
  validateBody(['status']),
  StaffController.updateStatus
);

/**
 * POST /municipalities/:municipalityId/staff/:staffId/reset-password
 * Reset staff password.
 */
router.post(
  '/municipalities/:municipalityId/staff/:staffId/reset-password',
  isMunicipalityAdmin,
  belongsToMunicipality,
  auditLogger,
  StaffController.resetPassword
);

/**
 * GET /municipalities/:municipalityId/staff/:staffId/audit-logs
 * Get staff audit logs.
 */
router.get(
  '/municipalities/:municipalityId/staff/:staffId/audit-logs',
  isMunicipalityAdmin,
  belongsToMunicipality,
  StaffController.getAuditLogs
);

/**
 * DELETE /municipalities/:municipalityId/staff/:staffId
 * Delete staff member.
 */
router.delete(
  '/municipalities/:municipalityId/staff/:staffId',
  isMunicipalityAdmin,
  belongsToMunicipality,
  auditLogger,
  StaffController.delete
);

// ─── Department-scoped Staff Routes (restricted to department access) ────────

/**
 * GET /departments/:departmentId/staff
 * List staff members in a specific department (department staff can view their own department).
 */
router.get(
  '/departments/:departmentId/staff',
  isMunicipalityStaff,
  belongsToDepartment,
  StaffController.listByDepartment
);

/**
 * GET /departments/:departmentId/staff/:staffId
 * Get staff member in a department.
 */
router.get(
  '/departments/:departmentId/staff/:staffId',
  isMunicipalityStaff,
  belongsToDepartment,
  StaffController.getById
);

/**
 * GET /departments/:departmentId/staff/export
 * Export staff list for a department.
 */
router.get(
  '/departments/:departmentId/staff/export',
  isMunicipalityAdmin,
  belongsToMunicipality,
  StaffController.export
);

// ─── Superadmin-only Staff Routes ────────────────────────────────────────────

/**
 * GET /superadmin/staff
 * Superadmin can view all staff across all municipalities.
 */
router.get(
  '/superadmin/staff',
  isSuperadmin,
  StaffController.listAll
);

/**
 * GET /superadmin/staff/:staffId
 * Superadmin can view any staff member.
 */
router.get(
  '/superadmin/staff/:staffId',
  isSuperadmin,
  StaffController.getById
);

/**
 * PATCH /superadmin/staff/:staffId/role
 * Superadmin can change staff role across municipalities.
 * Body: { role: string, municipalityId?: string }
 */
router.patch(
  '/superadmin/staff/:staffId/role',
  isSuperadmin,
  auditLogger,
  validateBody(['role']),
  StaffController.changeRole
);

/**
 * DELETE /superadmin/staff/:staffId
 * Superadmin can permanently delete any staff member.
 */
router.delete(
  '/superadmin/staff/:staffId',
  isSuperadmin,
  auditLogger,
  StaffController.deletePermanent
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