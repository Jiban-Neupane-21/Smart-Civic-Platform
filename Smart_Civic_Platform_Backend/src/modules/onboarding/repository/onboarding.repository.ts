import { SupabaseClient } from "@supabase/supabase-js";

export class OnboardingRepository {
  constructor(private supabaseAdmin: SupabaseClient) {}

  async getProgress(profileId: string) {
    const { data, error } = await this.supabaseAdmin
      .from("onboarding_wizard_progress")
      .select("*")
      .eq("profile_id", profileId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }
}
