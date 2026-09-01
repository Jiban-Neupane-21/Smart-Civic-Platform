// ===============================
// 📧 MAILER CONFIG (Nodemailer)
// ===============================

import nodemailer from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";

import { env } from "./env";

// ===============================
// 🚀 CREATE TRANSPORTER
// ===============================

const transporter = nodemailer.createTransport({
  host: env.SMTP.HOST,
  port: env.SMTP.PORT,
  secure: false, // true for 465, false for 587
  auth: env.SMTP.USER
    ? {
        user: env.SMTP.USER,
        pass: env.SMTP.PASS,
      }
    : undefined,
});

// ===============================
//  VERIFY CONNECTION (DEV ONLY)
// ===============================

if (env.NODE_ENV === "development" && env.SMTP.HOST) {
  transporter.verify((error: Error | null) => {
    if (error) {
      console.warn("Mailer connection failed:", error.message);
    } else {
      console.log("Mailer is ready to send emails");
    }
  });
}

// ===============================
// 📤 GENERIC SEND FUNCTION
// ===============================

type SendMailOptions = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export const sendMail = async ({
  to,
  subject,
  html,
  text,
}: SendMailOptions) => {
  try {
    const info = await transporter.sendMail({
      from: `"Smart Civic Platform" <${env.SMTP.USER}>`,
      to,
      subject,
      text,
      html,
    });

    if (env.NODE_ENV === "development") {
      console.log("Email sent:", info.messageId);
    }

    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Email sending failed");
  }
};

// ===============================
//  PREBUILT EMAIL HELPERS
// ===============================

// 1️⃣ Password Reset Email
export const sendPasswordResetEmail = async (email: string, token: string) => {
  const link = `${env.CLIENT_URL}/reset-password?token=${token}`;

  const html = `
    <h2>Password Reset</h2>
    <p>Click below to reset your password:</p>
    <a href="${link}">Reset Password</a>
    <p>This link expires in 1 hour.</p>
  `;

  return sendMail({
    to: email,
    subject: "Reset Your Password",
    html,
  });
};

// 3 Welcome Email (Citizen)
export const sendWelcomeEmail = async (email: string, name?: string) => {
  const html = `
    <h2>Welcome to Smart Civic Platform </h2>
    <p>Hello ${name || "User"},</p>
    <p>Your account has been successfully created.</p>
  `;

  return sendMail({
    to: email,
    subject: "Welcome to Smart Civic Platform",
    html,
  });
};
