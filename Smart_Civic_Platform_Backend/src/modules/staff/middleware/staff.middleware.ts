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
        .select('role, account_status')
        .eq('id', userId)
        .single();

      if (profileError || !profile || profile.account_status !== 'active' || profile.role !== 'staff') {
        res.status(403).json({ success: false, error: 'Access Denied: Requires active Field Staff permissions.' });
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