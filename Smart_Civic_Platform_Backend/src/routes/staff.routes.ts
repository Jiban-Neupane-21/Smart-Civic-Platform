import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../config/supabase";
import { sendSuccess, sendError } from "../utils/response";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";

const router = Router();
router.use(
  authenticate,
  authorize("staff", "department_head", "municipality_head"),
);

/**
 * @swagger
 * /api/staff/complaints:
 *   get:
 *     tags: [Staff]
 *     summary: List assigned complaints
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.get("/complaints", async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("complaints")
      .select(
        `co_uid, complaint_number, title, status, priority, reported_at, address_hint,
        complaint_categories ( name ), profiles!citizen_id ( full_name )`,
      )
      .eq("assigned_staff_id", req.user!.id)
      .eq("is_deleted", false)
      .order("reported_at", { ascending: false });
    if (error) throw new Error(error.message);
    return sendSuccess(res, data);
  } catch (e: unknown) {
    return sendError(res, e instanceof Error ? e.message : "Error");
  }
});

/**
 * @swagger
 * /api/staff/complaints/{id}:
 *   get:
 *     tags: [Staff]
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
router.get("/complaints/:id", async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("complaints")
      .select(
        `*, complaint_categories ( name ), complaint_attachments ( * ), complaint_replies ( * )`,
      )
      .eq("co_uid", req.params.id)
      .single();
    if (error) throw new Error("Complaint not found");
    return sendSuccess(res, data);
  } catch (e: unknown) {
    return sendError(
      res,
      e instanceof Error ? e.message : "Error",
      404,
    );
  }
});

/**
 * @swagger
 * /api/staff/complaints/{id}/status:
 *   patch:
 *     tags: [Staff]
 *     summary: Update complaint status (in_progress or resolved)
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
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [in_progress, resolved]
 *               note:
 *                 type: string
 *               citizen_message:
 *                 type: string
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.patch("/complaints/:id/status", async (req: Request, res: Response) => {
  try {
    const { status, note } = req.body;
    if (!["in_progress", "resolved"].includes(status))
      throw new Error("Invalid status");

    if (status === "resolved") {
      const { error } = await supabaseAdmin.rpc("resolve_complaint", {
        p_complaint_id: req.params.id,
        p_resolver_id: req.user!.id,
        p_resolution_note: note,
        p_report_to_citizen: req.body.citizen_message ?? null,
      } as never);
      if (error) throw new Error(error.message);
    } else {
      await supabaseAdmin
        .from("complaints")
        .update({ status, updated_at: new Date().toISOString() } as never)
        .eq("co_uid", req.params.id);
    }
    return sendSuccess(res, null, "Status updated");
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
 * /api/staff/complaints/{id}/proof:
 *   post:
 *     tags: [Staff]
 *     summary: Upload resolution proof attachment
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
 *             required: [file_url, file_name, file_type, file_size_bytes]
 *             properties:
 *               file_url:
 *                 type: string
 *               file_name:
 *                 type: string
 *               file_type:
 *                 type: string
 *               file_size_bytes:
 *                 type: integer
 *     responses:
 *       201:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.post("/complaints/:id/proof", async (req: Request, res: Response) => {
  try {
    const { file_url, file_name, file_type, file_size_bytes } = req.body;
    const { data, error } = await supabaseAdmin
      .from("complaint_attachments")
      .insert({
        complaint_id: req.params.id,
        uploaded_by: req.user!.id,
        file_url,
        file_name,
        file_type,
        file_size_bytes,
        attachment_type: "resolution_proof",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return sendSuccess(res, data, "Proof uploaded", 201);
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
 * /api/staff/profile:
 *   get:
 *     tags: [Staff]
 *     summary: Get staff profile
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.get("/profile", async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("staff")
      .select(
        "*, profiles ( full_name, email, phone, profile_picture ), departments ( dept_name ), municipalities ( official_name )",
      )
      .eq("profile_id", req.user!.id)
      .single();
    if (error) throw new Error(error.message);
    return sendSuccess(res, data);
  } catch (e: unknown) {
    return sendError(res, e instanceof Error ? e.message : "Error");
  }
});

export default router;
