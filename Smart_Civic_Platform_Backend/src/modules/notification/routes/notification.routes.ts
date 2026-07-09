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
   *     tags: [Superadmin API, Municipality API, Department API]
   *     security: [{ BearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/BroadcastNotificationRequest'
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
   *     tags: [Superadmin API, Municipality API, Department API, Staff API, Citizen API]
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
   *     tags: [Superadmin API, Municipality API, Department API, Staff API, Citizen API]
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
