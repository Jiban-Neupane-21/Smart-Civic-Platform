import { Response } from "express";
import { AuthenticatedRequest } from "../middleware";
import { supabaseAdmin } from "../../../config/supabase";
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
} from "../services/municipality.service";

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
      console.error("[MUNICIPALITY CONTROLLER ERROR]", err);
      res
        .status(500)
        .json({ success: false, message: "Internal server error." });
    });
  };

const param = (value: string | string[] | undefined) =>
  String(Array.isArray(value) ? value[0] : (value ?? ""));

const getPagination = (req: AuthenticatedRequest) => ({
  page: parseInt(req.query.page as string) || 1,
  limit: parseInt(req.query.limit as string) || 20,
  search: (req.query.search as string) || "",
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
    const muni = await MunicipalityService.getById(
      param(req.params.municipalityId),
    );
    res.json({ success: true, data: muni });
  });

  /**
   * POST /municipalities
   * Create a new municipality (superadmin only).
   * Body: { name, code, province, district, address, type, ... }
   */
  static create = asyncHandler(async (req, res) => {
    const { name, email, region, head_name, head_email, head_password } =
      req.body;

    // 1. Create the Municipality first to generate its UUID
    const { data: municipality, error: munError } = await supabaseAdmin
      .from("municipalities")
      .insert({
        official_name: name,
        region_state: region,
        login_email: email,
      })
      .select("m_uid")
      .single();

    if (munError) {
      // Handle PostgreSQL Unique Constraint Violation for Municipality Email
      if (munError.code === "23505") {
        throw new ConflictError("Municipality contact email already exists.");
      }
      throw munError;
    }

    // 2. Create the Municipality Head User (Database trigger handles the rest!)
    const { data: authUser, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: head_email,
        password: head_password,
        email_confirm: true, // Bypass email verification
        user_metadata: {
          full_name: head_name,
          role: "municipality_head",
          municipality_id: municipality.m_uid, // Crucial: Links the trigger's staff row!
        },
      });

    if (authError) {
      // Rollback: Delete the municipality we just created if user creation fails
      await supabaseAdmin
        .from("municipalities")
        .delete()
        .eq("m_uid", municipality.m_uid);

      if (authError.message.toLowerCase().includes("already registered")) {
        throw new ConflictError(
          "Municipality head email is already registered to another user.",
        );
      }
      throw authError;
    }

    // Ensure the profile is explicitly created/updated in case the database trigger is missing or failed
    await supabaseAdmin.from("profiles").upsert({
      id: authUser.user.id,
      email: head_email,
      full_name: head_name,
      role: "municipality_head",
      municipality_id: municipality.m_uid,
      account_status: "active",
    });

    // Ensure the staff record is explicitly created/updated
    await supabaseAdmin.from("staff").upsert(
      {
        profile_id: authUser.user.id,
        municipality_id: municipality.m_uid,
        staff_role: "municipality_head",
        employee_status: "active",
      },
      { onConflict: "profile_id" },
    );

    // 3. Link the new Auth User's ID back to the Municipality as the head_id
    await supabaseAdmin
      .from("municipalities")
      .update({ head_id: authUser.user.id })
      .eq("m_uid", municipality.m_uid);

    // 4. Return success mapped to the frontend's expected format
    res.status(201).json({
      success: true,
      message: "Municipality and Head account created successfully.",
      data: {
        id: municipality.m_uid,
        name: name,
        region: region || "N/A",
        email: email,
        status: "Active",
      },
    });
  });

  /**
   * PATCH /municipalities/:municipalityId
   * Update municipality details.
   */
  static update = asyncHandler(async (req, res) => {
    const id = param(req.params.municipalityId) || param(req.params.id);
    const { name, email, region, status } = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.official_name = name;
    if (email !== undefined) updateData.login_email = email;
    if (region !== undefined) updateData.region_state = region;
    if (status !== undefined) updateData.is_active = status === "Active";

    const { data: muni, error } = await supabaseAdmin
      .from("municipalities")
      .update(updateData)
      .eq("m_uid", id)
      .select()
      .single();

    if (error) {
      if (error.code === "23505")
        throw new ConflictError("Municipality contact email already exists.");
      throw error;
    }

    res.json({
      success: true,
      message: "Municipality updated.",
      data: {
        id: muni.m_uid,
        name: muni.official_name,
        region: muni.region_state || "N/A",
        email: muni.login_email,
        status: muni.is_active ? "Active" : "Inactive",
      },
    });
  });

  /**
   * DELETE /municipalities/:municipalityId
   * Delete a municipality (superadmin only).
   */
  static delete = asyncHandler(async (req, res) => {
    const id = param(req.params.municipalityId) || param(req.params.id);

    // Soft delete
    const { error } = await supabaseAdmin
      .from("municipalities")
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq("m_uid", id);

    if (error) throw error;

    res.json({ success: true, message: "Municipality deleted.", data: { id } });
  });

  /**
   * GET /municipalities/:municipalityId/stats
   * Dashboard statistics for a municipality.
   */
  static stats = asyncHandler(async (req, res) => {
    const stats = await MunicipalityService.getStats(
      param(req.params.municipalityId),
    );
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
    const departments = await DepartmentService.listByMunicipality(
      param(req.params.municipalityId),
    );
    res.json({ success: true, data: departments });
  });

  /**
   * GET /municipalities/:municipalityId/departments/:departmentId
   * Get a single department with staff list.
   */
  static getById = asyncHandler(async (req, res) => {
    const dept = await DepartmentService.getById(
      param(req.params.departmentId),
      param(req.params.municipalityId),
    );
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
    res
      .status(201)
      .json({ success: true, message: "Department created.", data: dept });
  });

  /**
   * PATCH /municipalities/:municipalityId/departments/:departmentId
   * Update department details.
   */
  static update = asyncHandler(async (req, res) => {
    const dept = await DepartmentService.update(
      param(req.params.departmentId),
      param(req.params.municipalityId),
      req.body,
    );
    res.json({ success: true, message: "Department updated.", data: dept });
  });

  /**
   * DELETE /municipalities/:municipalityId/departments/:departmentId
   * Delete a department.
   */
  static delete = asyncHandler(async (req, res) => {
    const result = await DepartmentService.delete(
      param(req.params.departmentId),
      param(req.params.municipalityId),
    );
    res.json({ success: true, message: "Department deleted.", data: result });
  });
}

