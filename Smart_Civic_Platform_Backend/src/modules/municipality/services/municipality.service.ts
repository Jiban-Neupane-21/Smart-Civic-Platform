import { supabaseAdmin } from "../../../config/supabase";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../../../utils/errors";
import { recordAudit } from "../../../utils/auditHelper";
import type {
  AccountStatus,
  AnnouncementAudience,
  ComplaintStatus,
  DepartmentType,
  EmployeeStatus,
  Priority,
} from "../../../types/database.type";

export { NotFoundError, ForbiddenError, ConflictError };

export interface PaginationOptions {
  page?: number;
  limit?: number;
  search?: string;
}

function paginate(page: number, limit: number) {
  const p = Math.max(1, page);
  const l = Math.min(100, limit);
  return { from: (p - 1) * l, to: (p - 1) * l + l - 1, page: p, limit: l };
}

function mapMunicipalityBody(body: Record<string, unknown>) {
  return {
    official_name: (body.name ?? body.official_name) as string,
    slug: (body.code ?? body.slug) as string | undefined,
    region_state:
      [body.district, body.province].filter(Boolean).join(", ") ||
      (body.region_state as string | undefined),
    office_address: (body.address ?? body.office_address) as string | undefined,
    login_email: (body.login_email ?? body.email) as string,
    support_email: body.support_email as string | undefined,
    emergency_contact: body.emergency_contact as string | undefined,
    website_url: (body.website ?? body.website_url) as string | undefined,
    login_domain: body.login_domain as string | undefined,
    registration_code: body.registration_code as string | undefined,
    is_active: body.status ? body.status === "active" : body.is_active,
  };
}

