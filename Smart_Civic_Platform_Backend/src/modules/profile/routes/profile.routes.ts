import { Router } from "express";
import { ProfileController } from "../controller/profile.controller";
import { SupabaseClient } from "@supabase/supabase-js";
import { validateBody } from "../../../middleware/validateBody";
import { identityUploadSchema, profilePictureSchema } from "../../../validation/profile.validation";

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

export function createProfileRouter(
  supabaseAdminClient: SupabaseClient,
  controller: ProfileController,
): Router {
  const router = Router();

  router.use(requireAuth(supabaseAdminClient));

  /**
   * @swagger
   * /api/profile/identity:
   *   put:
   *     summary: Update user identity documents
   *     tags: [Profile API]
   *     security: [{ BearerAuth: [] }]
   *     responses:
   *       200:
   *         description: Identity updated successfully
   */
  router.put(
    "/identity",
    validateBody(identityUploadSchema),
    controller.updateIdentity,
  );

  /**
   * @swagger
   * /api/profile/picture:
   *   put:
   *     summary: Update user profile picture
   *     tags: [Profile API]
   *     security: [{ BearerAuth: [] }]
   *     responses:
   *       200:
   *         description: Profile picture updated successfully
   */
  router.put(
    "/picture",
    validateBody(profilePictureSchema),
    controller.updateProfilePicture,
  );

  return router;
}
