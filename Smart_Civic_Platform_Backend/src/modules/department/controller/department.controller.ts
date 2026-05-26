import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware';
import {
  DepartmentService,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from '../services/department.service';

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
      console.error('[DEPARTMENT CONTROLLER ERROR]', err);
      res.status(500).json({ success: false, message: 'Internal server error.' });
    });
  };

const param = (value: string | string[] | undefined) =>
  String(Array.isArray(value) ? value[0] : value ?? "");

const getFilters = (req: AuthenticatedRequest) => ({
  page: parseInt(req.query.page as string) || 1,
  limit: parseInt(req.query.limit as string) || 20,
  search: (req.query.search as string) || '',
  status: (req.query.status as string) || '',
  headStaffId: (req.query.headStaffId as string) || '',
});

// ─── Department Controller ────────────────────────────────────────────────────

export class DepartmentController {
  /**
   * GET /departments?municipalityId=xxx
   * GET /municipalities/:municipalityId/departments
   * List all departments with pagination
   */
  static list = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const municipalityId = param(
      req.params.municipalityId || (req.query.municipalityId as string),
    );

    if (!municipalityId) {
      res.status(400).json({
        success: false,
        message: 'municipalityId is required.',
      });
      return;
    }

    const result = await DepartmentService.list(municipalityId, getFilters(req));
    res.json({ success: true, data: result });
  });

  /**
   * GET /departments/:departmentId?municipalityId=xxx
   * GET /municipalities/:municipalityId/departments/:departmentId
   * Get detailed department information
   */
  static getById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const municipalityId = param(
      req.params.municipalityId || (req.query.municipalityId as string),
    );
    const department = await DepartmentService.getById(
      param(req.params.departmentId),
      municipalityId
    );
    res.json({ success: true, data: department });
  });

  /**
   * POST /departments
   * POST /municipalities/:municipalityId/departments
   * Create a new department
   * Body: { name, code, description?, headName?, headEmail?, headPhone?, ... }
   */
  static create = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const municipalityId = param(
      req.params.municipalityId || req.body.municipalityId,
    );

    if (!municipalityId) {
      res.status(400).json({
        success: false,
        message: 'municipalityId is required.',
      });
      return;
    }

    const department = await DepartmentService.create(
      { ...req.body, municipalityId },
      req.user!.userId
    );

    res.status(201).json({
      success: true,
      message: 'Department created successfully.',
      data: department,
    });
  });

  /**
   * PATCH /departments/:departmentId
   * PATCH /municipalities/:municipalityId/departments/:departmentId
   * Update department details
   */
  static update = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const municipalityId = param(
      req.params.municipalityId || req.body.municipalityId,
    );

    const department = await DepartmentService.update(
      param(req.params.departmentId),
      municipalityId,
      req.body,
      req.user!.userId
    );

    res.json({
      success: true,
      message: 'Department updated successfully.',
      data: department,
    });
  });

  /**
   * DELETE /departments/:departmentId?permanent=false
   * DELETE /municipalities/:municipalityId/departments/:departmentId
   * Delete a department (soft delete by default)
   */
  static delete = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const municipalityId = param(
      req.params.municipalityId || (req.query.municipalityId as string),
    );
    const permanent = req.query.permanent === 'true';

    const result = await DepartmentService.delete(
      param(req.params.departmentId),
      municipalityId,
      permanent,
      req.user!.userId
    );

    res.json({
      success: true,
      message: result.message,
      data: result,
    });
  });

  /**
   * GET /departments/:departmentId/stats
   * GET /municipalities/:municipalityId/departments/:departmentId/stats
   * Get department statistics (complaints, staff, resolution rates)
   */
  static getStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const municipalityId = param(
      req.params.municipalityId || (req.query.municipalityId as string),
    );

    const stats = await DepartmentService.getStats(
      param(req.params.departmentId),
      municipalityId
    );

    res.json({ success: true, data: stats });
  });

  /**
   * GET /departments/select-list?municipalityId=xxx
   * GET /municipalities/:municipalityId/departments/select-list
   * Get simplified department list for dropdowns
   */
  static getSelectList = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const municipalityId = param(
      req.params.municipalityId || (req.query.municipalityId as string),
    );

    if (!municipalityId) {
      res.status(400).json({
        success: false,
        message: 'municipalityId is required.',
      });
      return;
    }

    const departments = await DepartmentService.getSelectList(municipalityId);
    res.json({ success: true, data: departments });
  });

  /**
   * POST /departments/reassign-staff
   * POST /municipalities/:municipalityId/departments/reassign-staff
   * Reassign all staff from one department to another
   * Body: { fromDepartmentId, toDepartmentId }
   */
  static reassignStaff = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const municipalityId = param(
      req.params.municipalityId || req.body.municipalityId,
    );

    const { fromDepartmentId, toDepartmentId } = req.body;

    if (!fromDepartmentId || !toDepartmentId) {
      res.status(400).json({
        success: false,
        message: 'fromDepartmentId and toDepartmentId are required.',
      });
      return;
    }

    const result = await DepartmentService.reassignStaff(
      fromDepartmentId,
      toDepartmentId,
      municipalityId,
      req.user!.userId
    );

    res.json({
      success: true,
      message: `${result.reassignedCount} staff members reassigned successfully.`,
      data: result,
    });
  });

  /**
   * GET /departments/export?municipalityId=xxx&format=csv
   * GET /municipalities/:municipalityId/departments/export
   * Export departments as CSV
   */
  static export = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const municipalityId = param(
      req.params.municipalityId || (req.query.municipalityId as string),
    );
    const format = (req.query.format as string) || 'csv';

    if (!municipalityId) {
      res.status(400).json({
        success: false,
        message: 'municipalityId is required.',
      });
      return;
    }

    const csvData = await DepartmentService.export(
      municipalityId,
      getFilters(req),
    );

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=departments_export_${Date.now()}.csv`
      );
      res.send(csvData);
    } else {
      res.json({ success: true, data: csvData });
    }
  });
}

export default DepartmentController;