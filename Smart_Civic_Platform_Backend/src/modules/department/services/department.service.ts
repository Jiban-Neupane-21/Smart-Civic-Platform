import { supabaseAdmin } from "../../../config/supabase";
import {
  ConflictError,
  NotFoundError,
} from "../../../utils/errors";
import { recordAudit } from "../../../utils/auditHelper";
import type { DepartmentType } from "../../../types/database.type";

export { NotFoundError, ConflictError };
export { ForbiddenError } from "../../../utils/errors";

export interface DepartmentFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  headStaffId?: string;
}

function paginate(page: number, limit: number) {
  const p = Math.max(1, page);
  const l = Math.min(100, limit);
  return { from: (p - 1) * l, to: (p - 1) * l + l - 1, page: p, limit: l };
}

function mapBody(municipalityId: string, body: Record<string, unknown>) {
  return {
    municipality_id: municipalityId,
    dept_name: (body.name ?? body.dept_name) as string,
    department_type: (body.department_type ?? body.type) as
      | DepartmentType
      | undefined,
    dept_contact: (body.contactPhone ?? body.dept_contact) as string | undefined,
    dept_email: (body.contactEmail ?? body.headEmail ?? body.dept_email) as
      | string
      | undefined,
    operating_budget: body.operating_budget as number | undefined,
    head_id: (body.headStaffId ?? body.head_id) as string | undefined,
    is_active: body.status ? body.status === "active" : undefined,
  };
}

