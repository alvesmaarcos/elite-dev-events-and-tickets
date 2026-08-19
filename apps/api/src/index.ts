import express from "express";
import cors from "cors";
import { env } from "./env";
import { authRouter } from "./routes/auth";

const app = express();

app.use(cors({ origin: env.corsOrigin }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/auth", authRouter);

app.listen(env.port, () => {
  console.log(`API executando em http://localhost:${env.port}`);
});
