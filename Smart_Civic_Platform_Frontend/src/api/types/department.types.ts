export interface Department {
  id: string;
  name: string;
  code?: string;
  description?: string;
  municipalityId: string;
  headId?: string;
  headName?: string;
  headEmail?: string;
  staffCount?: number;
  activeComplaintsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDepartmentDto {
  name: string;
  code?: string;
  description?: string;
  municipalityId?: string;
  headId?: string;
}

export interface UpdateDepartmentDto {
  name?: string;
  code?: string;
  description?: string;
  headId?: string;
}
