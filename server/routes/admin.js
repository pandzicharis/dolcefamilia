import express, { Router } from 'express'
import { timingSafeEqual } from 'node:crypto'
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { z } from 'zod'
import { db } from '../db.js'
import { fieldErrors, productSchema, promotionSchema, statusSchema } from '../schemas.js'
import { CATEGORIES } from '../seed.js'
import { allPromotions, promotionById } from '../pricing.js'
import { withVariants } from './products.js'

export const adminRouter = Router()

export const UPLOAD_DIR = resolve(process.env.UPLOAD_DIR || './data/uploads')
const IMG_DIR = resolve('./public/img')
const DOZVOLJENI_TIPOVI = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/png': 'png',
}

/**
 * NAMJERNO JEDNOSTAVNO: jedan dijeljeni token iz .env.
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

/** Provjera tokena bez povlacenja podataka - koristi je /admin login forma. */
adminRouter.get('/check', (_req, res) => res.json({ ok: true }))

// ---------------------------------------------------------------- NARUDZBE ---

adminRouter.get('/orders', (req, res) => {
  const where = []
  const params = []
  if (req.query.status) {
    where.push('status = ?')
    params.push(String(req.query.status))
  }
  // Pretraga po broju, imenu i telefonu. Dovoljno za tezinu koju ova lista
  // ima (LIMIT 200) - FTS bi ovdje bio oprema bez posla.
  if (req.query.q) {
    const q = `%${String(req.query.q).trim().toLowerCase()}%`
    where.push('(LOWER(order_number) LIKE ? OR LOWER(customer_name) LIKE ? OR phone LIKE ?)')
    params.push(q, q, q)
  }
  if (req.query.pickup) {
    where.push('pickup_date = ?')
    params.push(String(req.query.pickup))
  }

  const orders = db
    .prepare(
      `SELECT id, order_number, customer_name, phone, email, fulfillment, address, city,
              pickup_date, note, subtotal_fening, delivery_fening, total_fening,
              status, created_at
         FROM orders
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY created_at DESC, id DESC
        LIMIT 200`,
    )
    .all(...params)

  if (orders.length === 0) return res.json([])

  // Jedan upit za sve stavke umjesto N upita u petlji.
  const ids = orders.map((o) => o.id)
  const items = db
    .prepare(
      `SELECT order_id, slug_snapshot, name_snapshot, variant_label,
              unit_price_fening, qty, line_total_fening, discount_fening, promo_snapshot
         FROM order_items
        WHERE order_id IN (${ids.map(() => '?').join(',')})`,
    )
    .all(...ids)

  const byOrder = new Map(ids.map((id) => [id, []]))
  for (const it of items) byOrder.get(it.order_id)?.push(it)

  res.json(orders.map((o) => ({ ...o, items: byOrder.get(o.id) ?? [] })))
})

adminRouter.patch('/orders/:id', (req, res) => {
  const parsed = statusSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Neispravan status.', fields: fieldErrors(parsed.error) })
  }
  const id = brojId(req.params.id)
  if (!id) return res.status(400).json({ error: 'Neispravan ID narudžbe.' })

  const result = db
    .prepare('UPDATE orders SET status = ? WHERE id = ?')
    .run(parsed.data.status, id)
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Narudžba nije pronađena.' })
  }
  res.json({ ok: true, id, status: parsed.data.status })
})

// ----------------------------------------------------------------- PREGLED ---

/**
 * Brojevi za pocetni ekran admina: koliko je naruceno danas/ove sedmice,
 * sta se preuzima kojeg dana i sta se najvise prodaje.
 *
 * created_at je UTC (datetime('now')), pa se svako poredjenje po danu radi
 * kroz date(created_at,'localtime') - inace narudzba od 01:30 po lokalnom
 * vremenu pada u "juce".
 *
 * Otkazane narudzbe se NE broje u prihod; broj otkazanih stoji odvojeno.
 */
