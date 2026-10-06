import { all, one, ZONA } from './db.js'

export const PROMO_KINDS = ['procenat', 'iznos']
export const PROMO_SCOPES = ['sve', 'kategorija', 'proizvod']

/** Cijena nikad ne pada ispod 1 KM, koliko god akcija bila velika. */
const MIN_CIJENA_FENING = 100

/**
 * Danas u zoni RADNJE kao YYYY-MM-DD.
 *
 * Ne `new Date().toISOString()` (to je UTC dan, pa bi akcija koja pocinje
 * danas u 01:00 po sarajevskom bila jos neaktivna) i ne lokalna zona procesa
 * (na Vercelu je to UTC, dakle ista greska). Zona je eksplicitna - vidi ZONA.
 *
 * en-CA je ovdje jedini locale koji treba: njegov kratki format JESTE
 * YYYY-MM-DD. bs-BA se ne koristi nigdje na serveru jer su mu CLDR podaci
 * prazni (vidi src/lib/format.ts).
 */
const ISO_DAN = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export function danas() {
  return ISO_DAN.format(new Date())
}

/**
 * Datum od prije `n` dana, u istoj zoni i istom obliku kao danas().
 *
 * Racuna se od PODNEVA UTC, ne od trenutnog vremena: oduzimanje 24h od
 * ponoci u sedmici kad se mijenja racunanje vremena promasi dan za jedan.
 * Podne je dovoljno daleko od obje granice da pomak od sat vremena ne smeta.
 */
export function danPrije(n) {
  const [g, m, d] = danas().split('-').map(Number)
  const x = new Date(Date.UTC(g, m - 1, d, 12) - n * 86_400_000)
  const pad = (v) => String(v).padStart(2, '0')
  return `${x.getUTCFullYear()}-${pad(x.getUTCMonth() + 1)}-${pad(x.getUTCDate())}`
}

const selectPromo = `
  SELECT id, title, description, kind, value, scope, target,
         starts_on, ends_on, is_active, created_at
    FROM promotions
`

/** Sve akcije koje danas vaze. Jedan upit za cijeli katalog. */
export function activePromotions(dan = danas()) {
  return all(
    `${selectPromo}
      WHERE is_active = TRUE
        AND (starts_on IS NULL OR starts_on <= $1)
        AND (ends_on   IS NULL OR ends_on   >= $1)`,
    [dan],
  )
}

export function allPromotions() {
  return all(`${selectPromo} ORDER BY is_active DESC, id DESC`)
}

export function promotionById(id) {
  return one(`${selectPromo} WHERE id = $1`, [id])
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
