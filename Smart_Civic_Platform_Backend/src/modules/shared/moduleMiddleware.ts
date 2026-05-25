import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { authorize } from "../../middleware/authorize";
import type { AuthenticatedRequest } from "./legacyUser";

export { authenticate } from "./legacyUser";
export type { AuthenticatedRequest };

export const superadminRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: "Too many requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

export const municipalityRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, message: "Too many requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

export const publicRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: { success: false, message: "Too many requests. Please slow down." },
});

export const isSuperadmin = authorize("superadmin");

const STAFF_ROLES = [
  "superadmin",
  "municipality_head",
  "department_head",
  "staff",
] as const;

export const isMunicipalityStaff = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void => {
  if (!req.user || !STAFF_ROLES.includes(req.user.role as (typeof STAFF_ROLES)[number])) {
    res.status(403).json({
      success: false,
      message: "Access denied. Staff role required.",
    });
    return;
  }
  next();
};

export const isMunicipalityAdmin = authorize(
  "superadmin",
  "municipality_head",
);

export const belongsToMunicipality = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void => {
  if (req.user?.role === "superadmin") {
    next();
    return;
  }
  const paramId =
    req.params.municipalityId ||
    (req.query.municipalityId as string) ||
    req.body?.municipalityId;
  if (!paramId || req.user?.municipalityId !== paramId) {
    res.status(403).json({
      success: false,
      message: "Access denied. You do not belong to this municipality.",
    });
    return;
  }
  next();
};

export const belongsToDepartment = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void => {
  const bypassRoles = ["superadmin", "municipality_head"];
  if (req.user && bypassRoles.includes(req.user.role)) {
    next();
    return;
  }
  const paramDeptId = req.params.departmentId;
  if (!paramDeptId || req.user?.departmentId !== paramDeptId) {
    res.status(403).json({
      success: false,
      message: "Access denied. You do not belong to this department.",
    });
    return;
  }
  next();
};

export const validateBody =
  (requiredFields: string[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const missing = requiredFields.filter(
      (f) =>
        req.body[f] === undefined ||
        req.body[f] === null ||
        req.body[f] === "",
    );
    if (missing.length > 0) {
      res.status(400).json({
        success: false,
        message: `Missing required fields: ${missing.join(", ")}`,
      });
      return;
    }
    next();
  };

export const requestLogger = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void => {
  const start = Date.now();
  const tag = req.baseUrl.includes("superadmin")
    ? "SUPERADMIN"
    : req.baseUrl.includes("staff")
      ? "STAFF"
      : req.baseUrl.includes("department")
        ? "DEPARTMENT"
        : "MUNICIPALITY";
  res.on("finish", () => {
    console.log(
      `[${tag}] ${req.method} ${req.originalUrl} | status=${res.statusCode} | user=${req.user?.userId ?? "public"} | ${Date.now() - start}ms`,
    );
  });
  next();
};

/** No-op audit hook; services write to audit_logs with full schema */
export const auditLogger = (
  _req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): void => {
  next();
};
