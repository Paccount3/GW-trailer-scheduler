const SKIP_UNDER_BYTES = 900_000;
const MAX_EDGE = 1920;
const MAX_OUTPUT_BYTES = 1_200_000;

function jpegName(name: string) {
  const base = name.replace(/\.[^.]+$/, "").trim() || "photo";
  return `${base}.jpg`;
}

/**
 * Shrink phone-camera photos before upload.
 * Android gallery images are often several MB each, which exceeds Vercel's
 * request body limit and fails before the API can return a useful error.
 */
export async function prepareUploadImage(file: File): Promise<File> {
  const type = file.type.toLowerCase();
  const alreadySmall =
    file.size <= SKIP_UNDER_BYTES &&
    (type === "image/jpeg" ||
      type === "image/png" ||
      type === "image/webp");

  if (alreadySmall) return file;

  if (type === "image/jpg" && file.size <= SKIP_UNDER_BYTES) {
    return new File([file], jpegName(file.name), { type: "image/jpeg" });
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(
      `"${file.name || "Photo"}" could not be read. Choose a JPG or PNG from your photo gallery.`,
    );
  }

  try {
    let edge = MAX_EDGE;
    let quality = 0.82;
    let blob: Blob | null = null;

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("Unable to prepare the photo for upload.");
      }
      context.drawImage(bitmap, 0, 0, width, height);
      blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/jpeg", quality);
      });
      if (blob && blob.size <= MAX_OUTPUT_BYTES) break;
      edge = Math.round(edge * 0.75);
      quality = Math.max(0.55, quality - 0.12);
    }

    if (!blob) {
      throw new Error("Unable to prepare the photo for upload.");
    }

    return new File([blob], jpegName(file.name), { type: "image/jpeg" });
  } finally {
    bitmap.close();
  }
}
