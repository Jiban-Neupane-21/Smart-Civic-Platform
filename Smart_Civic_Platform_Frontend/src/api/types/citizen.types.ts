import type { UserProfile } from './auth.types';

export interface CitizenDetails {
  id: string;
  userId: string;
  fullName: string;
  phoneNumber?: string;
  citizenshipNo?: string;
  homeAddress?: string;
  permanentAddress?: string;
  wardNumber?: number;
  municipalityId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateCitizenProfileDto {
  fullName?: string;
  phoneNumber?: string;
  homeAddress?: string;
  permanentAddress?: string;
  wardNumber?: number;
}
