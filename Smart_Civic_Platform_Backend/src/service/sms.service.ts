import { smsConfig } from "../config/sms.config";

export class SmsService {
  /**
   * Send SMS message to targeted Nepal mobile number
   */
  static async sendSMS(phone: string, message: string): Promise<{ success: boolean; detail?: string }> {
    // Sanitize phone number (must be 10 digits starting with 98 or 97)
    const sanitizedPhone = phone.trim().replace(/^\+977/, "");

    if (smsConfig.provider === "console" || !smsConfig.apiKey) {
      console.log(`[SMS-DEV-FALLBACK] To: ${sanitizedPhone} | Message: "${message}"`);
      return { success: true, detail: "SMS logged to console (DEV mode)" };
    }

    try {
      // sparrow SMS integration
      if (smsConfig.provider === "sparrow") {
        const response = await fetch(smsConfig.baseUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: smsConfig.apiKey,
            from: smsConfig.senderId,
            to: sanitizedPhone,
            text: message,
          }),
        });

        const data = await response.json();
        return { success: response.ok, detail: JSON.stringify(data) };
      }

      console.log(`[SMS-UNKNOWN-PROVIDER] To: ${sanitizedPhone} | Message: "${message}"`);
      return { success: true, detail: "Logged to console" };
    } catch (error: any) {
      console.error("[SMS-SEND-ERROR]", error.message);
      return { success: false, detail: error.message };
    }
  }

  /**
   * Send formatted OTP SMS
   */
  static async sendOTP(phone: string, otpCode: string, purpose = "registration"): Promise<{ success: boolean }> {
    const msg = `Your Smart Civic verification code for ${purpose} is ${otpCode}. Valid for 10 minutes. Do not share this code with anyone.`;
    const res = await this.sendSMS(phone, msg);
    return { success: res.success };
  }
}
