import { Request ,Response } from "express";
import { supabaseAdmin } from "../../../config/supabase";

import { AuthenticatedRequest } from "../middleware";
import {
  UserService,
  AdminService,
  StatsService,
  AuditLogService,
  FeatureFlagService,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from "../services/superadmin.services";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Wraps async controller handlers and forwards errors to Express error handler.
 */
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
      console.error("[SUPERADMIN CONTROLLER ERROR]", err);
      res
        .status(500)
        .json({ success: false, message: "Internal server error." });
    });
  };

const getPagination = (req: AuthenticatedRequest) => ({
  page: parseInt(req.query.page as string) || 1,
  limit: parseInt(req.query.limit as string) || 20,
  search: (req.query.search as string) || "",
});

// ─── User Controller ──────────────────────────────────────────────────────────

export class UserController {
  /**
   * GET /superadmin/users
   * List all users with pagination and search.
   */
  static list = asyncHandler(async (req, res) => {
    const result = await UserService.listUsers(getPagination(req));
    res.json({ success: true, data: result });
  });

  /**
   * GET /superadmin/users/:id
   * Get a single user's full profile.
   */
  static getById = asyncHandler(async (req, res) => {
    const user = await UserService.getUserById(String(req.params.id));
    res.json({ success: true, data: user });
  });

  /**
   * PATCH /superadmin/users/:id/status
   * Ban, suspend, or reactivate a user.
   * Body: { status: 'banned' | 'suspended' | 'active', reason?: string }
   */
  static updateStatus = asyncHandler(async (req, res) => {
    const { status, reason } = req.body;
    const user = await UserService.updateUserStatus({
      userId: String(req.params.id),
      status,
      reason,
      performedBy: req.user!.userId,
    });
    res.json({
      success: true,
      message: `User status updated to '${status}'.`,
      data: user,
    });
  });

  /**
   * DELETE /superadmin/users/:id
   * Permanently delete a user account.
   */
  static delete = asyncHandler(async (req, res) => {
    const result = await UserService.deleteUser(String(req.params.id));
    res.json({
      success: true,
      message: "User deleted successfully.",
      data: result,
    });
  });

  /**
   * POST /superadmin/users/:id/impersonate
   * Generate a 30-minute token to impersonate a user.
   */
  static impersonate = asyncHandler(async (req, res) => {
    const result = await UserService.impersonateUser(
      String(req.params.id),
      req.user!.userId,
    );
    res.json({
      success: true,
      message: "Impersonation link generated.",
      data: result,
    });
  });
}

// ─── Municipality Controller ──────────────────────────────────────────────────

