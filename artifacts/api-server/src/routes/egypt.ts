import { Router } from "express";
import { EGYPT_GOVERNORATES } from "../lib/egypt";

const router = Router();

/**
 * GET /egypt/governorates
 * Public endpoint — returns all 27 Egyptian governorates for shipping-zone dropdowns.
 */
router.get("/egypt/governorates", (_req, res) => {
  res.json(EGYPT_GOVERNORATES);
});

export default router;
