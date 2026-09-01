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

    // Update the correct table based on role
    let data, error;
    if (role === "citizen") {
      ({ data, error } = await this.supabaseAdmin
        .from("citizens")
        .update({ profile_picture: publicUrl })
        .eq("id", userId)
        .select("profile_picture")
        .single());
    } else {
      ({ data, error } = await this.supabaseAdmin
        .from("profiles")
        .update({ profile_picture: publicUrl })
        .eq("id", userId)
        .select("profile_picture")
        .single());
    }

    if (error) throw new Error(`Failed to update profile picture: ${error.message}`);
    return data;
  }
}
