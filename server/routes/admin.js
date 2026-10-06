import express, { Router } from 'express'
import { timingSafeEqual } from 'node:crypto'
import { z } from 'zod'
import { all, imaBazu, one, run, tx, ZONA } from '../db.js'
import { demoNijeDostupno } from '../demo.js'
import { fieldErrors, productSchema, promotionSchema, statusSchema } from '../schemas.js'
import { CATEGORIES } from '../seed.js'
import { allPromotions, danas, danPrije, promotionById } from '../pricing.js'
import { spremiSliku, sveSlike } from '../storage.js'
import { withVariants } from './products.js'

export const adminRouter = Router()

const DOZVOLJENI_TIPOVI = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/png': 'png',
}

/**
 * NAMJERNO JEDNOSTAVNO: jedan dijeljeni token iz okruzenja.
 * Ovo sprjecava da lista narudzbi bude javna i nista vise. Nije pravi auth
 * sistem - nema korisnika, rotacije, isteka ni rate limita. Prije produkcije
 * ovo treba zamijeniti stvarnom autentikacijom.
 */
function requireAdmin(req, res, next) {
  const expected = process.env.ADMIN_TOKEN
  if (!expected) {
    return res.status(500).json({ error: 'ADMIN_TOKEN nije postavljen na serveru.' })
  }
  const header = req.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''

  const a = Buffer.from(token)
  const b = Buffer.from(expected)
  // timingSafeEqual baca ako duzine nisu jednake, pa se to provjerava prvo.
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return res.status(401).json({ error: 'Neispravan pristupni token.' })
  }
  next()
}

adminRouter.use(requireAdmin)

/**
 * Admin bez baze nema sta da pokaze ni gdje da upise. Provjera stoji IZA
 * requireAdmin-a namjerno: stanje baze nije podatak za neprijavljenog.
 */
adminRouter.use((req, res, next) => {
  if (!imaBazu && req.path !== '/check') return demoNijeDostupno(res)
  next()
})

/** Provjera tokena bez povlacenja podataka - koristi je /admin login forma. */
adminRouter.get('/check', (_req, res) => res.json({ ok: true }))

// ---------------------------------------------------------------- NARUDZBE ---

adminRouter.get('/orders', async (req, res, next) => {
  try {
    const where = []
    const params = []
    if (req.query.status) {
      params.push(String(req.query.status))
      where.push(`status = $${params.length}`)
    }
    // Pretraga po broju, imenu i telefonu. ILIKE je Postgresov LIKE koji ne
    // gleda velicinu slova, pa otpada rucno LOWER() na obje strane. Dovoljno
    // za tezinu koju ova lista ima (LIMIT 200) - FTS bi ovdje bio oprema bez posla.
    if (req.query.q) {
      params.push(`%${String(req.query.q).trim()}%`)
      const i = params.length
      where.push(`(order_number ILIKE $${i} OR customer_name ILIKE $${i} OR phone ILIKE $${i})`)
    }
    if (req.query.pickup) {
      params.push(String(req.query.pickup))
      where.push(`pickup_date = $${params.length}`)
    }

    const orders = await all(
      `SELECT id, order_number, customer_name, phone, email, fulfillment, address, city,
              pickup_date, note, subtotal_fening, delivery_fening, total_fening,
              status, created_at
         FROM orders
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY created_at DESC, id DESC
        LIMIT 200`,
      params,
    )

    if (orders.length === 0) return res.json([])

    // Jedan upit za sve stavke umjesto N upita u petlji.
    const ids = orders.map((o) => o.id)
    const items = await all(
      `SELECT order_id, slug_snapshot, name_snapshot, variant_label,
              unit_price_fening, qty, line_total_fening, discount_fening, promo_snapshot
         FROM order_items
        WHERE order_id = ANY($1::int[])`,
      [ids],
    )

    const byOrder = new Map(ids.map((id) => [id, []]))
    for (const it of items) byOrder.get(it.order_id)?.push(it)

    res.json(orders.map((o) => ({ ...o, items: byOrder.get(o.id) ?? [] })))
  } catch (err) {
    next(err)
  }
})

adminRouter.patch('/orders/:id', async (req, res, next) => {
  try {
    const parsed = statusSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Neispravan status.', fields: fieldErrors(parsed.error) })
    }
    const id = brojId(req.params.id)
    if (!id) return res.status(400).json({ error: 'Neispravan ID narudžbe.' })

    const result = await run('UPDATE orders SET status = $1 WHERE id = $2', [parsed.data.status, id])
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Narudžba nije pronađena.' })
    }
    res.json({ ok: true, id, status: parsed.data.status })
  } catch (err) {
    next(err)
  }
})

