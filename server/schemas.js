import { z } from 'zod'

const trimmed = (min, max, msg) =>
  z.string().trim().min(min, msg).max(max, `Najviše ${max} znakova.`)

/**
 * Klijent salje SAMO identifikatore i kolicine. Nijedna cijena iz ovog
 * objekta se ne koristi - server ih ponovo cita iz baze (vidi routes/orders.js).
 */
export const orderItemSchema = z.object({
  productId: z.number().int().positive(),
  variantId: z.number().int().positive(),
  qty: z.number().int().min(1, 'Količina mora biti najmanje 1.').max(50, 'Najviše 50 po stavci.'),
})

export const orderSchema = z
  .object({
    customerName: trimmed(2, 80, 'Unesite ime i prezime.'),
    phone: trimmed(6, 30, 'Unesite broj telefona.')
      .regex(/^[+0-9\s()/-]+$/, 'Broj telefona smije sadržavati samo cifre i znakove + ( ) / -'),
    email: z
      .union([z.string().trim().email('Unesite ispravnu e-mail adresu.'), z.literal('')])
      .optional()
      .transform((v) => (v ? v : null)),
    fulfillment: z.enum(['dostava', 'preuzimanje'], {
      message: 'Odaberite način preuzimanja.',
    }),
    address: z.string().trim().max(160).optional().transform((v) => v || null),
    city: z.string().trim().max(80).optional().transform((v) => v || null),
    pickupDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Odaberite datum.'),
    note: z.string().trim().max(600, 'Napomena može imati najviše 600 znakova.').optional()
      .transform((v) => v || null),
    items: z.array(orderItemSchema).min(1, 'Korpa je prazna.').max(40, 'Previše stavki u korpi.'),
  })
  .superRefine((data, ctx) => {
    if (data.fulfillment === 'dostava') {
      if (!data.address) {
        ctx.addIssue({ code: 'custom', path: ['address'], message: 'Unesite adresu za dostavu.' })
      }
      if (!data.city) {
        ctx.addIssue({ code: 'custom', path: ['city'], message: 'Odaberite grad.' })
      }
    }
  })

export const statusSchema = z.object({
  status: z.enum(['nova', 'potvrdjena', 'upripremi', 'spremna', 'zavrsena', 'otkazana'], {
    message: 'Nepoznat status.',
  }),
})

/** Pretvara zod gresku u { polje: poruka } koji forma moze prikazati ispod inputa. */
export function fieldErrors(error) {
  const out = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_'
    if (!out[key]) out[key] = issue.message
  }
  return out
}

// --- Admin: proizvodi i akcije ------------------------------------------------

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Polje koje admin forma salje kao tekst, prazan string ILI null (prazan
 * select, prazan datum). Prazno u svakom obliku izlazi kao null, da baza ne
 * dobije '' tamo gdje znaci "nije postavljeno".
 *
 * `.optional()` sam nije dovoljan: JSON null nije undefined i zod ga odbija.
 */
const prazno = (schema) =>
  z
    .union([schema, z.literal(''), z.null()])
    .optional()
    .transform((v) => (v ? v : null))

const variantInputSchema = z.object({
  /** Postojeca varijanta nosi id, nova ga nema. Cijene postojecih se mijenjaju
   *  na mjestu, da korpe kupaca koje drze variantId ne ispadnu nevalidne. */
  id: z.number().int().positive().optional(),
  label: trimmed(2, 60, 'Unesite naziv veličine.'),
  price_fening: z
    .number()
    .int('Cijena mora biti cijeli broj feninga.')
    .min(100, 'Cijena mora biti najmanje 1,00 KM.')
    .max(2_000_000, 'Cijena može biti najviše 20.000,00 KM.'),
})

export const productSchema = z.object({
  name: trimmed(2, 80, 'Unesite naziv proizvoda.'),
  slug: z
    .string()
    .trim()
    .min(2, 'Unesite URL oznaku.')
    .max(60, 'Najviše 60 znakova.')
    .regex(SLUG_RE, 'URL oznaka smije imati samo mala slova, cifre i crticu.'),
  category: trimmed(1, 40, 'Odaberite kategoriju.'),
  short_desc: z.string().trim().max(160, 'Najviše 160 znakova.').default(''),
  long_desc: z.string().trim().max(1600, 'Najviše 1600 znakova.').default(''),
  allergens: z.string().trim().max(200, 'Najviše 200 znakova.').default(''),
  image: prazno(z.string().trim().max(300, 'Putanja je predugačka.')),
  is_featured: z.boolean().default(false),
  is_available: z.boolean().default(true),
  sort_order: z.number().int().min(0).max(999).optional(),
  variants: z
    .array(variantInputSchema)
    .min(1, 'Proizvod treba najmanje jednu veličinu.')
    .max(6, 'Najviše šest veličina.'),
})

export const promotionSchema = z
  .object({
    title: trimmed(2, 80, 'Unesite naziv akcije.'),
    description: z.string().trim().max(200, 'Najviše 200 znakova.').default(''),
    kind: z.enum(['procenat', 'iznos'], { message: 'Odaberite vrstu popusta.' }),
    value: z.number().int('Vrijednost mora biti cijeli broj.').positive('Unesite vrijednost popusta.'),
    scope: z.enum(['sve', 'kategorija', 'proizvod'], { message: 'Odaberite na šta se akcija odnosi.' }),
    target: prazno(z.string().trim().max(60)),
    starts_on: prazno(z.string().trim().regex(DATE_RE, 'Neispravan datum.')),
    ends_on: prazno(z.string().trim().regex(DATE_RE, 'Neispravan datum.')),
    is_active: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.kind === 'procenat' && data.value > 90) {
      ctx.addIssue({ code: 'custom', path: ['value'], message: 'Procenat može biti najviše 90.' })
    }
    if (data.kind === 'iznos' && data.value > 500_000) {
      ctx.addIssue({ code: 'custom', path: ['value'], message: 'Iznos može biti najviše 5.000,00 KM.' })
    }
    if (data.scope !== 'sve' && !data.target) {
      ctx.addIssue({
        code: 'custom',
        path: ['target'],
        message: data.scope === 'kategorija' ? 'Odaberite kategoriju.' : 'Odaberite proizvod.',
      })
    }
    if (data.starts_on && data.ends_on && data.ends_on < data.starts_on) {
      ctx.addIssue({ code: 'custom', path: ['ends_on'], message: 'Kraj ne može biti prije početka.' })
    }
  })
