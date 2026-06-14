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
   * @openapi
   * /api/v1/complaints/submit:
   *   post:
   *     summary: Lodge a new citizen complaint entry
   *     tags: [Citizen Complaints]
   *     security: [{ BearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [municipality_id, category_id, title, description]
   *             properties:
   *               municipality_id: { type: string, format: uuid }
   *               category_id: { type: string, format: uuid }
   *               title: { type: string, example: "Broken Water Pipe near Main Bazaar" }
   *               description: { type: string, example: "The primary fresh drinking water line has cracked, leaking continuously for 48 hours." }
   *               attachment_url: { type: string, example: "https://xyz.supabase.co/storage/v1/object/public/complaints/leak.jpg" }
   */
  router.post("/submit", controller.create);
  router.get("/my-history", controller.getMyHistory);
  router.get("/categories", controller.getCategories);

  return router;
}
