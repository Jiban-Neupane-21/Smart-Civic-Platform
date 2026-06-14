import { Router } from "express";
import { MunicipalityController } from "../controller/municipality.controller";
import { verifyMunicipalityHeadContext } from "../middleware/municipality.middleware";
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

export function createMunicipalityRouter(
  supabaseAdminClient: SupabaseClient,
  controller: MunicipalityController,
): Router {
  const router = Router();

  // Enforce global route authentication and contextual verification
  router.use(requireAuth(supabaseAdminClient));
  router.use(verifyMunicipalityHeadContext(supabaseAdminClient));

  /**
   * @openapi
   * /api/v1/municipality/analytics:
   *   get:
   *     summary: Fetch local municipal performance data
   *     description: Extracts complaint counts and resolution rates for the managed municipality.
   *     tags: [Municipality API]
   *     security:
   *       - BearerAuth: []
   *     responses:
   *       200:
   *         description: Municipal metrics loaded successfully.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success: { type: boolean, example: true }
   *                 data:
   *                   type: object
   *                   properties:
   *                     municipality_id: { type: string, format: uuid }
   *                     official_name: { type: string, example: "Lalitpur Metropolitan City" }
   *                     pending_count: { type: integer, example: 5 }
   *                     ongoing_count: { type: integer, example: 12 }
   *                     resolved_count: { type: integer, example: 45 }
   *                     rejected_count: { type: integer, example: 2 }
   *                     total_complaints: { type: integer, example: 64 }
   *                     dynamic_resolution_rate: { type: number, example: 70.31 }
   */
  router.get("/analytics", controller.getAnalytics);

  /**
   * @openapi
   * /api/v1/municipality/departments/create:
   *   post:
   *     summary: Register an internal operational department
   *     description: Deploys a new specialized division (e.g., Waste Management, Infrastructure Development) within this municipality.
   *     tags: [Municipality API]
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - department_name
   *               - official_email
   *               - head_name
   *               - head_email
   *             properties:
   *               department_name: { type: string, example: "Civil Infrastructure Engineering" }
   *               official_email: { type: string, example: "infra@lalitpurmun.gov.np" }
   *               head_name: { type: string, example: "Er. Ramesh Shrestha" }
   *               head_email: { type: string, example: "ramesh.infra@lalitpurmun.gov.np" }
   *               head_profile_id: { type: string, format: uuid }
   *     responses:
   *       201:
   *         description: Department entity successfully registered.
   *       400:
   *         description: Data entry constraint failure.
   */
  router.post("/departments/create", controller.provisionDepartment);

  /**
   * @openapi
   * /api/v1/municipality/staff/onboard:
   *   post:
   *     summary: Enboard professional municipal personnel
   *     description: Attaches a base profile directly to a specific department within the municipality's staff register.
   *     tags: [Municipality API]
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - profile_id
   *               - primary_department_id
   *               - employee_id
   *               - expertise
   *             properties:
   *               profile_id: { type: string, format: uuid }
   *               primary_department_id: { type: string, format: uuid }
   *               employee_id: { type: string, example: "LMC-2026-894" }
   *               expertise: { type: string, example: "Hydraulic Systems, Drainage Maintenance" }
   *               contact_number: { type: string, example: "+9779851000000" }
   *               gender: { type: string, enum: [male, female, other, prefer_not_to_say], example: "male" }
   *     responses:
   *       201:
   *         description: Personnel successfully onboarded to the target department.
   */
  router.post("/staff/onboard", controller.onboardStaffProfile);

  /**
   * @openapi
   * /api/v1/municipality/complaints:
   *   get:
   *     summary: Fetch regional grievance log
   *     description: Returns a list of citizens' complaints filed under this specific regional jurisdiction.
   *     tags: [Municipality API]
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: query
   *         name: status
   *         schema: { type: string, enum: [pending, ongoing, resolved, rejected] }
   *         description: Optional status filter.
   *     responses:
   *       200:
   *         description: Regional logging array returned cleanly.
   */
  router.get("/complaints", controller.getComplaints);

  /**
   * @openapi
   * /api/municipality/users/create:
   *   post:
   *     summary: Create a department head or staff user account
   *     description: Directly creates a new user with department_head or staff role under this municipality. The user is created with force_password_reset enabled.
   *     tags: [Municipality API]
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
   *               - department_id
   *             properties:
   *               email: { type: string, format: email, example: "staff@lalitpurmun.gov.np" }
   *               password: { type: string, minLength: 8, example: "TempPass123!" }
   *               full_name: { type: string, example: "Er. Ramesh Shrestha" }
   *               role: { type: string, enum: [department_head, staff], example: "department_head" }
   *               department_id: { type: string, format: uuid }
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