export class MunicipalityController {
  /**
   * POST /superadmin/municipalities
   * Create a new municipality.
   */
  static create = asyncHandler(async (req, res) => {
    const { name, region, email, head_name, head_email, head_password } = req.body;

    // Validate required head fields
    if (!head_name || !head_email || !head_password) {
      res.status(400).json({
        success: false,
        message: "head_name, head_email, and head_password are required to create the municipality head account.",
      });
      return;
    }

    // Check if head_email belongs to an ACTIVE (non-deleted) profile
    const { data: activeProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", head_email)
      .eq("is_deleted", false)
      .maybeSingle();
    if (activeProfile) {
      throw new ConflictError(`A user with email '${head_email}' already exists.`);
    }

    // If a soft-deleted profile exists for this email, purge the stale auth user
    // so the email is freed up (profile.id === auth user id in Supabase)
    const { data: staleProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", head_email)
      .eq("is_deleted", true)
      .maybeSingle();
    if (staleProfile) {
      await supabaseAdmin.auth.admin.deleteUser(staleProfile.id);
    }

    // Generate a simple slug from the name (e.g., "Kathmandu Metro" -> "kathmandu-metro-1234")
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now().toString().slice(-4);

    // Step 1: Create the municipality row
    const { data: muni, error: muniErr } = await supabaseAdmin
      .from("municipalities")
      .insert({
        official_name: name,
        region_state: region,
        login_email: email,
        slug,
      })
      .select()
      .single();

    if (muniErr) throw new ConflictError(muniErr.message);

    // Step 2: Create the Supabase Auth user for the municipality head
    // The handle_new_user DB trigger fires on createUser and inserts a bare profiles row.
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: head_email,
      password: head_password,
      email_confirm: true,
      user_metadata: {
        full_name: head_name,
        role: "municipality_head",
        municipality_id: muni.m_uid,
      },
    });

    if (authErr) {
      // Rollback: soft-delete the municipality so we don't leave an orphaned row
      await supabaseAdmin
        .from("municipalities")
        .update({ is_deleted: true, is_active: false, deleted_at: new Date().toISOString() })
        .eq("m_uid", muni.m_uid);
      throw new Error(`Municipality created but head user creation failed: ${authErr.message}`);
    }

    const headUserId = authData.user.id;

    // Step 3: Update the profile row (created by the DB trigger) with full details
    await supabaseAdmin
      .from("profiles")
      .update({
        full_name: head_name,
        role: "municipality_head",
        municipality_id: muni.m_uid,
        force_password_reset: true,  // Require head to change temp password on first login
      })
      .eq("id", headUserId);

    // Step 4: Insert a staff row linking the head to the municipality
    await supabaseAdmin.from("staff").insert({
      profile_id: headUserId,
      municipality_id: muni.m_uid,
      staff_role: "municipality_head",
      employee_status: "active",
      onboarded_at: new Date().toISOString(),
    });

    // Step 5: Set head_id on the municipality row
    await supabaseAdmin
      .from("municipalities")
      .update({ head_id: headUserId })
      .eq("m_uid", muni.m_uid);

    const formattedData = {
      id: muni.m_uid,
      name: muni.official_name,
      region: muni.region_state || "N/A",
      email: muni.login_email || "N/A",
      status: muni.is_active && !muni.is_deleted ? "Active" : "Inactive",
      head: {
        id: headUserId,
        name: head_name,
        email: head_email,
      },
    };

    res.status(201).json({
      success: true,
      message: "Municipality and head user account created successfully.",
      data: formattedData,
    });
  });

  /**
   * GET /superadmin/municipalities
   * Get all municipalities for superadmin.
   */
  static list = asyncHandler(async (req, res) => {
    // Step 1: Fetch all active municipalities
    const { data: munis, error: muniErr } = await supabaseAdmin
      .from("municipalities")
      .select("m_uid, official_name, region_state, login_email, is_active, is_deleted, created_at, head_id")
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });

    if (muniErr) throw muniErr;

    // Step 2: Batch-fetch head profiles for all municipalities that have a head_id
    const headIds = (munis || [])
      .map((m: any) => m.head_id)
      .filter(Boolean) as string[];

    let profileMap: Record<string, { full_name: string; email: string }> = {};

    if (headIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, email")
        .in("id", headIds);

      profileMap = (profiles || []).reduce(
        (acc: Record<string, { full_name: string; email: string }>, p: any) => {
          acc[p.id] = { full_name: p.full_name, email: p.email };
          return acc;
        },
        {},
      );
    }

    // Step 3: Merge and format
    const formattedData = (munis || []).map((mun: any) => {
      const head = mun.head_id ? profileMap[mun.head_id] : null;
      return {
        id: mun.m_uid,
        name: mun.official_name,
        region: mun.region_state || "N/A",
        official_email: mun.login_email || "N/A",
        head_name: head?.full_name || "N/A",
        head_email: head?.email || "N/A",
        status: mun.is_active && !mun.is_deleted ? "Active" : "Inactive",
        created_at: mun.created_at,
      };
    });

