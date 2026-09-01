import { SupabaseClient } from "@supabase/supabase-js";
import { LifecycleService } from "./lifecycle.service";

export class AutoCloseService {
  constructor(private supabaseAdmin: SupabaseClient) {}

  /**
   * Auto-close resolved complaints after 7 days without citizen feedback
   */
  async autoCloseResolvedComplaints(): Promise<{ closedCount: number }> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const lifecycle = new LifecycleService(this.supabaseAdmin);

    // Query complaints in 'resolved' status where resolved_at is older than 7 days
    const { data: expiredResolved, error } = await this.supabaseAdmin
      .from("complaints")
      .select("co_uid, tracking_id")
      .eq("status", "resolved")
      .lt("resolved_at", sevenDaysAgo);

    if (error || !expiredResolved || expiredResolved.length === 0) {
      return { closedCount: 0 };
    }

    let closedCount = 0;
    for (const c of expiredResolved) {
      await lifecycle.transition(
        c.co_uid,
        "closed",
        "system",
        "system",
        "Auto-closed: 7 days elapsed post-resolution without citizen feedback."
      );
      closedCount++;
    }

    return { closedCount };
  }
}
