import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../config/supabase";
import { sendSuccess, sendError } from "../utils/response";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { MunicipalityUpdate } from "../types/database.type";

const router = Router();
router.use(authenticate, authorize("superadmin"));

/**
 * @swagger
 * /api/superadmin/municipalities:
 *   get:
 *     tags: [Superadmin]
 *     summary: List all municipalities
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of municipalities
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/municipalities", async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("municipalities")
      .select(
        "m_uid, official_name, login_email, region_state, is_active, created_at, registration_code",
      )
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return sendSuccess(res, data);
  } catch (e: unknown) {
    return sendError(res, e instanceof Error ? e.message : "Error");
  }
});

/**
 * @swagger
 * /api/superadmin/municipalities:
 *   post:
 *     tags: [Superadmin]
 *     summary: Create a municipality
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Municipality created
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
router.post("/municipalities", async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("municipalities")
      .insert({ ...req.body, registration_code: `MUN-${Date.now()}` })
      .select("m_uid, official_name, login_email")
      .single();
    if (error) throw new Error(error.message);
    return sendSuccess(res, data, "Municipality registered", 201);
  } catch (e: unknown) {
    return sendError(
      res,
      e instanceof Error ? e.message : "Error",
      400,
    );
  }
});

/**
 * @swagger
 * /api/superadmin/municipalities/{id}:
 *   patch:
 *     tags: [Superadmin]
 *     summary: Update a municipality
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
 *       400:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch("/municipalities/:id", async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("municipalities")
      .update(req.body as MunicipalityUpdate)
      .eq("m_uid", req.params.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return sendSuccess(res, data);
  } catch (e: unknown) {
    return sendError(
      res,
      e instanceof Error ? e.message : "Error",
      400,
    );
  }
});

/**
 * @swagger
 * /api/superadmin/municipalities/{id}:
 *   delete:
 *     tags: [Superadmin]
 *     summary: Soft-delete a municipality
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
router.delete("/municipalities/:id", async (req: Request, res: Response) => {
  try {
    await supabaseAdmin
      .from("municipalities")
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        is_active: false,
      })
      .eq("m_uid", req.params.id);
    return sendSuccess(res, null, "Municipality deactivated");
  } catch (e: unknown) {
    return sendError(
      res,
      e instanceof Error ? e.message : "Error",
      400,
    );
  }
});

/**
 * @swagger
 * /api/superadmin/stats:
 *   get:
 *     tags: [Superadmin]
 *     summary: System-wide statistics
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.get("/stats", async (_req: Request, res: Response) => {
  try {
    const [muniRes, complaintRes, userRes] = await Promise.all([
      supabaseAdmin
        .from("municipalities")
        .select("m_uid", { count: "exact", head: true })
        .eq("is_deleted", false),
      supabaseAdmin
        .from("complaints")
        .select("co_uid", { count: "exact", head: true })
        .eq("is_deleted", false),
      supabaseAdmin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("is_deleted", false),
    ]);
    return sendSuccess(res, {
      municipalities: muniRes.count,
      total_complaints: complaintRes.count,
      total_users: userRes.count,
    });
  } catch (e: unknown) {
    return sendError(res, e instanceof Error ? e.message : "Error");
  }
});

/**
 * @swagger
 * /api/superadmin/profiles:
 *   get:
 *     tags: [Superadmin]
 *     summary: List all user profiles
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *       - in: query
 *         name: municipality_id
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
router.get("/profiles", async (req: Request, res: Response) => {
  try {
    const { role, municipality_id } = req.query;
    let query = supabaseAdmin
      .from("profiles")
      .select(
        "id, full_name, email, role, account_status, municipality_id, created_at",
      )
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });
    if (role) query = query.eq("role", role as string);
    if (municipality_id)
      query = query.eq("municipality_id", municipality_id as string);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return sendSuccess(res, data);
  } catch (e: unknown) {
    return sendError(res, e instanceof Error ? e.message : "Error");
  }
});

/**
 * @swagger
 * /api/superadmin/profiles/{id}/status:
 *   patch:
 *     tags: [Superadmin]
 *     summary: Update account status (active, suspended, inactive)
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
 *             required: [account_status]
 *             properties:
 *               account_status:
 *                 type: string
 *                 enum: [active, suspended, inactive]
 *     responses:
 *       200:
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
router.patch("/profiles/:id/status", async (req: Request, res: Response) => {
  try {
    const { account_status } = req.body;
    if (!["active", "suspended", "inactive"].includes(account_status))
      throw new Error("Invalid status");
    await supabaseAdmin
      .from("profiles")
      .update({ account_status })
      .eq("id", req.params.id);
    return sendSuccess(res, null, `Account ${account_status}`);
  } catch (e: unknown) {
    return sendError(
      res,
      e instanceof Error ? e.message : "Error",
      400,
    );
  }
});

/**
 * @swagger
 * /api/superadmin/audit-logs:
 *   get:
 *     tags: [Superadmin]
 *     summary: Paginated audit logs
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.get("/audit-logs", async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = 50;
    const { data, error } = await supabaseAdmin
      .from("audit_logs")
      .select("*, profiles!action_by ( full_name, email )")
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);
    if (error) throw new Error(error.message);
    return sendSuccess(res, data);
  } catch (e: unknown) {
    return sendError(res, e instanceof Error ? e.message : "Error");
  }
});

export default router;
