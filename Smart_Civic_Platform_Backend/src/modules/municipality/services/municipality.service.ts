import { MunicipalityRepository } from "../repository/municipality.repository";
import type {
  ComplaintStatus,
  DepartmentInsert,
  StaffInsert,
} from "../../../types/database.type";

export class MunicipalityService {
  constructor(private repo: MunicipalityRepository) {}

  async getDashboardAnalytics(municipalityId: string) {
    return await this.repo.getLocalComplaintStats(municipalityId);
  }

  async getDepartments(municipalityId: string) {
    return await this.repo.getDepartments(municipalityId);
  }

  async registerDepartment(municipalityId: string, data: DepartmentInsert) {
    const completePayload = { ...data, municipality_id: municipalityId };
    return await this.repo.createDepartment(completePayload);
  }

  async updateDepartment(departmentId: string, data: any) {
    return await this.repo.updateDepartment(departmentId, data);
  }

  async deleteDepartment(departmentId: string) {
    return await this.repo.deleteDepartment(departmentId);
  }

  async getDepartmentCategories() {
    return await this.repo.getDepartmentCategories();
  }

  async registerStaffMember(municipalityId: string, data: StaffInsert) {
    const completePayload = { ...data, municipality_id: municipalityId };
    return await this.repo.onboardStaff(completePayload);
  }

  async getComplaintsLog(
    municipalityId: string,
    filterStatus?: ComplaintStatus,
  ) {
    return await this.repo.getRegionalComplaints(municipalityId, filterStatus);
  }
}
