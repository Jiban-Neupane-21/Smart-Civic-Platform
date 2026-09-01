import { ComplaintsRepository } from "../repository/complaints.repository";
import type { Database } from "../../../types/database.type";

export class ComplaintsService {
  constructor(private repo: ComplaintsRepository) {}

  async fileNewGrievance(
    citizenId: string,
    payload: Omit<
      Database["public"]["Tables"]["complaints"]["Insert"],
      "citizen_id"
    >,
  ) {
    return await this.repo.submitComplaint({
      ...payload,
      citizen_id: citizenId,
    });
  }

  async fetchCitizenHistory(citizenId: string) {
    return await this.repo.getCitizenComplaints(citizenId);
  }

  async fetchSystemCategories() {
    return await this.repo.getActiveCategories();
  }
}
