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
        .select("role, account_status")
        .eq("id", userId)
        .single();

      if (
        profileError ||
        !profile ||
        profile.account_status !== "active" ||
        profile.role !== "department_head"
      ) {
        res
          .status(403)
          .json({
            success: false,
            error: "Access Denied: Requires active Department Head privileges.",
          });
        return;
      }

      // Find the specific department managed by this user
      const { data: department, error: deptError } = await supabase
        .from("departments")
        .select("d_uid")
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
      req.departmentId = department.d_uid;
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
