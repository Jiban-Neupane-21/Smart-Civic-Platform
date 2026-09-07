import apiClient from "../client";
import type { KycUploadPayload } from "../../components/kyc/KycUpload";

export const profileApi = {
  updateIdentity: async (payload: KycUploadPayload) => {
    const response = await apiClient.put("/profile/identity", payload);
    return response.data;
  },
  updateProfilePicture: async (profilePictureBase64: string) => {
    const response = await apiClient.put("/profile/picture", {
      profile_picture: profilePictureBase64,
    });
    return response.data;
  },
};

