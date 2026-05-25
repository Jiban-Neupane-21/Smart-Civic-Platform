import { supabaseAdmin } from "../config/supabase";
import type { AuditAction, UserRole } from "../types/database.type";

export interface AuditEntry {
  actionBy: string | null;
  actionRole: UserRole;
  municipalityId?: string | null;
  departmentId?: string | null;
  tableName: string;
  recordId: string;
  action: AuditAction;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  ip?: string;
  userAgent?: string;
  note?: string;
}

export async function recordAudit(entry: AuditEntry): Promise<void> {
  const { error } = await supabaseAdmin.from("audit_logs").insert({
    action_by: entry.actionBy,
    action_role: entry.actionRole,
    municipality_id: entry.municipalityId ?? null,
    department_id: entry.departmentId ?? null,
    table_name: entry.tableName,
    record_id: entry.recordId,
    action: entry.action,
    old_value: entry.oldValue ?? null,
    new_value: entry.newValue ?? null,
    ip_address: entry.ip ?? null,
    user_agent: entry.userAgent ?? null,
    severity: "info",
    note: entry.note ?? null,
  });

  if (error) console.error("[audit]", error.message);
}
