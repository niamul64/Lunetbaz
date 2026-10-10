import { isMockApi } from "@/config/env";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

/**
 * Media uploads. With the backend: request a presigned S3/R2 URL, PUT the file
 * directly to storage, and return the public CDN URL. In mock mode a placeholder
 * image is returned so forms can be exercised without storage.
 */
export const uploadService = {
  validate(file: File) {
    if (!ACCEPTED.includes(file.type)) return "Use a JPG, PNG or WebP image.";
    if (file.size > MAX_IMAGE_BYTES) return "Images must be 5 MB or smaller.";
    return null;
  },

  async uploadImage(file: File): Promise<string> {
    const problem = this.validate(file);
    if (problem) throw ApiError.badRequest(problem);
    if (isMockApi) {
      let hue = 0;
      for (const ch of file.name) hue = (hue * 31 + ch.charCodeAt(0)) % 360;
      return `ph://camera/${hue}`;
    }
    const presign = await api.post<{ uploadUrl: string; publicUrl: string }>("/uploads/presign", { fileName: file.name, contentType: file.type, size: file.size });
    const res = await fetch(presign.uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
    if (!res.ok) throw new ApiError(res.status, "UPLOAD_FAILED", "Upload failed. Please try again.");
    return presign.publicUrl;
  },
};

