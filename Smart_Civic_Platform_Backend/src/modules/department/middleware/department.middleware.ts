import { Request, Response, NextFunction } from "express";
import { SupabaseClient } from "@supabase/supabase-js";

export interface DepartmentRequest extends Request {
  user?: any;
  departmentId?: string;
}

export const verifyDepartmentHeadContext = (supabase: SupabaseClient) => {
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
        .select("role, account_status, force_password_reset, identity_document_url")
        .eq("id", userId)
        .single();

      if (profileError || !profile) {
        res.status(403).json({ success: false, error: "Access Denied: Requires active Department Head privileges." });
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

      if (profile.account_status === "pending_onboarding" && !req.path?.startsWith("/onboarding")) {
        res.status(403).json({ success: false, error: "Onboarding incomplete. Complete your profile activation wizard first." });
        return;
      }

      if (profile.role !== "department_head" && profile.role !== "superadmin") {
        res.status(403).json({ success: false, error: "Access Denied: Requires Department Head privileges." });
        return;
      }

      // Find the specific department managed by this user
      const { data: department, error: deptError } = await supabase
        .from("departments")
        .select("id")
        .eq("head_profile_id", userId)
        .single();

      if (deptError || !department) {
        res
          .status(403)
          .json({
            success: false,
            error: "No active department configuration bound to this profile.",
          });
        return;
      }

      // Append the verified department ID directly to the request object
      req.departmentId = department.id;
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
