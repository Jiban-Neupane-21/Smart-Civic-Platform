import { SupabaseClient } from "@supabase/supabase-js";

export class StorageService {
  constructor(private supabaseAdmin: SupabaseClient) {}

  /**
   * Upload image buffer or base64 to Supabase Storage bucket
   */
  async uploadIdentityDocument(
    userId: string,
    fileBuffer: Buffer | string,
    fileName: string,
    contentType = "image/jpeg"
  ): Promise<string> {
    const bucketName = "identity-documents";
    const filePath = `${userId}/${Date.now()}_${fileName}`;

    // Ensure bucket exists or create it
    try {
      const { data: buckets } = await this.supabaseAdmin.storage.listBuckets();
      if (!buckets?.some((b) => b.name === bucketName)) {
        await this.supabaseAdmin.storage.createBucket(bucketName, {
          public: true,
          fileSizeLimit: 5242880, // 5MB
          allowedMimeTypes: ["image/png", "image/jpeg", "image/jpg", "application/pdf"],
        });
      }
    } catch (err: any) {
      console.warn("Storage bucket check warning:", err.message);
    }

    let body: Buffer;
    if (typeof fileBuffer === "string") {
      // Base64 string
      const base64Data = fileBuffer.replace(/^data:image\/\w+;base64,/, "");
      body = Buffer.from(base64Data, "base64");
    } else {
      body = fileBuffer;
    }

    const { error: uploadError } = await this.supabaseAdmin.storage
      .from(bucketName)
      .upload(filePath, body, {
        contentType,
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = this.supabaseAdmin.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  }
}
