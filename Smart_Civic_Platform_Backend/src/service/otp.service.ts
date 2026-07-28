import { SupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { SmsService } from "./sms.service";

export class OTPService {
  constructor(private supabaseAdmin: SupabaseClient) {}

  /**
   * Generate 6-digit numeric OTP and save to DB
   */
  async generateOTP(phone: string, purpose = "registration"): Promise<{ success: boolean; message: string }> {
    const sanitizedPhone = phone.trim().replace(/^\+977/, "");

    // 1. Invalidate previous unused OTPs for this phone and purpose
    await this.supabaseAdmin
      .from("otp_codes")
      .update({ is_used: true })
      .eq("phone", sanitizedPhone)
      .eq("purpose", purpose)
      .eq("is_used", false);

    // 2. Generate secure 6-digit OTP
    const otpCode = Math.floor(100000 + crypto.randomInt(900000)).toString();

    // 3. Set expiration time (10 minutes from now)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // 4. Insert into DB
    const { error } = await this.supabaseAdmin
      .from("otp_codes")
      .insert({
        phone: sanitizedPhone,
        otp_code: otpCode,
        purpose,
        is_used: false,
        expires_at: expiresAt,
      });

    if (error) throw error;

    // 5. Send SMS
    await SmsService.sendOTP(sanitizedPhone, otpCode, purpose);

    return {
      success: true,
      message: "OTP sent successfully to mobile number.",
    };
  }

  /**
   * Verify candidate OTP
   */
  async verifyOTP(phone: string, otpCode: string, purpose = "registration"): Promise<boolean> {
    const sanitizedPhone = phone.trim().replace(/^\+977/, "");

    const { data: record, error } = await this.supabaseAdmin
      .from("otp_codes")
      .select("id, expires_at")
      .eq("phone", sanitizedPhone)
      .eq("otp_code", otpCode)
      .eq("purpose", purpose)
      .eq("is_used", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !record) return false;

    // Mark as used
    await this.supabaseAdmin
      .from("otp_codes")
      .update({ is_used: true })
      .eq("id", record.id);

    return true;
  }

  /**
   * Clean up expired OTP records older than 24 hours
   */
  async cleanupExpiredOTPs(): Promise<void> {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    await this.supabaseAdmin
      .from("otp_codes")
      .delete()
      .lt("created_at", cutoff);
  }
}
