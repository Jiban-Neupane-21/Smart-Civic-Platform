// src/middlewares/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { supabase, supabaseAdmin } from '../config/supabase';

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1];

  // Verify the JWT with Supabase
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }

  // Fetch their profile to get role + org context
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, email, role, municipality_id, department_id')
    .eq('id', user.id)
    .eq('is_deleted', false)
    .single();

  if (profileError || !profile) {
    return res.status(401).json({ success: false, message: 'User profile not found' });
  }

  req.user = {
    id:              profile.id,
    email:           profile.email,
    role:            profile.role,
    municipality_id: profile.municipality_id,
    department_id:   profile.department_id
  };

  next();
};