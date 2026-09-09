import { supabaseAdmin } from "../config/supabase.js";
import type { AuditAction, Severity, UserRole } from "../types/database.type";

export interface AuditEntry {
  actionBy: string | null;
  actionRole: UserRole;
  municipalityId?: string | null;
  departmentId?: string | null;
  targetUserId?: string | null;
  tableName: string;
  recordId: string;
  action: AuditAction;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  ip?: string;
  userAgent?: string;
  severity?: Severity;
  note?: string;
}

export async function recordAudit(entry: AuditEntry): Promise<void> {
  let newValue = entry.newValue ? { ...entry.newValue } : null;
  if (entry.ip || entry.userAgent || entry.note) {
    newValue = newValue || {};
    if (entry.ip && !newValue.ip) newValue.ip = entry.ip;
    if (entry.userAgent && !newValue.user_agent) newValue.user_agent = entry.userAgent;
    if (entry.note && !newValue.note) newValue.note = entry.note;
  }

  const { error } = await supabaseAdmin
    .from("audit_logs")
    .insert({
      action_by: entry.actionBy,
      action_by_role: entry.actionRole as any,
      municipality_id: entry.municipalityId ?? null,
      target_user_id: entry.targetUserId ?? null,
      table_name: entry.tableName,
      record_id: entry.recordId,
      action: entry.action as any,
      old_value: entry.oldValue ?? null,
      new_value: newValue,
      severity: (entry.severity as any) || "info",
    } as any);

  if (error) console.error("[audit]", error.message);
}

