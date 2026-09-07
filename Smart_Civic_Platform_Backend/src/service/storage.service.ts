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
    contentType?: string
  ): Promise<string> {
    let resolvedContentType = contentType;
    let body: Buffer;
    if (typeof fileBuffer === "string") {
      // Base64 string
      const base64Data = fileBuffer.replace(/^data:.*?;base64,/, "");
      // Detect content type from base64 header if possible
      if (fileBuffer.startsWith("data:")) {
        const match = fileBuffer.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,/);
        if (match && match[1]) {
          resolvedContentType = match[1];
        }
      }
      body = Buffer.from(base64Data, "base64");
    } else {
      body = fileBuffer;
    }

    if (!resolvedContentType) {
      const ext = fileKey.split(".").pop()?.toLowerCase();
      switch (ext) {
        case "mp4": resolvedContentType = "video/mp4"; break;
        case "webm": resolvedContentType = "video/webm"; break;
        case "mov": resolvedContentType = "video/quicktime"; break;
        case "3gp": resolvedContentType = "video/3gpp"; break;
        case "png": resolvedContentType = "image/png"; break;
        case "webp": resolvedContentType = "image/webp"; break;
        case "jpg":
        case "jpeg": resolvedContentType = "image/jpeg"; break;
        case "pdf": resolvedContentType = "application/pdf"; break;
        default: resolvedContentType = "image/jpeg";
      }
    }

    if (resolvedContentType === "image/jpg") {
      resolvedContentType = "image/jpeg";
    }

    const { error: uploadError } = await this.supabaseAdmin.storage
      .from(bucketName)
      .upload(fileKey, body, {
        contentType: resolvedContentType,
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

  /**
   * Remove a list of files from a Supabase Storage bucket
   */
  async deleteFiles(bucketName: string, filePaths: string[]): Promise<void> {
    if (!filePaths || filePaths.length === 0) return;
    try {
      const { error } = await this.supabaseAdmin.storage
        .from(bucketName)
        .remove(filePaths);
      if (error) {
        console.warn(`[StorageService.deleteFiles] Error removing files from ${bucketName}:`, error.message);
      }
    } catch (err: any) {
      console.warn(`[StorageService.deleteFiles] Exception removing files from ${bucketName}:`, err.message);
    }
  }

  /**
   * Delete an entire folder and its files in a Supabase Storage bucket
   */
  async deleteFolder(bucketName: string, folderPrefix: string): Promise<void> {
    try {
      const { data: files, error } = await this.supabaseAdmin.storage
        .from(bucketName)
        .list(folderPrefix);

      if (error) {
        console.warn(`[StorageService.deleteFolder] Failed to list folder ${folderPrefix}:`, error.message);
        return;
      }

      if (files && files.length > 0) {
        const filePaths = files.map((f) => `${folderPrefix}/${f.name}`);
        await this.deleteFiles(bucketName, filePaths);
      }
    } catch (err: any) {
      console.warn(`[StorageService.deleteFolder] Exception in folder delete:`, err.message);
    }
  }
}
