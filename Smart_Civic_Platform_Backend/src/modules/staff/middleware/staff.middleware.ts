import { Response, NextFunction } from 'express';
import { SupabaseClient } from '@supabase/supabase-js';

export interface StaffRequest extends Request {
  user?: any;
  staffId?: string;
  departmentId?: string;
}

export const verifyStaffContext = (supabase: SupabaseClient) => {
  return async (req: any, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, error: 'User session context missing.' });
        return;
      }

      // Assert basic account runtime safety via profiles validation
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select("role, account_status, force_password_reset, identity_document_url")
        .eq("id", userId)
        .single();

      if (profileError || !profile) {
        res.status(403).json({ success: false, error: "Access Denied: Requires active Staff privileges." });
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

      if (profile.role !== 'staff') {
        res.status(403).json({ success: false, error: 'Access Denied: Requires Field Staff permissions.' });
        return;
      }

      // Query internal metadata footprints map
      const { data: staffMeta, error: metaError } = await supabase
        .from('staff')
        .select('id, primary_department_id')
        .eq('profile_id', userId)
        .single();

      if (metaError || !staffMeta) {
        res.status(403).json({ success: false, error: 'No localized staff employment records bound to this profile.' });
        return;
      }

      // Bind resolved identities into route lifecycle execution parameters safely
      req.staffId = staffMeta.id;
      req.departmentId = staffMeta.primary_department_id;
      next();
    } catch (err: any) {
      res.status(500).json({ success: false, error: 'Internal staff verification process failure.' });
    }
  };
};