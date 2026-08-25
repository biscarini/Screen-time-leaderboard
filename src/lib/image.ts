"use client";

/**
 * Shrink an image in the browser before it ever hits the network.
 *
 * A raw iPhone screenshot is several megabytes, and the Daily Average is
 * perfectly legible at a fraction of that — so this makes the upload fast and
 * the vision call cheap. If anything goes wrong we hand back the original;
 * a slow upload beats a failed one.
 */
export async function downscale(
  file: File,
  maxEdge = 1280,
  quality = 0.85,
): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1_500_000) {
      bitmap.close();
      return file;
    }

    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      return file;
    }
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    return blob ?? file;
  } catch {
    return file;
  }
}
