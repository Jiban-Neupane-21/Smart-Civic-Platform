import { Router } from "express";
import { MunicipalityController } from "../controller/municipality.controller";
import { verifyMunicipalityHeadContext } from "../middleware/municipality.middleware";
import { SupabaseClient } from "@supabase/supabase-js";

const requireAuth =
  (supabase: SupabaseClient) => async (req: any, res: any, next: any) => {
    console.log("requireAuth: incoming request to", req.originalUrl);
    console.log("requireAuth: headers received:", req.headers);
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.log("requireAuth: Authorization header absent.");
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

  // Enforce global route authentication
  router.use(requireAuth(supabaseAdminClient));

  // Department categories can be read by any authenticated user (e.g., citizens filing complaints)
  router.get("/departments/categories", controller.getDepartmentCategories);

  // Enforce contextual verification for Municipality Head privileges for remaining routes
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
   *             $ref: '#/components/schemas/ProvisionDepartmentRequest'
   *     responses:
   *       201:
   *         description: Department entity successfully registered.
   *       400:
   *         description: Data entry constraint failure.
   */
  router.post("/departments/create", controller.provisionDepartment);

  // New CRUD endpoints expected by frontend: /api/municipality/:municipalityId/departments
  router.get("/:municipalityId/departments", controller.getDepartments);
  router.get("/departments", controller.getDepartments);
  router.post("/:municipalityId/departments", controller.provisionDepartment);
  router.patch("/:municipalityId/departments/:id", controller.updateDepartment);
  router.patch("/departments/:id", controller.updateDepartment);
  router.delete("/:municipalityId/departments/:id", controller.deleteDepartment);
  router.delete("/departments/:id", controller.deleteDepartment);

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
   *             $ref: '#/components/schemas/OnboardStaffRequest'
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
   *             $ref: '#/components/schemas/CreateUserRequest'
   *     responses:
   *       201:
   *         description: User account created successfully.
   *       400:
   *         description: Validation error or duplicate email.
   */
  router.post("/users/create", controller.createUser);

  return router;
}
