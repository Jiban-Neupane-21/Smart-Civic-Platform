import { SupabaseClient } from "@supabase/supabase-js";

export class OnboardingWizardService {
  constructor(private supabaseAdmin: SupabaseClient) {}

  /**
   * Fetch current onboarding wizard progress for a profile
   */
  async getWizardProgress(profileId: string) {
    const { data, error } = await this.supabaseAdmin
      .from("onboarding_wizard_progress")
      .select("*")
      .eq("profile_id", profileId)
      .maybeSingle();

    if (!data) {
      // Create initial progress if absent
      const { data: created, error: createErr } = await this.supabaseAdmin
        .from("onboarding_wizard_progress")
        .insert({
          profile_id: profileId,
          current_step: 1,
          step1_completed: false,
          step2_completed: false,
          step3_completed: false,
          step4_completed: false,
        })
        .select()
        .single();

      if (createErr) throw createErr;
      return created;
    }

    return data;
  }

  /**
   * Step 1: Credentials & MFA enrollment
   */
  async completeStep1(profileId: string) {
    const nowIso = new Date().toISOString();
    await this.supabaseAdmin
      .from("onboarding_wizard_progress")
      .update({
        step1_completed: true,
        current_step: 2,
        updated_at: nowIso,
      })
      .eq("profile_id", profileId);

    return { current_step: 2, step1_completed: true };
  }

  /**
   * Step 2: Personal details, designation & emergency contact
   */
  async completeStep2(
    profileId: string,
    payload: {
      alternate_phone?: string;
      designation?: string;
      employee_id?: string;
    }
  ) {
    const nowIso = new Date().toISOString();

    // 1. Update profile details
    await this.supabaseAdmin
      .from("profiles")
      .update({
        alternate_phone: payload.alternate_phone || null,
        designation: payload.designation || null,
        employee_id: payload.employee_id || null,
        updated_at: nowIso,
      })
      .eq("id", profileId);

    // 2. Advance wizard progress
    await this.supabaseAdmin
      .from("onboarding_wizard_progress")
      .update({
        step2_completed: true,
        current_step: 3,
        updated_at: nowIso,
      })
      .eq("profile_id", profileId);

    return { current_step: 3, step2_completed: true };
  }

  /**
   * Step 3: Identity verification upload
   */
  async completeStep3(
    profileId: string,
    payload: {
      identity_type: string;
      identity_number: string;
      identity_document_url: string;
    }
  ) {
    const nowIso = new Date().toISOString();

    await this.supabaseAdmin
      .from("profiles")
      .update({
        identity_type: payload.identity_type,
        identity_number: payload.identity_number,
        identity_document_url: payload.identity_document_url,
        identity_verified_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", profileId);

    await this.supabaseAdmin
      .from("onboarding_wizard_progress")
      .update({
        step3_completed: true,
        current_step: 4,
        updated_at: nowIso,
      })
      .eq("profile_id", profileId);

    return { current_step: 4, step3_completed: true };
  }

  /**
   * Step 4: Finalize onboarding & activate profile
   */
  async finalizeOnboarding(profileId: string) {
    const nowIso = new Date().toISOString();

    // 1. Mark profile active & wizard completed
    const { data: profile, error } = await this.supabaseAdmin
      .from("profiles")
      .update({
        account_status: "active",
        onboarding_wizard_completed: true,
        onboarding_completed_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", profileId)
      .select()
      .single();

    if (error) throw error;

    // 2. Update wizard progress
    await this.supabaseAdmin
      .from("onboarding_wizard_progress")
      .update({
        step4_completed: true,
        wizard_completed_at: nowIso,
        updated_at: nowIso,
      })
      .eq("profile_id", profileId);

    return {
      success: true,
      message: "Profile activated cleanly. Welcome to Smart Civic Platform!",
      profile,
    };
  }
}
