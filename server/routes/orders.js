import { Router } from 'express'
import { all, imaBazu, nextOrderNumber, one, tx } from '../db.js'
import { demoNijeDostupno } from '../demo.js'
import { fieldErrors, orderSchema } from '../schemas.js'
import { activePromotions, discountedPrice, promoForProduct, promoSnapshot } from '../pricing.js'

export const ordersRouter = Router()

/**
 * Cijena dostave. Drzi se na serveru, ne u klijentu - inace je svako moze
 * nulirati u devtoolsu. Mora ostati u skladu sa src/config/brand.ts.
 */
const DELIVERY_FEE_FENING = 500
const FREE_DELIVERY_OVER_FENING = 8000

ordersRouter.post('/', async (req, res, next) => {
  // Bez baze narudzba nema gdje da se upise. Tiho "hvala na narudzbi" bi
  // znacilo kupca koji ceka tortu koju niko nije primio.
  if (!imaBazu) return demoNijeDostupno(res)

  const parsed = orderSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Provjerite unesene podatke.', fields: fieldErrors(parsed.error) })
  }
  const o = parsed.data

  try {
    // --- Cijene se NE citaju iz zahtjeva. Svaka se ponovo dohvata iz baze. ---
    // Sve stavke korpe idu jednim upitom. Par (variantId, productId) se
    // uporedjuje nad raspakovanim nizovima, pa stavka cija varijanta pripada
    // drugom proizvodu i dalje ne prolazi.
    const redovi = await all(
      `SELECT v.id AS variant_id, v.label, v.price_fening,
              p.id AS product_id, p.slug, p.name, p.category, p.is_available
         FROM product_variants v
         JOIN products p ON p.id = v.product_id
         JOIN unnest($1::int[], $2::int[]) AS trazeno(variant_id, product_id)
           ON trazeno.variant_id = v.id AND trazeno.product_id = p.id`,
      [o.items.map((i) => i.variantId), o.items.map((i) => i.productId)],
    )
    const poVarijanti = new Map(redovi.map((r) => [r.variant_id, r]))

    /** Sve varijante zatrazenih proizvoda - akcija "proizvod" se bira po
     *  najnizoj cijeni, pa se odluka ne smije praviti samo iz varijante koja
     *  je u korpi. */
    const cijenePoProizvodu = new Map()
    for (const v of await all(
      'SELECT product_id, price_fening FROM product_variants WHERE product_id = ANY($1::int[])',
      [[...new Set(redovi.map((r) => r.product_id))]],
    )) {
      if (!cijenePoProizvodu.has(v.product_id)) cijenePoProizvodu.set(v.product_id, [])
      cijenePoProizvodu.get(v.product_id).push({ price_fening: v.price_fening })
    }

    // Isti popust koji je katalog prikazao. Akcija se cita iz baze u trenutku
    // upisa: ko je dodao tortu u korpu prije nego je akcija istekla, placa
    // redovnu cijenu - i obrnuto, akcija koja je u medjuvremenu pocela se priznaje.
    const promos = await activePromotions()

    const resolved = []
    for (const item of o.items) {
      const row = poVarijanti.get(item.variantId)
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
          variants: cijenePoProizvodu.get(row.product_id) ?? [],
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

    // Jedna transakcija: narudzba bez stavki ne smije ostati u bazi.
    // nextOrderNumber() mora biti UNUTAR nje - uzima advisory lock da dva
    // istovremena zahtjeva ne dobiju isti broj.
    const orderNumber = await tx(async (client) => {
      const broj = await nextOrderNumber(client)
      const { rows } = await client.query(
        `INSERT INTO orders
           (order_number, customer_name, phone, email, fulfillment, address, city,
            pickup_date, note, subtotal_fening, delivery_fening, total_fening, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'nova')
         RETURNING id`,
        [
          broj,
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
        ],
      )
      const orderId = rows[0].id

      const vrijednosti = []
      const params = []
      for (const r of resolved) {
        const b = params.length
        vrijednosti.push(
          `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5}, $${b + 6}, $${b + 7}, $${b + 8}, $${b + 9}, $${b + 10})`,
        )
        params.push(
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
      await client.query(
        `INSERT INTO order_items
           (order_id, product_id, slug_snapshot, name_snapshot, variant_label,
            unit_price_fening, qty, line_total_fening, discount_fening, promo_snapshot)
         VALUES ${vrijednosti.join(', ')}`,
        params,
      )
      return broj
    })

    res.status(201).json({
      orderNumber,
      subtotalFening: subtotal,
      deliveryFening: delivery,
      totalFening: total,
    })
  } catch (err) {
    console.error('[orders] upis nije uspio:', err)
    if (res.headersSent) return next(err)
    res.status(500).json({ error: 'Narudžba nije sačuvana. Pokušajte ponovo.' })
  }
})

/** Javni pregled jedne narudzbe po broju - za "Hvala" stranicu nakon refresha. */
ordersRouter.get('/:orderNumber', async (req, res, next) => {
  if (!imaBazu) return res.status(404).json({ error: 'Narudžba nije pronađena.' })
  try {
    const order = await one(
      `SELECT order_number, customer_name, fulfillment, address, city, pickup_date,
              subtotal_fening, delivery_fening, total_fening, status, created_at
         FROM orders WHERE order_number = $1`,
      [req.params.orderNumber],
    )
    if (!order) return res.status(404).json({ error: 'Narudžba nije pronađena.' })

    const items = await all(
      `SELECT slug_snapshot, name_snapshot, variant_label, unit_price_fening, qty,
              line_total_fening, discount_fening, promo_snapshot
         FROM order_items
        WHERE order_id = (SELECT id FROM orders WHERE order_number = $1)`,
      [req.params.orderNumber],
    )

    res.json({ ...order, items })
  } catch (err) {
    next(err)
  }
})