export class MunicipalityService {
  static async list(options: PaginationOptions) {
    const { from, to, page, limit } = paginate(
      options.page || 1,
      options.limit || 20,
    );
    let query = supabaseAdmin
      .from("municipalities")
      .select("*", { count: "exact" })
      .eq("is_deleted", false)
      .order("official_name")
      .range(from, to);

    if (options.search?.trim()) {
      const s = `%${options.search.trim()}%`;
      query = query.or(
        `official_name.ilike.${s},slug.ilike.${s},region_state.ilike.${s}`,
      );
    }

    const { data, count, error } = await query;
    if (error) throw new Error(error.message);
    const total = count ?? 0;
    return {
      municipalities: data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getById(id: string) {
    const { data, error } = await supabaseAdmin
      .from("municipalities")
      .select(
        `
        *,
        departments ( d_uid, dept_name, is_active ),
        staff ( s_uid, profile_id, employee_status )
      `,
      )
      .eq("m_uid", id)
      .eq("is_deleted", false)
      .single();
    if (error || !data)
      throw new NotFoundError(`Municipality ${id} not found.`);
    return data;
  }

  static async create(dto: Record<string, unknown>) {
    const mapped = mapMunicipalityBody(dto);
    if (!mapped.official_name || !mapped.login_email) {
      throw new Error("official_name and login_email are required");
    }

    if (mapped.slug) {
      const { data: existing } = await supabaseAdmin
        .from("municipalities")
        .select("m_uid")
        .eq("slug", mapped.slug)
        .maybeSingle();
      if (existing) {
        throw new ConflictError(`Slug '${mapped.slug}' already exists.`);
      }
    }

    const { data, error } = await supabaseAdmin
      .from("municipalities")
      .insert({
        ...mapped,
        is_active: mapped.is_active ?? true,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  static async update(id: string, dto: Record<string, unknown>) {
    const { data: existing } = await supabaseAdmin
      .from("municipalities")
      .select("m_uid")
      .eq("m_uid", id)
      .maybeSingle();
    if (!existing) throw new NotFoundError(`Municipality ${id} not found.`);

    const mapped = mapMunicipalityBody({ ...dto, name: dto.name ?? undefined });
    const { data, error } = await supabaseAdmin
      .from("municipalities")
      .update(mapped)
      .eq("m_uid", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  static async delete(id: string) {
    const { data: existing } = await supabaseAdmin
      .from("municipalities")
      .select("m_uid")
      .eq("m_uid", id)
      .maybeSingle();
    if (!existing) throw new NotFoundError(`Municipality ${id} not found.`);

    const { error } = await supabaseAdmin
      .from("municipalities")
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        is_active: false,
      })
      .eq("m_uid", id);
    if (error) throw new Error(error.message);
    return { deletedId: id };
  }

  static async getStats(id: string) {
    const { data: muni } = await supabaseAdmin
      .from("municipalities")
      .select("m_uid, official_name, slug")
      .eq("m_uid", id)
      .single();
    if (!muni) throw new NotFoundError(`Municipality ${id} not found.`);

    const [staff, departments, complaints, resolved] = await Promise.all([
      supabaseAdmin
        .from("staff")
        .select("s_uid", { count: "exact", head: true })
        .eq("municipality_id", id)
        .eq("is_deleted", false),
      supabaseAdmin
        .from("departments")
        .select("d_uid", { count: "exact", head: true })
        .eq("municipality_id", id)
        .eq("is_deleted", false),
      supabaseAdmin
        .from("complaints")
        .select("co_uid", { count: "exact", head: true })
        .eq("municipality_id", id)
        .eq("is_deleted", false),
      supabaseAdmin
        .from("complaints")
        .select("co_uid", { count: "exact", head: true })
        .eq("municipality_id", id)
        .eq("status", "resolved")
        .eq("is_deleted", false),
    ]);

    const totalComplaints = complaints.count ?? 0;
    const resolvedCount = resolved.count ?? 0;

    return {
      municipality: muni,
      staff: { total: staff.count ?? 0 },
      departments: { total: departments.count ?? 0 },
      complaints: {
        total: totalComplaints,
        resolved: resolvedCount,
        resolutionRate:
          totalComplaints > 0
            ? Math.round((resolvedCount / totalComplaints) * 100)
            : 0,
      },
      generatedAt: new Date(),
    };
  }
}

function mapDepartmentBody(
  municipalityId: string,
  body: Record<string, unknown>,
) {
  return {
    municipality_id: municipalityId,
    dept_name: (body.name ?? body.dept_name) as string,
    department_type: (body.department_type ?? body.type) as
      | DepartmentType
      | undefined,
    dept_contact: (body.contactPhone ?? body.dept_contact) as
      | string
      | undefined,
    dept_email: (body.contactEmail ?? body.headEmail ?? body.dept_email) as
      | string
      | undefined,
    operating_budget: body.operating_budget as number | undefined,
    head_id: body.headStaffId as string | undefined,
  };
}

export class DepartmentService {
  static async listByMunicipality(municipalityId: string) {
    const { data, error } = await supabaseAdmin
      .from("departments")
      .select("*")
      .eq("municipality_id", municipalityId)
      .eq("is_deleted", false)
      .order("dept_name");
    if (error) throw new Error(error.message);
    return data;
  }

  static async getById(id: string, municipalityId: string) {
    const { data, error } = await supabaseAdmin
      .from("departments")
      .select(
        `
        *,
        staff (
          s_uid, profile_id, employee_id, staff_role, employee_status,
          profiles ( full_name, email, phone )
        )
      `,
      )
      .eq("d_uid", id)
      .eq("municipality_id", municipalityId)
      .eq("is_deleted", false)
      .single();
    if (error || !data) throw new NotFoundError(`Department ${id} not found.`);
    return data;
  }

  static async create(
    dto: Record<string, unknown> & { municipalityId: string },
  ) {
    const mapped = mapDepartmentBody(dto.municipalityId, dto);
    if (!mapped.dept_name) throw new Error("dept_name is required");

    const { data, error } = await supabaseAdmin
      .from("departments")
      .insert(mapped)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  static async update(
    id: string,
    municipalityId: string,
    data: Record<string, unknown>,
  ) {
    const dept = await this.getById(id, municipalityId);
    const mapped = mapDepartmentBody(municipalityId, data);
    const { data: updated, error } = await supabaseAdmin
      .from("departments")
      .update(mapped)
      .eq("d_uid", dept.d_uid)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return updated;
  }

  static async delete(id: string, municipalityId: string) {
    await this.getById(id, municipalityId);
    const { error } = await supabaseAdmin
      .from("departments")
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        is_active: false,
      })
      .eq("d_uid", id);
    if (error) throw new Error(error.message);
    return { deletedId: id };
  }
}

export class StaffService {
  static async listByMunicipality(
    municipalityId: string,
    options: PaginationOptions,
  ) {
    const { from, to, page, limit } = paginate(
      options.page || 1,
      options.limit || 20,
    );
    const { data, count, error } = await supabaseAdmin
      .from("staff")
      .select(
        `
        s_uid, profile_id, municipality_id, department_id,
        employee_id, staff_role, employee_status, joined_date,
        profiles ( full_name, email, phone, role )
      `,
        { count: "exact" },
      )
      .eq("municipality_id", municipalityId)
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

  static async create(
    dto: Record<string, unknown> & { municipalityId: string },
  ) {
    throw new Error(
      "Direct staff creation is not supported. Use POST /api/auth/invite to invite staff.",
    );
  }

  static async updateStatus(
    staffId: string,
    municipalityId: string,
    status: string,
  ) {
    const employeeStatus = status as EmployeeStatus;

    const { data, error } = await supabaseAdmin
      .from("staff")
      .update({ employee_status: employeeStatus })
      .eq("s_uid", staffId)
      .eq("municipality_id", municipalityId)
      .select()
      .single();
    if (error || !data) {
      throw new NotFoundError(`Staff member ${staffId} not found.`);
    }
    return data;
  }

  static async delete(staffId: string, municipalityId: string) {
    const { data: row } = await supabaseAdmin
      .from("staff")
      .select("profile_id")
      .eq("s_uid", staffId)
      .eq("municipality_id", municipalityId)
      .maybeSingle();
    if (!row) throw new NotFoundError(`Staff member ${staffId} not found.`);

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
      .update({ account_status: "inactive" as AccountStatus })
      .eq("id", row.profile_id);

    return { deletedId: staffId };
  }
}

export class ComplaintService {
  static async list(
    municipalityId: string,
    options: PaginationOptions & {
      status?: string;
      departmentId?: string;
    },
  ) {
    const { from, to, page, limit } = paginate(
      options.page || 1,
      options.limit || 20,
    );
    let query = supabaseAdmin
      .from("complaints")
      .select(
        `
        co_uid, title, status, priority, reported_at, resolved_at,
        profiles!complaints_citizen_id_fkey ( full_name, email, phone ),
        departments ( dept_name )
      `,
        { count: "exact" },
      )
      .eq("municipality_id", municipalityId)
      .eq("is_deleted", false)
      .order("reported_at", { ascending: false })
      .range(from, to);

    if (options.status) query = query.eq("status", options.status);
    if (options.departmentId) {
      query = query.eq("department_id", options.departmentId);
    }

    const { data, count, error } = await query;
    if (error) throw new Error(error.message);
    const total = count ?? 0;
    return {
      complaints: data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getById(id: string, municipalityId: string) {
    const { data, error } = await supabaseAdmin
      .from("complaints")
      .select(
        `
        *,
        profiles!complaints_citizen_id_fkey ( id, full_name, email, phone ),
        departments ( d_uid, dept_name ),
        complaint_categories ( name )
      `,
      )
      .eq("co_uid", id)
      .eq("municipality_id", municipalityId)
      .eq("is_deleted", false)
      .single();
    if (error || !data) throw new NotFoundError(`Complaint ${id} not found.`);
    return data;
  }

  static async create(
    dto: Record<string, unknown> & { municipalityId: string },
  ) {
    const { data, error } = await supabaseAdmin
      .from("complaints")
      .insert({
        citizen_id: dto.citizenId as string,
        municipality_id: dto.municipalityId,
        department_id: (dto.departmentId as string) ?? null,
        category_id: (dto.category_id as string) ?? null,
        title: dto.title as string,
        description: dto.description as string,
        address_hint: (dto.location as string) ?? null,
        status: "pending",
        priority: (dto.priority as Priority) ?? "medium",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  static async update(
    id: string,
    municipalityId: string,
    dto: Record<string, unknown>,
    updatedBy: string,
  ) {
    const existing = await this.getById(id, municipalityId);
    const patch: Record<string, unknown> = {};
    if (dto.status) patch.status = dto.status as ComplaintStatus;
    if (dto.priority) patch.priority = dto.priority;
    if (dto.resolutionNote) patch.resolution_note = dto.resolutionNote;
    if (dto.departmentId) patch.department_id = dto.departmentId;
    if (dto.status === "resolved") {
      patch.resolved_at = new Date().toISOString();
    }

    const { data, error } = await supabaseAdmin
      .from("complaints")
      .update(patch)
      .eq("co_uid", id)
      .select()
      .single();
    if (error) throw new Error(error.message);

    await recordAudit({
      actionBy: updatedBy,
      actionRole: "municipality_head",
      municipalityId,
      departmentId: (existing.department_id as string) ?? null,
      tableName: "complaints",
      recordId: id,
      action: "STATUS_CHANGE",
      oldValue: { status: existing.status },
      newValue: patch,
    });

    return data;
  }
}

/** Maps to `announcements` table (notices in API) */
export class NoticeService {
  static async list(
    municipalityId: string,
    options: PaginationOptions & { category?: string },
  ) {
    const { from, to, page, limit } = paginate(
      options.page || 1,
      options.limit || 20,
    );
    let query = supabaseAdmin
      .from("announcements")
      .select("*", { count: "exact" })
      .eq("municipality_id", municipalityId)
      .eq("is_deleted", false)
      .order("published_at", { ascending: false, nullsFirst: false })
      .range(from, to);

    if (options.category) {
      query = query.eq("audience", options.category);
    }

    const { data, count, error } = await query;
    if (error) throw new Error(error.message);
    const total = count ?? 0;
    return {
      notices: data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getById(id: string, municipalityId: string) {
    const { data, error } = await supabaseAdmin
      .from("announcements")
      .select("*")
      .eq("ann_uid", id)
      .eq("municipality_id", municipalityId)
      .eq("is_deleted", false)
      .single();
    if (error || !data) throw new NotFoundError(`Notice ${id} not found.`);
    return data;
  }

  static async create(
    dto: Record<string, unknown> & {
      municipalityId: string;
      publishedBy: string;
    },
  ) {
    const { data, error } = await supabaseAdmin
      .from("announcements")
      .insert({
        municipality_id: dto.municipalityId,
        created_by: dto.publishedBy,
        title: dto.title as string,
        body: dto.body as string,
        audience: (dto.category ??
          dto.audience ??
          "all") as AnnouncementAudience,
        department_id: (dto.departmentId as string) ?? null,
        published_at: dto.publishedAt
          ? new Date(dto.publishedAt as string).toISOString()
          : new Date().toISOString(),
        expires_at: dto.expiresAt
          ? new Date(dto.expiresAt as string).toISOString()
          : null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  static async update(
    id: string,
    municipalityId: string,
    data: Record<string, unknown>,
  ) {
    await this.getById(id, municipalityId);
    const patch: Record<string, unknown> = {};
    if (data.title) patch.title = data.title;
    if (data.body) patch.body = data.body;
    if (data.category || data.audience) {
      patch.audience = data.category ?? data.audience;
    }
    if (data.expiresAt) {
      patch.expires_at = new Date(data.expiresAt as string).toISOString();
    }

    const { data: updated, error } = await supabaseAdmin
      .from("announcements")
      .update(patch)
      .eq("ann_uid", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return updated;
  }

  static async delete(id: string, municipalityId: string) {
    await this.getById(id, municipalityId);
    const { error } = await supabaseAdmin
      .from("announcements")
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
      })
      .eq("ann_uid", id);
    if (error) throw new Error(error.message);
    return { deletedId: id };
  }
}

export class AuditLogService {
  static async listByMunicipality(
    municipalityId: string,
    options: PaginationOptions,
  ) {
    const { from, to, page, limit } = paginate(
      options.page || 1,
      options.limit || 20,
    );
    const { data, count, error } = await supabaseAdmin
      .from("audit_logs")
      .select("*", { count: "exact" })
      .eq("municipality_id", municipalityId)
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

  static async record(entry: {
    userId: string;
    email: string;
    municipalityId: string;
    action: string;
    payload?: unknown;
    ip: string;
    userAgent: string;
    timestamp: Date;
  }) {
    await recordAudit({
      actionBy: entry.userId,
      actionRole: "municipality_head",
      municipalityId: entry.municipalityId,
      tableName: "municipalities",
      recordId: entry.municipalityId,
      action: "UPDATE",
      newValue: {
        action: entry.action,
        payload: entry.payload,
        email: entry.email,
      },
      ip: entry.ip,
      userAgent: entry.userAgent,
    });
  }
}
