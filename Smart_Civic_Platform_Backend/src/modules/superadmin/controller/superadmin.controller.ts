import { Response } from "express";
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
