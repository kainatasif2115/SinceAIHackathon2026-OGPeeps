/**
 * Screenshot handling in the browser: decode, shrink and re-encode before
 * upload, so phone screenshots (often 3-8 MB) arrive as a few hundred KB.
 * Re-encoding through a canvas also drops EXIF data such as GPS location.
 */

export type ImageAttachment = {
  /** Local id for React keys and removal. */
  id: string;
  media_type: "image/jpeg";
  /** Base64 without the data: prefix, as the API expects. */
  data: string;
  /** data: URL for the thumbnail. */
  previewUrl: string;
  name: string;
};

export const MAX_IMAGES = 3;
// Claude reads images up to about this size without downscaling them itself.
const MAX_EDGE = 1568;
const QUALITY = 0.85;
const MAX_INPUT_BYTES = 20 * 1024 * 1024;

export class ImageError extends Error {
  constructor(readonly reason: "type" | "size" | "decode") {
    super(reason);
    this.name = "ImageError";
  }
}

let counter = 0;

export async function prepareImage(file: File): Promise<ImageAttachment> {
  if (!file.type.startsWith("image/")) throw new ImageError("type");
  if (file.size > MAX_INPUT_BYTES) throw new ImageError("size");

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // e.g. HEIC on browsers that cannot decode it
    throw new ImageError("decode");
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ImageError("decode");
  // JPEG has no transparency: paint white first so transparent PNGs stay readable.
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const previewUrl = canvas.toDataURL("image/jpeg", QUALITY);
  return {
    id: `img-${++counter}`,
    media_type: "image/jpeg",
    data: previewUrl.slice(previewUrl.indexOf(",") + 1),
    previewUrl,
    name: file.name || "screenshot",
  };
}

/** Image files from a paste or drop event. */
export function imageFiles(list: DataTransferItemList | FileList | null): File[] {
  if (!list) return [];
  const files: File[] = [];
  for (const item of Array.from(list as ArrayLike<DataTransferItem | File>)) {
    const file = item instanceof File ? item : item.kind === "file" ? item.getAsFile() : null;
    if (file && file.type.startsWith("image/")) files.push(file);
  }
  return files;
}
