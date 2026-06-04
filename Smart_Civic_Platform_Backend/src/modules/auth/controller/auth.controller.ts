import { Request, Response } from 'express';
import * as AuthService from "../services/auth.service";
import { sendSuccess, sendError } from "../../../utils/response";
import { supabaseAdmin } from "../../../config/supabase";

export const register = async (req: Request, res: Response) => {
  try {
    const data = await AuthService.registerService(req.body);
    return sendSuccess(res, data, 'Registration successful. You can now log in.', 201);
  } catch (e: any) { return sendError(res, e.message, 400); }
};

export const login = async (req: Request, res: Response) => {
  try {
    const data = await AuthService.loginService(req.body.email, req.body.password);
    return sendSuccess(res, data, 'Login successful');
  } catch (e: any) { return sendError(res, e.message, 401); }
};

export const refresh = async (req: Request, res: Response) => {
  try {
    const data = await AuthService.refreshTokenService(req.body.refresh_token);
    return sendSuccess(res, data, 'Token refreshed');
  } catch (e: any) { return sendError(res, e.message, 401); }
};

export const logout = async (req: Request, res: Response) => {
  try {
    await AuthService.logoutService(req.body.refresh_token, req.user!.id);
    return sendSuccess(res, null, 'Logged out successfully');
  } catch (e: any) { return sendError(res, e.message, 400); }
};

export const inviteStaff = async (req: Request, res: Response) => {
  try {
    const data = await AuthService.inviteStaffService({
      ...req.body,
      municipality_id: req.user!.municipality_id!,
      invited_by: req.user!.id,
    });
    return sendSuccess(res, data, 'Invitation sent', 201);
  } catch (e: any) { return sendError(res, e.message, 400); }
};

export const acceptInvite = async (req: Request, res: Response) => {
  try {
    const data = await AuthService.acceptInviteService(req.body);
    return sendSuccess(res, data, 'Invite accepted');
  } catch (e: any) { return sendError(res, e.message, 400); }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const data = await AuthService.forgotPasswordService(req.body.email);
    return sendSuccess(res, data);
  } catch (e: any) { return sendError(res, e.message, 400); }
};

export const getMe = async (req: Request, res: Response) => {
  try {
    const user = req.user!;

    // For citizens, also fetch their address from the citizens table
    if (user.role === 'citizen') {
      const { data: citizen } = await supabaseAdmin
        .from('citizens')
        .select('first_name, middle_name, last_name, date_of_birth, gender, home_address, permanent_address, ward_number, notification_pref')
        .eq('id', user.id)
        .single();

      return sendSuccess(res, {
        ...user,
        citizen_details: citizen ?? null,
      });
    }

    // For staff/admin roles, just return the profile
    return sendSuccess(res, user);
  } catch (e: any) {
    return sendError(res, e.message, 500);
  }
};