// ----------------------------------------------------------------- PREGLED ---

/**
 * Brojevi za pocetni ekran admina: koliko je naruceno danas/ove sedmice,
 * sta se preuzima kojeg dana i sta se najvise prodaje.
 *
 * created_at je TIMESTAMPTZ, dakle trenutak bez zone u zapisu. Svako
 * poredjenje po DANU mora kroz zonu radnje (`AT TIME ZONE`) - na Vercelu je
 * lokalno vrijeme procesa UTC, pa bi narudzba primljena u 01:30 po sarajevskom
 * pala u "juce" i admin bi je trazio na pogresnom danu.
 *
 * Otkazane narudzbe se NE broje u prihod; broj otkazanih stoji odvojeno.
 */
adminRouter.get('/summary', async (_req, res, next) => {
  try {
    const dan = danas()

    const zaPeriod = (danaUnazad) =>
      one(
        `SELECT COUNT(*) AS n, COALESCE(SUM(total_fening), 0) AS total
           FROM orders
          WHERE status <> 'otkazana'
            AND (created_at AT TIME ZONE $1)::date >= $2::date`,
        [ZONA, danPrije(danaUnazad)],
      )

    const [danasNarudzbe, sedmica, mjesec, statusi, pickupDani, pickupStavke, topProizvodi, popusti, brojevi] =
      await Promise.all([
        zaPeriod(0),
        zaPeriod(6),
        zaPeriod(29),

        all('SELECT status, COUNT(*) AS n FROM orders GROUP BY status'),

        all(
          `SELECT pickup_date, COUNT(*) AS n, COALESCE(SUM(total_fening), 0) AS total
             FROM orders
            WHERE pickup_date >= $1
              AND status NOT IN ('otkazana', 'zavrsena')
            GROUP BY pickup_date
            ORDER BY pickup_date
            LIMIT 14`,
          [dan],
        ),

        // Sta se tacno preuzima kojeg dana - zbog ovoga admin postoji.
        all(
          `SELECT o.pickup_date, i.name_snapshot, i.variant_label, SUM(i.qty) AS qty
             FROM orders o
             JOIN order_items i ON i.order_id = o.id
            WHERE o.pickup_date >= $1
              AND o.status NOT IN ('otkazana', 'zavrsena')
            GROUP BY o.pickup_date, i.name_snapshot, i.variant_label
            ORDER BY o.pickup_date, qty DESC`,
          [dan],
        ),

        all(
          `SELECT i.name_snapshot, SUM(i.qty) AS qty, SUM(i.line_total_fening) AS total
             FROM order_items i
             JOIN orders o ON o.id = i.order_id
            WHERE o.status <> 'otkazana'
              AND (o.created_at AT TIME ZONE $1)::date >= $2::date
            GROUP BY i.name_snapshot
            ORDER BY qty DESC, total DESC
            LIMIT 6`,
          [ZONA, danPrije(89)],
        ),

        one(
          `SELECT COALESCE(SUM(i.discount_fening), 0) AS total
             FROM order_items i
             JOIN orders o ON o.id = i.order_id
            WHERE o.status <> 'otkazana'
              AND (o.created_at AT TIME ZONE $1)::date >= $2::date`,
          [ZONA, danPrije(29)],
        ),

        one(`SELECT (SELECT COUNT(*) FROM products) AS proizvoda,
                    (SELECT COUNT(*) FROM promotions WHERE is_active = TRUE) AS akcija`),
      ])

    const poDanu = new Map(pickupDani.map((d) => [d.pickup_date, { ...d, items: [] }]))
    for (const s of pickupStavke) poDanu.get(s.pickup_date)?.items.push(s)

    res.json({
      danas: danasNarudzbe,
      sedmica,
      mjesec,
      popustMjesec: popusti.total,
      statusi: Object.fromEntries(statusi.map((s) => [s.status, s.n])),
      pickup: [...poDanu.values()],
      topProizvodi,
      brojProizvoda: brojevi.proizvoda,
      brojAkcija: brojevi.akcija,
    })
  } catch (err) {
    next(err)
  }
})

// --------------------------------------------------------------- PROIZVODI ---

adminRouter.get('/products', async (_req, res, next) => {
  try {
    const rows = await all(
      `SELECT id, slug, name, category, short_desc, long_desc, unit, serves,
              allergens, image, is_featured, is_available, sort_order
         FROM products
        ORDER BY sort_order, id`,
    )
    res.json(await withVariants(rows))
  } catch (err) {
    next(err)
  }
})

