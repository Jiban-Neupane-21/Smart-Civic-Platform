import { Router } from "express";
import { NotificationsController } from "../controller/notification.controller";
import { SupabaseClient } from "@supabase/supabase-js";

const requireAuth =
  (supabase: SupabaseClient) => async (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token)
      return res
        .status(401)
        .json({ error: "Session verification key dropped." });
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);
    if (error || !user)
      return res.status(401).json({ error: "Invalid active session token." });
    req.user = user;
    next();
  };

export function createNotificationsRouter(
  supabase: SupabaseClient,
  controller: NotificationsController,
): Router {
  const router = Router();
  router.use(requireAuth(supabase));

  /**
   * @openapi
   * /api/v1/notifications/broadcast:
   *   post:
   *     summary: Dispatch administrative notice layout
   *     tags: [Notifications Engine]
   *     security: [{ BearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [audience_type, title, body]
   *             properties:
   *               audience_type: { type: string, enum: [all_departments, all_staff, particular_department, particular_staff, department_internal_staff] }
   *               target_municipality_id: { type: string, format: uuid }
   *               target_department_id: { type: string, format: uuid }
   *               target_staff_profile_id: { type: string, format: uuid }
   *               title: { type: string, example: "Quarterly Environmental Budget Adjustments" }
   *               body: { type: string, example: "Please review structural field work re-allocations posted in department folders." }
   */
  router.post("/broadcast", controller.sendAlert);
  router.get("/inbound-queue", controller.fetchMyAlerts);
  router.patch("/:notificationId/acknowledge", controller.readAlert);

  return router;
}
