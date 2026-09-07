import { Router } from "express";
import { ProfileController } from "../controller/profile.controller";
import { SupabaseClient } from "@supabase/supabase-js";
import { authenticate } from "../../../middleware/authenticate";
import { validateBody } from "../../../middleware/validateBody";
import { identityUploadSchema, profilePictureSchema } from "../../../validation/profile.validation";

export function createProfileRouter(
  _supabaseAdminClient: SupabaseClient,
  controller: ProfileController,
): Router {
  const router = Router();

  router.use(authenticate);

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