adminRouter.get('/summary', (_req, res) => {
  const zaPeriod = (odDana) =>
    db
      .prepare(
        `SELECT COUNT(*) AS n, COALESCE(SUM(total_fening), 0) AS total
           FROM orders
          WHERE status <> 'otkazana'
            AND date(created_at, 'localtime') >= date('now', 'localtime', ?)`,
      )
      .get(odDana)

  const statusi = db
    .prepare('SELECT status, COUNT(*) AS n FROM orders GROUP BY status')
    .all()

  const pickupDani = db
    .prepare(
      `SELECT pickup_date, COUNT(*) AS n, COALESCE(SUM(total_fening), 0) AS total
         FROM orders
        WHERE pickup_date >= date('now', 'localtime')
          AND status NOT IN ('otkazana', 'zavrsena')
        GROUP BY pickup_date
        ORDER BY pickup_date
        LIMIT 14`,
    )
    .all()

  // Sta se tacno preuzima kojeg dana - zbog ovoga admin postoji.
  const pickupStavke = db
    .prepare(
      `SELECT o.pickup_date, i.name_snapshot, i.variant_label, SUM(i.qty) AS qty
         FROM orders o
         JOIN order_items i ON i.order_id = o.id
        WHERE o.pickup_date >= date('now', 'localtime')
          AND o.status NOT IN ('otkazana', 'zavrsena')
        GROUP BY o.pickup_date, i.name_snapshot, i.variant_label
        ORDER BY o.pickup_date, qty DESC`,
    )
    .all()

  const poDanu = new Map(pickupDani.map((d) => [d.pickup_date, { ...d, items: [] }]))
  for (const s of pickupStavke) poDanu.get(s.pickup_date)?.items.push(s)

  const topProizvodi = db
    .prepare(
      `SELECT i.name_snapshot, SUM(i.qty) AS qty, SUM(i.line_total_fening) AS total
         FROM order_items i
         JOIN orders o ON o.id = i.order_id
        WHERE o.status <> 'otkazana'
          AND date(o.created_at, 'localtime') >= date('now', 'localtime', '-89 days')
        GROUP BY i.name_snapshot
        ORDER BY qty DESC, total DESC
        LIMIT 6`,
    )
    .all()

  const popusti = db
    .prepare(
      `SELECT COALESCE(SUM(i.discount_fening), 0) AS total
         FROM order_items i
         JOIN orders o ON o.id = i.order_id
        WHERE o.status <> 'otkazana'
          AND date(o.created_at, 'localtime') >= date('now', 'localtime', '-29 days')`,
    )
    .get()

  res.json({
    danas: zaPeriod('-0 days'),
    sedmica: zaPeriod('-6 days'),
    mjesec: zaPeriod('-29 days'),
    popustMjesec: popusti.total,
    statusi: Object.fromEntries(statusi.map((s) => [s.status, s.n])),
    pickup: [...poDanu.values()],
    topProizvodi,
    brojProizvoda: db.prepare('SELECT COUNT(*) AS n FROM products').get().n,
    brojAkcija: db.prepare('SELECT COUNT(*) AS n FROM promotions WHERE is_active = 1').get().n,
  })
})

// --------------------------------------------------------------- PROIZVODI ---

adminRouter.get('/products', (_req, res) => {
  const rows = db
    .prepare(
      `SELECT id, slug, name, category, short_desc, long_desc, unit, serves,
              allergens, image, is_featured, is_available, sort_order
         FROM products
        ORDER BY sort_order, id`,
    )
    .all()
  res.json(withVariants(rows))
})