    res.status(200).json(formattedData);
  });

  /**
   * DELETE /superadmin/municipalities/:id
   * Soft-delete a municipality and fully clean up the head user account
   * so their email can be reused for a future municipality head.
   */
  static delete = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Fetch the municipality to get head_id before deleting
    const { data: muni } = await supabaseAdmin
      .from("municipalities")
      .select("m_uid, head_id")
      .eq("m_uid", id)
      .maybeSingle();

    if (!muni) {
      throw new NotFoundError(`Municipality ${id} not found.`);
    }

    // Step 1: Soft-delete the municipality row
    const { error: muniErr } = await supabaseAdmin
      .from("municipalities")
      .update({
        is_deleted: true,
        is_active: false,
        deleted_at: new Date().toISOString(),
      })
      .eq("m_uid", id);
    if (muniErr) throw muniErr;

    // Step 2: Clean up the head user if one exists
    if (muni.head_id) {
      // Soft-delete the profile so the email appears free
      await supabaseAdmin
        .from("profiles")
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          account_status: "inactive",
        })
        .eq("id", muni.head_id);

      // Deactivate the staff record
      await supabaseAdmin
        .from("staff")
        .update({ employee_status: "inactive", is_deleted: true, deleted_at: new Date().toISOString() })
        .eq("profile_id", muni.head_id);

      // Hard-delete the Supabase Auth user so the email can be reused
      await supabaseAdmin.auth.admin.deleteUser(muni.head_id);
    }

    res.status(200).json({ success: true, message: "Municipality and head user deleted successfully." });
  });

  /**
   * PATCH /superadmin/municipalities/:id
   * Update a municipality's details.
   */
  static update = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, region, email, is_active } = req.body;

    // Check it exists first
    const { data: existing } = await supabaseAdmin
      .from("municipalities")
      .select("m_uid")
      .eq("m_uid", id)
      .eq("is_deleted", false)
      .maybeSingle();

    if (!existing) {
      throw new NotFoundError(`Municipality ${id} not found.`);
    }

    const patch: Record<string, unknown> = {};
    if (name !== undefined)      patch.official_name = name;
    if (region !== undefined)    patch.region_state  = region;
    if (email !== undefined)     patch.login_email   = email;
    if (is_active !== undefined) patch.is_active     = is_active;

    const { data, error } = await supabaseAdmin
      .from("municipalities")
      .update(patch)
      .eq("m_uid", id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    const formattedData = {
      id: data.m_uid,
      name: data.official_name,
      region: data.region_state || "N/A",
      email: data.login_email || "N/A",
      status: data.is_active && !data.is_deleted ? "Active" : "Inactive",
    };

    res.status(200).json({
      success: true,
      message: "Municipality updated successfully.",
      data: formattedData,
    });
  });
}

// ─── Admin Controller ─────────────────────────────────────────────────────────

export class AdminController {
  /**
   * GET /superadmin/admins
   * List all admin accounts.
   */
  static list = asyncHandler(async (req, res) => {
    const admins = await AdminService.listAdmins();
    res.json({ success: true, data: admins });
  });

  /**
   * POST /superadmin/admins
   * Create a new admin account.
   * Body: { name, email, password, role? }
   */
  static create = asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body;
    const admin = await AdminService.createAdmin({
      name,
      email,
      password,
      role,
    });
    res.status(201).json({
      success: true,
      message: "Admin account created successfully.",
      data: admin,
    });
  });
}

// ─── Stats Controller ─────────────────────────────────────────────────────────

export class StatsController {
  /**
   * GET /superadmin/stats
   * Returns platform-wide dashboard statistics.
   */
  static overview = asyncHandler(async (req, res) => {
    const stats = await StatsService.getDashboardStats();
    res.json({ success: true, data: stats });
  });
}

// ─── Audit Log Controller ─────────────────────────────────────────────────────

export class AuditLogController {
  /**
   * GET /superadmin/audit-logs
   * Returns a paginated list of all superadmin audit log entries.
   */
  static list = asyncHandler(async (req, res) => {
    const result = await AuditLogService.listLogs(getPagination(req));
    res.json({ success: true, data: result });
  });
}

// ─── Feature Flag Controller ──────────────────────────────────────────────────

export class FeatureFlagController {
  /**
   * GET /superadmin/feature-flags
   * Returns all feature flags.
   */
  static list = asyncHandler(async (req, res) => {
    const flags = await FeatureFlagService.listFlags();
    res.json({ success: true, data: flags });
  });

  /**
   * PATCH /superadmin/feature-flags/:id/toggle
   * Enable or disable a feature flag.
   * Body: { enabled: boolean }
   */
  static toggle = asyncHandler(async (req, res) => {
    const { enabled } = req.body;
    await FeatureFlagService.toggleFlag(String(req.params.id), enabled);
    res.json({
      success: true,
      message: `Feature flag ${enabled ? "enabled" : "disabled"} (not in schema).`,
    });
  });
}
