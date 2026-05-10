import { v2 as cloudinary } from "cloudinary";

let configured = false;

function ensureConfig() {
  if (configured) return;
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
  const api_key = process.env.CLOUDINARY_API_KEY;
  const api_secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud_name || !api_key || !api_secret) {
    throw new Error("Cloudinary env vars are incomplete");
  }
  cloudinary.config({ cloud_name, api_key, api_secret });
  configured = true;
}

/** True when all three Cloudinary credentials are set (server uploads images to CDN). */
export function isCloudinaryEnabled(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME?.trim() &&
      process.env.CLOUDINARY_API_KEY?.trim() &&
      process.env.CLOUDINARY_API_SECRET?.trim(),
  );
}

/**
 * Upload raw image bytes to Cloudinary. Returns HTTPS URL suitable to store in the DB.
 */
export async function uploadProductImageBuffer(buffer: Buffer): Promise<{ url: string; publicId: string }> {
  ensureConfig();
  const folder = (process.env.CLOUDINARY_UPLOAD_FOLDER ?? "nour/products").replace(/^\/+|\/+$/g, "");

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (err, result) => {
        if (err) {
          reject(err);
          return;
        }
        if (!result?.secure_url) {
          reject(new Error("Cloudinary returned no secure_url"));
          return;
        }
        resolve({ url: result.secure_url, publicId: result.public_id ?? "" });
      },
    );
    stream.end(buffer);
  });
}
