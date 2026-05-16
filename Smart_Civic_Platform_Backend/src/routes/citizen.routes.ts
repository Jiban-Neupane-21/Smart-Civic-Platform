import { Router } from "express";
import * as C from "../controller/citizen.controller";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { validateBody } from "../middleware/validateBody";
import {
  submitComplaintSchema,
  submitFeedbackSchema,
} from "../validation/citizen.validation";

const router = Router();

/**
 * @swagger
 * /api/citizen/municipalities:
 *   get:
 *     tags: [Citizen]
 *     summary: List active municipalities (complaint form dropdown)
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.get("/municipalities", C.getMunicipalities);

/**
 * @swagger
 * /api/citizen/municipalities/{municipalityId}/categories:
 *   get:
 *     tags: [Citizen]
 *     summary: List complaint categories for a municipality
 *     parameters:
 *       - in: path
 *         name: municipalityId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.get(
  "/municipalities/:municipalityId/categories",
  C.getCategories,
);

router.use(authenticate, authorize("citizen"));

/**
 * @swagger
 * /api/citizen/complaints:
 *   post:
 *     tags: [Citizen]
 *     summary: Submit a new complaint
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SubmitComplaintRequest'
 *     responses:
 *       201:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post(
  "/complaints",
  validateBody(submitComplaintSchema),
  C.submitComplaint,
);

/**
 * @swagger
 * /api/citizen/complaints:
 *   get:
 *     tags: [Citizen]
 *     summary: List my complaints
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/complaints", C.getMyComplaints);

/**
 * @swagger
 * /api/citizen/complaints/{id}:
 *   get:
 *     tags: [Citizen]
 *     summary: Get complaint detail
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       404:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/complaints/:id", C.getComplaintDetail);

/**
 * @swagger
 * /api/citizen/complaints/{id}/history:
 *   get:
 *     tags: [Citizen]
 *     summary: Get complaint status history
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       404:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/complaints/:id/history", C.getComplaintHistory);

/**
 * @swagger
 * /api/citizen/complaints/{id}/feedback:
 *   post:
 *     tags: [Citizen]
 *     summary: Submit feedback for a resolved complaint
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
 *             $ref: '#/components/schemas/SubmitFeedbackRequest'
 *     responses:
 *       201:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  "/complaints/:id/feedback",
  validateBody(submitFeedbackSchema),
  C.submitFeedback,
);

export default router;
