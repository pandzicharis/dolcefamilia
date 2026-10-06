import type { ProductPromo, Promotion, Variant } from '../types'
import { formatKM, formatKMFull } from './format'

/** Ima li varijanta akcijsku cijenu. */
export function naAkciji(v: Variant): boolean {
  return v.effective_price_fening < v.price_fening
}

/** Cijena koja se naplacuje. Postoji kao funkcija da se nigdje u UI-u ne
 *  potkrade `price_fening` tamo gdje treba akcijska cijena. */
export function cijena(v: Variant): number {
  return v.effective_price_fening ?? v.price_fening
}

/** Kratka oznaka popusta za badz: "−15%" ili "−5,00 KM". */
export function popustOznaka(promo: Pick<ProductPromo, 'kind' | 'value'>): string {
  // Minus je U+2212, ne hyphen - u Fraunces-u hyphen na ovoj velicini izgleda
  // kao crtica za prelamanje rijeci.
  return promo.kind === 'procenat' ? `−${promo.value}%` : `−${formatKMFull(promo.value)}`
}

/** Isto, ali za admin listu gdje stoji uz naziv akcije. */
export function popustTekst(promo: Pick<Promotion, 'kind' | 'value'>): string {
  return promo.kind === 'procenat' ? `${promo.value}%` : `${formatKM(promo.value)} KM`
}

/** Trajanje akcije kao jedna linija: "do 12.10.2026." / "12.10. – 20.10.2026." */
export function trajanje(promo: Pick<Promotion, 'starts_on' | 'ends_on'>): string {
  const kratko = (iso: string) => {
    const [g, m, d] = iso.split('-')
    return `${d}.${m}.${g}.`
  }
  if (promo.starts_on && promo.ends_on) return `${kratko(promo.starts_on)} – ${kratko(promo.ends_on)}`
  if (promo.ends_on) return `do ${kratko(promo.ends_on)}`
  if (promo.starts_on) return `od ${kratko(promo.starts_on)}`
  return 'bez roka'
}

/**
 * Je li akcija danas na snazi. Server ovo racuna isto (pricing.js), ali admin
 * lista mora moci prikazati i akciju koja je aktivna a jos nije pocela.
 */
export function uToku(promo: Pick<Promotion, 'is_active' | 'starts_on' | 'ends_on'>): boolean {
  if (!promo.is_active) return false
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const danas = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  if (promo.starts_on && promo.starts_on > danas) return false
  if (promo.ends_on && promo.ends_on < danas) return false
  return true
}
