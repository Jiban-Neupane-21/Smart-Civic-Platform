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
        .select("role, account_status, force_password_reset, identity_document_url, municipality_id")
        .eq("id", userId)
        .single();
        
      if (profileError || !profile) {
        res.status(403).json({ success: false, error: "Access Denied: Requires active Municipality Head privileges." });
        return;
      }

      req.user.force_password_reset = profile.force_password_reset;
      req.user.role = profile.role;
      req.user.identity_document_url = profile.identity_document_url;

      if (profile.account_status === "suspended") {
        res.status(403).json({ success: false, error: "Account suspended. Contact platform administrator." });
        return;
      }

      if (profile.account_status === "invited") {
        res.status(403).json({ success: false, error: "Invitation not accepted yet. Accept your invitation link first." });
        return;
      }

      const isProfileOrOnboardingRoute = req.path?.startsWith("/onboarding") || req.path === "/profile" || req.path?.startsWith("/profile");

      if (profile.account_status === "pending_onboarding" && !isProfileOrOnboardingRoute) {
        res.status(403).json({ success: false, error: "Onboarding incomplete. Complete your profile activation wizard first." });
        return;
      }

      if (profile.role !== "municipality_head" && profile.role !== "superadmin") {
        res.status(403).json({ success: false, error: "Access Denied: Requires Municipality Head privileges." });
        return;
      }

      // Find the specific municipality managed by this user (check head_profile_id or profile.municipality_id)
      let municipalityId: string | null = null;

      const { data: muniByHead } = await supabase
        .from("municipalities")
        .select("id")
        .eq("head_profile_id", userId)
        .maybeSingle();

      if (muniByHead) {
        municipalityId = muniByHead.id;
      } else if (profile.municipality_id) {
        const { data: muniById } = await supabase
          .from("municipalities")
          .select("id")
          .eq("id", profile.municipality_id)
          .maybeSingle();

        if (muniById) {
          municipalityId = muniById.id;
          // Heal head_profile_id link if it wasn't set
          await supabase
            .from("municipalities")
            .update({ head_profile_id: userId })
            .eq("id", municipalityId)
            .is("head_profile_id", null);
        }
      }

      if (!municipalityId) {
        res.status(403).json({
          success: false,
          error: "No active municipality configuration bound to this profile.",
        });
        return;
      }

      // Append the verified municipality ID directly to the request object
      req.municipalityId = municipalityId;
      next();
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: "Internal context verification failure.",
      });
    }
  };
};
