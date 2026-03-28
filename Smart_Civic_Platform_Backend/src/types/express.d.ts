// src/types/express.d.ts
import { Request } from 'express';

export interface AuthUser {
  id: string;
  email: string;
  role: 'superadmin' | 'municipality_head' | 'department_head' | 'staff' | 'citizen';
  municipality_id: string | null;
  department_id: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}