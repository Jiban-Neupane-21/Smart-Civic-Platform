import { Request, Response, NextFunction } from "express";
import { SupabaseClient } from "@supabase/supabase-js";

export interface MunicipalityRequest extends Request {
  user?: any;
  municipalityId?: string;
}

export const verifyMunicipalityHeadContext = (supabase: SupabaseClient) => {
  return async (req: any, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res
          .status(401)
          .json({ success: false, error: "User session context missing." });
        return;
      }

      // Check if the profile is active and has the correct role designation
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, account_status")
        .eq("id", userId)
        .single();

      if (
        profileError ||
        !profile ||
        profile.account_status !== "active" ||
        profile.role !== "municipality_head"
      ) {
        res
          .status(403)
          .json({
            success: false,
            error:
              "Access Denied: Requires active Municipality Head privileges.",
          });
        return;
      }

      // Find the specific municipality managed by this user
      const { data: municipality, error: muniError } = await supabase
        .from("municipalities")
        .select("m_uid")
        .eq("head_profile_id", userId)
        .single();

      if (muniError || !municipality) {
        res
          .status(403)
          .json({
            success: false,
            error:
              "No active municipality configuration bound to this profile.",
          });
        return;
      }

      // Append the verified municipality ID directly to the request object
      req.municipalityId = municipality.m_uid;
      next();
    } catch (err: any) {
      res
        .status(500)
        .json({
          success: false,
          error: "Internal context verification failure.",
        });
    }
  };
};
