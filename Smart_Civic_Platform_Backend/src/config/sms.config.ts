export const smsConfig = {
  provider: process.env.SMS_PROVIDER || "console", // 'sparrow' | 'ntc' | 'console'
  apiKey: process.env.SMS_API_KEY || "",
  senderId: process.env.SMS_SENDER_ID || "SmartCivic",
  baseUrl: process.env.SMS_BASE_URL || "http://api.sparrowsms.com/v2/sms/",
};