adminRouter.post('/products', (req, res) => {
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
  if (db.prepare('SELECT 1 FROM products WHERE slug = ?').get(p.slug)) {
    return res
      .status(409)
      .json({ error: 'Proizvod sa ovom URL oznakom već postoji.', fields: { slug: 'Već zauzeto.' } })
  }

  const { max } = db.prepare('SELECT COALESCE(MAX(sort_order), -1) AS max FROM products').get()

  db.exec('BEGIN IMMEDIATE')
  let id
  try {
    db.prepare(
      `INSERT INTO products
         (slug, name, category, short_desc, long_desc, unit, serves, allergens,
          image, is_featured, is_available, sort_order, created_at)
       VALUES (?, ?, ?, ?, ?, 'kom', '', ?, ?, ?, ?, ?, datetime('now'))`,
    ).run(
      p.slug,
      p.name,
      p.category,
      p.short_desc,
      p.long_desc,
      p.allergens,
      p.image,
      p.is_featured ? 1 : 0,
      p.is_available ? 1 : 0,
      p.sort_order ?? max + 1,
    )
    id = db.prepare('SELECT last_insert_rowid() AS id').get().id
    const insertVariant = db.prepare(
      'INSERT INTO product_variants (product_id, label, price_fening, sort_order) VALUES (?, ?, ?, ?)',
    )
    p.variants.forEach((v, i) => insertVariant.run(id, v.label, v.price_fening, i))
    db.exec('COMMIT')
  } catch (err) {
    db.exec('ROLLBACK')
    console.error('[admin] proizvod nije upisan:', err)
    return res.status(500).json({ error: 'Proizvod nije sačuvan.' })
  }

  res.status(201).json(jedanProizvod(id))
})

adminRouter.put('/products/:id', (req, res) => {
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
  if (!db.prepare('SELECT 1 FROM products WHERE id = ?').get(id)) {
    return res.status(404).json({ error: 'Proizvod nije pronađen.' })
  }
  if (db.prepare('SELECT 1 FROM products WHERE slug = ? AND id <> ?').get(p.slug, id)) {
    return res
      .status(409)
      .json({ error: 'Proizvod sa ovom URL oznakom već postoji.', fields: { slug: 'Već zauzeto.' } })
  }

  db.exec('BEGIN IMMEDIATE')
  try {
    db.prepare(
      `UPDATE products
          SET slug = ?, name = ?, category = ?, short_desc = ?, long_desc = ?,
              allergens = ?, image = ?, is_featured = ?, is_available = ?
        WHERE id = ?`,
    ).run(
      p.slug,
      p.name,
      p.category,
      p.short_desc,
      p.long_desc,
      p.allergens,
      p.image,
      p.is_featured ? 1 : 0,
      p.is_available ? 1 : 0,
      id,
    )

    // Postojece varijante se mijenjaju NA MJESTU, ne brisu i upisuju ponovo:
    // korpe kupaca drze variantId u localStorage-u, a obrisan id znaci stavka
    // koja tiho ispadne iz korpe pri sljedecoj validaciji.
    const postojece = db
      .prepare('SELECT id FROM product_variants WHERE product_id = ?')
      .all(id)
      .map((v) => v.id)
    const zadrzane = new Set()

    const update = db.prepare(
      'UPDATE product_variants SET label = ?, price_fening = ?, sort_order = ? WHERE id = ? AND product_id = ?',
    )
    const insert = db.prepare(
      'INSERT INTO product_variants (product_id, label, price_fening, sort_order) VALUES (?, ?, ?, ?)',
    )

    p.variants.forEach((v, i) => {
      if (v.id && postojece.includes(v.id)) {
        update.run(v.label, v.price_fening, i, v.id, id)
        zadrzane.add(v.id)
      } else {
        insert.run(id, v.label, v.price_fening, i)
      }
    })

    const zaBrisanje = postojece.filter((vid) => !zadrzane.has(vid))
    if (zaBrisanje.length) {
      db.prepare(
        `DELETE FROM product_variants WHERE product_id = ? AND id IN (${zaBrisanje.map(() => '?').join(',')})`,
      ).run(id, ...zaBrisanje)
    }

    db.exec('COMMIT')
  } catch (err) {
    db.exec('ROLLBACK')
    console.error('[admin] proizvod nije sacuvan:', err)
    return res.status(500).json({ error: 'Proizvod nije sačuvan.' })
  }

  res.json(jedanProizvod(id))
})

const flagsSchema = z.object({
  is_available: z.boolean().optional(),
  is_featured: z.boolean().optional(),
})

