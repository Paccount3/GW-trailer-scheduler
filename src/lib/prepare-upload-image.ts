const SKIP_UNDER_BYTES = 900_000;
const MAX_EDGE = 1920;
const MAX_OUTPUT_BYTES = 1_200_000;

function jpegName(name: string) {
  const base = name.replace(/\.[^.]+$/, "").trim() || "photo";
  return `${base}.jpg`;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isFileAccessError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const name = "name" in error ? String(error.name) : "";
  const message = error.message.toLowerCase();
  return (
    name === "NotReadableError" ||
    name === "NotFoundError" ||
    message.includes("could not be read") ||
    message.includes("permission problems") ||
    message.includes("after a reference to a file was acquired")
  );
}

function sniffImageType(bytes: Uint8Array) {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "JPEG";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "PNG";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "WebP";
  }
  if (bytes.length >= 12 && bytes[4] === 0x66 && bytes[5] === 0x74) {
    const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
    if (["heic", "heix", "hevc", "hevx", "mif1", "msf1"].includes(brand)) {
      return "HEIC";
    }
  }
  return "unrecognized";
}

function fileLabel(file: File) {
  return file.name?.trim() || "Photo";
}

/**
 * Copy a selected photo into browser memory immediately.
 * Android Chrome often invalidates the original File handle after later
 * validation errors or when the page is backgrounded.
 */
export async function captureFileInMemory(file: File): Promise<File> {
  try {
    const bytes = await file.arrayBuffer();
    return new File([bytes], file.name || "photo.jpg", {
      type: file.type || "application/octet-stream",
      lastModified: file.lastModified || Date.now(),
    });
  } catch (error) {
    if (isFileAccessError(error)) {
      throw new Error(
        `"${fileLabel(file)}" could not be kept on this phone after it was selected. Please choose the photo again, then submit right away.`,
      );
    }
    throw error instanceof Error
      ? error
      : new Error(`Unable to keep "${fileLabel(file)}" in memory.`);
  }
}

async function fileFacts(file: File) {
  try {
    const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    return {
      name: fileLabel(file),
      size: formatBytes(file.size),
      type: file.type || "no file type",
      contents: sniffImageType(header),
    };
  } catch (error) {
    if (isFileAccessError(error)) {
      throw new Error(
        `"${fileLabel(file)}" could not be read. On Android this often happens if a previous submit failed and the photo needs to be selected again.`,
      );
    }
    throw error;
  }
}

function decodeFailureMessage(
  facts: Awaited<ReturnType<typeof fileFacts>>,
) {
  if (facts.contents === "HEIC") {
    return `"${facts.name}" is named like a photo, but the file contents are HEIC (${facts.size}, reported as ${facts.type}). Save or export it as a JPG or PNG, then try again.`;
  }
  if (facts.contents === "JPEG" || facts.contents === "PNG" || facts.contents === "WebP") {
    return `"${facts.name}" is a ${facts.contents} photo (${facts.size}, reported as ${facts.type}), but this browser could not open it. That usually means the photo is too large for this device to decode, or the file is damaged. Try a smaller JPG or PNG.`;
  }
  return `"${facts.name}" could not be opened (${facts.size}, reported as ${facts.type}, file contents look ${facts.contents}). Choose a JPG or PNG from your gallery.`;
}

type Drawable = {
  width: number;
  height: number;
  draw: (
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
  ) => void;
  close: () => void;
};

async function decodeWithImageElement(file: File): Promise<Drawable> {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("image-element-decode-failed"));
      element.src = url;
    });
    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
      draw: (context, width, height) => {
        context.drawImage(image, 0, 0, width, height);
      },
      close: () => URL.revokeObjectURL(url),
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

async function decodeImage(file: File): Promise<Drawable> {
  try {
    const bitmap = await createImageBitmap(file);
    return {
      width: bitmap.width,
      height: bitmap.height,
      draw: (context, width, height) => {
        context.drawImage(bitmap, 0, 0, width, height);
      },
      close: () => bitmap.close(),
    };
  } catch (error) {
    if (isFileAccessError(error)) {
      throw new Error(
        `"${fileLabel(file)}" could not be read. Please choose the photo again and submit without leaving this page.`,
      );
    }
    try {
      return await decodeWithImageElement(file);
    } catch (fallbackError) {
      if (isFileAccessError(fallbackError)) {
        throw new Error(
          `"${fileLabel(file)}" could not be read. Please choose the photo again and submit without leaving this page.`,
        );
      }
      throw new Error(decodeFailureMessage(await fileFacts(file)));
    }
  }
}

/**
 * Shrink phone-camera photos before upload.
 * Android gallery images are often several MB each, which exceeds Vercel's
 * request body limit and fails before the API can return a useful error.
 */
export async function prepareUploadImage(file: File): Promise<File> {
  try {
    const type = file.type.toLowerCase();
    const alreadySmall =
      file.size <= SKIP_UNDER_BYTES &&
      (type === "image/jpeg" || type === "image/png" || type === "image/webp");

    if (alreadySmall) return file;

    if (type === "image/jpg" && file.size <= SKIP_UNDER_BYTES) {
      return new File([file], jpegName(file.name), { type: "image/jpeg" });
    }

    const facts = await fileFacts(file);
    if (facts.contents === "HEIC") {
      throw new Error(decodeFailureMessage(facts));
    }

    const image = await decodeImage(file);

    try {
      let edge = MAX_EDGE;
      let quality = 0.82;
      let blob: Blob | null = null;
      let lastWidth = image.width;
      let lastHeight = image.height;

      for (let attempt = 0; attempt < 4; attempt += 1) {
        const scale = Math.min(1, edge / Math.max(image.width, image.height));
        lastWidth = Math.max(1, Math.round(image.width * scale));
        lastHeight = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = lastWidth;
        canvas.height = lastHeight;
        const context = canvas.getContext("2d");
        if (!context) {
          throw new Error(
            `"${facts.name}" could not be resized (${facts.size}, ${image.width}×${image.height}). This device may not have enough memory for that photo.`,
          );
        }
        image.draw(context, lastWidth, lastHeight);
        blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob((value) => resolve(value), "image/jpeg", quality);
        });
        if (blob && blob.size <= MAX_OUTPUT_BYTES) break;
        edge = Math.round(edge * 0.75);
        quality = Math.max(0.55, quality - 0.12);
      }

      if (!blob) {
        throw new Error(
          `"${facts.name}" could not be converted to a smaller JPG (original ${facts.size}, ${image.width}×${image.height}).`,
        );
      }

      if (blob.size > MAX_OUTPUT_BYTES) {
        throw new Error(
          `"${facts.name}" is still too large after resizing. Original ${facts.size} (${image.width}×${image.height}); prepared file is ${formatBytes(blob.size)} at ${lastWidth}×${lastHeight}. The limit is ${formatBytes(MAX_OUTPUT_BYTES)}. Choose a smaller photo.`,
        );
      }

      return new File([blob], jpegName(file.name), { type: "image/jpeg" });
    } finally {
      image.close();
    }
  } catch (error) {
    if (isFileAccessError(error)) {
      throw new Error(
        `"${fileLabel(file)}" could not be read. Please choose the photo again and submit without leaving this page.`,
      );
    }
    throw error;
  }
}
