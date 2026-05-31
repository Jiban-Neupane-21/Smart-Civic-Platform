
import { Request as AuthenticatedRequest, Response, NextFunction } from "express";


export const belongsToMunicipality = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  const targetId =
    req.params.municipalityId ||
    req.body.municipalityId ||
    req.query.municipalityId;

  if (req.user?.role === "superadmin") {
    return next();
  }

  if (targetId && req.user?.municipality_id !== targetId) {
    return res.status(403).json({
      success: false,
      message: "Access denied. You do not belong to this municipality.",
    });
  }

  next();
};

export const belongsToDepartment = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  const targetId =
    req.params.departmentId || req.body.departmentId || req.query.departmentId;

  if (
    req.user?.role === "superadmin" ||
    req.user?.role === "municipality_head"
  ) {
    return next();
  }

  if (targetId && req.user?.department_id !== targetId) {
    return res.status(403).json({
      success: false,
      message: "Access denied. You do not belong to this department.",
    });
  }

  next();
};
