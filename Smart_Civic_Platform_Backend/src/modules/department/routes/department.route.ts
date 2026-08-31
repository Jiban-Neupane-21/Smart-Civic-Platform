import { Router } from "express";
import { DepartmentController } from "../controller/department.controller";
import { verifyDepartmentHeadContext } from "../middleware/department.middleware";
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

export function createDepartmentRouter(
  supabaseAdminClient: SupabaseClient,
  controller: DepartmentController,
): Router {
  const router = Router();

  router.use(requireAuth(supabaseAdminClient));
  router.use(verifyDepartmentHeadContext(supabaseAdminClient));

  const { forcePasswordReset } = require("../../../middleware/forcePasswordReset");
  const { requireKyc } = require("../../../middleware/requireKyc");
  router.use(forcePasswordReset);
  router.use(requireKyc);

  /**
   * @swagger
   * /api/department/dashboard:
   *   get:
   *     summary: Department Operational Dashboard KPI Metrics
   *     tags: [Department API]
   *     security: [{ BearerAuth: [] }]
   *     responses:
   *       200:
   *         description: Metrics loaded.
   */
  router.get("/dashboard", controller.getDashboard);

  router.get("/profile", controller.getDepartmentProfile);
  router.patch("/profile", controller.setupDepartmentProfile);

  /**
   * @swagger
   * /api/department/logo:
   *   put:
   *     summary: Update department logo
   *     tags: [Department API]
   *     security: [{ BearerAuth: [] }]
   *     responses:
   *       200:
   *         description: Logo updated successfully.
   */
  router.put("/logo", controller.updateLogo);

  /**
   * @swagger
   * /api/department/queue:
   *   get:
   *     summary: Department complaint triage queue
   *     tags: [Department API]
   *     security: [{ BearerAuth: [] }]
   *     responses:
   *       200:
   *         description: Queue items.
   */
  router.get("/queue", controller.getQueue);

  /**
   * @swagger
   * /api/department/collaborations:
   *   get:
   *     summary: List cross-department collaboration requests
   *     tags: [Department API]
   *     security: [{ BearerAuth: [] }]
   *     responses:
   *       200:
   *         description: Collaborations list.
   */
  router.get("/collaborations", controller.getCollaborations);

  /**
   * @swagger
   * /api/department/complaints/export:
   *   get:
   *     summary: Export department complaints as CSV dataset
   *     tags: [Department API]
   *     security: [{ BearerAuth: [] }]
   *     responses:
   *       200:
   *         description: CSV file generated.
   */
  router.get("/complaints/export", controller.exportComplaintsCsv);

  /**
   * @swagger
   * /api/department/complaints/{complaintId}/collaborate:
   *   post:
   *     summary: Initiate cross-department collaboration request
   *     tags: [Department API]
   *     security: [{ BearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: complaintId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/DepartmentCollaborationRequest'
   *     responses:
   *       200:
   *         description: Collaboration requested.
   */
  router.post(
    "/complaints/:complaintId/collaborate",
    controller.requestCollaboration
  );

  /**
   * @swagger
   * /api/department/complaints/{complaintId}/sign-off:
   *   post:
   *     summary: Submit supporting department inspection sign-off decision
   *     tags: [Department API]
   *     security: [{ BearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: complaintId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/DepartmentSignOffRequest'
   *     responses:
   *       200:
   *         description: Sign-off recorded.
   */
  router.post(
    "/complaints/:complaintId/sign-off",
    controller.submitSignOff
  );

  /**
   * @swagger
   * /api/department/teams/create:
   *   post:
   *     summary: Provision internal operational team
   *     tags: [Department API]
   *     security: [{ BearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateTeamRequest'
   *     responses:
   *       201:
   *         description: Team created.
   */
  router.post("/teams/create", controller.setupTeam);
  router.post("/teams/assign-member", controller.attachStaff);

  /**
   * @swagger
   * /api/department/teams:
   *   get:
   *     summary: List department operational teams
   *     tags: [Department API]
   *     security: [{ BearerAuth: [] }]
   *     responses:
   *       200:
   *         description: Teams list.
   */
  router.get("/teams", controller.getTeams);
  router.get("/teams/:teamName", controller.getTeamDetails);
  router.patch("/teams/:teamName", controller.updateTeam);
  router.delete("/teams/:teamName/members/:staffId", controller.removeMember);
  router.patch("/teams/:teamName/members/:staffId", controller.toggleLeader);

  /**
   * @swagger
   * /api/department/teams/{teamName}/assign-complaint:
   *   post:
   *     summary: Assign complaint ticket to an operational team
   *     tags: [Department API]
   *     security: [{ BearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: teamName
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/AssignComplaintToTeamRequest'
   *     responses:
   *       200:
   *         description: Ticket assigned to team.
   */
  router.post("/teams/:teamName/assign-complaint", controller.assignComplaintToTeam);
  router.get("/teams/:teamName/complaints", controller.getTeamComplaints);

  /**
   * @swagger
   * /api/department/complaints/{complaintId}/state:
   *   patch:
   *     summary: Process complaint status transition (under_review, assigned, rejected)
   *     tags: [Department API]
   *     security: [{ BearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: complaintId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: Status updated.
   */
  router.patch(
    "/complaints/:complaintId/state",
    controller.processGrievanceState,
  );

  /**
   * @swagger
   * /api/department/staff-roster:
   *   get:
   *     summary: List department staff roster
   *     tags: [Department API]
   *     security: [{ BearerAuth: [] }]
   *     responses:
   *       200:
   *         description: Staff roster.
   */
  router.get("/staff-roster", controller.getStaffRoster);
  router.get("/staff", controller.getStaffRoster);

  router.post("/staff/availability", controller.checkStaffAvailability);

  /**
   * @swagger
   * /api/department/staff/create:
   *   post:
   *     summary: Dispatch staff invitation token
   *     tags: [Department API]
   *     security: [{ BearerAuth: [] }]
   *     responses:
   *       201:
   *         description: Staff invite dispatched.
   */
  router.post("/staff/create", controller.createStaff);
  router.post("/staff", controller.createStaff);
  router.post("/users/create", controller.createUser);

  router.patch("/staff/:staffId", controller.updateStaff);
  router.delete("/staff/:staffId", controller.removeStaff);
  router.patch("/staff/:staffId/status", controller.updateStaffStatus);
  router.patch("/staff/:id/kyc", controller.reviewStaffKyc);
  router.post("/staff/:staffId/reset-password", controller.resetStaffPassword);

  return router;
}
