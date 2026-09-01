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
    // Explicitly bypass for superadmin and citizen roles
    if (req.user.role === "superadmin" || req.user.role === "citizen") {
      return next();
    }

    // Let them hit the change password endpoints, otherwise block
    if (
      !req.path.includes("/reset-password") &&
      !req.path.includes("/change-password")
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
