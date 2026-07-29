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
  kycStatus?: 'unverified' | 'pending' | 'verified' | 'rejected';
  kycVerifiedAt?: string;
  kycRejectionReason?: string;
  identityType?: string;
  identityNumber?: string;
  identityFrontImageUrl?: string;
  identityBackImageUrl?: string;
  permanentProvinceId?: string;
  permanentDistrictId?: string;
  permanentMunicipalityId?: string;
  permanentWardId?: string;
  permanentTole?: string;
  currentProvinceId?: string;
  currentDistrictId?: string;
  currentMunicipalityId?: string;
  currentWardId?: string;
  currentTole?: string;
}

export interface UpdateCitizenProfileDto {
  fullName?: string;
  phoneNumber?: string;
  homeAddress?: string;
  permanentAddress?: string;
  wardNumber?: number;
}

export interface Province {
  id: string;
  name: string;
}

export interface District {
  id: string;
  name: string;
}

export interface Municipality {
  id: string;
  official_name: string;
  local_level_type: string;
}

export interface Ward {
  id: string;
  ward_no: number;
  ward_office_name?: string;
}

export interface StructuredAddress {
  province_id: string;
  district_id: string;
  municipality_id: string;
  ward_id: string;
  tole?: string;
}

export interface AddressPayload {
  permanent: StructuredAddress;
  current: StructuredAddress;
}

export interface IdentityPayload {
  identity_type: 'citizenship' | 'national_id' | 'passport' | 'driving_license' | 'voter_id';
  identity_number: string;
  front_image: string;
  back_image: string;
}
