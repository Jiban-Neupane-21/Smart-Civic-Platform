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
   *             $ref: '#/components/schemas/ProvisionMunicipalityRequest'
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
   *             $ref: '#/components/schemas/AssignRoleRequest'
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
   *             $ref: '#/components/schemas/ManageStatusRequest'
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
   *             $ref: '#/components/schemas/CreateUserRequest'
   *     responses:
   *       201:
   *         description: User account created successfully.
   *       400:
   *         description: Validation error or duplicate email.
   */
  router.post("/users/create", controller.createUser);

  /**
   * @openapi
   * /api/v1/superadmin/municipalities:
   *   get:
   *     summary: Fetch all municipalities
   *     description: Returns a list of all registered municipalities in the system.
   *     tags: [Superadmin API]
   *     security:
   *       - BearerAuth: []
   *     responses:
   *       200:
   *         description: Municipalities retrieved successfully.
   */
  router.get("/municipalities", controller.getMunicipalities);

  /**
   * @openapi
   * /api/v1/superadmin/municipalities/{id}:
   *   delete:
   *     summary: Delete a municipality
   *     description: Deletes a municipality by its ID.
   *     tags: [Superadmin API]
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: The UUID of the municipality.
   *     responses:
   *       200:
   *         description: Municipality deleted successfully.
   */
  router.put("/municipalities/:id", controller.updateMunicipality);
  router.delete("/municipalities/:id", controller.deleteMunicipality);

  return router;
}