// ─── Staff Controller ─────────────────────────────────────────────────────────

export class StaffController {
  /**
   * GET /municipalities/:municipalityId/staff
   * Paginated list of all staff in a municipality.
   */
  static list = asyncHandler(async (req, res) => {
    const result = await StaffService.listByMunicipality(
      param(req.params.municipalityId),
      getPagination(req),
    );
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
    res
      .status(201)
      .json({ success: true, message: "Staff account created.", data: staff });
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
      req.body.status,
    );
    res.json({
      success: true,
      message: `Staff status updated to '${req.body.status}'.`,
      data: staff,
    });
  });

  /**
   * DELETE /municipalities/:municipalityId/staff/:staffId
   * Remove a staff member.
   */
  static delete = asyncHandler(async (req, res) => {
    const result = await StaffService.delete(
      param(req.params.staffId),
      param(req.params.municipalityId),
    );
    res.json({ success: true, message: "Staff member removed.", data: result });
  });
}

// ─── Complaint Controller ─────────────────────────────────────────────────────

export class ComplaintController {
  /**
   * GET /municipalities/:municipalityId/complaints
   * Paginated list of complaints. Filter by ?status= or ?departmentId=
   */
  static list = asyncHandler(async (req, res) => {
    const result = await ComplaintService.list(
      param(req.params.municipalityId),
      {
        ...getPagination(req),
        status: req.query.status as string,
        departmentId: req.query.departmentId as string,
      },
    );
    res.json({ success: true, data: result });
  });

  /**
   * GET /municipalities/:municipalityId/complaints/:complaintId
   * Full complaint details with timeline.
   */
  static getById = asyncHandler(async (req, res) => {
    const complaint = await ComplaintService.getById(
      param(req.params.complaintId),
      param(req.params.municipalityId),
    );
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
      message: "Complaint submitted successfully.",
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
      req.user!.userId,
    );
    res.json({ success: true, message: "Complaint updated.", data: complaint });
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
    const notice = await NoticeService.getById(
      param(req.params.noticeId),
      param(req.params.municipalityId),
    );
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
    res
      .status(201)
      .json({ success: true, message: "Notice published.", data: notice });
  });

  /**
   * PATCH /municipalities/:municipalityId/notices/:noticeId
   * Update a notice.
   */
  static update = asyncHandler(async (req, res) => {
    const notice = await NoticeService.update(
      param(req.params.noticeId),
      param(req.params.municipalityId),
      req.body,
    );
    res.json({ success: true, message: "Notice updated.", data: notice });
  });

  /**
   * DELETE /municipalities/:municipalityId/notices/:noticeId
   * Delete a notice.
   */
  static delete = asyncHandler(async (req, res) => {
    const result = await NoticeService.delete(
      param(req.params.noticeId),
      param(req.params.municipalityId),
    );
    res.json({ success: true, message: "Notice deleted.", data: result });
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
      getPagination(req),
    );
    res.json({ success: true, data: result });
  });
}
