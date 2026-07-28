import { Router } from "express";
import * as NotificationController from "../controller/notification.controller";
import { authenticate } from "../../../middleware/authenticate";

const router = Router();

router.use(authenticate);

router.get("/", NotificationController.getMyNotifications);
router.get("/unread-count", NotificationController.getUnreadCount);
router.patch("/:id/read", NotificationController.markAsRead);

export default router;