adminRouter.post('/products', async (req, res, next) => {
  try {
    const parsed = productSchema.safeParse(req.body)
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: 'Provjerite unesene podatke.', fields: fieldErrors(parsed.error) })
    }
    const p = parsed.data
    if (!poznataKategorija(p.category)) {
      return res.status(400).json({ error: 'Nepoznata kategorija.', fields: { category: 'Nepoznata kategorija.' } })
    }
    if (await one('SELECT 1 FROM products WHERE slug = $1', [p.slug])) {
      return res
        .status(409)
        .json({ error: 'Proizvod sa ovom URL oznakom već postoji.', fields: { slug: 'Već zauzeto.' } })
    }

    const { max } = await one('SELECT COALESCE(MAX(sort_order), -1) AS max FROM products')

    const id = await tx(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO products
           (slug, name, category, short_desc, long_desc, unit, serves, allergens,
            image, is_featured, is_available, sort_order, created_at)
         VALUES ($1, $2, $3, $4, $5, 'kom', '', $6, $7, $8, $9, $10, now())
         RETURNING id`,
        [
          p.slug,
          p.name,
          p.category,
          p.short_desc,
          p.long_desc,
          p.allergens,
          p.image,
          p.is_featured,
          p.is_available,
          p.sort_order ?? max + 1,
        ],
      )
      const noviId = rows[0].id
      await upisiVarijante(client, noviId, p.variants)
      return noviId
    })

    res.status(201).json(await jedanProizvod(id))
  } catch (err) {
    console.error('[admin] proizvod nije upisan:', err)
    if (res.headersSent) return next(err)
    res.status(500).json({ error: 'Proizvod nije sačuvan.' })
  }
})

/** Nove varijante jednim INSERT-om - tri odvojena upita bi bila tri skoka na bazu. */
async function upisiVarijante(client, productId, varijante) {
  if (varijante.length === 0) return
  const vrijednosti = []
  const params = []
  varijante.forEach((v, i) => {
    const b = params.length
    vrijednosti.push(`($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4})`)
    params.push(productId, v.label, v.price_fening, i)
  })
  await client.query(
    `INSERT INTO product_variants (product_id, label, price_fening, sort_order)
     VALUES ${vrijednosti.join(', ')}`,
    params,
  )
}

adminRouter.put('/products/:id', async (req, res, next) => {
  const id = brojId(req.params.id)
  if (!id) return res.status(400).json({ error: 'Neispravan ID proizvoda.' })

  const parsed = productSchema.safeParse(req.body)
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: 'Provjerite unesene podatke.', fields: fieldErrors(parsed.error) })
  }
  const p = parsed.data
  if (!poznataKategorija(p.category)) {
    return res.status(400).json({ error: 'Nepoznata kategorija.', fields: { category: 'Nepoznata kategorija.' } })
  }

  try {
    if (!(await one('SELECT 1 FROM products WHERE id = $1', [id]))) {
      return res.status(404).json({ error: 'Proizvod nije pronađen.' })
    }
    if (await one('SELECT 1 FROM products WHERE slug = $1 AND id <> $2', [p.slug, id])) {
      return res
        .status(409)
        .json({ error: 'Proizvod sa ovom URL oznakom već postoji.', fields: { slug: 'Već zauzeto.' } })
    }

    await tx(async (client) => {
      await client.query(
        `UPDATE products
            SET slug = $1, name = $2, category = $3, short_desc = $4, long_desc = $5,
                allergens = $6, image = $7, is_featured = $8, is_available = $9
          WHERE id = $10`,
        [
          p.slug,
          p.name,
          p.category,
          p.short_desc,
          p.long_desc,
          p.allergens,
          p.image,
          p.is_featured,
          p.is_available,
          id,
        ],
      )

      // Postojece varijante se mijenjaju NA MJESTU, ne brisu i upisuju ponovo:
      // korpe kupaca drze variantId u localStorage-u, a obrisan id znaci stavka
      // koja tiho ispadne iz korpe pri sljedecoj validaciji.
      const { rows } = await client.query(
        'SELECT id FROM product_variants WHERE product_id = $1',
        [id],
      )
      const postojece = rows.map((v) => v.id)
      const zadrzane = new Set()
      const nove = []

      for (const [i, v] of p.variants.entries()) {
        if (v.id && postojece.includes(v.id)) {
          await client.query(
            `UPDATE product_variants SET label = $1, price_fening = $2, sort_order = $3
              WHERE id = $4 AND product_id = $5`,
            [v.label, v.price_fening, i, v.id, id],
          )
          zadrzane.add(v.id)
        } else {
          nove.push(v)
        }
      }
      await upisiVarijante(client, id, nove)

      const zaBrisanje = postojece.filter((vid) => !zadrzane.has(vid))
      if (zaBrisanje.length) {
        await client.query(
          'DELETE FROM product_variants WHERE product_id = $1 AND id = ANY($2::int[])',
          [id, zaBrisanje],
        )
      }
    })

    res.json(await jedanProizvod(id))
  } catch (err) {
    console.error('[admin] proizvod nije sacuvan:', err)
    if (res.headersSent) return next(err)
    res.status(500).json({ error: 'Proizvod nije sačuvan.' })
  }
})

const flagsSchema = z.object({
  is_available: z.boolean().optional(),
  is_featured: z.boolean().optional(),
})

/** Brzi prekidaci iz liste - bez otvaranja cijele forme. */
adminRouter.patch('/products/:id', async (req, res, next) => {
  try {
    const id = brojId(req.params.id)
    if (!id) return res.status(400).json({ error: 'Neispravan ID proizvoda.' })
    const parsed = flagsSchema.safeParse(req.body)
    if (!parsed.success || (parsed.data.is_available === undefined && parsed.data.is_featured === undefined)) {
      return res.status(400).json({ error: 'Nema šta mijenjati.' })
    }
    const sets = []
    const params = []
    if (parsed.data.is_available !== undefined) {
      params.push(parsed.data.is_available)
      sets.push(`is_available = $${params.length}`)
    }
    if (parsed.data.is_featured !== undefined) {
      params.push(parsed.data.is_featured)
      sets.push(`is_featured = $${params.length}`)
    }
    params.push(id)
    const result = await run(`UPDATE products SET ${sets.join(', ')} WHERE id = $${params.length}`, params)
    if (result.changes === 0) return res.status(404).json({ error: 'Proizvod nije pronađen.' })
    res.json(await jedanProizvod(id))
  } catch (err) {
    next(err)
  }
})

/**
 * Brisanje je trajno, ali stare narudzbe ne trpe: order_items drzi snapshot
 * imena i cijene i NEMA strani kljuc na products, pa racun ostaje citljiv i
 * kad proizvoda vise nema u ponudi.
 */
adminRouter.delete('/products/:id', async (req, res, next) => {
  try {
    const id = brojId(req.params.id)
    if (!id) return res.status(400).json({ error: 'Neispravan ID proizvoda.' })
    const result = await run('DELETE FROM products WHERE id = $1', [id])
    if (result.changes === 0) return res.status(404).json({ error: 'Proizvod nije pronađen.' })
    res.json({ ok: true, id })
  } catch (err) {
    next(err)
  }
})

// ------------------------------------------------------------------ AKCIJE ---

adminRouter.get('/promotions', async (_req, res, next) => {
  try {
    const [proizvodi, akcije] = await Promise.all([
      all('SELECT id, name FROM products'),
      allPromotions(),
    ])
    const imena = new Map(proizvodi.map((p) => [String(p.id), p.name]))
    const kategorije = new Map(CATEGORIES.map((c) => [c.slug, c.name]))
    res.json(
      akcije.map((p) => ({
        ...p,
        target_label:
          p.scope === 'sve'
            ? 'Cijela ponuda'
            : p.scope === 'kategorija'
              ? (kategorije.get(p.target) ?? p.target)
              : (imena.get(String(p.target)) ?? `#${p.target}`),
      })),
    )
  } catch (err) {
    next(err)
  }
})

