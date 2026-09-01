import { Router } from "express";
import { OnboardingController } from "../controller/onboarding.controller";
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

export function createOnboardingRouter(
  supabaseAdminClient: SupabaseClient,
  controller: OnboardingController
): Router {
  const router = Router();

  router.use(requireAuth(supabaseAdminClient));

  /**
   * @swagger
   * /api/onboarding/status:
   *   get:
   *     summary: Fetch current first-login onboarding wizard progress for profile
   *     tags: [Onboarding API]
   *     security: [{ BearerAuth: [] }]
   *     responses:
   *       200:
   *         description: Current wizard step and completion flags retrieved.
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/SuccessResponse'
   */
  router.get("/status", controller.getStatus);

  /**
   * @swagger
   * /api/onboarding/step1:
   *   post:
   *     summary: Complete Step 1 — Credentials setup & MFA enrollment
   *     tags: [Onboarding API]
   *     security: [{ BearerAuth: [] }]
   *     requestBody:
   *       required: false
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/OnboardingStep1Request'
   *     responses:
   *       200:
   *         description: Step 1 completed. Advanced to Step 2.
   */
  router.post("/step1", controller.step1);

  /**
   * @swagger
   * /api/onboarding/step2:
   *   post:
   *     summary: Complete Step 2 — Personal details, designation & emergency contact
   *     tags: [Onboarding API]
   *     security: [{ BearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/OnboardingStep2Request'
   *     responses:
   *       200:
   *         description: Step 2 completed. Advanced to Step 3.
   */
  router.post("/step2", controller.step2);

  /**
   * @swagger
   * /api/onboarding/step3:
   *   post:
   *     summary: Complete Step 3 — Staff identity document upload & verification details
   *     tags: [Onboarding API]
   *     security: [{ BearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/OnboardingStep3Request'
   *     responses:
   *       200:
   *         description: Step 3 completed. Advanced to Step 4.
   */
  router.post("/step3", controller.step3);

  /**
   * @swagger
   * /api/onboarding/step4:
   *   post:
   *     summary: Complete Step 4 — Finalize onboarding & activate profile to active status
   *     tags: [Onboarding API]
   *     security: [{ BearerAuth: [] }]
   *     responses:
   *       200:
   *         description: Profile activated successfully. Full access granted.
   */
  router.post("/step4", controller.step4);

  return router;
}
