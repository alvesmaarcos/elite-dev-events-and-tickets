import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import { searchCatalog } from "../lib/tmdb";

export const catalogRouter = Router();

catalogRouter.get("/tmdb", requireAuth, requireRole("ORGANIZER"), async (req, res) => {
  const q = String(req.query.q || "");
  try {
    res.json(await searchCatalog(q));
  } catch {
    res.status(502).json({ error: "Falha ao consultar o catalogo externo." });
  }
});
