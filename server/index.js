import express from 'express'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { initSchema } from './db.js'
import { seedIfEmpty } from './seed.js'
import { productsRouter } from './routes/products.js'
import { ordersRouter } from './routes/orders.js'
import { adminRouter, UPLOAD_DIR } from './routes/admin.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST = resolve(__dirname, '..', 'dist')
const PORT = Number(process.env.PORT) || 3001

initSchema()
const seeded = seedIfEmpty()

const app = express()
app.disable('x-powered-by')
app.use(express.json({ limit: '64kb' }))

app.get('/api/health', (_req, res) => res.json({ ok: true, seeded }))
app.use('/api/products', productsRouter)
app.use('/api/orders', ordersRouter)
app.use('/api/admin', adminRouter)

app.use('/api', (_req, res) => res.status(404).json({ error: 'Nepoznata API ruta.' }))

/**
 * Fotografije koje je admin ucitao. Stoje IZVAN public/ namjerno: public/ se
 * kopira u dist/ pri buildu, pa bi slika ucitana nakon builda postojala samo
 * do sljedeceg deploya. data/uploads/ zivi uz bazu i prezivi build.
 * U devu Vite proxyja /uploads ovamo (vidi vite.config.ts).
 */
mkdirSync(UPLOAD_DIR, { recursive: true })
app.use('/uploads', express.static(UPLOAD_DIR, { index: false, maxAge: '1h' }))

// U produkciji isti proces servira i build. U devu Vite drzi frontend
// na :5173 i proxyja /api ovamo, pa se ovaj blok preskoce.
if (existsSync(DIST)) {
  app.use(express.static(DIST, { index: false, maxAge: '1h' }))
  app.get(/.*/, (_req, res) => res.sendFile(join(DIST, 'index.html')))
}

app.use((err, _req, res, _next) => {
  console.error('[server]', err)
  res.status(500).json({ error: 'Greška na serveru.' })
})

app.listen(PORT, () => {
  console.log(`  Dolce Familia API  →  http://localhost:${PORT}`)
  if (seeded.seeded) console.log(`  Baza popunjena sa ${seeded.count} proizvoda.`)
  if (!existsSync(DIST)) console.log('  (dist/ ne postoji — frontend servira Vite na :5173)')
})
