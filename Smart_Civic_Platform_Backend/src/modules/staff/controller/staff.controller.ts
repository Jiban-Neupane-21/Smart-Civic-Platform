import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware';
import {
  StaffService,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from '../services/staff.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const asyncHandler =
  (fn: (req: AuthenticatedRequest, res: Response) => Promise<void>) =>
  (req: AuthenticatedRequest, res: Response): void => {
    fn(req, res).catch((err: unknown) => {
      if (
        err instanceof NotFoundError ||
        err instanceof ForbiddenError ||
        err instanceof ConflictError
      ) {
        res.status((err as { statusCode: number }).statusCode).json({
          success: false,
          message: err.message,
        });
        return;
      }
      console.error('[STAFF CONTROLLER ERROR]', err);
      res.status(500).json({ success: false, message: 'Internal server error.' });
    });
  };

const getPagination = (req: AuthenticatedRequest) => ({
  page: parseInt(req.query.page as string) || 1,
  limit: parseInt(req.query.limit as string) || 20,
  search: (req.query.search as string) || '',
  departmentId: (req.query.departmentId as string) || '',
  role: (req.query.role as string) || '',
  status: (req.query.status as string) || '',
});

// ─── Staff Controller ─────────────────────────────────────────────────────────

export class StaffController {
  /**
   * GET /staff
   * GET /municipalities/:municipalityId/staff
   * List all staff members with pagination and filters.
   * 
   * Query params:
   * - page: number (default: 1)
   * - limit: number (default: 20, max: 100)
   * - search: string (searches name/email)
   * - departmentId: string (filter by department)
   * - role: string (filter by role)
   * - status: string (filter by status: active/inactive)
   */
  static list = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const municipalityId = String(
      req.params.municipalityId || req.query.municipalityId || "",
    );
    const result = await StaffService.list(municipalityId, getPagination(req));
    res.json({ success: true, data: result });
  });

  /**
   * GET /staff/:staffId
   * GET /municipalities/:municipalityId/staff/:staffId
   * Get detailed information about a specific staff member.
   */
  static getById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const municipalityId = String(
      req.params.municipalityId || req.query.municipalityId || "",
    );
    const staff = await StaffService.getById(
      String(req.params.staffId),
      municipalityId
    );
    res.json({ success: true, data: staff });
  });

  /**
   * POST /staff
   * POST /municipalities/:municipalityId/staff
   * Create a new staff account.
   * 
   * Body: {
   *   name: string,
   *   email: string,
   *   password: string,
   *   role: 'municipality_admin' | 'department_head' | 'municipality_staff' | 'department_staff',
   *   departmentId: string,
   *   phone?: string,
   *   designation?: string,
   *   address?: string
   * }
   */
  static create = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const municipalityId = req.params.municipalityId || req.body.municipalityId;
    const staff = await StaffService.create({
      ...req.body,
      municipalityId,
      createdBy: req.user!.userId,
    });
    res.status(201).json({ 
      success: true, 
      message: 'Staff account created successfully.', 
      data: staff 
    });
  });

  /**
   * PATCH /staff/:staffId
   * PATCH /municipalities/:municipalityId/staff/:staffId
   * Update staff profile information.
   * 
   * Body: {
   *   name?: string,
   *   phone?: string,
   *   designation?: string,
   *   address?: string,
   *   departmentId?: string,
   *   role?: string (only superadmin can change role)
   * }
   */
  static update = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const municipalityId = req.params.municipalityId || req.body.municipalityId;
    const staff = await StaffService.update(
      String(req.params.staffId),
      municipalityId,
      req.body,
      req.user!
    );
    res.json({ 
      success: true, 
      message: 'Staff profile updated successfully.', 
      data: staff 
    });
  });

  /**
   * PATCH /staff/:staffId/status
   * PATCH /municipalities/:municipalityId/staff/:staffId/status
   * Activate or deactivate a staff member.
   * 
   * Body: { status: 'active' | 'inactive', reason?: string }
   */
  static updateStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const municipalityId = req.params.municipalityId || req.body.municipalityId;
    const staff = await StaffService.updateStatus(
      String(req.params.staffId),
      municipalityId,
      req.body.status,
      req.body.reason,
      req.user!.userId
    );
    res.json({ 
      success: true, 
      message: `Staff status updated to '${req.body.status}'.`, 
      data: staff 
    });
  });

  /**
   * POST /staff/:staffId/reset-password
   * POST /municipalities/:municipalityId/staff/:staffId/reset-password
   * Reset staff password (admin-initiated).
   * 
   * Body: { newPassword?: string } (if not provided, generates random password)
   */
  static resetPassword = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const municipalityId = req.params.municipalityId || req.body.municipalityId;
    const result = await StaffService.resetPassword(
      String(req.params.staffId),
      municipalityId,
      req.body.newPassword,
      req.user!.userId
    );
    res.json({ 
      success: true, 
      message: 'Password reset successfully.', 
      data: result 
    });
  });

  /**
   * DELETE /staff/:staffId
   * DELETE /municipalities/:municipalityId/staff/:staffId
   * Permanently remove a staff member (soft delete by default).
   * 
   * Query param: ?permanent=true for hard delete
   */
  static delete = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const municipalityId = String(
      req.params.municipalityId || req.query.municipalityId || "",
    );
    const permanent = req.query.permanent === 'true';
    
    const result = await StaffService.delete(
      String(req.params.staffId),
      municipalityId,
      permanent,
      req.user!.userId
    );
    
    res.json({ 
      success: true, 
      message: permanent ? 'Staff member permanently deleted.' : 'Staff member deactivated.', 
      data: result 
    });
  });

  /**
   * GET /staff/:staffId/audit-logs
   * GET /municipalities/:municipalityId/staff/:staffId/audit-logs
   * Get audit trail for a specific staff member.
   */
  static getAuditLogs = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const municipalityId = String(
      req.params.municipalityId || req.query.municipalityId || "",
    );
    const result = await StaffService.getAuditLogs(
      String(req.params.staffId),
      municipalityId,
      getPagination(req)
    );
    res.json({ success: true, data: result });
  });

  /**
   * GET /staff/me
   * Get currently logged-in staff profile.
   */
  static getMe = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const staff = await StaffService.getByProfileId(req.user!.userId);
    res.json({ success: true, data: staff });
  });

  static listByDepartment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await StaffService.listByDepartment(
      String(req.params.departmentId),
      getPagination(req),
    );
    res.json({ success: true, data: result });
  });

  static listAll = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await StaffService.listAll(getPagination(req));
    res.json({ success: true, data: result });
  });

  static changeRole = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const staff = await StaffService.changeRole(
      String(req.params.staffId),
      req.body.role,
      req.body.municipalityId,
      req.user!.userId,
    );
    res.json({ success: true, message: 'Role updated.', data: staff });
  });

  static deletePermanent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await StaffService.deletePermanent(
      String(req.params.staffId),
      req.user!.userId,
    );
    res.json({ success: true, message: 'Staff permanently deleted.', data: result });
  });

  /**
   * PATCH /staff/me
   * Update own profile (limited fields).
   * 
   * Body: { name?: string, phone?: string, address?: string }
   */
  static updateMe = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const allowedFields = ['name', 'phone', 'address'];
    const updateData: any = {};
    
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }
    
    const staff = await StaffService.update(
      req.user!.userId,
      req.user!.municipalityId!,
      updateData,
      req.user!
    );
    
    res.json({ 
      success: true, 
      message: 'Profile updated successfully.', 
      data: staff 
    });
  });

  /**
   * POST /staff/change-password
   * Staff member changes their own password.
   * 
   * Body: { currentPassword: string, newPassword: string }
   */
  static changePassword = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    await StaffService.changePassword(
      req.user!.userId,
      req.body.currentPassword,
      req.body.newPassword
    );
    
    res.json({ 
      success: true, 
      message: 'Password changed successfully.' 
    });
  });

  /**
   * GET /staff/export
   * GET /municipalities/:municipalityId/staff/export
   * Export staff list as CSV/Excel.
   * 
   * Query param: ?format=csv (default) | excel
   */
  static export = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const municipalityId = String(
      req.params.municipalityId || req.query.municipalityId || "",
    );
    const format = req.query.format as string || 'csv';
    const filters = getPagination(req);
    
    const exportData = await StaffService.export(String(municipalityId), filters);
    
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=staff_export_${Date.now()}.csv`);
      res.send(exportData);
    } else {
      res.json({ success: true, data: exportData });
    }
  });
}

export default StaffController;