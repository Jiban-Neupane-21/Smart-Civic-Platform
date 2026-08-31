import { SupabaseClient } from "@supabase/supabase-js";

export class StorageService {
  constructor(private supabaseAdmin: SupabaseClient) {}

  /**
   * General upload method for any bucket
   */
  async upload(
    bucketName: string,
    fileKey: string,
    fileBuffer: Buffer | string,
    contentType = "image/jpeg"
  ): Promise<string> {
    let body: Buffer;
    if (typeof fileBuffer === "string") {
      // Base64 string
      const base64Data = fileBuffer.replace(/^data:.*?;base64,/, "");
      // Detect content type from base64 header if possible, else default
      if (fileBuffer.startsWith("data:")) {
        const match = fileBuffer.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,/);
        if (match && match[1]) {
          contentType = match[1];
        }
      }
      body = Buffer.from(base64Data, "base64");
    } else {
      body = fileBuffer;
    }

    const { error: uploadError } = await this.supabaseAdmin.storage
      .from(bucketName)
      .upload(fileKey, body, {
        contentType,
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = this.supabaseAdmin.storage
      .from(bucketName)
      .getPublicUrl(fileKey);

    return publicUrlData.publicUrl;
  }

  /**
   * Upload image buffer or base64 to Supabase Storage bucket
   * Legacy wrapper for identity documents
   */
  async uploadIdentityDocument(
    userId: string,
    fileBuffer: Buffer | string,
    fileName: string,
    contentType = "image/jpeg"
  ): Promise<string> {
    const bucketName = "identity-documents";
    // We now include a kyc/ subfolder as per the plan path pattern
    const fileKey = `${userId}/kyc/${Date.now()}_${fileName}`;

    return this.upload(bucketName, fileKey, fileBuffer, contentType);
  }
}