/** Brzi prekidaci iz liste - bez otvaranja cijele forme. */
adminRouter.patch('/products/:id', (req, res) => {
  const id = brojId(req.params.id)
  if (!id) return res.status(400).json({ error: 'Neispravan ID proizvoda.' })
  const parsed = flagsSchema.safeParse(req.body)
  if (!parsed.success || (parsed.data.is_available === undefined && parsed.data.is_featured === undefined)) {
    return res.status(400).json({ error: 'Nema šta mijenjati.' })
  }
  const sets = []
  const params = []
  if (parsed.data.is_available !== undefined) {
    sets.push('is_available = ?')
    params.push(parsed.data.is_available ? 1 : 0)
  }
  if (parsed.data.is_featured !== undefined) {
    sets.push('is_featured = ?')
    params.push(parsed.data.is_featured ? 1 : 0)
  }
  const result = db.prepare(`UPDATE products SET ${sets.join(', ')} WHERE id = ?`).run(...params, id)
  if (result.changes === 0) return res.status(404).json({ error: 'Proizvod nije pronađen.' })
  res.json(jedanProizvod(id))
})

/**
 * Brisanje je trajno, ali stare narudzbe ne trpe: order_items drzi snapshot
 * imena i cijene i NEMA strani kljuc na products, pa racun ostaje citljiv i
 * kad proizvoda vise nema u ponudi.
 */
adminRouter.delete('/products/:id', (req, res) => {
  const id = brojId(req.params.id)
  if (!id) return res.status(400).json({ error: 'Neispravan ID proizvoda.' })
  const result = db.prepare('DELETE FROM products WHERE id = ?').run(id)
  if (result.changes === 0) return res.status(404).json({ error: 'Proizvod nije pronađen.' })
  res.json({ ok: true, id })
})

// ------------------------------------------------------------------ AKCIJE ---

adminRouter.get('/promotions', (_req, res) => {
  const imena = new Map(
    db.prepare('SELECT id, name FROM products').all().map((p) => [String(p.id), p.name]),
  )
  const kategorije = new Map(CATEGORIES.map((c) => [c.slug, c.name]))
  res.json(
    allPromotions().map((p) => ({
      ...p,
      is_active: Boolean(p.is_active),
      target_label:
        p.scope === 'sve'
          ? 'Cijela ponuda'
          : p.scope === 'kategorija'
            ? (kategorije.get(p.target) ?? p.target)
            : (imena.get(String(p.target)) ?? `#${p.target}`),
    })),
  )
})

function validirajAkciju(body) {
  const parsed = promotionSchema.safeParse(body)
  if (!parsed.success) {
    return { error: { status: 400, body: { error: 'Provjerite unesene podatke.', fields: fieldErrors(parsed.error) } } }
  }
  const a = parsed.data
  if (a.scope === 'kategorija' && !poznataKategorija(a.target)) {
    return { error: { status: 400, body: { error: 'Nepoznata kategorija.', fields: { target: 'Nepoznata kategorija.' } } } }
  }
  if (a.scope === 'proizvod' && !db.prepare('SELECT 1 FROM products WHERE id = ?').get(Number(a.target))) {
    return { error: { status: 400, body: { error: 'Nepoznat proizvod.', fields: { target: 'Nepoznat proizvod.' } } } }
  }
  return { data: a }
}

