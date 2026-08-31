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
      .select("role, account_status, force_password_reset")
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
    
    req.user.force_password_reset = profile.force_password_reset;
    req.user.role = profile.role;
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

  const { forcePasswordReset } = require("../../../middleware/forcePasswordReset");
  router.use(forcePasswordReset);

  /**
   * @openapi
   * /api/v1/superadmin/analytics:
   *   get:
   *     summary: Fetch system-wide macro metrics
   *     tags: [Superadmin API]
   *     security:
   *       - BearerAuth: []
   *     responses:
   *       200:
   *         description: Macro metrics loaded successfully.
   */
  router.get("/analytics", controller.getMetrics);

  /**
   * @openapi
   * /api/v1/superadmin/provinces:
   *   get:
   *     summary: Fetch all provinces
   *     tags: [Superadmin Reference Data]
   *     security:
   *       - BearerAuth: []
   *     responses:
   *       200:
   *         description: List of provinces retrieved successfully.
   */
  router.get("/provinces", controller.getProvinces);

  /**
   * @openapi
   * /api/v1/superadmin/districts:
   *   get:
   *     summary: Fetch districts (optionally filtered by province_id)
   *     tags: [Superadmin Reference Data]
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: query
   *         name: province_id
   *         schema: { type: string, format: uuid }
   *     responses:
   *       200:
   *         description: List of districts.
   */
  router.get("/districts", controller.getDistricts);

  /**
   * @openapi
   * /api/v1/superadmin/municipalities/reference:
   *   get:
   *     summary: Fetch reference municipalities for cascading dropdowns
   *     tags: [Superadmin Reference Data]
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: query
   *         name: district_id
   *         schema: { type: string, format: uuid }
   *       - in: query
   *         name: is_active
   *         schema: { type: boolean }
   *     responses:
   *       200:
   *         description: Reference municipalities list.
   */
  router.get("/municipalities/reference", controller.getReferenceMunicipalities);

  /**
   * @openapi
   * /api/v1/superadmin/municipalities/{id}/detail:
   *   get:
   *     summary: Fetch full municipality detail
   *     tags: [Superadmin Reference Data]
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *     responses:
   *       200:
   *         description: Full municipality detail with province & district names.
   */
  router.get("/municipalities/:id/detail", controller.getMunicipalityDetail);

  /**
   * @openapi
   * /api/v1/superadmin/wards/{municipality_id}:
   *   get:
   *     summary: Fetch wards for a municipality
   *     tags: [Superadmin Reference Data]
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: path
   *         name: municipality_id
   *         required: true
   *         schema: { type: string, format: uuid }
   *     responses:
   *       200:
   *         description: List of wards.
   */
  router.get("/wards/:municipality_id", controller.getWards);

  /**
   * @openapi
   * /api/v1/superadmin/municipalities/provision:
   *   post:
   *     summary: Provision and activate pre-seeded municipality entity
   *     tags: [Superadmin API]
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [municipality_id, head_name, head_email]
   *             properties:
   *               municipality_id: { type: string, format: uuid }
   *               head_name: { type: string }
   *               head_email: { type: string }
   *               head_password: { type: string }
   *     responses:
   *       201:
   *         description: Municipality infrastructure successfully provisioned.
   */
  router.post("/municipalities/provision", controller.provisionMunicipality);

  /**
   * @openapi
   * /api/v1/superadmin/users/assign-role:
   *   patch:
   *     summary: Elevate or alter systemic authorization roles
   *     tags: [Superadmin API]
   *     security:
   *       - BearerAuth: []
   *     responses:
   *       200:
   *         description: Core account role elevated.
   */
  router.patch("/users/assign-role", controller.changeUserRole);

  /**
   * @openapi
   * /api/v1/superadmin/users/manage-status:
   *   patch:
   *     summary: Enforce account lifecycle status transitions
   *     tags: [Superadmin API]
   *     security:
   *       - BearerAuth: []
   *     responses:
   *       200:
   *         description: Profile status updated.
   */
  router.patch("/users/manage-status", controller.restrictUserAccess);

  /**
   * @openapi
   * /api/v1/superadmin/audit-logs:
   *   get:
   *     summary: Query the system immutable audit logging stream
   *     tags: [Superadmin API]
   *     security:
   *       - BearerAuth: []
   *     responses:
   *       200:
   *         description: Audit records retrieved.
   */
  router.get("/audit-logs", controller.getSystemAudits);

  /**
   * @openapi
   * /api/superadmin/users/create:
   *   post:
   *     summary: Create a municipality head user account
   *     tags: [Superadmin API]
   *     security:
   *       - BearerAuth: []
   *     responses:
   *       201:
   *         description: User account created.
   */
  router.post("/users/create", controller.createUser);

  /**
   * @openapi
   * /api/v1/superadmin/municipalities:
   *   get:
   *     summary: Fetch all active municipalities with joined province & district details
   *     tags: [Superadmin API]
   *     security:
   *       - BearerAuth: []
   *     responses:
   *       200:
   *         description: Active municipalities retrieved successfully.
   */
  router.get("/municipalities", controller.getMunicipalities);

  /**
   * @openapi
   * /api/v1/superadmin/municipalities/{id}:
   *   put:
   *     summary: Update a municipality
   *     tags: [Superadmin API]
   *   delete:
   *     summary: Delete a municipality
   *     tags: [Superadmin API]
   */
  /**
   * @openapi
   * /api/v1/superadmin/municipalities/{id}/kyc:
   *   patch:
   *     summary: Review and update a municipality's KYC status
   *     tags: [Superadmin API]
   *     security:
   *       - BearerAuth: []
   */
  router.patch("/municipalities/:id/kyc", controller.reviewMunicipalityKyc);

  router.put("/municipalities/:id", controller.updateMunicipality);
  router.delete("/municipalities/:id", controller.deleteMunicipality);

  return router;
}
