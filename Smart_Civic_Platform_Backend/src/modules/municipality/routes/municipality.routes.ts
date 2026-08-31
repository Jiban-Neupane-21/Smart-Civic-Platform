import { Router } from "express";
import { MunicipalityController } from "../controller/municipality.controller";
import { verifyMunicipalityHeadContext } from "../middleware/municipality.middleware";
import { SupabaseClient } from "@supabase/supabase-js";

const requireAuth =
  (supabase: SupabaseClient) => async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Authorization header absent." });
    }

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

export function createMunicipalityRouter(
  supabaseAdminClient: SupabaseClient,
  controller: MunicipalityController,
): Router {
  const router = Router();

  router.use(requireAuth(supabaseAdminClient));

  /**
   * @swagger
   * /api/municipality/departments/categories:
   *   get:
   *     summary: List system department categories
   *     tags: [Municipality API]
   *     security: [{ BearerAuth: [] }]
   *     responses:
   *       200:
   *         description: Department categories list.
   */
  router.get("/departments/categories", controller.getDepartmentCategories);

  router.use(verifyMunicipalityHeadContext(supabaseAdminClient));

  /**
   * @swagger
   * /api/municipality/profile:
   *   get:
   *     summary: Get municipality's own full profile including KYC status
   *     tags: [Municipality API]
   *     security: [{ BearerAuth: [] }]
   *     responses:
   *       200:
   *         description: Municipality profile data.
   *   patch:
   *     summary: Update municipality profile and submit KYC documents
   *     tags: [Municipality API]
   *     security: [{ BearerAuth: [] }]
   *     responses:
   *       200:
   *         description: Profile updated.
   */
  router.get("/profile", controller.getMunicipalityProfile);
  router.patch("/profile", controller.updateMunicipalityProfile);

  const { forcePasswordReset } = require("../../../middleware/forcePasswordReset");
  const { requireKyc } = require("../../../middleware/requireKyc");
  router.use(forcePasswordReset);
  router.use(requireKyc);

  /**
   * @swagger
   * /api/municipality/analytics:
   *   get:
   *     summary: Municipality operational analytics dashboard metrics
   *     tags: [Municipality API]
   *     security: [{ BearerAuth: [] }]
   *     responses:
   *       200:
   *         description: Analytics summary loaded.
   */
  router.get("/analytics", controller.getAnalytics);

  /**
   * @swagger
   * /api/municipality/logo:
   *   put:
   *     summary: Update municipality logo
   *     tags: [Municipality API]
   *     security: [{ BearerAuth: [] }]
   *     responses:
   *       200:
   *         description: Logo updated successfully.
   */
  router.put("/logo", controller.updateLogo);

  /**
   * @swagger
   * /api/municipality/departments:
   *   get:
   *     summary: List departments in municipality
   *     tags: [Municipality API]
   *     security: [{ BearerAuth: [] }]
   *     responses:
   *       200:
   *         description: Departments list.
   *   post:
   *     summary: Provision a new department and generate department head invite
   *     tags: [Municipality API]
   *     security: [{ BearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/ProvisionDepartmentRequest'
   *     responses:
   *       201:
   *         description: Department provisioned and invite generated.
   */
  router.get("/departments", controller.getDepartments);
  router.post("/departments", controller.provisionDepartment);
  router.post("/departments/create", controller.provisionDepartment);

  /**
   * @swagger
   * /api/municipality/departments/{id}:
   *   get:
   *     summary: Get department details
   *     tags: [Municipality API]
   *     security: [{ BearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: Department details.
   *   patch:
   *     summary: Update department configuration
   *     tags: [Municipality API]
   *     security: [{ BearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: Department updated.
   *   delete:
   *     summary: Delete department
   *     tags: [Municipality API]
   *     security: [{ BearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: Department deleted.
   */
  router.get("/departments/:id", controller.getDepartmentDetail);
  router.patch("/departments/:id", controller.updateDepartment);
  router.delete("/departments/:id", controller.deleteDepartment);
  router.post("/departments/:id/replace-head", controller.replaceDepartmentHead);
  router.patch("/departments/:id/kyc", controller.reviewDepartmentKyc);

  router.get("/:municipalityId/departments", controller.getDepartments);
  router.post("/:municipalityId/departments", controller.provisionDepartment);
  router.get("/:municipalityId/departments/:id", controller.getDepartmentDetail);
  router.patch("/:municipalityId/departments/:id", controller.updateDepartment);
  router.delete("/:municipalityId/departments/:id", controller.deleteDepartment);
  router.patch("/:municipalityId/departments/:id/kyc", controller.reviewDepartmentKyc);

  /**
   * @swagger
   * /api/municipality/staff:
   *   get:
   *     summary: List staff profiles in municipality
   *     tags: [Municipality API]
   *     security: [{ BearerAuth: [] }]
   *     responses:
   *       200:
   *         description: Staff list.
   *   post:
   *     summary: Dispatch staff role invitation
   *     tags: [Municipality API]
   *     security: [{ BearerAuth: [] }]
   *     responses:
   *       201:
   *         description: Invitation created.
   */
  router.get("/staff", controller.listStaff);
  router.post("/staff", controller.createStaff);
  router.post("/staff/onboard", controller.onboardStaffProfile);
  router.patch("/staff/:staffId", controller.updateStaff);
  router.delete("/staff/:staffId", controller.deleteStaff);
  router.patch("/staff/:staffId/status", controller.updateStaffStatus);
  router.patch("/staff/:id/kyc", controller.reviewStaffKyc);
  router.post("/staff/:staffId/reset-password", controller.resetStaffPassword);

  router.get("/:municipalityId/staff", controller.listStaff);
  router.post("/:municipalityId/staff", controller.createStaff);
  router.patch("/:municipalityId/staff/:staffId", controller.updateStaff);
  router.delete("/:municipalityId/staff/:staffId", controller.deleteStaff);
  router.patch("/:municipalityId/staff/:staffId/status", controller.updateStaffStatus);
  router.patch("/:municipalityId/staff/:id/kyc", controller.reviewStaffKyc);
  router.post("/:municipalityId/staff/:staffId/reset-password", controller.resetStaffPassword);

  /**
   * @swagger
   * /api/municipality/complaints:
   *   get:
   *     summary: List all complaints across municipality
   *     tags: [Municipality API]
   *     security: [{ BearerAuth: [] }]
   *     responses:
   *       200:
   *         description: Complaints list.
   */
  router.get("/complaints", controller.getComplaints);

  /**
   * @swagger
   * /api/municipality/kyc-pending:
   *   get:
   *     summary: List citizens awaiting identity verification (KYC review)
   *     tags: [Municipality API]
   *     security: [{ BearerAuth: [] }]
   *     responses:
   *       200:
   *         description: Pending KYC list.
   */
  router.get("/kyc-pending", controller.getPendingKycList);
  router.get("/kyc-pending/:citizenId", controller.getKycCitizenDetail);

  /**
   * @swagger
   * /api/municipality/kyc-pending/{citizenId}:
   *   patch:
   *     summary: Review citizen KYC application (verify or reject)
   *     tags: [Municipality API]
   *     security: [{ BearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: citizenId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/KycReviewRequest'
   *     responses:
   *       200:
   *         description: KYC status updated.
   */
  router.patch("/kyc-pending/:citizenId", controller.reviewKyc);

  router.get("/:municipalityId/kyc-pending", controller.getPendingKycList);
  router.get("/:municipalityId/kyc-pending/:citizenId", controller.getKycCitizenDetail);
  router.patch("/:municipalityId/kyc-pending/:citizenId", controller.reviewKyc);

  /**
   * @swagger
   * /api/municipality/teams:
   *   get:
   *     summary: List cross-department emergency task force teams
   *     tags: [Municipality API]
   *     security: [{ BearerAuth: [] }]
   *     responses:
   *       200:
   *         description: Teams list.
   *   post:
   *     summary: Provision a cross-department emergency task force team
   *     tags: [Municipality API]
   *     security: [{ BearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateCrossDeptTeamRequest'
   *     responses:
   *       201:
   *         description: Cross-dept team created.
   */
  router.get("/teams", controller.getCrossDeptTeams);
  router.post("/teams", controller.createCrossDeptTeam);
  router.delete("/teams/:teamId", controller.deactivateCrossDeptTeam);
  router.post("/teams/:teamId/assign-complaint", controller.assignComplaintToTeam);
  router.get("/teams/:teamId/complaints", controller.getTeamComplaints);

  router.get("/:municipalityId/teams", controller.getCrossDeptTeams);
  router.post("/:municipalityId/teams", controller.createCrossDeptTeam);
  router.delete("/:municipalityId/teams/:teamId", controller.deactivateCrossDeptTeam);
  router.post("/:municipalityId/teams/:teamId/assign-complaint", controller.assignComplaintToTeam);
  router.get("/:municipalityId/teams/:teamId/complaints", controller.getTeamComplaints);

  /**
   * @swagger
   * /api/municipality/complaints:
   *   get:
   *     summary: Get all complaints for the municipality
   *     tags: [Municipality API]
   *     security: [{ BearerAuth: [] }]
   *     responses:
   *       200:
   *         description: Complaints list.
   */
  router.get("/complaints", controller.getComplaints);

  /**
   * @swagger
   * /api/municipality/complaints/escalated:
   *   get:
   *     summary: Get SLA Level 2 escalated grievances feed
   *     tags: [Municipality API]
   *     security: [{ BearerAuth: [] }]
   *     responses:
   *       200:
   *         description: Escalated complaints feed.
   */
  router.get("/complaints/escalated", controller.getEscalatedComplaints);

  /**
   * @swagger
   * /api/municipality/complaints/{id}/intervene:
   *   post:
   *     summary: Municipality Head administrative intervention on escalated complaint
   *     tags: [Municipality API]
   *     security: [{ BearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/InterveneComplaintRequest'
   *     responses:
   *       200:
   *         description: Intervention executed.
   */
  router.post("/complaints/:id/intervene", controller.interveneInComplaint);

  router.get("/:municipalityId/complaints", controller.getComplaints);
  router.get("/:municipalityId/complaints/escalated", controller.getEscalatedComplaints);
  router.post("/:municipalityId/complaints/:id/intervene", controller.interveneInComplaint);

  router.post("/users/create", controller.createUser);

  return router;
}
