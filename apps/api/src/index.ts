import express from "express"
import cors from "cors"
import { env } from "./env"

const app = express()

app.use(cors({ origin: env.corsOrigin }))
app.use(express.json())

app.get("/health", (_req, res) => {
    res.json({ ok: true })
})

app.listen(env.port, () => {
    console.log(`API executando na porta ${env.port}`)
})