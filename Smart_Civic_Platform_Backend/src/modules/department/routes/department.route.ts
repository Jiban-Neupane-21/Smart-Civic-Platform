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

  // Route Wide Protection Components
  router.use(requireAuth(supabaseAdminClient));
  router.use(verifyDepartmentHeadContext(supabaseAdminClient));

  /**
   * @openapi
   * /api/v1/department/teams/create:
   *   post:
   *     summary: Create an incident response team
   *     description: Instantiates an internal field squad within the department to handle a specific grievance.
   *     tags: [Department API]
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - team_name
   *               - complaint_id
   *             properties:
   *               team_name: { type: string, example: "Emergency Sewage Recovery Squad B" }
   *               complaint_id: { type: string, format: uuid, example: "bc103a89-2114-419b-aa22-127839401111" }
   *     responses:
   *       201:
   *         description: Response team registered and active.
   */
  router.post("/teams/create", controller.setupTeam);

  /**
   * @openapi
   * /api/v1/department/teams/assign-member:
   *   post:
   *     summary: Attach active personnel to a response team
   *     description: Links a specific staff profile to an active department team, optionally assigning them as a leader.
   *     tags: [Department API]
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - team_id
   *               - staff_id
   *             properties:
   *               team_id: { type: string, format: uuid, example: "c2194811-1029-4112-bb91-92837190001a" }
   *               staff_id: { type: string, format: uuid, example: "9af36111-c918-4a11-b011-826315271891" }
   *               is_leader: { type: boolean, default: false, example: true }
   *     responses:
   *       201:
   *         description: Staff profile linked to the team successfully.
   */
  router.post("/teams/assign-member", controller.attachStaff);

  /**
   * @openapi
   * /api/v1/department/complaints/{complaintId}/state:
   *   patch:
   *     summary: Transition the lifecycle state of an assigned complaint
   *     description: Allows the department head to update a complaint to ongoing, resolved, or rejected, enforcing audit notes.
   *     tags: [Department API]
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: path
   *         name: complaintId
   *         required: true
   *         schema: { type: string, format: uuid }
   *         description: Unique key id of the complaint.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - action
   *             properties:
   *               action: { type: string, enum: [ongoing, resolved, rejected], example: "resolved" }
   *               resolution_note: { type: string, example: "Main conduit line replaced. Flow testing verified normal pressure metrics." }
   *               rejection_reason: { type: string, example: "The requested repair area falls outside municipal property lines." }
   *     responses:
   *       200:
   *         description: Complaint status updated and timestamp locked.
   */
  router.patch(
    "/complaints/:complaintId/state",
    controller.processGrievanceState,
  );

  /**
   * @openapi
   * /api/v1/department/staff-roster:
   *   get:
   *     summary: Fetch department personnel roster
   *     description: Returns the full list of staff profiles operating under this department head's jurisdiction.
   *     tags: [Department API]
   *     security:
   *       - BearerAuth: []
   *     responses:
   *       200:
   *         description: Roster retrieved successfully.
   */
  router.get("/staff-roster", controller.getStaffRoster);

  /**
   * @openapi
   * /api/department/staff/create:
   *   post:
   *     summary: Create a staff user account in this department
   *     description: Directly creates a new staff user under this department. The user is created with force_password_reset enabled. Department and municipality IDs are auto-filled from the authenticated department head's context.
   *     tags: [Department API]
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
   *             properties:
   *               email: { type: string, format: email, example: "technician@lalitpurmun.gov.np" }
   *               password: { type: string, minLength: 8, example: "TempPass123!" }
   *               full_name: { type: string, example: "Bikash Tamang" }
   *               phone: { type: string, example: "+9779851000000" }
   *     responses:
   *       201:
   *         description: Staff account created successfully.
   *       400:
   *         description: Validation error or duplicate email.
   */
  router.post("/staff/create", controller.createStaff);

  return router;
}
