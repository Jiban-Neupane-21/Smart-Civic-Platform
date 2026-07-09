import { SuperadminRepository } from "../middleware/superadmin.repository";
import type {
  AccountStatus,
  MunicipalityInsert,
  UserRole,
} from "../../../types/database.type";

export class SuperadminService {
  constructor(private repo: SuperadminRepository) {}

  async getDashboardMetrics() {
    try {
      return await this.repo.getMacroAnalytics();
    } catch (error: any) {
      throw new Error(
        `Failed to compile analytics dashboard: ${error.message}`,
      );
    }
  }

  async registerNewMunicipality(payload: MunicipalityInsert) {
    try {
      return await this.repo.createMunicipality(payload);
    } catch (error: any) {
      throw new Error(`Municipality deployment failed: ${error.message}`);
    }
  }

  async checkEmailExists(email: string): Promise<boolean> {
    return await this.repo.checkEmailExists(email);
  }

  async getProfileIdByEmail(email: string): Promise<string | null> {
    return await this.repo.getProfileIdByEmail(email);
  }

  async updateMunicipalityHead(m_uid: string, profile_id: string) {
    return await this.repo.updateMunicipalityHead(m_uid, profile_id);
  }

  async adjustUserAuthorization(targetUserId: string, targetRole: UserRole) {
    try {
      return await this.repo.updateUserRole(targetUserId, targetRole);
    } catch (error: any) {
      throw new Error(`Role elevation aborted: ${error.message}`);
    }
  }

  async modifyUserAccess(targetUserId: string, action: AccountStatus) {
    try {
      return await this.repo.updateAccountStatus(targetUserId, action);
    } catch (error: any) {
      throw new Error(`Account status modification failed: ${error.message}`);
    }
  }

  async fetchSystemAuditTrail(page: number = 1, limit: number = 20) {
    try {
      const offset = (page - 1) * limit;
      return await this.repo.getAuditLogs(limit, offset);
    } catch (error: any) {
      throw new Error(`Audit log retrieval rejected: ${error.message}`);
    }
  }

  async getAllMunicipalities() {
    try {
      return await this.repo.getMunicipalities();
    } catch (error: any) {
      throw new Error(`Failed to retrieve municipalities: ${error.message}`);
    }
  }

  async removeMunicipality(id: string) {
    try {
      return await this.repo.deleteMunicipality(id);
    } catch (error: any) {
      throw new Error(`Failed to delete municipality: ${error.message}`);
    }
  }
}