adminRouter.post('/promotions', (req, res) => {
  const { data: a, error } = validirajAkciju(req.body)
  if (error) return res.status(error.status).json(error.body)

  db.prepare(
    `INSERT INTO promotions
       (title, description, kind, value, scope, target, starts_on, ends_on, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    a.title,
    a.description,
    a.kind,
    a.value,
    a.scope,
    a.scope === 'sve' ? null : a.target,
    a.starts_on,
    a.ends_on,
    a.is_active ? 1 : 0,
  )
  const id = db.prepare('SELECT last_insert_rowid() AS id').get().id
  res.status(201).json(promotionById(id))
})

adminRouter.put('/promotions/:id', (req, res) => {
  const id = brojId(req.params.id)
  if (!id) return res.status(400).json({ error: 'Neispravan ID akcije.' })
  const { data: a, error } = validirajAkciju(req.body)
  if (error) return res.status(error.status).json(error.body)

  const result = db
    .prepare(
      `UPDATE promotions
          SET title = ?, description = ?, kind = ?, value = ?, scope = ?, target = ?,
              starts_on = ?, ends_on = ?, is_active = ?
        WHERE id = ?`,
    )
    .run(
      a.title,
      a.description,
      a.kind,
      a.value,
      a.scope,
      a.scope === 'sve' ? null : a.target,
      a.starts_on,
      a.ends_on,
      a.is_active ? 1 : 0,
      id,
    )
  if (result.changes === 0) return res.status(404).json({ error: 'Akcija nije pronađena.' })
  res.json(promotionById(id))
})

adminRouter.patch('/promotions/:id', (req, res) => {
  const id = brojId(req.params.id)
  if (!id) return res.status(400).json({ error: 'Neispravan ID akcije.' })
  const parsed = z.object({ is_active: z.boolean() }).safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Nema šta mijenjati.' })
  const result = db
    .prepare('UPDATE promotions SET is_active = ? WHERE id = ?')
    .run(parsed.data.is_active ? 1 : 0, id)
  if (result.changes === 0) return res.status(404).json({ error: 'Akcija nije pronađena.' })
  res.json(promotionById(id))
})

adminRouter.delete('/promotions/:id', (req, res) => {
  const id = brojId(req.params.id)
  if (!id) return res.status(400).json({ error: 'Neispravan ID akcije.' })
  const result = db.prepare('DELETE FROM promotions WHERE id = ?').run(id)
  if (result.changes === 0) return res.status(404).json({ error: 'Akcija nije pronađena.' })
  res.json({ ok: true, id })
})

// ------------------------------------------------------------------- SLIKE ---

/**
 * Ponuda slika za formu proizvoda: fotografije koje su dosle sa projektom
 * (`public/img`) i one koje je admin ucitao (`data/uploads`).
 *
 * -640 varijante se ne nabrajaju - one su dio srcSet konvencije, ne izbor.
 */
adminRouter.get('/images', (_req, res) => {
  res.json([...izlistaj(IMG_DIR, '/img'), ...izlistaj(UPLOAD_DIR, '/uploads')])
})

function izlistaj(dir, prefix) {
  try {
    return readdirSync(dir)
      .filter((f) => /\.(webp|jpg|jpeg|png)$/i.test(f) && !/-640\.webp$/i.test(f))
      .sort()
      .map((f) => ({ path: `${prefix}/${f}`, source: prefix === '/img' ? 'projekt' : 'ucitano' }))
  } catch {
    return []
  }
}

/**
 * Ucitavanje fotografije. Tijelo je sirovi bajtovi slike, ne multipart -
 * multipart bi znacio novu zavisnost, a ovdje ide jedan fajl po zahtjevu.
 *
 * Slike se NE smanjuju (nema sharp): za karticu i stranicu proizvoda se
 * koristi isti fajl. Zato stoji granica od 6 MB, a u README-u uputa kako
 * napraviti -640 varijantu kad fotografija ide u stalnu ponudu.
 */
adminRouter.post(
  '/uploads',
  express.raw({ type: Object.keys(DOZVOLJENI_TIPOVI), limit: '6mb' }),
  (req, res) => {
    const ext = DOZVOLJENI_TIPOVI[String(req.get('content-type')).split(';')[0].trim()]
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
      mkdirSync(UPLOAD_DIR, { recursive: true })
      writeFileSync(resolve(UPLOAD_DIR, ime), req.body)
    } catch (err) {
      console.error('[admin] slika nije sacuvana:', err)
      return res.status(500).json({ error: 'Slika nije sačuvana.' })
    }

    res.status(201).json({ path: `/uploads/${ime}` })
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

function jedanProizvod(id) {
  const row = db
    .prepare(
      `SELECT id, slug, name, category, short_desc, long_desc, unit, serves,
              allergens, image, is_featured, is_available, sort_order
         FROM products WHERE id = ?`,
    )
    .get(id)
  return row ? withVariants([row])[0] : null
}
