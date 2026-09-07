import { SupabaseClient } from "@supabase/supabase-js";
import { StorageService } from "../../../service/storage.service";

export class ProfileService {
  constructor(private supabaseAdmin: SupabaseClient) {}

  async updateIdentity(
    userId: string,
    body: {
      identity_type: string;
      identity_number: string;
      identity_document: string;
    },
  ) {
    const storageService = new StorageService(this.supabaseAdmin);

    const uploadedUrl = await storageService.uploadIdentityDocument(
      userId,
      body.identity_document,
      "identity_document",
    );

    const { data, error } = await this.supabaseAdmin
      .from("profiles")
      .update({
        identity_type: body.identity_type,
        identity_number: body.identity_number,
        identity_document_url: uploadedUrl,
        identity_verified_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select("identity_type, identity_number, identity_document_url, identity_verified_at")
      .single();

    if (error) {
      throw new Error(`Failed to update identity: ${error.message}`);
    }

    return data;
  }

  async updateProfilePicture(
    userId: string,
    role: string,
    base64Data: string
  ) {
    const storageService = new StorageService(this.supabaseAdmin);
    
    // Upload avatar
    const fileKey = `${userId}/avatar`; // extension will be implicit or handled if needed, let's append timestamp to bust cache
    const publicUrl = await storageService.upload("avatars", `${fileKey}_${Date.now()}.jpg`, base64Data);

    // Always update profiles table
    const { error: profileError } = await this.supabaseAdmin
      .from("profiles")
      .update({
        profile_picture: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (profileError) {
      throw new Error(`Failed to update profile picture: ${profileError.message}`);
    }

    // Also update citizens table if citizen record exists
    await this.supabaseAdmin
      .from("citizens")
      .update({
        profile_picture: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    return { profile_picture: publicUrl };
  }
}
