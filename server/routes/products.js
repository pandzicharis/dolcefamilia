import { Router } from 'express'
import { all, imaBazu, one } from '../db.js'
import { CATEGORIES } from '../seed.js'
import { DEMO_KATALOG, demoBrojPoKategoriji, demoProizvodi } from '../demo.js'
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
 *
 * Varijante za CIJELI katalog idu jednim upitom (`= ANY`), ne jednim po
 * proizvodu. Sa SQLite fajlom je N+1 bio besplatan; prema Neonu je svaki upit
 * mrezni skok, pa bi dvanaest proizvoda znacilo trinaest odlazaka na bazu.
 *
 * is_featured i is_available su u Postgresu pravi BOOLEAN, pa izlaze kao
 * true/false bez pretvaranja (SQLite ih je drzao kao 0/1).
 */
async function withVariants(rows) {
  if (rows.length === 0) return []

  const ids = rows.map((p) => p.id)
  const [promos, sveVarijante] = await Promise.all([
    activePromotions(),
    all(
      `SELECT id, product_id, label, price_fening FROM product_variants
        WHERE product_id = ANY($1::int[])
        ORDER BY sort_order, id`,
      [ids],
    ),
  ])

  const poProizvodu = new Map(ids.map((id) => [id, []]))
  for (const { product_id, ...v } of sveVarijante) poProizvodu.get(product_id)?.push(v)

  return rows.map((p) => {
    const variants = poProizvodu.get(p.id) ?? []
    const promo = promoForProduct({ ...p, variants }, promos)
    const sVarijantama = variants.map((v) => ({
      ...v,
      effective_price_fening: discountedPrice(v.price_fening, promo),
    }))
    return {
      ...p,
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

productsRouter.get('/categories', async (_req, res, next) => {
  try {
    if (!imaBazu) {
      const brojaci = demoBrojPoKategoriji()
      return res.json(CATEGORIES.map((c) => ({ ...c, count: brojaci[c.slug] ?? 0 })))
    }
    const counts = await all(
      'SELECT category, COUNT(*) AS n FROM products WHERE is_available = TRUE GROUP BY category',
    )
    const byCat = Object.fromEntries(counts.map((c) => [c.category, c.n]))
    res.json(CATEGORIES.map((c) => ({ ...c, count: byCat[c.slug] ?? 0 })))
  } catch (err) {
    next(err)
  }
})

productsRouter.get('/', async (req, res, next) => {
  try {
    if (!imaBazu) {
      return res.json(
        demoProizvodi({
          category: req.query.category ? String(req.query.category) : undefined,
          featured: req.query.featured === '1',
        }),
      )
    }
    const where = []
    const params = []
    if (req.query.category) {
      params.push(String(req.query.category))
      where.push(`category = $${params.length}`)
    }
    if (req.query.featured === '1') {
      where.push('is_featured = TRUE')
    }
    const sql = `${selectProducts}
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY is_available DESC, sort_order, id`
    res.json(await withVariants(await all(sql, params)))
  } catch (err) {
    next(err)
  }
})

productsRouter.get('/:slug', async (req, res, next) => {
  try {
    if (!imaBazu) {
      const p = DEMO_KATALOG.find((x) => x.slug === req.params.slug)
      return p ? res.json(p) : res.status(404).json({ error: 'Proizvod nije pronađen.' })
    }
    const row = await one(`${selectProducts} WHERE slug = $1`, [req.params.slug])
    if (!row) return res.status(404).json({ error: 'Proizvod nije pronađen.' })
    res.json((await withVariants([row]))[0])
  } catch (err) {
    next(err)
  }
})

export { withVariants }
