import { Router } from "express";
import { SuperadminController } from "../controller/superadmin.controller";
import { SupabaseClient } from "@supabase/supabase-js";

const requireAuth =
  (supabase: SupabaseClient) => async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader)
      return res.status(401).json({ error: "Authorization header absent." });

    const token = authHeader.split(" ")[1];
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user)
      return res.status(401).json({ error: "Invalid active session token." });
    req.user = user;
    next();
  };

const requireSuperadminGuard =
  (supabase: SupabaseClient) => async (req: any, res: any, next: any) => {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role, account_status")
      .eq("id", req.user.id)
      .single();

    if (
      error ||
      !profile ||
      profile.role !== "superadmin" ||
      profile.account_status !== "active"
    ) {
      return res
        .status(403)
        .json({ error: "Access Denied: Superadmin privileges restricted." });
    }
    next();
  };

export function createSuperadminRouter(
  supabaseAdminClient: SupabaseClient,
  controller: SuperadminController,
): Router {
  const router = Router();

  // Route Wide Global Protection Components
  router.use(requireAuth(supabaseAdminClient));
  router.use(requireSuperadminGuard(supabaseAdminClient));

  /**
   * @openapi
   * /api/v1/superadmin/analytics:
   *   get:
   *     summary: Fetch system-wide macro metrics
   *     description: Returns aggregated, high-level operational metrics across all registered municipalities.
   *     tags: [Superadmin API]
   *     security:
   *       - BearerAuth: []
   *     responses:
   *       200:
   *         description: Macro metrics loaded successfully.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success: { type: boolean, example: true }
   *                 data:
   *                   type: object
   *                   properties:
   *                     total_municipalities: { type: integer, example: 14 }
   *                     total_departments: { type: integer, example: 56 }
   *                     total_staff: { type: integer, example: 320 }
   *                     total_citizens: { type: integer, example: 12450 }
   *                     total_active_users: { type: integer, example: 12700 }
   *                     total_suspended_users: { type: integer, example: 12 }
   *                     total_pending_complaints: { type: integer, example: 145 }
   *                     total_resolved_complaints: { type: integer, example: 1890 }
   *       401:
   *         description: Unauthorized or session expired.
   *       403:
   *         description: Forbidden. Insufficient roles.
   */
  router.get("/analytics", controller.getMetrics);

  /**
   * @openapi
   * /api/v1/superadmin/municipalities/provision:
   *   post:
   *     summary: Provision a new municipality entity
   *     description: Registers a new regional municipal jurisdiction alongside its executive administrative profile.
   *     tags: [Superadmin API]
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - official_name
   *               - official_email
   *               - head_name
   *               - head_email
   *               - municipality_type
   *             properties:
   *               official_name: { type: string, example: "Lalitpur Metropolitan City" }
   *               official_email: { type: string, example: "info@lalitpurmun.gov.np" }
   *               head_name: { type: string, example: "Chiribabu Maharjan" }
   *               head_email: { type: string, example: "mayor@lalitpurmun.gov.np" }
   *               municipality_type: { type: string, enum: [metropolitan, sub_metropolitan, urban_municipality, rural_municipality], example: "metropolitan" }
   *               total_wards: { type: integer, minimum: 0, maximum: 33, example: 29 }
   *               province: { type: string, example: "Bagmati Province" }
   *               district: { type: string, example: "Lalitpur" }
   *     responses:
   *       201:
   *         description: Municipality infrastructure successfully provisioned.
   *       400:
   *         description: Malformed structural payload or regex criteria failure.
   */
  router.post("/municipalities/provision", controller.provisionMunicipality);

  /**
   * @openapi
   * /api/v1/superadmin/users/assign-role:
   *   patch:
   *     summary: Elevate or alter systemic authorization roles
   *     description: Wraps access directly to the isolated schema RPC trigger to safely update target profile designations.
   *     tags: [Superadmin API]
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - targetUserId
   *               - newRole
   *             properties:
   *               targetUserId: { type: string, format: uuid, example: "123e4567-e89b-12d3-a456-426614174000" }
   *               newRole: { type: string, enum: [superadmin, municipality_head, department_head, staff, citizen], example: "municipality_head" }
   *     responses:
   *       200:
   *         description: Core account role elevated and audited successfully.
   *       400:
   *         description: Processing error or attempt to demote the last remaining Superadmin.
   */
  router.patch("/users/assign-role", controller.changeUserRole);

  /**
   * @openapi
   * /api/v1/superadmin/users/manage-status:
   *   patch:
   *     summary: Enforce account lifecycle status transitions
   *     description: Instantly flips status flags to suspend or reactivate individual platform profiles.
   *     tags: [Superadmin API]
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - targetUserId
   *               - status
   *             properties:
   *               targetUserId: { type: string, format: uuid, example: "8af36111-c918-4a11-b011-826315271891" }
   *               status: { type: string, enum: [active, inactive, suspended], example: "suspended" }
   *     responses:
   *       200:
   *         description: Profile successfully placed into target lifecycle phase.
   */
  router.patch("/users/manage-status", controller.restrictUserAccess);

  /**
   * @openapi
   * /api/v1/superadmin/audit-logs:
   *   get:
   *     summary: Query the system immutable audit logging stream
   *     description: Reads data records out of the read-only infrastructure audit trail.
   *     tags: [Superadmin API]
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema: { type: integer, default: 1 }
   *         description: Target page block context.
   *       - in: query
   *         name: limit
   *         schema: { type: integer, default: 20 }
   *         description: Total records per block query execution.
   *     responses:
   *       200:
   *         description: Audit records retrieved smoothly.
   */
  router.get("/audit-logs", controller.getSystemAudits);

  /**
   * @openapi
   * /api/superadmin/users/create:
   *   post:
   *     summary: Create a municipality head user account
   *     description: Directly creates a new user with the municipality_head role. The user is created with force_password_reset enabled.
   *     tags: [Superadmin API]
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *               - password
   *               - full_name
   *               - role
   *               - municipality_id
   *             properties:
   *               email: { type: string, format: email, example: "mayor@lalitpurmun.gov.np" }
   *               password: { type: string, minLength: 8, example: "TempPass123!" }
   *               full_name: { type: string, example: "Chiribabu Maharjan" }
   *               role: { type: string, enum: [municipality_head], example: "municipality_head" }
   *               municipality_id: { type: string, format: uuid }
   *               phone: { type: string, example: "+9779851000000" }
   *     responses:
   *       201:
   *         description: User account created successfully.
   *       400:
   *         description: Validation error or duplicate email.
   */
  router.post("/users/create", controller.createUser);

  return router;
}
