import { recordAudit, AuditEntry } from "../utils/auditHelper";
import type { AuditAction, Severity, UserRole } from "../types/database.type";

export class AuditService {
  /**
   * Log an authentication login event
   */
  static async logLogin(params: {
    userId: string;
    role: UserRole;
    municipalityId?: string | null;
    email?: string;
    fullName?: string;
    ip?: string;
    userAgent?: string;
    method?: "password" | "mobile_otp" | "oauth";
  }): Promise<void> {
    await recordAudit({
      actionBy: params.userId,
      actionRole: params.role,
      municipalityId: params.municipalityId ?? null,
      tableName: "profiles",
      recordId: params.userId,
      action: "LOGIN",
      newValue: {
        method: params.method || "password",
        email: params.email,
        full_name: params.fullName,
        role: params.role,
        municipality_id: params.municipalityId ?? null,
        ip: params.ip,
        user_agent: params.userAgent,
        login_at: new Date().toISOString(),
      },
      ip: params.ip,
      userAgent: params.userAgent,
      severity: "info",
    });
  }

  /**
   * Log an authentication logout event
   */
  static async logLogout(params: {
    userId: string;
    role?: UserRole;
    municipalityId?: string | null;
    ip?: string;
    userAgent?: string;
  }): Promise<void> {
    await recordAudit({
      actionBy: params.userId,
      actionRole: params.role || "citizen",
      municipalityId: params.municipalityId ?? null,
      tableName: "profiles",
      recordId: params.userId,
      action: "LOGOUT",
      newValue: {
        logout_at: new Date().toISOString(),
        ip: params.ip,
        user_agent: params.userAgent,
      },
      ip: params.ip,
      userAgent: params.userAgent,
      severity: "info",
    });
  }

  /**
   * Log a general administrative or system action
   */
  static async logAction(entry: AuditEntry): Promise<void> {
    await recordAudit(entry);
  }
}

export default AuditService;
