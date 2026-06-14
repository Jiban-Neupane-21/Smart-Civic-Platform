import { StaffRepository } from "../repository/staff.repository";

export class StaffService {
  constructor(private repo: StaffRepository) {}

  async fetchAssignedFieldWork(staffId: string) {
    try {
      return await this.repo.getMyAssignedTeams(staffId);
    } catch (error: any) {
      throw new Error(
        `Failed to compile assigned team tasks ledger: ${error.message}`,
      );
    }
  }

  async fetchDepartmentalGrievances(departmentId: string) {
    try {
      return await this.repo.getDepartmentComplaintsLog(departmentId);
    } catch (error: any) {
      throw new Error(
        `Failed to retrieve department complaints log: ${error.message}`,
      );
    }
  }
}