export class DepartmentService {
  static async list(municipalityId: string, filters: DepartmentFilters) {
    const { from, to, page, limit } = paginate(
      filters.page || 1,
      filters.limit || 20,
    );

    let query = supabaseAdmin
      .from("departments")
      .select("*", { count: "exact" })
      .eq("municipality_id", municipalityId)
      .eq("is_deleted", false)
      .order("dept_name")
      .range(from, to);

    if (filters.search?.trim()) {
      const s = `%${filters.search.trim()}%`;
      query = query.or(`dept_name.ilike.${s},dept_email.ilike.${s}`);
    }
    if (filters.status === "inactive") query = query.eq("is_active", false);
    if (filters.status === "active") query = query.eq("is_active", true);
    if (filters.headStaffId) query = query.eq("head_id", filters.headStaffId);

    const { data, count, error } = await query;
    if (error) throw new Error(error.message);
    const total = count ?? 0;

    return {
      departments: data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getById(id: string, municipalityId?: string) {
    let query = supabaseAdmin
      .from("departments")
      .select(
        `
        *,
        municipalities ( m_uid, official_name, slug, region_state ),
        staff (
          s_uid, profile_id, employee_id, staff_role, employee_status,
          profiles ( full_name, email, phone )
        )
      `,
      )
      .eq("d_uid", id)
      .eq("is_deleted", false);

    if (municipalityId) query = query.eq("municipality_id", municipalityId);

    const { data, error } = await query.single();
    if (error || !data) throw new NotFoundError(`Department ${id} not found.`);

    const { count: staffCount } = await supabaseAdmin
      .from("staff")
      .select("s_uid", { count: "exact", head: true })
      .eq("department_id", id)
      .eq("is_deleted", false);

    const { count: complaintCount } = await supabaseAdmin
      .from("complaints")
      .select("co_uid", { count: "exact", head: true })
      .eq("department_id", id)
      .eq("is_deleted", false);

    return {
      ...data,
      _count: {
        staff: staffCount ?? 0,
        complaints: complaintCount ?? 0,
      },
    };
  }

  static async create(
    dto: Record<string, unknown> & { municipalityId: string },
    createdBy: string,
  ) {
    const mapped = mapBody(dto.municipalityId, dto);
    if (!mapped.dept_name) throw new Error("dept_name is required");

    const { data: muni } = await supabaseAdmin
      .from("municipalities")
      .select("m_uid")
      .eq("m_uid", dto.municipalityId)
      .maybeSingle();
    if (!muni) {
      throw new NotFoundError(`Municipality ${dto.municipalityId} not found.`);
    }

    const { data: dup } = await supabaseAdmin
      .from("departments")
      .select("d_uid")
      .eq("municipality_id", dto.municipalityId)
      .eq("dept_name", mapped.dept_name)
      .eq("is_deleted", false)
      .maybeSingle();
    if (dup) {
      throw new ConflictError(
        `Department '${mapped.dept_name}' already exists in this municipality.`,
      );
    }

    const { data, error } = await supabaseAdmin
      .from("departments")
      .insert({ ...mapped, is_active: mapped.is_active ?? true })
      .select()
      .single();
    if (error) throw new Error(error.message);

    await recordAudit({
      actionBy: createdBy,
      actionRole: "municipality_head",
      municipalityId: dto.municipalityId,
      tableName: "departments",
      recordId: data.d_uid,
      action: "INSERT",
      newValue: data as unknown as Record<string, unknown>,
    });

    return data;
  }

  static async update(
    id: string,
    municipalityId: string,
    dto: Record<string, unknown>,
    updatedBy: string,
  ) {
    await this.getById(id, municipalityId);
    const mapped = mapBody(municipalityId, dto);
    const { data, error } = await supabaseAdmin
      .from("departments")
      .update(mapped)
      .eq("d_uid", id)
      .select()
      .single();
    if (error) throw new Error(error.message);

    await recordAudit({
      actionBy: updatedBy,
      actionRole: "municipality_head",
      municipalityId,
      departmentId: id,
      tableName: "departments",
      recordId: id,
      action: "UPDATE",
      newValue: mapped,
    });

    return data;
  }

  static async delete(
    id: string,
    municipalityId: string,
    permanent: boolean,
    deletedBy: string,
  ) {
    const dept = await this.getById(id, municipalityId);
    if ((dept._count?.staff ?? 0) > 0) {
      throw new ConflictError(
        "Cannot delete department with active staff. Reassign staff first.",
      );
    }

    if (permanent) {
      const { error } = await supabaseAdmin
        .from("departments")
        .delete()
        .eq("d_uid", id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("departments")
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          is_active: false,
        })
        .eq("d_uid", id);
      if (error) throw new Error(error.message);
    }

    await recordAudit({
      actionBy: deletedBy,
      actionRole: "municipality_head",
      municipalityId,
      departmentId: id,
      tableName: "departments",
      recordId: id,
      action: permanent ? "DELETE" : "UPDATE",
      note: permanent ? "permanent delete" : "soft delete",
    });

    return {
      deletedId: id,
      permanent,
      message: permanent
        ? "Department permanently deleted."
        : "Department deactivated.",
    };
  }

  static async getStats(id: string, municipalityId: string) {
    const dept = await this.getById(id, municipalityId);

    const statuses = ["pending", "in_progress", "resolved", "rejected"] as const;
    const counts: Record<string, number> = {};
    for (const status of statuses) {
      const { count } = await supabaseAdmin
        .from("complaints")
        .select("co_uid", { count: "exact", head: true })
        .eq("department_id", id)
        .eq("status", status)
        .eq("is_deleted", false);
      counts[status] = count ?? 0;
    }

    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const resolved = counts.resolved ?? 0;

    return {
      department: {
        id: dept.d_uid,
        name: dept.dept_name,
      },
      staff: { total: dept._count?.staff ?? 0 },
      complaints: {
        total,
        byStatus: counts,
        resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 0,
      },
      generatedAt: new Date(),
    };
  }

  static async getSelectList(municipalityId: string) {
    const { data, error } = await supabaseAdmin
      .from("departments")
      .select("d_uid, dept_name, head_id, is_active")
      .eq("municipality_id", municipalityId)
      .eq("is_active", true)
      .eq("is_deleted", false)
      .order("dept_name");
    if (error) throw new Error(error.message);
    return data?.map((d) => ({
      id: d.d_uid,
      name: d.dept_name,
      headStaffId: d.head_id,
    }));
  }

  static async reassignStaff(
    fromDepartmentId: string,
    toDepartmentId: string,
    municipalityId: string,
    reassignedBy: string,
  ) {
    const { data: updated, error } = await supabaseAdmin
      .from("staff")
      .update({ department_id: toDepartmentId })
      .eq("department_id", fromDepartmentId)
      .eq("municipality_id", municipalityId)
      .select("s_uid");
    if (error) throw new Error(error.message);

    await recordAudit({
      actionBy: reassignedBy,
      actionRole: "municipality_head",
      municipalityId,
      departmentId: toDepartmentId,
      tableName: "staff",
      recordId: toDepartmentId,
      action: "REASSIGN",
      newValue: {
        fromDepartmentId,
        toDepartmentId,
        count: updated?.length ?? 0,
      },
    });

    return {
      reassignedCount: updated?.length ?? 0,
      fromDepartmentId,
      toDepartmentId,
    };
  }

  static async export(municipalityId: string, filters: DepartmentFilters) {
    const { departments } = await this.list(municipalityId, {
      ...filters,
      limit: 10000,
    });
    const headers = [
      "Name",
      "Type",
      "Email",
      "Contact",
      "Budget",
      "Active",
      "Created",
    ];
    const rows = (departments ?? []).map((d) => [
      d.dept_name,
      d.department_type ?? "",
      d.dept_email ?? "",
      d.dept_contact ?? "",
      d.operating_budget ?? "",
      d.is_active,
      d.created_at,
    ]);
    return [
      headers.join(","),
      ...rows.map((row) =>
        row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","),
      ),
    ].join("\n");
  }
}

export default DepartmentService;
