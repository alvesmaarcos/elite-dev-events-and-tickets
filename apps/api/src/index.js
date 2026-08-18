const express = require('express')
const app = express()

app.get("/", (req, res) => {
    res.json({ ok: true })
})

const port = 3333
app.listen(port, console.log(`API executando na porta ${port}`))