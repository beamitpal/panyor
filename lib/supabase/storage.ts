import { supabase } from "./client"

export type StorageBucket =
  | "student-avatars"
  | "complaint-attachments"
  | "notice-attachments"
  | "equipment-images"

export interface UploadFileOptions {
  bucket: StorageBucket
  path: string
  file: File | Blob
  allowedMimeTypes?: string[]
  maxSizeBytes?: number
}

const DEFAULT_MAX_SIZE = 5 * 1024 * 1024 // 5MB
const DEFAULT_ALLOWED_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]

export async function uploadHostelFile({
  bucket,
  path,
  file,
  allowedMimeTypes = DEFAULT_ALLOWED_MIMES,
  maxSizeBytes = DEFAULT_MAX_SIZE,
}: UploadFileOptions): Promise<{ url?: string; error?: string }> {
  // Validate file size
  if (file.size > maxSizeBytes) {
    return {
      error: `File size exceeds the limit of ${Math.round(maxSizeBytes / (1024 * 1024))}MB.`,
    }
  }

  // Validate mime type
  if (allowedMimeTypes.length > 0 && !allowedMimeTypes.includes(file.type)) {
    return {
      error: `Invalid file format: ${file.type}. Allowed formats: ${allowedMimeTypes.join(", ")}`,
    }
  }

  try {
    const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
      upsert: true,
    })

    if (error) {
      console.warn("Supabase storage upload error:", error.message)
      return { error: `Upload failed: ${error.message}` }
    }

    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(data.path)
    return { url: publicUrlData.publicUrl }
  } catch (err: unknown) {
    console.warn("Storage upload error:", err)
    return { error: err instanceof Error ? err.message : "File upload failed." }
  }
}
