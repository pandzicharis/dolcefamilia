export type Variant = {
  id: number
  label: string
  /** REDOVNA cijena. Kad akcija vazi, kupac je vidi precrtanu. */
  price_fening: number
  /** Cijena koja se stvarno naplacuje. Server racuna isto polje pri upisu
   *  narudzbe, pa se prikaz i racun ne mogu razici. */
  effective_price_fening: number
}

/** Akcija kako je vidi kupac. Formatiranje popusta je u lib/promo.ts. */
export type ProductPromo = {
  id: number
  title: string
  description: string
  kind: 'procenat' | 'iznos'
  value: number
  ends_on: string | null
}

export type Product = {
  id: number
  slug: string
  name: string
  category: string
  short_desc: string
  long_desc: string
  unit: string
  serves: string
  allergens: string
  image: string | null
  is_featured: boolean
  is_available: boolean
  sort_order: number
  variants: Variant[]
  promo: ProductPromo | null
  /** Najniza AKCIJSKA cijena - katalog je prikazuje kao "od X KM". */
  fromPriceFening: number
  /** Najniza redovna cijena. Jednaka gornjoj kad akcije nema. */
  fromRegularPriceFening: number
}

export type Category = {
  slug: string
  name: string
  count: number
}

export type CartItem = {
  /** `${productId}:${variantId}` */
  key: string
  productId: number
  variantId: number
  slug: string
  name: string
  /** Prava fotografija kad postoji; null -> CakeImage crta placeholder. */
  image: string | null
  variantLabel: string
  /** Cijena koja se placa - akcijska kad akcija vazi. */
  unitPriceFening: number
  /** Redovna cijena, samo za precrtavanje. null kad akcije nema. */
  regularPriceFening: number | null
  qty: number
}

export type OrderItemRow = {
  slug_snapshot: string
  name_snapshot: string
  variant_label: string
  unit_price_fening: number
  qty: number
  line_total_fening: number
  /** Ukupan popust na stavku. Starije narudzbe imaju 0. */
  discount_fening: number
  /** Npr. "Jesenja akcija (-15%)". null kad popusta nije bilo. */
  promo_snapshot: string | null
}

export type PublicOrder = {
  order_number: string
  customer_name: string
  fulfillment: 'dostava' | 'preuzimanje'
  address: string | null
  city: string | null
  pickup_date: string
  subtotal_fening: number
  delivery_fening: number
  total_fening: number
  status: string
  created_at: string
  items: OrderItemRow[]
}

export type AdminOrder = PublicOrder & {
  id: number
  phone: string
  email: string | null
  note: string | null
}

export type OrderPayload = {
  customerName: string
  phone: string
  email?: string
  fulfillment: 'dostava' | 'preuzimanje'
  address?: string
  city?: string
  pickupDate: string
  note?: string
  items: { productId: number; variantId: number; qty: number }[]
}

export type OrderResult = {
  orderNumber: string
  subtotalFening: number
  deliveryFening: number
  totalFening: number
}

// --- Admin -------------------------------------------------------------------

export type PromoKind = 'procenat' | 'iznos'
export type PromoScope = 'sve' | 'kategorija' | 'proizvod'

export type Promotion = {
  id: number
  title: string
  description: string
  kind: PromoKind
  value: number
  scope: PromoScope
  /** Slug kategorije ili id proizvoda kao tekst. null za cijelu ponudu. */
  target: string | null
  starts_on: string | null
  ends_on: string | null
  is_active: boolean
  created_at: string
  /** Citljiv naziv onoga na sta se akcija odnosi - gradi ga server. */
  target_label: string
}

export type PromotionInput = {
  title: string
  description: string
  kind: PromoKind
  value: number
  scope: PromoScope
  target: string | null
  starts_on: string | null
  ends_on: string | null
  is_active: boolean
}

export type ProductInput = {
  name: string
  slug: string
  category: string
  short_desc: string
  long_desc: string
  allergens: string
  image: string | null
  is_featured: boolean
  is_available: boolean
  variants: { id?: number; label: string; price_fening: number }[]
}

export type AdminImage = {
  path: string
  source: 'projekt' | 'ucitano'
}

export type PickupDan = {
  pickup_date: string
  n: number
  total: number
  items: { name_snapshot: string; variant_label: string; qty: number }[]
}

export type AdminSummary = {
  danas: { n: number; total: number }
  sedmica: { n: number; total: number }
  mjesec: { n: number; total: number }
  popustMjesec: number
  statusi: Record<string, number>
  pickup: PickupDan[]
  topProizvodi: { name_snapshot: string; qty: number; total: number }[]
  brojProizvoda: number
  brojAkcija: number
}
