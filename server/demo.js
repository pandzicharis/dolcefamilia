import { PRODUCTS } from './seed.js'

/**
 * Katalog bez baze.
 *
 * Kad DATABASE_URL nije postavljen, API servira OVO umjesto Postgresa, u
 * potpuno istom obliku u kojem bi stigao iz baze - sa `variants`,
 * `effective_price_fening`, `fromPriceFening` i `promo: null`. Klijent ne zna
 * razliku i ne treba mu nijedna izmjena.
 *
 * Zasto postoji: svjez deploy radi i izgleda ispravno prije nego iko napravi
 * bazu. Katalog je ionako statican sadrzaj - mijenja se kroz admin, a admin u
 * ovom rezimu ionako ne radi.
 *
 * Id-evi su izvedeni iz redoslijeda i poklapaju se sa onim sto bi baza dala
 * nakon seeda (IDENTITY krece od 1), pa korpa spremljena u demo rezimu ostaje
 * ispravna i nakon prelaska na pravu bazu.
 */
let sljedeciVariantId = 0

export const DEMO_KATALOG = PRODUCTS.map((p, i) => {
  const variants = p.variants.map((v) => ({
    id: ++sljedeciVariantId,
    label: v.label,
    price_fening: v.price_fening,
    // Bez baze nema akcija, pa je akcijska cijena jednaka redovnoj.
    effective_price_fening: v.price_fening,
  }))
  const najniza = Math.min(...variants.map((v) => v.price_fening))

  return {
    id: i + 1,
    slug: p.slug,
    name: p.name,
    category: p.category,
    short_desc: p.short_desc,
    long_desc: p.long_desc,
    unit: p.unit ?? 'kom',
    serves: p.serves ?? '',
    allergens: p.allergens ?? '',
    image: p.image ?? null,
    is_featured: Boolean(p.is_featured),
    is_available: p.is_available ?? true,
    sort_order: i,
    variants,
    promo: null,
    fromPriceFening: najniza,
    fromRegularPriceFening: najniza,
  }
})

export function demoProizvodi({ category, featured } = {}) {
  return DEMO_KATALOG.filter(
    (p) => (!category || p.category === category) && (!featured || p.is_featured),
  )
}

export function demoBrojPoKategoriji() {
  const brojaci = {}
  for (const p of DEMO_KATALOG) {
    if (p.is_available) brojaci[p.category] = (brojaci[p.category] ?? 0) + 1
  }
  return brojaci
}

/** Jedinstven odgovor za sve sto u demo rezimu ne moze raditi. */
export function demoNijeDostupno(res) {
  return res.status(503).json({
    error: 'Baza nije povezana, pa se ovo trenutno ne može sačuvati. Pozovite nas telefonom.',
  })
}
