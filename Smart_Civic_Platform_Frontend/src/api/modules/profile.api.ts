import apiClient from "../client";
import type { KycUploadPayload } from "../../components/kyc/KycUpload";

export const profileApi = {
  updateIdentity: async (payload: KycUploadPayload) => {
    const response = await apiClient.put("/profile/identity", payload);
    return response.data;
  },
};
