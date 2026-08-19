import express from "express";
import cors from "cors";
import { env } from "./env";
import { authRouter } from "./routes/auth";
import { catalogRouter } from "./routes/catalog";
import { eventsRouter } from "./routes/events";

const app = express();

app.use(cors({ origin: env.corsOrigin }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/auth", authRouter);
app.use("/catalog", catalogRouter);
app.use("/events", eventsRouter);


app.listen(env.port, () => {
  console.log(`API executando em http://localhost:${env.port}`);
});
