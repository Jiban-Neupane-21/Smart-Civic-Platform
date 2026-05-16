import { Router } from "express";
import * as C from "../controller/municipality.controller";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";

const router = Router();
router.use(authenticate, authorize("municipality_head", "superadmin"));

/**
 * @swagger
 * /api/municipality/complaints:
 *   get:
 *     tags: [Municipality]
 *     summary: Municipality complaint dashboard
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.get("/complaints", C.getDashboard);

/**
 * @swagger
 * /api/municipality/complaints/{id}/assign:
 *   patch:
 *     tags: [Municipality]
 *     summary: Assign complaint to a department
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               department_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.patch("/complaints/:id/assign", C.assignToDepartment);

/**
 * @swagger
 * /api/municipality/complaints/{id}/reject:
 *   patch:
 *     tags: [Municipality]
 *     summary: Reject a complaint
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
 */
router.patch("/complaints/:id/reject", C.rejectComplaint);

/**
 * @swagger
 * /api/municipality/departments:
 *   get:
 *     tags: [Municipality]
 *     summary: List departments
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.get("/departments", C.getDepartments);

/**
 * @swagger
 * /api/municipality/departments:
 *   post:
 *     tags: [Municipality]
 *     summary: Create a department
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.post("/departments", C.createDepartment);

/**
 * @swagger
 * /api/municipality/departments/{id}:
 *   patch:
 *     tags: [Municipality]
 *     summary: Update a department
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
 *             type: object
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.patch("/departments/:id", C.updateDepartment);

/**
 * @swagger
 * /api/municipality/departments/{id}:
 *   delete:
 *     tags: [Municipality]
 *     summary: Delete a department
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
 */
router.delete("/departments/:id", C.deleteDepartment);

/**
 * @swagger
 * /api/municipality/sla-breaches:
 *   get:
 *     tags: [Municipality]
 *     summary: List SLA breaches
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.get("/sla-breaches", C.getSLABreaches);

/**
 * @swagger
 * /api/municipality/invitations:
 *   get:
 *     tags: [Municipality]
 *     summary: List pending staff invitations
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.get("/invitations", C.getPendingInvitations);

export default router;
