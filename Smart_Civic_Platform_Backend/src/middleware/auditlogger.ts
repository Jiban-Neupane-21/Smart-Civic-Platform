import { Request as AuthenticatedRequest, Response, NextFunction } from "express";

import { supabaseAdmin } from "../config/supabase";

type AuditAction =
  | "INSERT"
  | "UPDATE"
  | "DELETE"
  | "LOGIN"
  | "LOGOUT"
  | "ASSIGN"
  | "REASSIGN"
  | "STATUS_CHANGE"
  | "APPROVE"
  | "REJECT"
  | "EXPORT"
  | "INVITE"
  | "PASSWORD_RESET";

export const auditLogger = (
  tableName: string,
  action: AuditAction,
  getRecordId: (req: AuthenticatedRequest) => string | undefined,
  getOldValue?: (req: AuthenticatedRequest) => Request,
  getNewValue?: (req: AuthenticatedRequest) => Request,
) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) => {
    const originalJson = res.json;

    res.json = function (body) {
      res.json = originalJson;
      const response = res.json(body);

      // Only log successful operations
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        const recordId = getRecordId(req);
        if (recordId) {
          supabaseAdmin
            .from("audit_logs")
            .insert({
              action_by: req.user.id,
              action_by_role: req.user.role as any,
              municipality_id: req.user.municipality_id,
              table_name: tableName,
              record_id: recordId,
              action: action as any,
              old_value: getOldValue ? getOldValue(req) : null,
              new_value: getNewValue ? getNewValue(req) : null,
              severity: 'info',
            } as any)
            .then(({ error }) => {
              if (error) console.error("[AUDIT LOG ERROR]", error);
            });
        }
      }
      return response;
    };
    next();
  };
};

export const requestLogger = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  const start = Date.now();
  res.on("finish", () =>
    console.log(
      `[${req.method}] ${req.originalUrl} - ${res.statusCode} [${Date.now() - start}ms]`,
    ),
  );
  next();
};
