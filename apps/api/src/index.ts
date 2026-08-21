import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import { env } from "./env";
import { authRouter } from "./routes/auth";
import { catalogRouter } from "./routes/catalog";
import { eventsRouter } from "./routes/events";
import { reservationsRouter } from "./routes/reservations";
import { gateRouter } from "./routes/gate";
import { ticketsRouter } from "./routes/tickets";


const app = express();

app.use(cors({ origin: env.corsOrigin }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/auth", authRouter);
app.use("/catalog", catalogRouter);
app.use("/events", eventsRouter);
app.use("/reservations", reservationsRouter);
app.use("/gate", gateRouter);
app.use("/tickets", ticketsRouter);

// Rota inexistente tambem responde JSON. O padrao do Express e uma pagina
// HTML, que quebra o cliente do front (ele espera JSON em toda resposta).
app.use((_req, res) => {
  res.status(404).json({ error: "Rota nao encontrada." });
});

// Ultimo middleware da cadeia, e o unico com quatro parametros -- e assim que
// o Express reconhece um tratador de erro.
//
// Sem ele, uma excecao inesperada (banco fora do ar, por exemplo) devolve a
// pagina de erro padrao do Express: HTML com o stack trace inteiro e os
// caminhos absolutos do servidor. Detalhe de implementacao nao e assunto de
// quem consome a API -- o log fica aqui, o cliente recebe so o essencial.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[erro nao tratado]", err);
  res.status(500).json({ error: "Erro interno no servidor." });
});

app.listen(env.port, () => {
  console.log(`API executando em http://localhost:${env.port}`);
});
