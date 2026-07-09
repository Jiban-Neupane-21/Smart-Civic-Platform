import { Router } from "express";
import { ComplaintsController } from "../controller/complaint.controller";
import { SupabaseClient } from "@supabase/supabase-js";

const requireAuth =
  (supabase: SupabaseClient) => async (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token)
      return res.status(401).json({ error: "Session footprint missing." });
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);
    if (error || !user)
      return res
        .status(401)
        .json({ error: "Session authentication signature invalid." });
    req.user = user;
    next();
  };

export function createComplaintsRouter(
  supabase: SupabaseClient,
  controller: ComplaintsController,
): Router {
  const router = Router();
  router.use(requireAuth(supabase));

  /**
   * @swagger
   * /api/complaints/submit:
   *   post:
   *     summary: Lodge a new citizen complaint entry
   *     tags: [Citizen API]
   *     security: [{ BearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/SubmitComplaintRequest'
   *     responses:
   *       201:
   *         description: Complaint submitted successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/SuccessResponse'
   */
  router.post("/submit", controller.create);

  /**
   * @swagger
   * /api/complaints/my-history:
   *   get:
   *     summary: Get my complaint history
   *     tags: [Citizen API]
   *     security: [{ BearerAuth: [] }]
   *     responses:
   *       200:
   *         description: List of complaints
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/SuccessResponse'
   */
  router.get("/my-history", controller.getMyHistory);

  /**
   * @swagger
   * /api/complaints/categories:
   *   get:
   *     summary: List complaint categories
   *     tags: [Citizen API]
   *     security: [{ BearerAuth: [] }]
   *     responses:
   *       200:
   *         description: List of categories
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/SuccessResponse'
   */
  router.get("/categories", controller.getCategories);

  return router;
}
