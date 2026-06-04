import {
  Request as AuthenticatedRequest,
  Response,
  NextFunction,
} from "express";
// Assuming AuthenticatedRequest is exported here

export const forcePasswordReset = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  // Check if the profile requires a password reset
  if (req.user && req.user.force_password_reset) {
    // Let them hit the change password endpoints, otherwise block
    if (
      !req.originalUrl.includes("/reset-password") &&
      !req.originalUrl.includes("/change-password")
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You must reset your initial password before accessing the platform.",
        code: "FORCE_PASSWORD_RESET",
      });
    }
  }

  next();
};
