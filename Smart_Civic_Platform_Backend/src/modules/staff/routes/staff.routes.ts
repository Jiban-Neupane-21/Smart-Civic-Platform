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

  router.use(requireAuth(supabaseAdminClient));
  router.use(verifyStaffContext(supabaseAdminClient));

  /**
   * @swagger
   * /api/staff/profile:
   *   get:
   *     summary: Fetch my staff employment profile & department metadata
   *     tags: [Staff API]
   *     security: [{ BearerAuth: [] }]
   *     responses:
   *       200:
   *         description: Profile loaded.
   *   patch:
   *     summary: Update my contact number or expertise
   *     tags: [Staff API]
   *     security: [{ BearerAuth: [] }]
   *     responses:
   *       200:
   *         description: Profile updated.
   */
  router.get("/profile", controller.getMyProfile);
  router.patch("/profile", controller.updateMyProfile);

  /**
   * @swagger
   * /api/staff/my-department:
   *   get:
   *     summary: Fetch my primary department details
   *     tags: [Staff API]
   *     security: [{ BearerAuth: [] }]
   *     responses:
   *       200:
   *         description: Department details.
   */
  router.get("/my-department", controller.getMyDepartment);

  /**
   * @swagger
   * /api/staff/my-assignments:
   *   get:
   *     summary: List operational team assignments bound to staff profile
   *     tags: [Staff API]
   *     security: [{ BearerAuth: [] }]
   *     responses:
   *       200:
   *         description: Assignments list.
   */
  router.get("/my-assignments", controller.getMyTeams);

  /**
   * @swagger
   * /api/staff/schedule:
   *   get:
   *     summary: Get my field work schedule calendar and task timeline
   *     tags: [Staff API]
   *     security: [{ BearerAuth: [] }]
   *     responses:
   *       200:
   *         description: Schedule items.
   */
  router.get("/schedule", controller.getMySchedule);

  /**
   * @swagger
   * /api/staff/department-queue:
   *   get:
   *     summary: View department complaint queue
   *     tags: [Staff API]
   *     security: [{ BearerAuth: [] }]
   *     responses:
   *       200:
   *         description: Department queue.
   */
  router.get("/department-queue", controller.getDepartmentQueue);

  /**
   * @swagger
   * /api/staff/assignments/{assignmentId}/acknowledge:
   *   patch:
   *     summary: Acknowledge assignment receipt
   *     tags: [Staff API]
   *     security: [{ BearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: assignmentId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: Acknowledged.
   */
  router.patch("/assignments/:assignmentId/acknowledge", controller.acknowledgeAssignment);

  /**
   * @swagger
   * /api/staff/assignments/{assignmentId}/accept:
   *   post:
   *     summary: Step 1 of assignment flow — Accept ticket assignment
   *     tags: [Staff API]
   *     security: [{ BearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: assignmentId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: Accepted. Status set to assigned.
   */
  router.post("/assignments/:assignmentId/accept", controller.acceptAssignment);

  /**
   * @swagger
   * /api/staff/assignments/{assignmentId}/start:
   *   post:
   *     summary: Step 2 of assignment flow — Start active field work
   *     tags: [Staff API]
   *     security: [{ BearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: assignmentId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: Field work started. Status set to in_progress.
   */
  router.post("/assignments/:assignmentId/start", controller.startAssignment);

  /**
   * @swagger
   * /api/staff/assignments/{assignmentId}/complete:
   *   post:
   *     summary: Step 3 of assignment flow — Complete resolution work
   *     tags: [Staff API]
   *     security: [{ BearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: assignmentId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: Work completed. Status set to resolved.
   */
  router.post("/assignments/:assignmentId/complete", controller.completeAssignment);

  /**
   * @swagger
   * /api/staff/assignments/{id}/transfer:
   *   post:
   *     summary: Peer-to-peer staff handoff — Transfer complaint to colleague
   *     tags: [Staff API]
   *     security: [{ BearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/TransferAssignmentRequest'
   *     responses:
   *       200:
   *         description: Complaint transferred cleanly to peer.
   */
  router.post("/assignments/:id/transfer", controller.transferAssignment);

  /**
   * @swagger
   * /api/staff/assignments/{id}/return-to-dept:
   *   post:
   *     summary: Return complaint to Department Head for reassignment
   *     tags: [Staff API]
   *     security: [{ BearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/ReturnAssignmentRequest'
   *     responses:
   *       200:
   *         description: Complaint returned to Department Head. Status set to under_review.
   */
  router.post("/assignments/:id/return-to-dept", controller.returnAssignmentToDeptHead);

  return router;
}
