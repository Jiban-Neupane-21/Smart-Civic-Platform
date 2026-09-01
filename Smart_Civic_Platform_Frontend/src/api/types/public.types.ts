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
