import { Request, Response } from "express";
import { supabaseAdmin } from "../../../config/supabase";
import { sendSuccess, sendError } from "../../../utils/response";

export const getMyNotifications = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { data, error } = await supabaseAdmin
      .from("notifications")
      .select("*")
      .or(`target_profile_id.eq.${userId},audience.eq.all_citizens,audience.eq.all_staff`)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;
    return sendSuccess(res, data || []);
  } catch (e: any) {
    return sendError(res, e.message, 500);
  }
};

export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { count, error } = await supabaseAdmin
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .or(`target_profile_id.eq.${userId},audience.eq.all_citizens,audience.eq.all_staff`);

    if (error) throw error;
    return sendSuccess(res, { unread_count: count || 0 });
  } catch (e: any) {
    return sendError(res, e.message, 500);
  }
};

export const markAsRead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    await supabaseAdmin.from("notification_reads").upsert({
      notification_id: id,
      profile_id: userId,
      read_at: new Date().toISOString(),
    });

    return sendSuccess(res, { success: true });
  } catch (e: any) {
    return sendError(res, e.message, 400);
  }
};
