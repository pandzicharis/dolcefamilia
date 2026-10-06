import { db } from './db.js'

export const PROMO_KINDS = ['procenat', 'iznos']
export const PROMO_SCOPES = ['sve', 'kategorija', 'proizvod']

/** Cijena nikad ne pada ispod 1 KM, koliko god akcija bila velika. */
const MIN_CIJENA_FENING = 100

/** Danas u LOKALNOJ zoni kao YYYY-MM-DD. new Date().toISOString() bi dao UTC
 *  dan, pa bi akcija koja pocinje danas u 01:00 po lokalnom bila jos neaktivna. */
export function danas() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const selectPromo = `
  SELECT id, title, description, kind, value, scope, target,
         starts_on, ends_on, is_active, created_at
    FROM promotions
`

/** Sve akcije koje danas vaze. Jedan upit za cijeli katalog. */
export function activePromotions(dan = danas()) {
  return db
    .prepare(
      `${selectPromo}
        WHERE is_active = 1
          AND (starts_on IS NULL OR starts_on <= ?)
          AND (ends_on   IS NULL OR ends_on   >= ?)`,
    )
    .all(dan, dan)
}

export function allPromotions() {
  return db.prepare(`${selectPromo} ORDER BY is_active DESC, id DESC`).all()
}

export function promotionById(id) {
  return db.prepare(`${selectPromo} WHERE id = ?`).get(id)
}

/** Snizena cijena jedne varijante. Zaokruzuje se na fening, nikad na float. */
export function discountedPrice(priceFening, promo) {
  if (!promo) return priceFening
  const snizeno =
    promo.kind === 'procenat'
      ? Math.round((priceFening * (100 - promo.value)) / 100)
      : priceFening - promo.value
  return Math.max(snizeno, MIN_CIJENA_FENING)
}

const SPECIFICNOST = { proizvod: 3, kategorija: 2, sve: 1 }

function vazi(promo, product) {
  if (promo.scope === 'sve') return true
  if (promo.scope === 'kategorija') return promo.target === product.category
  if (promo.scope === 'proizvod') return Number(promo.target) === Number(product.id)
  return false
}

/**
 * Akcija koja vazi za proizvod. Kad se vise njih poklopi, NE sabiraju se:
 * pobjedjuje najuza (proizvod > kategorija > sve), a u istom nivou ona koja
 * kupcu da nizu cijenu. Sabiranje popusta je najlaksi nacin da torta od 70 KM
 * ispadne 12 KM zato sto su dvije akcije slucajno ostale aktivne.
 */
export function promoForProduct(product, promos) {
  const kandidati = promos.filter((p) => vazi(p, product))
  if (kandidati.length === 0) return null

  const referenca = product.variants?.length
    ? Math.min(...product.variants.map((v) => v.price_fening))
    : 10000

  return kandidati.reduce((najbolja, p) => {
    const a = SPECIFICNOST[p.scope] ?? 0
    const b = SPECIFICNOST[najbolja.scope] ?? 0
    if (a !== b) return a > b ? p : najbolja
    return discountedPrice(referenca, p) < discountedPrice(referenca, najbolja) ? p : najbolja
  })
}

/** Ono sto klijent vidi o akciji. Formatiranje (−15%, −5,00 KM) je na klijentu. */
export function promoPublic(promo) {
  if (!promo) return null
  return {
    id: promo.id,
    title: promo.title,
    description: promo.description,
    kind: promo.kind,
    value: promo.value,
    ends_on: promo.ends_on,
  }
}

/** Feninzi u "8,00" bez float matematike. Klijent ima lib/format.ts; ovo je
 *  jedino mjesto na serveru gdje cijena postaje tekst. */
function km(fening) {
  return `${Math.floor(fening / 100)},${String(fening % 100).padStart(2, '0')}`
}

/** Tekstualni snapshot akcije za order_items — da se za pola godine zna ZASTO
 *  je cijena bila niza, i kad akcija u medjuvremenu bude obrisana. */
export function promoSnapshot(promo) {
  if (!promo) return null
  const popust = promo.kind === 'procenat' ? `-${promo.value}%` : `-${km(promo.value)} KM`
  return `${promo.title} (${popust})`
}
