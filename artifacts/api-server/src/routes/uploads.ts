import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import os from "os";
import { v4 as uuidv4 } from "uuid";
import { fileTypeFromBuffer } from "file-type";
import { requireRole } from "../middleware/require-role";

const uploadsDir = process.env.VERCEL ? path.join(os.tmpdir(), "uploads") : path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const ALLOWED_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/bmp",
]);

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/avif": ".avif",
  "image/bmp": ".bmp",
};

// Use memory storage so we can validate MIME via magic bytes before writing to disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

const router = Router();

router.post(
  "/uploads/image",
  requireRole("owner", "manager", "catalog_manager", "staff"),
  upload.single("image"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "لم يتم إرفاق ملف" });
    }

    // Validate real MIME type by inspecting the first 4100 magic bytes
    const detected = await fileTypeFromBuffer(req.file.buffer);
    if (!detected || !ALLOWED_MIMES.has(detected.mime)) {
      return res
        .status(415)
        .json({ error: "نوع الملف غير مدعوم — يُقبل فقط JPG/PNG/WebP/GIF/AVIF/BMP" });
    }

    // Rename to UUID + validated extension to prevent path traversal / spoofing
    const ext = MIME_TO_EXT[detected.mime] ?? ".jpg";
    const filename = `${uuidv4()}${ext}`;
    
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const { put } = await import("@vercel/blob");
        const blob = await put(filename, req.file.buffer, { access: 'public' });
        return res.json({ url: blob.url, filename: blob.pathname });
      } catch (err) {
        req.log?.error({ err }, "Vercel Blob upload failed, falling back to local storage");
      }
    }

    const filepath = path.join(uploadsDir, filename);
    fs.writeFileSync(filepath, req.file.buffer);

    const url = `/api/uploads/${filename}`;
    return res.json({ url, filename });
  },
);

export default router;
