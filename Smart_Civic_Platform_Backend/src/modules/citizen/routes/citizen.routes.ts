import { Router } from "express";
import * as C from "../controller/citizen.controller";
import { authenticate } from "../../../middleware/authenticate";
import { authorize } from "../../../middleware/authorize";
import { validateBody } from "../../../middleware/validateBody";
import {
  submitFeedbackSchema,
  updateProfileSchema,
  addressSchema,
  identityUploadSchema,
} from "../../../validation/citizen.validation";
import { reopenComplaintSchema, complaintNoteSchema } from "../../../validation/complaint.validation";

const router = Router();

/**
 * @swagger
 * /api/citizen/provinces:
 *   get:
 *     summary: Public province reference list
 *     tags: [Citizen API]
 *     responses:
 *       200:
 *         description: Province list retrieved.
 */
router.get("/provinces", C.getProvinces);

/**
 * @swagger
 * /api/citizen/districts:
 *   get:
 *     summary: Public district reference list
 *     tags: [Citizen API]
 *     responses:
 *       200:
 *         description: District list retrieved.
 */
router.get("/districts", C.getDistricts);

/**
 * @swagger
 * /api/citizen/municipalities:
 *   get:
 *     summary: Public municipality reference list
 *     tags: [Citizen API]
 *     responses:
 *       200:
 *         description: Municipality list retrieved.
 */
router.get("/municipalities", C.getMunicipalities);

/**
 * @swagger
 * /api/citizen/wards:
 *   get:
 *     summary: Public ward reference list
 *     tags: [Citizen API]
 *     responses:
 *       200:
 *         description: Ward list retrieved.
 */
router.get("/wards", C.getWards);

/**
 * @swagger
 * /api/citizen/municipalities/{municipalityId}/categories:
 *   get:
 *     summary: Get complaint categories available in municipality
 *     tags: [Citizen API]
 *     parameters:
 *       - in: path
 *         name: municipalityId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Complaint categories list.
 */
router.get("/municipalities/:municipalityId/categories", C.getCategories);

// Authenticated citizen routes
router.use(authenticate, authorize("citizen"));

/**
 * @swagger
 * /api/citizen/dashboard:
 *   get:
 *     summary: Get citizen dashboard statistics and recent complaints
 *     tags: [Citizen API]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Dashboard payload loaded.
 */
router.get("/dashboard", C.getDashboard);

/**
 * @swagger
 * /api/citizen/complaints:
 *   post:
 *     summary: Submit a new grievance ticket with 4-step structured address and auto-routing
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
 *         description: Complaint created cleanly. Standardized tracking ID assigned.
 *   get:
 *     summary: List my submitted grievances
 *     tags: [Citizen API]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: My complaints list retrieved.
 */
router.post("/complaints", C.submitComplaint);
router.get("/complaints", C.getMyComplaints);

/**
 * @swagger
 * /api/citizen/complaints/{id}:
 *   get:
 *     summary: Get complaint detail by UUID
 *     tags: [Citizen API]
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
 *         description: Complaint detail loaded.
 */
router.get("/complaints/:id", C.getComplaintDetail);

/**
 * @swagger
 * /api/citizen/complaints/{id}/history:
 *   get:
 *     summary: Get complaint timeline history with citizen-friendly messages
 *     tags: [Citizen API]
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
 *         description: Timeline history retrieved.
 */
router.get("/complaints/:id/history", C.getComplaintHistory);

/**
 * @swagger
 * /api/citizen/complaints/{id}/reopen:
 *   post:
 *     summary: Reopen a resolved complaint within 7 days (max 2 reopens allowed)
 *     tags: [Citizen API]
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
 *         description: Complaint status changed to reopened.
 */
router.post(
  "/complaints/:id/reopen",
  validateBody(reopenComplaintSchema),
  C.reopenComplaint,
);

/**
 * @swagger
 * /api/citizen/complaints/{id}/updates:
 *   post:
 *     summary: Add public note / comment to complaint
 *     tags: [Citizen API]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       201:
 *         description: Note appended.
 *   get:
 *     summary: List public notes for complaint
 *     tags: [Citizen API]
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
 *         description: Notes list.
 */
router.post(
  "/complaints/:id/updates",
  validateBody(complaintNoteSchema),
  C.addComplaintNote,
);
router.get("/complaints/:id/updates", C.getComplaintUpdates);

/**
 * @swagger
 * /api/citizen/complaints/{id}/media:
 *   post:
 *     summary: Upload media evidence (photos/videos) to complaint
 *     tags: [Citizen API]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       201:
 *         description: Media attached.
 */
router.post("/complaints/:id/media", C.uploadComplaintMedia);

/**
 * @swagger
 * /api/citizen/complaints/{id}/feedback:
 *   post:
 *     summary: Submit resolution satisfaction rating and feedback
 *     tags: [Citizen API]
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
 *         description: Feedback recorded.
 */
router.post(
  "/complaints/:id/feedback",
  validateBody(submitFeedbackSchema),
  C.submitFeedback,
);

/**
 * @swagger
 * /api/citizen/address:
 *   post:
 *     summary: Update structured permanent & current address
 *     tags: [Citizen API]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Address updated.
 */
router.post(
  "/address",
  validateBody(addressSchema),
  C.updateAddress,
);

/**
 * @swagger
 * /api/citizen/identity:
 *   post:
 *     summary: Upload identity verification (KYC) document images
 *     tags: [Citizen API]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Identity documents submitted for review.
 */
router.post(
  "/identity",
  validateBody(identityUploadSchema),
  C.uploadIdentity,
);

/**
 * @swagger
 * /api/citizen/profile:
 *   put:
 *     summary: Update citizen profile details
 *     tags: [Citizen API]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Profile updated.
 */
router.put(
  "/profile",
  validateBody(updateProfileSchema),
  C.updateProfile,
);

export default router;