async function validirajAkciju(body) {
  const parsed = promotionSchema.safeParse(body)
  if (!parsed.success) {
    return { error: { status: 400, body: { error: 'Provjerite unesene podatke.', fields: fieldErrors(parsed.error) } } }
  }
  const a = parsed.data
  if (a.scope === 'kategorija' && !poznataKategorija(a.target)) {
    return { error: { status: 400, body: { error: 'Nepoznata kategorija.', fields: { target: 'Nepoznata kategorija.' } } } }
  }
  if (a.scope === 'proizvod' && !(await one('SELECT 1 FROM products WHERE id = $1', [Number(a.target)]))) {
    return { error: { status: 400, body: { error: 'Nepoznat proizvod.', fields: { target: 'Nepoznat proizvod.' } } } }
  }
  return { data: a }
}

adminRouter.post('/promotions', async (req, res, next) => {
  try {
    const { data: a, error } = await validirajAkciju(req.body)
    if (error) return res.status(error.status).json(error.body)

    const { id } = await one(
      `INSERT INTO promotions
         (title, description, kind, value, scope, target, starts_on, ends_on, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [a.title, a.description, a.kind, a.value, a.scope, a.scope === 'sve' ? null : a.target, a.starts_on, a.ends_on, a.is_active],
    )
    res.status(201).json(await promotionById(id))
  } catch (err) {
    next(err)
  }
})

adminRouter.put('/promotions/:id', async (req, res, next) => {
  try {
    const id = brojId(req.params.id)
    if (!id) return res.status(400).json({ error: 'Neispravan ID akcije.' })
    const { data: a, error } = await validirajAkciju(req.body)
    if (error) return res.status(error.status).json(error.body)

    const result = await run(
      `UPDATE promotions
          SET title = $1, description = $2, kind = $3, value = $4, scope = $5, target = $6,
              starts_on = $7, ends_on = $8, is_active = $9
        WHERE id = $10`,
      [a.title, a.description, a.kind, a.value, a.scope, a.scope === 'sve' ? null : a.target, a.starts_on, a.ends_on, a.is_active, id],
    )
    if (result.changes === 0) return res.status(404).json({ error: 'Akcija nije pronađena.' })
    res.json(await promotionById(id))
  } catch (err) {
    next(err)
  }
})

adminRouter.patch('/promotions/:id', async (req, res, next) => {
  try {
    const id = brojId(req.params.id)
    if (!id) return res.status(400).json({ error: 'Neispravan ID akcije.' })
    const parsed = z.object({ is_active: z.boolean() }).safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Nema šta mijenjati.' })
    const result = await run('UPDATE promotions SET is_active = $1 WHERE id = $2', [parsed.data.is_active, id])
    if (result.changes === 0) return res.status(404).json({ error: 'Akcija nije pronađena.' })
    res.json(await promotionById(id))
  } catch (err) {
    next(err)
  }
})

adminRouter.delete('/promotions/:id', async (req, res, next) => {
  try {
    const id = brojId(req.params.id)
    if (!id) return res.status(400).json({ error: 'Neispravan ID akcije.' })
    const result = await run('DELETE FROM promotions WHERE id = $1', [id])
    if (result.changes === 0) return res.status(404).json({ error: 'Akcija nije pronađena.' })
    res.json({ ok: true, id })
  } catch (err) {
    next(err)
  }
})

// ------------------------------------------------------------------- SLIKE ---

adminRouter.get('/images', async (_req, res, next) => {
  try {
    res.json(await sveSlike())
  } catch (err) {
    next(err)
  }
})

/**
 * Ucitavanje fotografije. Tijelo je sirovi bajtovi slike, ne multipart -
 * multipart bi znacio novu zavisnost, a ovdje ide jedan fajl po zahtjevu.
 *
 * Slike se NE smanjuju (nema sharp): za karticu i karusel se koristi isti
 * fajl. Zato stoji granica od 6 MB, a u README-u uputa kako napraviti -640
 * varijantu kad fotografija ide u stalnu ponudu.
 *
 * Gdje fajl zavrsi odlucuje storage.js: Vercel Blob u produkciji, disk lokalno.
 */
adminRouter.post(
  '/uploads',
  express.raw({ type: Object.keys(DOZVOLJENI_TIPOVI), limit: '6mb' }),
  async (req, res) => {
    const tip = String(req.get('content-type')).split(';')[0].trim()
    const ext = DOZVOLJENI_TIPOVI[tip]
    if (!ext) {
      return res.status(415).json({ error: 'Podržani formati su WEBP, JPG i PNG.' })
    }
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      return res.status(400).json({ error: 'Slika je prazna.' })
    }

    const osnova =
      String(req.query.name || 'slika')
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40) || 'slika'
    const ime = `${osnova}-${Date.now().toString(36)}.${ext}`

    try {
      const path = await spremiSliku(ime, req.body, tip)
      res.status(201).json({ path })
    } catch (err) {
      console.error('[admin] slika nije sacuvana:', err)
      res.status(500).json({ error: 'Slika nije sačuvana.' })
    }
  },
)

// ----------------------------------------------------------------- POMOCNE ---

function brojId(raw) {
  const id = Number(raw)
  return Number.isInteger(id) && id > 0 ? id : null
}

function poznataKategorija(slug) {
  return CATEGORIES.some((c) => c.slug === slug)
}

async function jedanProizvod(id) {
  const row = await one(
    `SELECT id, slug, name, category, short_desc, long_desc, unit, serves,
            allergens, image, is_featured, is_available, sort_order
       FROM products WHERE id = $1`,
    [id],
  )
  return row ? (await withVariants([row]))[0] : null
}
