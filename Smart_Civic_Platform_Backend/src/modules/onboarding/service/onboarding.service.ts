import { OnboardingRepository } from "../repository/onboarding.repository";
import { OnboardingWizardService } from "../../../service/onboarding-wizard.service";

export class OnboardingService {
  constructor(private repo: OnboardingRepository) {}

  async getStatus(profileId: string) {
    const wizardService = new OnboardingWizardService((this.repo as any).supabaseAdmin);
    return await wizardService.getWizardProgress(profileId);
  }

  async completeStep1(profileId: string) {
    const wizardService = new OnboardingWizardService((this.repo as any).supabaseAdmin);
    return await wizardService.completeStep1(profileId);
  }

  async completeStep2(profileId: string, payload: any) {
    const wizardService = new OnboardingWizardService((this.repo as any).supabaseAdmin);
    return await wizardService.completeStep2(profileId, payload);
  }

  async completeStep3(profileId: string, payload: any) {
    const wizardService = new OnboardingWizardService((this.repo as any).supabaseAdmin);
    return await wizardService.completeStep3(profileId, payload);
  }

  async finalizeOnboarding(profileId: string) {
    const wizardService = new OnboardingWizardService((this.repo as any).supabaseAdmin);
    return await wizardService.finalizeOnboarding(profileId);
  }
}
