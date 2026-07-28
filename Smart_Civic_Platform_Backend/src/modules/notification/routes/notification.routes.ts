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
   * /api/notifications:
   *   get:
   *     summary: Fetch my notification feed
   *     tags: [Notifications API]
   *     security: [{ BearerAuth: [] }]
   *     responses:
   *       200:
   *         description: Notification feed list.
   */
  router.get("/", controller.fetchMyAlerts);
  router.get("/inbound-queue", controller.fetchMyAlerts);

  /**
   * @swagger
   * /api/notifications/unread-count:
   *   get:
   *     summary: Get unread notification count badge
   *     tags: [Notifications API]
   *     security: [{ BearerAuth: [] }]
   *     responses:
   *       200:
   *         description: Unread count retrieved.
   */
  router.get("/unread-count", controller.getUnreadCount);

  /**
   * @swagger
   * /api/notifications/read-all:
   *   patch:
   *     summary: Mark all notifications as read
   *     tags: [Notifications API]
   *     security: [{ BearerAuth: [] }]
   *     responses:
   *       200:
   *         description: All notifications marked read.
   */
  router.patch("/read-all", controller.readAllAlerts);

  /**
   * @swagger
   * /api/notifications/{id}/read:
   *   patch:
   *     summary: Mark single notification as read
   *     tags: [Notifications API]
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
   *         description: Notification marked read.
   */
  router.patch("/:id/read", controller.readAlert);
  router.patch("/:notificationId/acknowledge", controller.readAlert);

  /**
   * @swagger
   * /api/notifications/broadcast:
   *   post:
   *     summary: Dispatch targeted broadcast notification to specific audience
   *     tags: [Notifications API]
   *     security: [{ BearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/BroadcastNotificationRequest'
   *     responses:
   *       201:
   *         description: Broadcast notification dispatched.
   */
  router.post("/broadcast", controller.sendAlert);

  return router;
}
