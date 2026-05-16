import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response.js';

export const authorize = (...allowedRoles: string[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return sendError(res, 'Unauthenticated', 401);
    if (!allowedRoles.includes(req.user.role)) {
      return sendError(res, `Access denied. Required roles: ${allowedRoles.join(', ')}`, 403);
    }
    next();
  };