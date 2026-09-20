// Thin static + proxy server for the guided sim. Replaces preview.mjs:
// serves this prototype's files plus the two vendor bundles (three,
// fontsource) preview.mjs used to mount, and proxies /api/proctor so
// TYPESAFE_API_KEY never reaches the browser.
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createExaminer } from './examinerClient.mjs'

const root = fileURLToPath(new URL('.', import.meta.url))
const app = express()
app.use(express.json())
app.use('/vendor/three', express.static(path.resolve(root, '../../node_modules/three')))
app.use('/vendor/font', express.static(path.resolve(root, '../../node_modules/@fontsource-variable/figtree')))
app.use(express.static(root))

const apiKey = process.env.TYPESAFE_API_KEY
if (!apiKey) console.warn('TYPESAFE_API_KEY not set — proctor will be unavailable')

const examiner = apiKey ? createExaminer({ apiKey, fetch }) : null

app.post('/api/proctor', async (req, res) => {
  if (!examiner) return res.status(503).json({ error: 'proctor_unavailable' })
  try {
    const result = await examiner.evaluate(req.body.rubric, req.body.evidence)
    res.json(result)
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

const port = process.env.PORT || 4820
app.listen(port, () => console.log(`Sim server on http://localhost:${port}`))
