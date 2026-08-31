import { Request, Response, NextFunction } from "express";

export const requireKyc = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const user = req.user;

  // Citizens and Superadmins are exempt from mandatory KYC blocking dashboard access
  if (!user || ["superadmin", "citizen"].includes(user.role)) {
    return next();
  }

  // If the user already has KYC completed (has an identity document)
  if (user.identity_document_url) {
    return next();
  }

  // Whitelisted paths that the user can access while KYC is incomplete
  const whitelist = [
    "/reset-password",
    "/change-password",
    "/profile",
    "/profile/identity",
    "/auth/me",
    "/auth/logout"
  ];

  const isWhitelisted = whitelist.some((path) => req.path.includes(path)) || req.path === "/kyc";

  if (!isWhitelisted) {
    return res.status(403).json({
      success: false,
      message: "You must complete your KYC upload before accessing the platform.",
      code: "KYC_REQUIRED",
    });
  }

  next();
};
