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
   * @swagger
   * /api/notifications/broadcast:
   *   post:
   *     summary: Dispatch administrative notice layout
   *     tags: [Notifications API]
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
   *     responses:
   *       200:
   *         description: Broadcast sent
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/SuccessResponse'
   */
  router.post("/broadcast", controller.sendAlert);

  /**
   * @swagger
   * /api/notifications/inbound-queue:
   *   get:
   *     summary: Fetch my notifications
   *     tags: [Notifications API]
   *     security: [{ BearerAuth: [] }]
   *     responses:
   *       200:
   *         description: List of notifications
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/SuccessResponse'
   */
  router.get("/inbound-queue", controller.fetchMyAlerts);

  /**
   * @swagger
   * /api/notifications/{notificationId}/acknowledge:
   *   patch:
   *     summary: Mark notification as read
   *     tags: [Notifications API]
   *     security: [{ BearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: notificationId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: Notification acknowledged
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/SuccessResponse'
   */
  router.patch("/:notificationId/acknowledge", controller.readAlert);

  return router;
}
