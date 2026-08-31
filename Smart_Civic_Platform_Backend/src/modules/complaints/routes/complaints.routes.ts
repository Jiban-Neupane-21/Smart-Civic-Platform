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

    const { data: profile } = await supabase
      .from("profiles")
      .select("force_password_reset, role")
      .eq("id", user.id)
      .single();

    req.user = { 
      ...user, 
      force_password_reset: profile?.force_password_reset,
      role: profile?.role 
    };
    next();
  };

export function createComplaintsRouter(
  supabase: SupabaseClient,
  controller: ComplaintsController,
): Router {
  const router = Router();
  router.use(requireAuth(supabase));

  const { forcePasswordReset } = require("../../../middleware/forcePasswordReset");
  router.use(forcePasswordReset);

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
