import { Router } from 'express'
import { db, nextOrderNumber } from '../db.js'
import { fieldErrors, orderSchema } from '../schemas.js'
import { activePromotions, discountedPrice, promoForProduct, promoSnapshot } from '../pricing.js'

export const ordersRouter = Router()

/**
 * Cijena dostave. Drzi se na serveru, ne u klijentu - inace je svako moze
 * nulirati u devtoolsu. Mora ostati u skladu sa src/config/brand.ts.
 */
const DELIVERY_FEE_FENING = 500
const FREE_DELIVERY_OVER_FENING = 8000

ordersRouter.post('/', (req, res) => {
  const parsed = orderSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Provjerite unesene podatke.', fields: fieldErrors(parsed.error) })
  }
  const o = parsed.data

  // --- Cijene se NE citaju iz zahtjeva. Svaka se ponovo dohvata iz baze. ---
  const variantStmt = db.prepare(`
    SELECT v.id AS variant_id, v.label, v.price_fening,
           p.id AS product_id, p.slug, p.name, p.category, p.is_available
      FROM product_variants v
      JOIN products p ON p.id = v.product_id
     WHERE v.id = ? AND p.id = ?
  `)
  /** Sve varijante proizvoda - akcija "proizvod" se bira po najnizoj cijeni,
   *  pa se odluka ne smije praviti samo iz varijante koja je u korpi. */
  const svePoProizvodu = db.prepare(
    'SELECT price_fening FROM product_variants WHERE product_id = ?',
  )

  // Isti popust koji je katalog prikazao. Akcija se cita iz baze u trenutku
  // upisa: ko je dodao tortu u korpu prije nego je akcija istekla, placa
  // redovnu cijenu - i obrnuto, akcija koja je u medjuvremenu pocela se priznaje.
  const promos = activePromotions()

  const resolved = []
  for (const item of o.items) {
    const row = variantStmt.get(item.variantId, item.productId)
    if (!row) {
      return res.status(400).json({
        error: 'Jedna od stavki u korpi više ne postoji. Osvježite stranicu i pokušajte ponovo.',
      })
    }
    if (!row.is_available) {
      return res.status(409).json({
        error: `"${row.name}" trenutno nije dostupna. Uklonite je iz korpe da nastavite.`,
        unavailableSlug: row.slug,
      })
    }

    const promo = promoForProduct(
      {
        id: row.product_id,
        category: row.category,
        variants: svePoProizvodu.all(row.product_id),
      },
      promos,
    )
    const unit = discountedPrice(row.price_fening, promo)

    resolved.push({
      product_id: row.product_id,
      slug: row.slug,
      name: row.name,
      variant_label: row.label,
      unit_price_fening: unit,
      qty: item.qty,
      line_total_fening: unit * item.qty,
      discount_fening: (row.price_fening - unit) * item.qty,
      promo_snapshot: unit < row.price_fening ? promoSnapshot(promo) : null,
    })
  }

  const subtotal = resolved.reduce((s, r) => s + r.line_total_fening, 0)
  const delivery =
    o.fulfillment === 'dostava' && subtotal < FREE_DELIVERY_OVER_FENING ? DELIVERY_FEE_FENING : 0
  const total = subtotal + delivery

  const insertOrder = db.prepare(`
    INSERT INTO orders
      (order_number, customer_name, phone, email, fulfillment, address, city,
       pickup_date, note, subtotal_fening, delivery_fening, total_fening, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'nova')
  `)
  const insertItem = db.prepare(`
    INSERT INTO order_items
      (order_id, product_id, slug_snapshot, name_snapshot, variant_label,
       unit_price_fening, qty, line_total_fening, discount_fening, promo_snapshot)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  // Jedna transakcija: narudzba bez stavki ne smije ostati u bazi.
  // nextOrderNumber() mora biti UNUTAR nje, inace dva istovremena
  // zahtjeva dobiju isti broj.
  db.exec('BEGIN IMMEDIATE')
  let orderNumber
  try {
    orderNumber = nextOrderNumber()
    insertOrder.run(
      orderNumber,
      o.customerName,
      o.phone,
      o.email,
      o.fulfillment,
      o.fulfillment === 'dostava' ? o.address : null,
      o.fulfillment === 'dostava' ? o.city : null,
      o.pickupDate,
      o.note,
      subtotal,
      delivery,
      total,
    )
    const { id: orderId } = db.prepare('SELECT last_insert_rowid() AS id').get()
    for (const r of resolved) {
      insertItem.run(
        orderId,
        r.product_id,
        r.slug,
        r.name,
        r.variant_label,
        r.unit_price_fening,
        r.qty,
        r.line_total_fening,
        r.discount_fening,
        r.promo_snapshot,
      )
    }
    db.exec('COMMIT')
  } catch (err) {
    db.exec('ROLLBACK')
    console.error('[orders] upis nije uspio:', err)
    return res.status(500).json({ error: 'Narudžba nije sačuvana. Pokušajte ponovo.' })
  }

  res.status(201).json({
    orderNumber,
    subtotalFening: subtotal,
    deliveryFening: delivery,
    totalFening: total,
  })
})

/** Javni pregled jedne narudzbe po broju - za "Hvala" stranicu nakon refresha. */
ordersRouter.get('/:orderNumber', (req, res) => {
  const order = db
    .prepare(
      `SELECT order_number, customer_name, fulfillment, address, city, pickup_date,
              subtotal_fening, delivery_fening, total_fening, status, created_at
         FROM orders WHERE order_number = ?`,
    )
    .get(req.params.orderNumber)
  if (!order) return res.status(404).json({ error: 'Narudžba nije pronađena.' })

  const items = db
    .prepare(
      `SELECT slug_snapshot, name_snapshot, variant_label, unit_price_fening, qty,
              line_total_fening, discount_fening, promo_snapshot
         FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = ?)`,
    )
    .all(req.params.orderNumber)

  res.json({ ...order, items })
})
