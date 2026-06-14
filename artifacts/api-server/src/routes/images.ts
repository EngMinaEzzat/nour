import { Router, Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import os from "os";
import sharp from "sharp";

const router = Router();

// Cache directory (Vercel uses /tmp, standard Node uses ./uploads)
const CACHE_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), "uploads_cache")
  : path.join(process.cwd(), "uploads_cache");

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

const uploadsDir = process.env.VERCEL
  ? path.join(os.tmpdir(), "uploads")
  : path.join(process.cwd(), "uploads");

async function findBlobUrl(filename: string): Promise<string | null> {
  try {
    const { list } = await import("@vercel/blob");
    // Try exact match first
    const exactRes = await list({ prefix: filename, limit: 1 });
    if (exactRes.blobs.length > 0) {
      return exactRes.blobs[0].url;
    }

    // Fallback: search by prefix without extension to handle random suffixes
    const ext = path.extname(filename);
    const base = ext ? filename.slice(0, -ext.length) : filename;
    const listRes = await list({ prefix: base, limit: 5 });
    for (const blob of listRes.blobs) {
      const blobName = blob.pathname;
      if (blobName === filename || blobName.startsWith(base + "-")) {
        return blob.url;
      }
    }
  } catch (err) {
    console.error("Vercel Blob list error:", err);
  }
  return null;
}

router.get(
  "/images/resize",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { src: imagePath, w, h } = req.query;

      if (!imagePath || typeof imagePath !== "string") {
        return res.status(400).json({ error: "Missing path parameter" });
      }

      // Only allow resizing images from our own /api/uploads/ directory (security)
      if (!imagePath.startsWith("/api/uploads/")) {
        return res.status(400).json({ error: "Invalid path parameter" });
      }

      const filename = imagePath.replace("/api/uploads/", "");
      const sourceFilePath = path.resolve(path.join(uploadsDir, filename));
      const resolvedUploadsDir = path.resolve(uploadsDir);

      // Prevent path traversal vulnerabilities by verifying the resolved path is within uploadsDir
      if (
        !sourceFilePath.startsWith(resolvedUploadsDir + path.sep) &&
        sourceFilePath !== resolvedUploadsDir
      ) {
        return res.status(400).json({ error: "Invalid path parameter" });
      }

      if (!fs.existsSync(sourceFilePath)) {
        // Blob fallback: if the file doesn't exist locally, try fetching from Vercel Blob
        if (process.env.BLOB_READ_WRITE_TOKEN) {
          try {
            const blobUrl = await findBlobUrl(filename);
            if (blobUrl) {
              // For resize, download blob to temp, process, then clean up
              const response = await fetch(blobUrl);
              if (response.ok) {
                const buffer = Buffer.from(await response.arrayBuffer());
                fs.writeFileSync(sourceFilePath, buffer);
                // File now exists locally — continue with resize below
              } else {
                return res.redirect("/product-fashion-optimized.jpg");
              }
            } else {
              return res.redirect("/product-fashion-optimized.jpg");
            }
          } catch {
            return res.redirect("/product-fashion-optimized.jpg");
          }
        } else {
          return res.redirect("/product-fashion-optimized.jpg");
        }
      }

      const width = w ? parseInt(w as string, 10) : undefined;
      const height = h ? parseInt(h as string, 10) : undefined;

      if (!width && !height) {
        // If no dimensions requested, redirect to the original upload path
        return res.redirect(imagePath);
      }

      // Ensure safe dimensions
      if (width && (width <= 0 || width > 2000)) {
        return res.status(400).json({ error: "Invalid width" });
      }
      if (height && (height <= 0 || height > 2000)) {
        return res.status(400).json({ error: "Invalid height" });
      }

      const cachedFilename = `resized_${width || "auto"}x${height || "auto"}_${filename}`;
      const cachedFilePath = path.join(CACHE_DIR, cachedFilename);

      // If cached file exists, stream it
      if (fs.existsSync(cachedFilePath)) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        return res.sendFile(cachedFilePath);
      }

      // Resize using sharp
      try {
        await sharp(sourceFilePath)
          .resize({
            width,
            height,
            fit: "cover",
            withoutEnlargement: true,
          })
          .toFile(cachedFilePath);

        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        return res.sendFile(cachedFilePath);
      } catch (sharpError) {
        console.error(`Image resize error (sharp) for ${filename}:`, sharpError);
        // Fallback to the default image to prevent broken images on storefronts
        return res.redirect("/product-fashion-optimized.jpg");
      }
    } catch (error) {
      console.error("Image route error:", error);
      next(error);
    }
  },
);

export default router;
