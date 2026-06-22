/**
 * Image helpers for the product photo picker. We mirror the server's limits so
 * the user gets a friendly message *before* a doomed upload, and best-effort
 * downscale big phone photos so uploads are quick on slow shop connections.
 */

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB, matches the API
const MAX_DIMENSION = 1280; // longest edge after downscale

/** Validate type/size up front. Returns a plain-language error, or null if OK. */
export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return "That file type isn't supported. Please choose a JPG, PNG, or WebP photo.";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return "That photo is too large (over 5 MB). Please choose a smaller one.";
  }
  return null;
}

/**
 * Best-effort downscale: if the photo is larger than MAX_DIMENSION on its
 * longest edge, redraw it smaller as a JPEG. On any failure we simply return the
 * original file — never block the user on an optimisation.
 */
export async function downscaleImage(file: File): Promise<File> {
  // WebP/PNG transparency aside, JPEG is fine for product photos and smallest.
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const longest = Math.max(bitmap.width, bitmap.height);
    if (longest <= MAX_DIMENSION) {
      bitmap.close?.();
      return file;
    }
    const scale = MAX_DIMENSION / longest;
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85),
    );
    if (!blob || blob.size >= file.size) return file; // no win — keep original
    const base = file.name.replace(/\.[^.]+$/, "");
    return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  }
}
