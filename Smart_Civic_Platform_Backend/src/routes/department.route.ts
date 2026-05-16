import { Request, Response, Router } from "express";
import * as DeptService from "../service/department.service";
import { sendSuccess, sendError } from "../utils/response";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";

const getDeptId = (req: Request) => req.user!.department_id!;

const getComplaints = async (req: Request, res: Response) => {
  try {
    return sendSuccess(
      res,
      await DeptService.getDeptComplaints(getDeptId(req), {
        status: req.query.status as string,
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
      }),
    );
  } catch (e: unknown) {
    return sendError(res, e instanceof Error ? e.message : "Error");
  }
};

const assignToStaff = async (req: Request, res: Response) => {
  try {
    return sendSuccess(
      res,
      await DeptService.assignToStaff(
        req.params.id as string,
        req.body.staff_id,
        req.user!.id,
        req.body.remark,
      ),
    );
  } catch (e: unknown) {
    return sendError(res, e instanceof Error ? e.message : "Error", 400);
  }
};

const getStaff = async (req: Request, res: Response) => {
  try {
    return sendSuccess(res, await DeptService.getDeptStaff(getDeptId(req)));
  } catch (e: unknown) {
    return sendError(res, e instanceof Error ? e.message : "Error");
  }
};

const getTeams = async (req: Request, res: Response) => {
  try {
    return sendSuccess(res, await DeptService.getTeams(getDeptId(req)));
  } catch (e: unknown) {
    return sendError(res, e instanceof Error ? e.message : "Error");
  }
};

const createTeam = async (req: Request, res: Response) => {
  try {
    return sendSuccess(
      res,
      await DeptService.createTeam(getDeptId(req), req.body),
      "Team created",
      201,
    );
  } catch (e: unknown) {
    return sendError(res, e instanceof Error ? e.message : "Error", 400);
  }
};

const getWorkload = async (req: Request, res: Response) => {
  try {
    return sendSuccess(res, await DeptService.getTeamWorkload(getDeptId(req)));
  } catch (e: unknown) {
    return sendError(res, e instanceof Error ? e.message : "Error");
  }
};

const router = Router();
router.use(authenticate, authorize("department_head", "superadmin"));

/**
 * @swagger
 * /api/department/complaints:
 *   get:
 *     tags: [Department]
 *     summary: List department complaints
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.get("/complaints", getComplaints);

/**
 * @swagger
 * /api/department/complaints/{id}/assign:
 *   patch:
 *     tags: [Department]
 *     summary: Assign complaint to staff member
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
 *             required: [staff_id]
 *             properties:
 *               staff_id:
 *                 type: string
 *                 format: uuid
 *               remark:
 *                 type: string
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.patch("/complaints/:id/assign", assignToStaff);

/**
 * @swagger
 * /api/department/staff:
 *   get:
 *     tags: [Department]
 *     summary: List department staff
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.get("/staff", getStaff);

/**
 * @swagger
 * /api/department/teams:
 *   get:
 *     tags: [Department]
 *     summary: List teams
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.get("/teams", getTeams);

/**
 * @swagger
 * /api/department/teams:
 *   post:
 *     tags: [Department]
 *     summary: Create a team
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
router.post("/teams", createTeam);

/**
 * @swagger
 * /api/department/workload:
 *   get:
 *     tags: [Department]
 *     summary: Team workload summary
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.get("/workload", getWorkload);

export default router;
