export interface OnboardingStatus {
  isCompleted: boolean;
  currentStep: number;
  totalSteps: number;
  missingFields: string[];
}

export interface SubmitOnboardingDto {
  fullName: string;
  phoneNumber: string;
  homeAddress: string;
  permanentAddress: string;
  wardNumber: number;
  municipalityId: string;
  citizenshipNo?: string;
}
