import { SuperadminRepository } from "../middleware/superadmin.repository";
import type {
  AccountStatus,
  UserRole,
} from "../../../types/database.type";
import { AuditService } from "../../../service/audit.service";

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

  async registerNewMunicipality(payload: Record<string, any>, actorId?: string) {
    try {
      const created = await this.repo.createMunicipality(payload);
      if (created?.id) {
        AuditService.logAction({
          actionBy: actorId || null,
          actionRole: "superadmin",
          municipalityId: created.id,
          tableName: "municipalities",
          recordId: created.id,
          action: "INSERT",
          newValue: payload,
          severity: "info",
        }).catch((err) => console.error("[Audit registerNewMunicipality]", err));
      }
      return created;
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

  async updateMunicipalityHead(id: string, profile_id: string) {
    return await this.repo.updateMunicipalityHead(id, profile_id);
  }

  async adjustUserAuthorization(targetUserId: string, targetRole: UserRole, actorId?: string) {
    try {
      const updated = await this.repo.updateUserRole(targetUserId, targetRole);
      AuditService.logAction({
        actionBy: actorId || null,
        actionRole: "superadmin",
        targetUserId,
        tableName: "profiles",
        recordId: targetUserId,
        action: "ROLE_CHANGE",
        newValue: { role: targetRole },
        severity: "info",
      }).catch((err) => console.error("[Audit adjustUserAuthorization]", err));
      return updated;
    } catch (error: any) {
      throw new Error(`Role elevation aborted: ${error.message}`);
    }
  }

  async modifyUserAccess(targetUserId: string, action: AccountStatus, actorId?: string) {
    try {
      const updated = await this.repo.updateAccountStatus(targetUserId, action);
      AuditService.logAction({
        actionBy: actorId || null,
        actionRole: "superadmin",
        targetUserId,
        tableName: "profiles",
        recordId: targetUserId,
        action: "STATUS_CHANGE",
        newValue: { account_status: action },
        severity: action === "suspended" ? "warning" : "info",
      }).catch((err) => console.error("[Audit modifyUserAccess]", err));
      return updated;
    } catch (error: any) {
      throw new Error(`Account status modification failed: ${error.message}`);
    }
  }

  async fetchSystemAuditTrail(
    page: number = 1,
    limit: number = 20,
    filters?: {
      action?: string;
      role?: string;
      severity?: string;
      search?: string;
      actorId?: string;
      targetUserId?: string;
      municipalityId?: string;
    }
  ) {
    try {
      const offset = (page - 1) * limit;
      return await this.repo.getAuditLogs(limit, offset, filters);
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

  async modifyMunicipality(id: string, data: Record<string, any>, actorId?: string) {
    try {
      const updated = await this.repo.updateMunicipality(id, data);
      AuditService.logAction({
        actionBy: actorId || null,
        actionRole: "superadmin",
        municipalityId: id,
        tableName: "municipalities",
        recordId: id,
        action: "UPDATE",
        newValue: data,
        severity: "info",
      }).catch((err) => console.error("[Audit modifyMunicipality]", err));
      return updated;
    } catch (error: any) {
      throw new Error(`Failed to update municipality: ${error.message}`);
    }
  }

  async reviewMunicipalityKyc(
    id: string,
    status: 'verified' | 'rejected',
    verifiedBy: string,
    rejectionReason?: string
  ) {
    try {
      const updated = await this.repo.reviewMunicipalityKyc(id, status, verifiedBy, rejectionReason);
      AuditService.logAction({
        actionBy: verifiedBy || null,
        actionRole: "superadmin",
        municipalityId: id,
        tableName: "municipalities",
        recordId: id,
        action: "STATUS_CHANGE",
        newValue: { kyc_status: status, rejection_reason: rejectionReason || null },
        severity: status === "rejected" ? "warning" : "info",
      }).catch((err) => console.error("[Audit reviewMunicipalityKyc]", err));
      return updated;
    } catch (error: any) {
      throw new Error(`Failed to update KYC status: ${error.message}`);
    }
  }

  async fetchMunicipalityById(id: string) {
    try {
      return await this.repo.getMunicipalityById(id);
    } catch (error: any) {
      throw new Error(`Failed to fetch municipality: ${error.message}`);
    }
  }

  async removeProfile(profileId: string) {
    try {
      return await this.repo.deleteProfileById(profileId);
    } catch (error: any) {
      throw new Error(`Failed to delete profile: ${error.message}`);
    }
  }

  async removeAuthUser(userId: string) {
    try {
      return await this.repo.deleteAuthUser(userId);
    } catch (error: any) {
      throw new Error(`Failed to delete auth user: ${error.message}`);
    }
  }

  async resetMunicipality(id: string, deletedBy?: string) {
    try {
      return await this.repo.cascadeSoftDeleteMunicipality(id, deletedBy);
    } catch (error: any) {
      throw new Error(`Failed to reset municipality: ${error.message}`);
    }
  }

  async removeMunicipality(id: string, deletedBy?: string) {
    try {
      const result = await this.repo.cascadeSoftDeleteMunicipality(id, deletedBy);

      // Collect all affected user/profile IDs to delete from auth.users
      const idsToDelete = new Set<string>(result.affectedProfileIds || []);

      // Also scan Supabase Auth users directly for any matching municipality metadata (catches orphaned auth users)
      try {
        const { data: authUsersData } = await this.repo.getAuthUsersByMunicipality(id);
        if (authUsersData && authUsersData.length > 0) {
          authUsersData.forEach((u: any) => idsToDelete.add(u.id));
        }
      } catch (scanErr: any) {
        console.warn("Could not scan auth users by municipality metadata:", scanErr.message);
      }

      const targetIds = Array.from(idsToDelete).filter(Boolean);

      // Proactively clear foreign keys for all collected IDs before deletion
      await this.repo.cleanForeignKeysForUsers(targetIds);

      const deletedAuthUserIds: string[] = [];
      const failedAuthUserDeletions: { id: string; error: string }[] = [];

      for (const uid of targetIds) {
        try {
          await this.repo.deleteAuthUser(uid);
          deletedAuthUserIds.push(uid);
        } catch (authErr: any) {
          console.error(`Failed to remove auth user ${uid}:`, authErr.message);
          failedAuthUserDeletions.push({ id: uid, error: authErr.message });
        }
      }

      AuditService.logAction({
        actionBy: deletedBy || null,
        actionRole: "superadmin",
        municipalityId: id,
        tableName: "municipalities",
        recordId: id,
        action: "DELETE",
        newValue: { deleted_at: new Date().toISOString(), affected_profiles_count: targetIds.length },
        severity: "critical",
      }).catch((err) => console.error("[Audit removeMunicipality]", err));

      return {
        ...result,
        deletedAuthUserIds,
        failedAuthUserDeletions,
      };
    } catch (error: any) {
      throw new Error(`Failed to delete municipality: ${error.message}`);
    }
  }

  // ===== NEW REFERENCE & PROVISIONING METHODS =====

  async getProvinces() {
    try {
      return await this.repo.getProvinces();
    } catch (error: any) {
      throw new Error(`Failed to fetch provinces: ${error.message}`);
    }
  }

  async getDistricts(provinceId?: string) {
    try {
      return await this.repo.getDistricts(provinceId);
    } catch (error: any) {
      throw new Error(`Failed to fetch districts: ${error.message}`);
    }
  }

  async getReferenceMunicipalities(districtId?: string, isActive?: boolean) {
    try {
      return await this.repo.getReferenceMunicipalities(districtId, isActive);
    } catch (error: any) {
      throw new Error(`Failed to fetch reference municipalities: ${error.message}`);
    }
  }

  async getMunicipalityDetail(id: string) {
    try {
      return await this.repo.getMunicipalityDetail(id);
    } catch (error: any) {
      throw new Error(`Failed to fetch municipality detail: ${error.message}`);
    }
  }

  async getWards(municipalityId: string) {
    try {
      return await this.repo.getWards(municipalityId);
    } catch (error: any) {
      throw new Error(`Failed to fetch wards: ${error.message}`);
    }
  }

  async activateMunicipality(
    id: string,
    headProfileId: string,
    headName: string,
    headEmail: string,
    actorId?: string
  ) {
    try {
      const activated = await this.repo.activateMunicipality(id, headProfileId, headName, headEmail);
      AuditService.logAction({
        actionBy: actorId || null,
        actionRole: "superadmin",
        municipalityId: id,
        targetUserId: headProfileId,
        tableName: "municipalities",
        recordId: id,
        action: "INSERT",
        newValue: { head_name: headName, head_email: headEmail, activated: true },
        severity: "info",
      }).catch((err) => console.error("[Audit activateMunicipality]", err));
      return activated;
    } catch (error: any) {
      throw new Error(`Failed to activate municipality: ${error.message}`);
    }
  }

  async createWards(municipalityId: string, count: number) {
    try {
      return await this.repo.createWards(municipalityId, count);
    } catch (error: any) {
      throw new Error(`Failed to auto-create wards: ${error.message}`);
    }
  }
}
