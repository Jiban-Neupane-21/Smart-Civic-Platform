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
   * /api/v1/department/dashboard:
   *   get:
   *     summary: Fetch the department operational summary
   *     description: Aggregates complaint status counts, resolution rate, staff roster size, active teams, and the most recent complaints for the authenticated department head's department.
   *     tags: [Department API]
   *     security:
   *       - BearerAuth: []
   *     responses:
   *       200:
   *         description: Department dashboard summary retrieved successfully.
   *       403:
   *         description: Caller is not an active department head.
   */
  router.get("/dashboard", controller.getDashboard);

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
   *             $ref: '#/components/schemas/CreateTeamRequest'
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
   *             $ref: '#/components/schemas/AssignTeamMemberRequest'
   *     responses:
   *       201:
   *         description: Staff profile linked to the team successfully.
   */
  router.post("/teams/assign-member", controller.attachStaff);

  // ─── Team Management ─────────────────────────────────────────────────────────

  /** List all teams in the department with member details */
  router.get("/teams", controller.getTeams);

  /** Get a single team by name with full member details */
  router.get("/teams/:teamName", controller.getTeamDetails);

  /** Update team fields (name, description, is_active) */
  router.patch("/teams/:teamName", controller.updateTeam);

  /** Remove a staff member from a team */
  router.delete("/teams/:teamName/members/:staffId", controller.removeMember);

  /** Toggle leader status for a team member */
  router.patch("/teams/:teamName/members/:staffId", controller.toggleLeader);

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
   *             $ref: '#/components/schemas/UpdateComplaintStateRequest'
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
   *             $ref: '#/components/schemas/CreateUserRequest'
   *     responses:
   *       201:
   *         description: Staff account created successfully.
   *       400:
   *         description: Validation error or duplicate email.
   */
  router.post("/staff/create", controller.createStaff);

  /**
   * @openapi
   * /api/v1/department/staff/{staffId}:
   *   patch:
   *     summary: Update a department staff member's profile
   *     description: Allows the department head to edit staff details such as name, email, phone, expertise, status, and other personal information. Only staff belonging to this department can be modified.
   *     tags: [Department API]
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: path
   *         name: staffId
   *         required: true
   *         schema: { type: string, format: uuid }
   *         description: Unique staff record identifier (s_uid).
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               full_name: { type: string, description: "Staff full name (updates profile)." }
   *               email: { type: string, format: email, description: "Staff email (updates profile)." }
   *               phone: { type: string, description: "Staff phone (updates profile)." }
   *               expertise: { type: string, description: "Area of expertise." }
   *               contact_number: { type: string, description: "Direct contact number." }
   *               employee_status: { type: string, enum: [active, inactive, suspended], description: "Employment status." }
   *               gender: { type: string, description: "Gender." }
   *               date_of_birth: { type: string, format: date, description: "Date of birth." }
   *               personal_address: { type: string, description: "Residential address." }
   *     responses:
   *       200:
   *         description: Staff record updated successfully.
   *       400:
   *         description: Validation error or staff not found in this department.
   */
  router.patch("/staff/:staffId", controller.updateStaff);

  /**
   * @openapi
   * /api/v1/department/staff/{staffId}:
   *   delete:
   *     summary: Soft-delete a department staff member
   *     description: Marks the staff record as deleted and deactivates their linked profile. The staff member will no longer be able to log in. Only staff belonging to this department can be removed.
   *     tags: [Department API]
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: path
   *         name: staffId
   *         required: true
   *         schema: { type: string, format: uuid }
   *         description: Unique staff record identifier (s_uid).
   *     responses:
   *       200:
   *         description: Staff member deactivated successfully.
   *       400:
   *         description: Staff not found or access denied.
   */
  router.delete("/staff/:staffId", controller.removeStaff);

  return router;
}
