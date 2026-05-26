import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware';
import {
  MunicipalityService,
  DepartmentService,
  StaffService,
  ComplaintService,
  NoticeService,
  AuditLogService,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from '../services/municipality.service';

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
      console.error('[MUNICIPALITY CONTROLLER ERROR]', err);
      res.status(500).json({ success: false, message: 'Internal server error.' });
    });
  };

const param = (value: string | string[] | undefined) =>
  String(Array.isArray(value) ? value[0] : value ?? "");

const getPagination = (req: AuthenticatedRequest) => ({
  page: parseInt(req.query.page as string) || 1,
  limit: parseInt(req.query.limit as string) || 20,
  search: (req.query.search as string) || '',
});

// ─── Municipality Controller ──────────────────────────────────────────────────

export class MunicipalityController {
  /**
   * GET /municipalities
   * List all municipalities (superadmin view).
   */
  static list = asyncHandler(async (req, res) => {
    const result = await MunicipalityService.list(getPagination(req));
    res.json({ success: true, data: result });
  });

  /**
   * GET /municipalities/:municipalityId
   * Get full profile of a municipality including department list.
   */
  static getById = asyncHandler(async (req, res) => {
    const muni = await MunicipalityService.getById(param(req.params.municipalityId));
    res.json({ success: true, data: muni });
  });

  /**
   * POST /municipalities
   * Create a new municipality (superadmin only).
   * Body: { name, code, province, district, address, type, ... }
   */
  static create = asyncHandler(async (req, res) => {
    const muni = await MunicipalityService.create(req.body);
    res.status(201).json({ success: true, message: 'Municipality created.', data: muni });
  });

  /**
   * PATCH /municipalities/:municipalityId
   * Update municipality details.
   */
  static update = asyncHandler(async (req, res) => {
    const muni = await MunicipalityService.update(param(req.params.municipalityId), req.body);
    res.json({ success: true, message: 'Municipality updated.', data: muni });
  });

  /**
   * DELETE /municipalities/:municipalityId
   * Delete a municipality (superadmin only).
   */
  static delete = asyncHandler(async (req, res) => {
    const result = await MunicipalityService.delete(param(req.params.municipalityId));
    res.json({ success: true, message: 'Municipality deleted.', data: result });
  });

  /**
   * GET /municipalities/:municipalityId/stats
   * Dashboard statistics for a municipality.
   */
  static stats = asyncHandler(async (req, res) => {
    const stats = await MunicipalityService.getStats(param(req.params.municipalityId));
    res.json({ success: true, data: stats });
  });
}

// ─── Department Controller ────────────────────────────────────────────────────

export class DepartmentController {
  /**
   * GET /municipalities/:municipalityId/departments
   * List all departments in a municipality.
   */
  static list = asyncHandler(async (req, res) => {
    const departments = await DepartmentService.listByMunicipality(param(req.params.municipalityId));
    res.json({ success: true, data: departments });
  });

  /**
   * GET /municipalities/:municipalityId/departments/:departmentId
   * Get a single department with staff list.
   */
  static getById = asyncHandler(async (req, res) => {
    const dept = await DepartmentService.getById(param(req.params.departmentId), param(req.params.municipalityId));
    res.json({ success: true, data: dept });
  });

  /**
   * POST /municipalities/:municipalityId/departments
   * Create a new department.
   * Body: { name, code, description?, headName?, headEmail?, headPhone? }
   */
  static create = asyncHandler(async (req, res) => {
    const dept = await DepartmentService.create({
      ...req.body,
      municipalityId: param(req.params.municipalityId),
    });
    res.status(201).json({ success: true, message: 'Department created.', data: dept });
  });

  /**
   * PATCH /municipalities/:municipalityId/departments/:departmentId
   * Update department details.
   */
  static update = asyncHandler(async (req, res) => {
    const dept = await DepartmentService.update(
      param(req.params.departmentId),
      param(req.params.municipalityId),
      req.body
    );
    res.json({ success: true, message: 'Department updated.', data: dept });
  });

  /**
   * DELETE /municipalities/:municipalityId/departments/:departmentId
   * Delete a department.
   */
  static delete = asyncHandler(async (req, res) => {
    const result = await DepartmentService.delete(param(req.params.departmentId), param(req.params.municipalityId));
    res.json({ success: true, message: 'Department deleted.', data: result });
  });
}

// ─── Staff Controller ─────────────────────────────────────────────────────────

export class StaffController {
  /**
   * GET /municipalities/:municipalityId/staff
   * Paginated list of all staff in a municipality.
   */
  static list = asyncHandler(async (req, res) => {
    const result = await StaffService.listByMunicipality(param(req.params.municipalityId), getPagination(req));
    res.json({ success: true, data: result });
  });

  /**
   * POST /municipalities/:municipalityId/staff
   * Create a new staff account.
   * Body: { name, email, password, role, departmentId, designation? }
   */
  static create = asyncHandler(async (req, res) => {
    const staff = await StaffService.create({
      ...req.body,
      municipalityId: param(req.params.municipalityId),
    });
    res.status(201).json({ success: true, message: 'Staff account created.', data: staff });
  });

