import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { app } from "./helpers.js";
import supertest from "supertest";
import path from "path";
import fs from "fs";

const request = supertest(app);

describe("Images Router Security", () => {
  const uploadsDir = path.join(process.cwd(), "uploads");
  const testImageName = "test-security-image.png";
  const testImagePath = path.join(uploadsDir, testImageName);

  beforeEach(async () => {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    // ensure test image exists
    fs.writeFileSync(testImagePath, "dummy-image-content");
  });

  afterEach(() => {
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }
  });

  it("should reject path traversal attempts with 400", async () => {
    const maliciousPath = "/api/uploads/../../../etc/passwd";

    const res = await request.get(
      `/api/images/resize?src=${encodeURIComponent(maliciousPath)}&w=100&h=100`,
    );

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Invalid path parameter" });
  });

  it("should accept valid paths inside uploads directory", async () => {
    const validPath = `/api/uploads/${testImageName}`;
    const res = await request.get(
      `/api/images/resize?src=${encodeURIComponent(validPath)}&w=100&h=100`,
    );

    expect(res.status).not.toBe(400);
    expect(res.status).not.toBe(404);
  });
});
