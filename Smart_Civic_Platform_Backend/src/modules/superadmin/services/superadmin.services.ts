import { supabaseAdmin } from "../../../config/supabase";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../../../utils/errors";
import { recordAudit } from "../../../utils/auditHelper";
import type { AccountStatus, UserRole } from "../../../types/database.type";

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

export class UserService {
  static async listUsers(options: PaginationOptions) {
    const { from, to, page, limit } = paginate(
      options.page || 1,
      options.limit || 20,
    );
    let query = supabaseAdmin
      .from("profiles")
      .select(
        "id, full_name, email, role, account_status, municipality_id, created_at, last_login_at",
        { count: "exact" },
      )
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (options.search?.trim()) {
      const s = `%${options.search.trim()}%`;
      query = query.or(`full_name.ilike.${s},email.ilike.${s}`);
    }

    const { data, count, error } = await query;
    if (error) throw new Error(error.message);
    const total = count ?? 0;

    return {
      users: data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getUserById(userId: string) {
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (error || !profile) throw new NotFoundError(`User ${userId} not found.`);

    const { data: logs } = await supabaseAdmin
      .from("audit_logs")
      .select("*")
      .eq("action_by", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    return { ...(profile as Record<string, unknown>), recent_audit: logs ?? [] };
  }

  static async updateUserStatus(dto: {
    userId: string;
    status: AccountStatus;
    reason?: string;
    performedBy: string;
  }) {
    const { data: user } = await supabaseAdmin
      .from("profiles")
      .select("id, role, account_status")
      .eq("id", dto.userId)
      .single();
    if (!user) throw new NotFoundError(`User ${dto.userId} not found.`);
    if (user.role === "superadmin") {
      throw new ForbiddenError("Cannot change status of another superadmin.");
    }

    const { data: updated, error } = await supabaseAdmin
      .from("profiles")
      .update({ account_status: dto.status })
      .eq("id", dto.userId)
      .select()
      .single();
    if (error) throw new Error(error.message);

    await recordAudit({
      actionBy: dto.performedBy,
      actionRole: "superadmin",
      tableName: "profiles",
      recordId: dto.userId,
      action: "STATUS_CHANGE",
      oldValue: { account_status: user.account_status },
      newValue: { account_status: dto.status, reason: dto.reason },
    });

    return updated;
  }

  static async deleteUser(userId: string) {
    const { data: user } = await supabaseAdmin
      .from("profiles")
      .select("id, role")
      .eq("id", userId)
      .single();
    if (!user) throw new NotFoundError(`User ${userId} not found.`);
    if (user.role === "superadmin") {
      throw new ForbiddenError("Cannot delete a superadmin account.");
    }

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        account_status: "inactive",
      })
      .eq("id", userId);
    if (error) throw new Error(error.message);

    return { deletedUserId: userId };
  }

  static async impersonateUser(targetUserId: string, superadminId: string) {
    const { data: target } = await supabaseAdmin
      .from("profiles")
      .select("id, email, role")
      .eq("id", targetUserId)
      .single();
    if (!target) throw new NotFoundError(`User ${targetUserId} not found.`);
    if (target.role === "superadmin") {
      throw new ForbiddenError("Cannot impersonate another superadmin.");
    }

    const { data: linkData, error } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: target.email,
      });
    if (error) throw new Error(error.message);

    await recordAudit({
      actionBy: superadminId,
      actionRole: "superadmin",
      tableName: "profiles",
      recordId: targetUserId,
      action: "LOGIN",
      note: "impersonation link generated",
    });

    return {
      properties: linkData.properties,
      targetUser: { id: target.id, email: target.email },
    };
  }
}

export class AdminService {
  static async listAdmins() {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, role, account_status, created_at")
      .eq("role", "superadmin")
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  }

  static async createAdmin(dto: {
    name: string;
    email: string;
    password: string;
    role?: string;
  }) {
    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", dto.email)
      .maybeSingle();
    if (existing) throw new ConflictError(`Email ${dto.email} is already registered.`);

    const { data: authData, error: authErr } =
      await supabaseAdmin.auth.admin.createUser({
        email: dto.email,
        password: dto.password,
        email_confirm: true,
        user_metadata: { full_name: dto.name },
      });
    if (authErr) throw new Error(authErr.message);

    const uid = authData.user.id;
    await supabaseAdmin
      .from("profiles")
      .update({ full_name: dto.name, role: "superadmin" as UserRole })
      .eq("id", uid);
    await supabaseAdmin.from("citizens").delete().eq("id", uid);

    return {
      id: uid,
      full_name: dto.name,
      email: dto.email,
      role: "superadmin",
    };
  }
}

export class StatsService {
  static async getDashboardStats() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

    const [
      profiles,
      municipalities,
      complaints,
      pendingInvites,
    ] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id, role, account_status, created_at", { count: "exact" })
        .eq("is_deleted", false),
      supabaseAdmin
        .from("municipalities")
        .select("m_uid", { count: "exact", head: true })
        .eq("is_deleted", false),
      supabaseAdmin
        .from("complaints")
        .select("co_uid", { count: "exact", head: true })
        .eq("is_deleted", false),
      supabaseAdmin
        .from("staff_invitations")
        .select("inv_uid", { count: "exact", head: true })
        .eq("status", "pending"),
    ]);

    const rows = profiles.data ?? [];
    const byRole = rows.reduce(
      (acc, r) => {
        acc[r.role] = (acc[r.role] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      profiles: {
        total: profiles.count ?? 0,
        active: rows.filter((r) => r.account_status === "active").length,
        suspended: rows.filter((r) => r.account_status === "suspended").length,
        byRole,
        newToday: rows.filter(
          (r) => new Date(r.created_at) >= startOfDay,
        ).length,
        newThisWeek: rows.filter(
          (r) => new Date(r.created_at) >= startOfWeek,
        ).length,
      },
      municipalities: { total: municipalities.count ?? 0 },
      complaints: { total: complaints.count ?? 0 },
      pendingInvitations: pendingInvites.count ?? 0,
      generatedAt: new Date(),
    };
  }
}

export class AuditLogService {
  static async listLogs(options: PaginationOptions) {
    const { from, to, page, limit } = paginate(
      options.page || 1,
      options.limit || 20,
    );
    const { data, count, error } = await supabaseAdmin
      .from("audit_logs")
      .select("*", { count: "exact" })
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
}

/** No feature_flags table in schema — stub for route compatibility */
export class FeatureFlagService {
  static async listFlags() {
    return [];
  }

  static async toggleFlag(flagId: string, _enabled: boolean) {
    throw new NotFoundError(
      `Feature flags are not defined in the database schema (id: ${flagId}).`,
    );
  }
}
