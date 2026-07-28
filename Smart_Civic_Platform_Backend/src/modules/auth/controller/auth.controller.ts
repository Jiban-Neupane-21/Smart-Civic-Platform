import { Request, Response } from "express";
import * as AuthService from "../services/auth.service";
import { sendSuccess, sendError } from "../../../utils/response";
import { supabaseAdmin } from "../../../config/supabase";
import { OTPService } from "../../../service/otp.service";

export const register = async (req: Request, res: Response) => {
  try {
    const data = await AuthService.registerService(req.body);
    return sendSuccess(res, data, "Registration successful. You can now log in.", 201);
  } catch (e: any) {
    console.error("[Register] Error:", e);
    return sendError(res, e.message, 400);
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const data = await AuthService.loginService(req.body.email, req.body.password);
    return sendSuccess(res, data, "Login successful");
  } catch (e: any) {
    return sendError(res, e.message, 401);
  }
};

export const sendOtp = async (req: Request, res: Response) => {
  try {
    const { phone, purpose } = req.body;
    if (!phone) return sendError(res, "Mobile number is required.", 400);
    const otpService = new OTPService(supabaseAdmin);
    const result = await otpService.generateOTP(phone, purpose || "registration");
    return sendSuccess(res, result);
  } catch (e: any) {
    return sendError(res, e.message, 400);
  }
};

export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { phone, otp_code, purpose } = req.body;
    if (!phone || !otp_code) return sendError(res, "Phone and OTP code are required.", 400);
    const otpService = new OTPService(supabaseAdmin);
    const isValid = await otpService.verifyOTP(phone, otp_code, purpose || "registration");
    if (!isValid) return sendError(res, "Invalid or expired OTP code.", 400);
    return sendSuccess(res, { verified: true });
  } catch (e: any) {
    return sendError(res, e.message, 400);
  }
};

export const loginMobile = async (req: Request, res: Response) => {
  try {
    const { phone, otp_code } = req.body;
    if (!phone || !otp_code) return sendError(res, "Phone and OTP code are required.", 400);
    const data = await AuthService.loginWithMobileService(phone, otp_code);
    return sendSuccess(res, data, "Mobile login successful.");
  } catch (e: any) {
    return sendError(res, e.message, 401);
  }
};

export const refresh = async (req: Request, res: Response) => {
  try {
    const data = await AuthService.refreshTokenService(req.body.refresh_token);
    return sendSuccess(res, data, "Token refreshed");
  } catch (e: any) {
    return sendError(res, e.message, 401);
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    await AuthService.logoutService(req.body.refresh_token, req.user!.id);
    return sendSuccess(res, null, "Logged out successfully");
  } catch (e: any) {
    return sendError(res, e.message, 400);
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const data = await AuthService.forgotPasswordService(req.body.email);
    return sendSuccess(res, data);
  } catch (e: any) {
    return sendError(res, e.message, 400);
  }
};

export const changePassword = async (req: Request, res: Response) => {
  try {
    const data = await AuthService.changePasswordService(req.user!.id, req.body);
    return sendSuccess(res, data, "Password changed successfully");
  } catch (e: any) {
    return sendError(res, e.message, 400);
  }
};

export const getMe = async (req: Request, res: Response) => {
  try {
    const user = req.user!;

    if (user.role === "citizen") {
      const { data: citizen } = await req.userClient!
        .from("citizens")
        .select(`
          first_name, middle_name, last_name, date_of_birth, gender,
          current_address, permanent_address, ward_id, notification_pref,
          permanent_province_id, permanent_district_id, permanent_municipality_id, permanent_ward_id, permanent_tole,
          current_province_id, current_district_id, current_municipality_id, current_ward_id, current_tole,
          identity_type, identity_number, identity_front_image_url, identity_back_image_url,
          kyc_status, kyc_verified_at, kyc_rejection_reason
        `)
        .eq("id", user.id)
        .maybeSingle();

      return sendSuccess(res, {
        ...user,
        citizen_details: citizen ?? null,
      });
    }

    return sendSuccess(res, user);
  } catch (e: any) {
    return sendError(res, e.message, 500);
  }
};