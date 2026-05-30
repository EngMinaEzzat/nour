import { Router, Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import os from "os";
import sharp from "sharp";

const router = Router();

// Cache directory (Vercel uses /tmp, standard Node uses ./uploads)
const CACHE_DIR = process.env.VERCEL ? path.join(os.tmpdir(), "uploads_cache") : path.join(process.cwd(), "uploads_cache");

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

const uploadsDir = process.env.VERCEL ? path.join(os.tmpdir(), "uploads") : path.join(process.cwd(), "uploads");

router.get("/api/images/resize", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { path: imagePath, w, h } = req.query;

    if (!imagePath || typeof imagePath !== "string") {
      return res.status(400).json({ error: "Missing path parameter" });
    }

    // Only allow resizing images from our own /api/uploads/ directory (security)
    if (!imagePath.startsWith("/api/uploads/")) {
      return res.status(400).json({ error: "Invalid path parameter" });
    }

    const filename = imagePath.replace("/api/uploads/", "");
    const sourceFilePath = path.join(uploadsDir, filename);

    if (!fs.existsSync(sourceFilePath)) {
      return res.status(404).json({ error: "Image not found" });
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
    await sharp(sourceFilePath)
      .resize({
        width,
        height,
        fit: "cover",
        withoutEnlargement: true,
      })
      .toFile(cachedFilePath);

    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.sendFile(cachedFilePath);
  } catch (error) {
    console.error("Image resize error:", error);
    next(error);
  }
});

export default router;
