import { Router } from "express";
import { StaffController } from "../controller/staff.controller";
import { verifyStaffContext } from "../middleware/staff.middleware";
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

export function createStaffRouter(
  supabaseAdminClient: SupabaseClient,
  controller: StaffController,
): Router {
  const router = Router();

  // Enforce session presence and inject structural staff parameters automatically
  router.use(requireAuth(supabaseAdminClient));
  router.use(verifyStaffContext(supabaseAdminClient));

  /**
   * @openapi
   * /api/v1/staff/my-assignments:
   *   get:
   *     summary: Fetch my active field team deployments
   *     description: Returns a scannable listing of all operational task forces the authenticated staff member has been assigned to help complete.
   *     tags: [Staff API]
   *     security:
   *       - BearerAuth: []
   *     responses:
   *       200:
   *         description: Assigned work records compiled cleanly.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success: { type: boolean, example: true }
   *                 data:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       tm_id: { type: string, format: uuid }
   *                       is_leader: { type: boolean, example: false }
   *                       joined_at: { type: string, format: date-time }
   *                       teams:
   *                         type: object
   *                         properties:
   *                           team_id: { type: string, format: uuid }
   *                           team_name: { type: string, example: "Emergency Road Repair Crew" }
   *                           is_active: { type: boolean, example: true }
   *                           complaints:
   *                             type: object
   *                             properties:
   *                               id: { type: string, format: uuid }
   *                               title: { type: string, example: "Main St Sinkhole Hazard" }
   *                               status: { type: string, example: "ongoing" }
   */
  router.get("/my-assignments", controller.getMyTeams);

  /**
   * @openapi
   * /api/v1/staff/department-queue:
   *   get:
   *     summary: Fetch department level unresolved grievance queue
   *     description: Exposes the list of incoming unassigned citizen complaints routed directly to the staff member's primary department registry.
   *     tags: [Staff API]
   *     security:
   *       - BearerAuth: []
   *     responses:
   *       200:
   *         description: Department general backlog array rendered successfully.
   */
  router.get("/department-queue", controller.getDepartmentQueue);

  return router;
}
