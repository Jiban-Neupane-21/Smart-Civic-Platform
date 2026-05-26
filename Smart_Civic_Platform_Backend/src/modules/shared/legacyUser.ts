import { Request, Response, NextFunction } from "express";
import { authenticate as supabaseAuthenticate } from "../../middleware/authenticate";

export type { AuthUser as LegacyAuthUser } from "../../middleware/authenticate";

export type AuthenticatedRequest = Request;

export const authenticate = supabaseAuthenticate;
