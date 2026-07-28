import { SupabaseClient } from "@supabase/supabase-js";

export interface AvailabilityResult {
  staff_id: string;
  is_available: boolean;
  conflicting_team_name?: string;
  start_date?: string;
  end_date?: string;
}

export class ScheduleService {
  constructor(private supabaseAdmin: SupabaseClient) {}

  /**
   * Check single staff availability between startDate and endDate
   */
  async checkAvailability(
    staffId: string,
    startDate: string,
    endDate: string
  ): Promise<AvailabilityResult> {
    // Overlap condition: assignment.start_date < endDate AND assignment.end_date > startDate
    const { data: conflicts, error } = await this.supabaseAdmin
      .from("staff_assignments")
      .select(`
        id, start_date, end_date, released_at,
        team:teams!team_id(team_name, is_active)
      `)
      .eq("staff_id", staffId)
      .is("released_at", null)
      .lt("start_date", endDate)
      .gt("end_date", startDate);

    if (error) throw error;

    const activeConflict = conflicts?.find((c: any) => c.team?.is_active !== false);

    if (activeConflict) {
      const teamObj: any = activeConflict.team;
      const teamName = Array.isArray(teamObj) ? teamObj[0]?.team_name : teamObj?.team_name;

      return {
        staff_id: staffId,
        is_available: false,
        conflicting_team_name: teamName || "Another Team",
        start_date: activeConflict.start_date,
        end_date: activeConflict.end_date,
      };
    }

    return {
      staff_id: staffId,
      is_available: true,
    };
  }

  /**
   * Bulk check availability for multiple staff IDs
   */
  async checkBulkAvailability(
    staffIds: string[],
    startDate: string,
    endDate: string
  ): Promise<AvailabilityResult[]> {
    const results: AvailabilityResult[] = [];
    for (const staffId of staffIds) {
      const res = await this.checkAvailability(staffId, startDate, endDate);
      results.push(res);
    }
    return results;
  }

  /**
   * Auto-release expired staff assignments and deactivate teams past end_date
   */
  async autoReleaseExpiredAssignments(): Promise<{ releasedCount: number }> {
    const nowIso = new Date().toISOString();

    // 1. Find teams past end_date that are still active
    const { data: expiredTeams } = await this.supabaseAdmin
      .from("teams")
      .select("id")
      .eq("is_active", true)
      .lt("end_date", nowIso);

    if (expiredTeams && expiredTeams.length > 0) {
      const teamIds = expiredTeams.map((t) => t.id);

      // Deactivate teams
      await this.supabaseAdmin
        .from("teams")
        .update({ is_active: false, updated_at: nowIso })
        .in("id", teamIds);

      // Release staff assignments
      await this.supabaseAdmin
        .from("staff_assignments")
        .update({
          released_at: nowIso,
          release_reason: "Auto-released: Team duration expired",
        })
        .in("team_id", teamIds)
        .is("released_at", null);

      return { releasedCount: teamIds.length };
    }

    return { releasedCount: 0 };
  }
}