  /**
   * PATCH /municipalities/:municipalityId/staff/:staffId/status
   * Activate or deactivate a staff member.
   * Body: { status: 'active' | 'inactive' }
   */
  static updateStatus = asyncHandler(async (req, res) => {
    const staff = await StaffService.updateStatus(
      param(req.params.staffId),
      param(req.params.municipalityId),
      req.body.status
    );
    res.json({ success: true, message: `Staff status updated to '${req.body.status}'.`, data: staff });
  });

  /**
   * DELETE /municipalities/:municipalityId/staff/:staffId
   * Remove a staff member.
   */
  static delete = asyncHandler(async (req, res) => {
    const result = await StaffService.delete(param(req.params.staffId), param(req.params.municipalityId));
    res.json({ success: true, message: 'Staff member removed.', data: result });
  });
}

// ─── Complaint Controller ─────────────────────────────────────────────────────

export class ComplaintController {
  /**
   * GET /municipalities/:municipalityId/complaints
   * Paginated list of complaints. Filter by ?status= or ?departmentId=
   */
  static list = asyncHandler(async (req, res) => {
    const result = await ComplaintService.list(param(req.params.municipalityId), {
      ...getPagination(req),
      status: req.query.status as string,
      departmentId: req.query.departmentId as string,
    });
    res.json({ success: true, data: result });
  });

  /**
   * GET /municipalities/:municipalityId/complaints/:complaintId
   * Full complaint details with timeline.
   */
  static getById = asyncHandler(async (req, res) => {
    const complaint = await ComplaintService.getById(param(req.params.complaintId), param(req.params.municipalityId));
    res.json({ success: true, data: complaint });
  });

  /**
   * POST /municipalities/:municipalityId/complaints
   * Submit a new complaint (typically called from citizen-facing API).
   * Body: { citizenId, category, title, description, location?, wardNo?, attachments? }
   */
  static create = asyncHandler(async (req, res) => {
    const complaint = await ComplaintService.create({
      ...req.body,
      municipalityId: param(req.params.municipalityId),
    });
    res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully.',
      data: complaint,
    });
  });

  /**
   * PATCH /municipalities/:municipalityId/complaints/:complaintId
   * Update complaint status, assign staff, or add resolution note.
   * Body: { status?, assignedTo?, resolutionNote?, priority? }
   */
  static update = asyncHandler(async (req, res) => {
    const complaint = await ComplaintService.update(
      param(req.params.complaintId),
      param(req.params.municipalityId),
      req.body,
      req.user!.userId
    );
    res.json({ success: true, message: 'Complaint updated.', data: complaint });
  });
}

// ─── Notice Controller (announcements table) ──────────────────────────────────

export class NoticeController {
  /**
   * GET /municipalities/:municipalityId/notices
   * Paginated notice list. Filter by ?category=
   */
  static list = asyncHandler(async (req, res) => {
    const result = await NoticeService.list(param(req.params.municipalityId), {
      ...getPagination(req),
      category: req.query.category as string,
    });
    res.json({ success: true, data: result });
  });

  /**
   * GET /municipalities/:municipalityId/notices/:noticeId
   * Get a single notice.
   */
  static getById = asyncHandler(async (req, res) => {
    const notice = await NoticeService.getById(param(req.params.noticeId), param(req.params.municipalityId));
    res.json({ success: true, data: notice });
  });

  /**
   * POST /municipalities/:municipalityId/notices
   * Publish a new notice.
   * Body: { title, body, category, expiresAt?, attachments? }
   */
  static create = asyncHandler(async (req, res) => {
    const notice = await NoticeService.create({
      ...req.body,
      municipalityId: param(req.params.municipalityId),
      publishedBy: req.user!.userId,
    });
    res.status(201).json({ success: true, message: 'Notice published.', data: notice });
  });

  /**
   * PATCH /municipalities/:municipalityId/notices/:noticeId
   * Update a notice.
   */
  static update = asyncHandler(async (req, res) => {
    const notice = await NoticeService.update(param(req.params.noticeId), param(req.params.municipalityId), req.body);
    res.json({ success: true, message: 'Notice updated.', data: notice });
  });

  /**
   * DELETE /municipalities/:municipalityId/notices/:noticeId
   * Delete a notice.
   */
  static delete = asyncHandler(async (req, res) => {
    const result = await NoticeService.delete(param(req.params.noticeId), param(req.params.municipalityId));
    res.json({ success: true, message: 'Notice deleted.', data: result });
  });
}

// ─── Audit Log Controller ─────────────────────────────────────────────────────

export class AuditLogController {
  /**
   * GET /municipalities/:municipalityId/audit-logs
   * Paginated audit log for a municipality.
   */
  static list = asyncHandler(async (req, res) => {
    const result = await AuditLogService.listByMunicipality(
      param(req.params.municipalityId),
      getPagination(req)
    );
    res.json({ success: true, data: result });
  });
}