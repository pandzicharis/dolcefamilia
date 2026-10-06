import { Router } from 'express'
import { db } from '../db.js'
import { CATEGORIES } from '../seed.js'
import { activePromotions, discountedPrice, promoForProduct, promoPublic } from '../pricing.js'

export const productsRouter = Router()

const selectProducts = `
  SELECT id, slug, name, category, short_desc, long_desc, unit, serves,
         allergens, image, is_featured, is_available, sort_order
    FROM products
`

/**
 * Dodaje varijante i akcijsku cijenu.
 *
 * `price_fening` ostaje REDOVNA cijena, a `effective_price_fening` je ono sto
 * se naplacuje. Klijent racuna iskljucivo sa drugim poljem; server pri upisu
 * narudzbe ponovo prolazi kroz istu funkciju popusta, pa se prikaz i racun ne
 * mogu razici.
 */
function withVariants(rows) {
  if (rows.length === 0) return []
  const promos = activePromotions()
  const stmt = db.prepare(
    `SELECT id, label, price_fening FROM product_variants
      WHERE product_id = ? ORDER BY sort_order, id`,
  )
  return rows.map((p) => {
    const variants = stmt.all(p.id)
    const promo = promoForProduct({ ...p, variants }, promos)
    const sVarijantama = variants.map((v) => ({
      ...v,
      effective_price_fening: discountedPrice(v.price_fening, promo),
    }))
    return {
      ...p,
      is_featured: Boolean(p.is_featured),
      is_available: Boolean(p.is_available),
      variants: sVarijantama,
      promo: promoPublic(promo),
      // Najniza cijena - katalog je prikazuje kao "od X KM".
      fromPriceFening: sVarijantama.length
        ? Math.min(...sVarijantama.map((v) => v.effective_price_fening))
        : 0,
      /** Redovna najniza cijena - kartica je precrta kad akcija vazi. */
      fromRegularPriceFening: sVarijantama.length
        ? Math.min(...sVarijantama.map((v) => v.price_fening))
        : 0,
    }
  })
}

productsRouter.get('/categories', (_req, res) => {
  const counts = db
    .prepare('SELECT category, COUNT(*) AS n FROM products WHERE is_available = 1 GROUP BY category')
    .all()
  const byCat = Object.fromEntries(counts.map((c) => [c.category, c.n]))
  res.json(CATEGORIES.map((c) => ({ ...c, count: byCat[c.slug] ?? 0 })))
})

productsRouter.get('/', (req, res) => {
  const where = []
  const params = []
  if (req.query.category) {
    where.push('category = ?')
    params.push(String(req.query.category))
  }
  if (req.query.featured === '1') {
    where.push('is_featured = 1')
  }
  const sql = `${selectProducts}
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY is_available DESC, sort_order, id`
  res.json(withVariants(db.prepare(sql).all(...params)))
})

productsRouter.get('/:slug', (req, res) => {
  const row = db.prepare(`${selectProducts} WHERE slug = ?`).get(req.params.slug)
  if (!row) return res.status(404).json({ error: 'Proizvod nije pronađen.' })
  res.json(withVariants([row])[0])
})

export { withVariants }
