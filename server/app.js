import express from 'express'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { productsRouter } from './routes/products.js'
import { ordersRouter } from './routes/orders.js'
import { adminRouter } from './routes/admin.js'
import { imaBazu } from './db.js'
import { naBlobu, UPLOAD_DIR } from './storage.js'

const DIST = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist')

/** Na Vercelu staticke fajlove servira CDN, a ne ova funkcija. */
const naVercelu = Boolean(process.env.VERCEL)

/**
 * Express aplikacija bez `listen`.
 *
 * Dijele je dva ulaza: `server/index.js` (lokalni proces koji slusa na portu)
 * i `api/index.js` (Vercelova funkcija). Zato ovdje NEMA ni `initSchema()` ni
 * `seedIfEmpty()` - na Vercelu bi se izvrsavali pri svakom hladnom startu
 * funkcije, dakle i po nekoliko puta dnevno, svaki put jedan upit vise prije
 * nego kupac uopste vidi katalog. Sema i seed idu kroz `npm run db:setup`.
 */
export function createApp() {
  const app = express()
  app.disable('x-powered-by')
  app.use(express.json({ limit: '64kb' }))

  app.get('/api/health', (_req, res) =>
    res.json({
      ok: true,
      // `katalog: 'demo'` znaci da DATABASE_URL nije postavljen - sajt radi,
      // ali iz seed podataka, i narudzbe se ne mogu primiti.
      katalog: imaBazu ? 'baza' : 'demo',
      storage: naBlobu ? 'blob' : 'disk',
      vercel: naVercelu,
    }),
  )
  app.use('/api/products', productsRouter)
  app.use('/api/orders', ordersRouter)
  app.use('/api/admin', adminRouter)

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Nepoznata API ruta.' }))

  /**
   * Fotografije koje je admin ucitao, kad idu na disk (lokalni dev).
   * Na Vercelu ih drzi Blob i u bazi stoji puni https URL, pa ova ruta tamo
   * nema sta da servira.
   */
  if (!naBlobu) {
    mkdirSync(UPLOAD_DIR, { recursive: true })
    app.use('/uploads', express.static(UPLOAD_DIR, { index: false, maxAge: '1h' }))
  }

  // Lokalno u produkcijskom modu isti proces servira i build. U devu Vite
  // drzi frontend na :5173 i proxyja /api ovamo, pa se blok preskoce.
  if (!naVercelu && existsSync(DIST)) {
    app.use(express.static(DIST, { index: false, maxAge: '1h' }))
    app.get(/.*/, (_req, res) => res.sendFile(join(DIST, 'index.html')))
  }

  app.use((err, _req, res, _next) => {
    console.error('[server]', err)
    if (res.headersSent) return
    res.status(500).json({ error: 'Greška na serveru.' })
  })

  return app
}
