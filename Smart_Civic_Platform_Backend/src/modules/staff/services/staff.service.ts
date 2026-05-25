import crypto from "crypto";
import { supabaseAdmin } from "../../../config/supabase";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../../../utils/errors";
import { recordAudit } from "../../../utils/auditHelper";
import type { EmployeeStatus, UserRole } from "../../../types/database.type";

export { NotFoundError, ForbiddenError, ConflictError };

export interface PaginationOptions {
  page?: number;
  limit?: number;
  search?: string;
  departmentId?: string;
  role?: string;
  status?: string;
}

function paginate(page: number, limit: number) {
  const p = Math.max(1, page);
  const l = Math.min(100, limit);
  return { from: (p - 1) * l, to: (p - 1) * l + l - 1, page: p, limit: l };
}

const STAFF_SELECT = `
  s_uid, profile_id, municipality_id, department_id,
  employee_id, staff_role, employee_status, joined_date, invited_at, onboarded_at,
  profiles ( id, full_name, email, phone, role, account_status )
`;

export class StaffService {
  static async list(municipalityId: string | undefined, options: PaginationOptions) {
    if (!municipalityId) {
      throw new Error("municipalityId is required");
    }
    const { from, to, page, limit } = paginate(
      options.page || 1,
      options.limit || 20,
    );

    let query = supabaseAdmin
      .from("staff")
      .select(STAFF_SELECT, { count: "exact" })
      .eq("municipality_id", municipalityId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (options.departmentId) {
      query = query.eq("department_id", options.departmentId);
    }
    if (options.role) query = query.eq("staff_role", options.role);
    if (options.status) {
      query = query.eq("employee_status", options.status as EmployeeStatus);
    }

    const { data, count, error } = await query;
    if (error) throw new Error(error.message);
    const total = count ?? 0;

    let staff = data ?? [];
    if (options.search?.trim()) {
      const s = options.search.toLowerCase();
      staff = staff.filter((row) => {
        const p = row.profiles as { full_name?: string; email?: string } | null;
        return (
          p?.full_name?.toLowerCase().includes(s) ||
          p?.email?.toLowerCase().includes(s) ||
          row.employee_id?.toLowerCase().includes(s)
        );
      });
    }

    return {
      staff,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async listByDepartment(
    departmentId: string,
    options: PaginationOptions,
  ) {
    const { data: dept } = await supabaseAdmin
      .from("departments")
      .select("municipality_id")
      .eq("d_uid", departmentId)
      .single();
    if (!dept) throw new NotFoundError(`Department ${departmentId} not found.`);
    return this.list(dept.municipality_id, {
      ...options,
      departmentId,
    });
  }

  static async listAll(options: PaginationOptions) {
    const { from, to, page, limit } = paginate(
      options.page || 1,
      options.limit || 20,
    );
    const { data, count, error } = await supabaseAdmin
      .from("staff")
      .select(STAFF_SELECT, { count: "exact" })
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .range(from, to);
    if (error) throw new Error(error.message);
    const total = count ?? 0;
    return {
      staff: data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getByProfileId(profileId: string) {
    const { data, error } = await supabaseAdmin
      .from("staff")
      .select(
        `
        ${STAFF_SELECT},
        departments ( d_uid, dept_name ),
        municipalities ( m_uid, official_name )
      `,
      )
      .eq("profile_id", profileId)
      .eq("is_deleted", false)
      .single();
    if (error || !data) {
      throw new NotFoundError(`Staff profile ${profileId} not found.`);
    }
    return data;
  }

  static async getById(staffId: string, municipalityId?: string) {
    let query = supabaseAdmin
      .from("staff")
      .select(
        `
        ${STAFF_SELECT},
        departments ( d_uid, dept_name ),
        municipalities ( m_uid, official_name )
      `,
      )
      .eq("s_uid", staffId)
      .eq("is_deleted", false);

    if (municipalityId) query = query.eq("municipality_id", municipalityId);

    const { data, error } = await query.single();
    if (error || !data) {
      throw new NotFoundError(`Staff member ${staffId} not found.`);
    }
    return data;
  }

  static async create(_dto: Record<string, unknown>) {
    throw new Error(
      "Use POST /api/auth/invite to onboard staff (matches staff_invitations schema).",
    );
  }

  static async update(
    staffId: string,
    municipalityId: string,
    dto: Record<string, unknown>,
    actor: { userId: string; role: string },
  ) {
    const row = await this.getById(staffId, municipalityId);
    const profileId = row.profile_id as string;

    const profilePatch: Record<string, unknown> = {};
    if (dto.name) profilePatch.full_name = dto.name;
    if (dto.phone) profilePatch.phone = dto.phone;
    if (dto.role && actor.role === "superadmin") {
      profilePatch.role = dto.role;
    }

    if (Object.keys(profilePatch).length > 0) {
      const { error } = await supabaseAdmin
        .from("profiles")
        .update(profilePatch)
        .eq("id", profileId);
      if (error) throw new Error(error.message);
    }

    const staffPatch: Record<string, unknown> = {};
    if (dto.departmentId) staffPatch.department_id = dto.departmentId;
    if (dto.employeeId) staffPatch.employee_id = dto.employeeId;
    if (dto.role && actor.role === "superadmin") {
      staffPatch.staff_role = dto.role;
    }

    if (Object.keys(staffPatch).length > 0) {
      const { error } = await supabaseAdmin
        .from("staff")
        .update(staffPatch)
        .eq("s_uid", staffId);
      if (error) throw new Error(error.message);
    }

    return this.getById(staffId, municipalityId);
  }

  static async updateStatus(
    staffId: string,
    municipalityId: string,
    status: string,
    _reason?: string,
    updatedBy?: string,
  ) {
    const employeeStatus = status as EmployeeStatus;
    const { data, error } = await supabaseAdmin
      .from("staff")
      .update({ employee_status: employeeStatus })
      .eq("s_uid", staffId)
      .eq("municipality_id", municipalityId)
      .select("profile_id")
      .single();
    if (error || !data) {
      throw new NotFoundError(`Staff member ${staffId} not found.`);
    }

    const accountMap: Record<string, string> = {
      active: "active",
      inactive: "inactive",
      suspended: "suspended",
      terminated: "suspended",
    };
    await supabaseAdmin
      .from("profiles")
      .update({ account_status: accountMap[status] ?? "inactive" })
      .eq("id", data.profile_id);

    if (updatedBy) {
      await recordAudit({
        actionBy: updatedBy,
        actionRole: "municipality_head",
        municipalityId,
        tableName: "staff",
        recordId: staffId,
        action: "STATUS_CHANGE",
        newValue: { employee_status: employeeStatus },
      });
    }

    return this.getById(staffId, municipalityId);
  }

  static async resetPassword(
    staffId: string,
    municipalityId: string,
    newPassword?: string,
    _by?: string,
  ) {
    const row = await this.getById(staffId, municipalityId);
    const profileRaw = row.profiles as { email: string } | { email: string }[];
    const profile = Array.isArray(profileRaw) ? profileRaw[0] : profileRaw;
    const password = newPassword ?? crypto.randomUUID().slice(0, 16);
    const { error } = await supabaseAdmin.auth.admin.updateUserById(
      row.profile_id as string,
      { password },
    );
    if (error) throw new Error(error.message);
    await supabaseAdmin
      .from("profiles")
      .update({ force_password_reset: true })
      .eq("id", row.profile_id);
    return {
      message: "Password reset. User must change password on next login.",
      email: profile.email,
    };
  }

  static async changePassword(
    profileId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", profileId)
      .single();
    if (!profile) throw new NotFoundError("Profile not found");

    const { error: signErr } = await supabaseAdmin.auth.signInWithPassword({
      email: profile.email,
      password: currentPassword,
    });
    if (signErr) throw new Error("Current password is incorrect");

    const { error } = await supabaseAdmin.auth.admin.updateUserById(profileId, {
      password: newPassword,
    });
    if (error) throw new Error(error.message);

    await supabaseAdmin
      .from("profiles")
      .update({ force_password_reset: false })
      .eq("id", profileId);

    await supabaseAdmin
      .from("refresh_tokens")
      .update({ is_revoked: true, revoked_at: new Date().toISOString() })
      .eq("profile_id", profileId);
  }

  static async delete(
    staffId: string,
    municipalityId: string,
    permanent: boolean,
    deletedBy: string,
  ) {
    const row = await this.getById(staffId, municipalityId);
    if (permanent) {
      await supabaseAdmin.auth.admin.deleteUser(row.profile_id as string);
    } else {
      await supabaseAdmin
        .from("staff")
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          employee_status: "inactive",
        })
        .eq("s_uid", staffId);
      await supabaseAdmin
        .from("profiles")
        .update({ account_status: "inactive", is_deleted: true })
        .eq("id", row.profile_id);
    }

    await recordAudit({
      actionBy: deletedBy,
      actionRole: "municipality_head",
      municipalityId,
      tableName: "staff",
      recordId: staffId,
      action: permanent ? "DELETE" : "UPDATE",
      note: permanent ? "permanent" : "soft delete",
    });

    return { deletedId: staffId, permanent };
  }

  static async deletePermanent(staffId: string, deletedBy: string) {
    const row = await this.getById(staffId);
    return this.delete(
      staffId,
      row.municipality_id as string,
      true,
      deletedBy,
    );
  }

  static async changeRole(
    staffId: string,
    role: UserRole,
    municipalityId: string | undefined,
    updatedBy: string,
  ) {
    const row = await this.getById(staffId, municipalityId);
    await supabaseAdmin
      .from("profiles")
      .update({ role })
      .eq("id", row.profile_id);
    await supabaseAdmin
      .from("staff")
      .update({ staff_role: role })
      .eq("s_uid", staffId);

    await recordAudit({
      actionBy: updatedBy,
      actionRole: "superadmin",
      municipalityId: row.municipality_id as string,
      tableName: "staff",
      recordId: staffId,
      action: "UPDATE",
      newValue: { role },
    });

    return this.getById(staffId, row.municipality_id as string);
  }

  static async getAuditLogs(
    staffId: string,
    municipalityId: string,
    options: PaginationOptions,
  ) {
    const { from, to, page, limit } = paginate(
      options.page || 1,
      options.limit || 20,
    );
    const row = await this.getById(staffId, municipalityId);
    const { data, count, error } = await supabaseAdmin
      .from("audit_logs")
      .select("*", { count: "exact" })
      .or(`record_id.eq.${staffId},action_by.eq.${row.profile_id}`)
      .order("created_at", { ascending: false })
      .range(from, to);
    if (error) throw new Error(error.message);
    const total = count ?? 0;
    return {
      logs: data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async export(municipalityId: string, filters: PaginationOptions) {
    const { staff } = await this.list(municipalityId, {
      ...filters,
      limit: 10000,
    });
    const headers = [
      "Name",
      "Email",
      "Role",
      "Employee ID",
      "Department",
      "Status",
    ];
    const rows = (staff ?? []).map((s) => {
      const p = s.profiles as {
        full_name?: string;
        email?: string;
      } | null;
      return [
        p?.full_name ?? "",
        p?.email ?? "",
        s.staff_role,
        s.employee_id ?? "",
        s.department_id ?? "",
        s.employee_status,
      ];
    });
    return [
      headers.join(","),
      ...rows.map((r) =>
        r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","),
      ),
    ].join("\n");
  }
}

export default StaffService;
