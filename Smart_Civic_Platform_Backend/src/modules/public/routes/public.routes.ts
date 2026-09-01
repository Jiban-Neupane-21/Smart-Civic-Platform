import { Router } from "express";
import * as PublicController from "../controller/public.controller";

const router = Router();

/**
 * @swagger
 * /api/public/provinces:
 *   get:
 *     summary: List active provinces for location cascade dropdown
 *     tags: [Public API]
 *     responses:
 *       200:
 *         description: Active provinces list retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.get("/provinces", PublicController.getProvinces);

/**
 * @swagger
 * /api/public/districts:
 *   get:
 *     summary: List active districts filtered by province
 *     tags: [Public API]
 *     parameters:
 *       - in: query
 *         name: province_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter districts by province ID
 *     responses:
 *       200:
 *         description: Districts list retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.get("/districts", PublicController.getDistricts);

/**
 * @swagger
 * /api/public/municipalities:
 *   get:
 *     summary: List active municipalities filtered by district
 *     tags: [Public API]
 *     parameters:
 *       - in: query
 *         name: district_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter municipalities by district ID
 *     responses:
 *       200:
 *         description: Municipalities list retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.get("/municipalities", PublicController.getMunicipalities);

/**
 * @swagger
 * /api/public/wards:
 *   get:
 *     summary: List wards for a municipality
 *     tags: [Public API]
 *     parameters:
 *       - in: query
 *         name: municipality_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Municipality ID
 *     responses:
 *       200:
 *         description: Wards list retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.get("/wards", PublicController.getWards);

/**
 * @swagger
 * /api/public/complaints/track/{trackingId}:
 *   get:
 *     summary: Public grievance ticket status lookup by tracking ID
 *     tags: [Public API]
 *     parameters:
 *       - in: path
 *         name: trackingId
 *         required: true
 *         schema:
 *           type: string
 *         example: "KTM-WARD4-SWM-2026-000001"
 *         description: Standardized ticket tracking code
 *     responses:
 *       200:
 *         description: Grievance details retrieved cleanly.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       404:
 *         description: Ticket not found.
 */
router.get("/complaints/track/:trackingId", PublicController.trackComplaint);

/**
 * @swagger
 * /api/public/invite/validate:
 *   get:
 *     summary: Validate role invitation token
 *     tags: [Public API]
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Role invitation token
 *     responses:
 *       200:
 *         description: Invitation token is valid.
 *       400:
 *         description: Invalid, expired, or consumed invitation token.
 */
router.get("/invite/validate", PublicController.validateInvite);

/**
 * @swagger
 * /api/public/invite/accept:
 *   post:
 *     summary: Accept role invite, create authentication credentials, and initialize onboarding wizard
 *     tags: [Public API]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RoleInviteAcceptanceRequest'
 *     responses:
 *       201:
 *         description: Invitation accepted successfully. Profile set to pending_onboarding.
 *       400:
 *         description: Validation or account creation failure.
 */
router.post("/invite/accept", PublicController.acceptInvite);

export default router;
