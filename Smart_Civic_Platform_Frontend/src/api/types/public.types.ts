export interface PublicStats {
  totalMunicipalities: number;
  totalComplaintsResolved: number;
  totalActiveCitizens: number;
}

export interface PublicAnnouncement {
  id: string;
  title: string;
  content: string;
  category: string;
  municipalityId?: string;
  publishedAt: string;
}

export interface ActiveMunicipality {
  id: string;
  official_name: string;
  local_level_type?: string;
  total_wards?: number;
  district_id: string;
  district_name: string;
  province_id: string;
  province_name: string;
  official_email?: string;
  is_active?: boolean;
}

