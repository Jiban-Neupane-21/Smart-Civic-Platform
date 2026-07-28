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
        
      if (profileError || !profile) {
        res.status(403).json({ success: false, error: "Access Denied: Requires active Municipality Head privileges." });
        return;
      }

      if (profile.account_status === "suspended") {
        res.status(403).json({ success: false, error: "Account suspended. Contact platform administrator." });
        return;
      }

      if (profile.account_status === "invited") {
        res.status(403).json({ success: false, error: "Invitation not accepted yet. Accept your invitation link first." });
        return;
      }

      if (profile.account_status === "pending_onboarding" && !req.path?.startsWith("/onboarding")) {
        res.status(403).json({ success: false, error: "Onboarding incomplete. Complete your profile activation wizard first." });
        return;
      }

      if (profile.role !== "municipality_head" && profile.role !== "superadmin") {
        res.status(403).json({ success: false, error: "Access Denied: Requires Municipality Head privileges." });
        return;
      }

      // Find the specific municipality managed by this user
      const { data: municipality, error: muniError } = await supabase
        .from("municipalities")
        .select("id")
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
      req.municipalityId = municipality.id;
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
