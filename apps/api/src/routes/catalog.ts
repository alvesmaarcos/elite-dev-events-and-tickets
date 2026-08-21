import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import { fetchCatalog } from "../lib/tmdb";

export const catalogRouter = Router();

catalogRouter.get("/tmdb", requireAuth, requireRole("ORGANIZER"), async (req, res) => {
  const q = String(req.query.q || "");
  const page = Number(req.query.page || 1);

  try {
    res.json(await fetchCatalog(q, page));
  } catch (err) {
    // 502 = "eu sou intermediario e quem esta atras de mim falhou". Registrar
    // no log e devolver o motivo evita ficar adivinhando por que a busca nao
    // traz nada -- foi exatamente o que aconteceu com a chave no formato
    // errado.
    console.error("[catalog] falha ao consultar a TMDb:", err);
    res.status(502).json({
      error: "Falha ao consultar o catalogo externo.",
      detalhe: err instanceof Error ? err.message : String(err),
    });
  }
});
