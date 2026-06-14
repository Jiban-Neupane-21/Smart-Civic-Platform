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
    // Business Rule: Ensure attachments match allowed storage root paths
    if (
      payload.attachment_url &&
      !payload.attachment_url.includes(".supabase.co/storage/v1/object/public/")
    ) {
      throw new Error(
        "Security Violation: Invalid attachment storage source location path.",
      );
    }
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
