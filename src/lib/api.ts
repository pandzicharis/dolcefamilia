import { KATALOG, KATEGORIJE } from '../data/katalog'
import type {
  AdminImage,
  AdminOrder,
  AdminSummary,
  OrderPayload,
  OrderResult,
  Product,
  ProductInput,
  Promotion,
  PromotionInput,
  PublicOrder,
} from '../types'

/** Greska sa API-ja koja nosi i greske po polju, da ih forma moze razvrstati. */
export class ApiError extends Error {
  status: number
  fields?: Record<string, string>
  unavailableSlug?: string

  constructor(message: string, status: number, extra?: Record<string, unknown>) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fields = extra?.fields as Record<string, string> | undefined
    this.unavailableSlug = extra?.unavailableSlug as string | undefined
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`/api${path}`, {
      ...init,
      headers: {
        ...(init?.body && typeof init.body === 'string' ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    })
  } catch {
    throw new ApiError('Nema veze sa serverom. Provjerite internet konekciju.', 0)
  }

  const isJson = res.headers.get('content-type')?.includes('application/json')
  const body = isJson ? await res.json().catch(() => null) : null

  if (!res.ok) {
    throw new ApiError(body?.error ?? `Greška ${res.status}.`, res.status, body ?? undefined)
  }
  return body as T
}

/** Admin zahtjevi nose isti token u svakom pozivu - vidi server/routes/admin.js. */
const auth = (token: string) => ({ Authorization: `Bearer ${token}` })

export const api = {
  /**
   * Ponuda se čita iz builda (`src/data/katalog.ts`), ne sa servera.
   *
   * Katalog je statičan sadržaj koji se mijenja par puta godišnje, pa nema
   * razloga da prvi ekran čeka mrežni zahtjev — ni da ponuda nestane kad API
   * ne odgovori. Filtriranje je isto ono koje je radio `/api/products`.
   *
   * Narudžbe i admin i dalje idu na server; samo čitanje kataloga ne.
   */
  products: async (params?: { category?: string; featured?: boolean }) =>
    KATALOG.filter(
      (p) =>
        (!params?.category || p.category === params.category) &&
        (!params?.featured || p.is_featured),
    ),

  categories: async () => KATEGORIJE,

  product: async (slug: string) => {
    const p = KATALOG.find((x) => x.slug === slug)
    if (!p) throw new ApiError('Proizvod nije pronađen.', 404)
    return p
  },

  createOrder: (payload: OrderPayload) =>
    request<OrderResult>('/orders', { method: 'POST', body: JSON.stringify(payload) }),
  order: (orderNumber: string) =>
    request<PublicOrder>(`/orders/${encodeURIComponent(orderNumber)}`),

  adminCheck: (token: string) => request<{ ok: true }>('/admin/check', { headers: auth(token) }),

  adminSummary: (token: string) => request<AdminSummary>('/admin/summary', { headers: auth(token) }),

  adminOrders: (token: string, filter?: { status?: string; q?: string; pickup?: string }) => {
    const q = new URLSearchParams()
    if (filter?.status) q.set('status', filter.status)
    if (filter?.q) q.set('q', filter.q)
    if (filter?.pickup) q.set('pickup', filter.pickup)
    const qs = q.toString()
    return request<AdminOrder[]>(`/admin/orders${qs ? `?${qs}` : ''}`, { headers: auth(token) })
  },
  adminSetStatus: (token: string, id: number, status: string) =>
    request<{ ok: true }>(`/admin/orders/${id}`, {
      method: 'PATCH',
      headers: auth(token),
      body: JSON.stringify({ status }),
    }),

  adminProducts: (token: string) => request<Product[]>('/admin/products', { headers: auth(token) }),
  adminCreateProduct: (token: string, input: ProductInput) =>
    request<Product>('/admin/products', {
      method: 'POST',
      headers: auth(token),
      body: JSON.stringify(input),
    }),
  adminUpdateProduct: (token: string, id: number, input: ProductInput) =>
    request<Product>(`/admin/products/${id}`, {
      method: 'PUT',
      headers: auth(token),
      body: JSON.stringify(input),
    }),
  adminProductFlags: (
    token: string,
    id: number,
    flags: { is_available?: boolean; is_featured?: boolean },
  ) =>
    request<Product>(`/admin/products/${id}`, {
      method: 'PATCH',
      headers: auth(token),
      body: JSON.stringify(flags),
    }),
  adminDeleteProduct: (token: string, id: number) =>
    request<{ ok: true }>(`/admin/products/${id}`, { method: 'DELETE', headers: auth(token) }),

  adminPromotions: (token: string) => request<Promotion[]>('/admin/promotions', { headers: auth(token) }),
  adminCreatePromotion: (token: string, input: PromotionInput) =>
    request<Promotion>('/admin/promotions', {
      method: 'POST',
      headers: auth(token),
      body: JSON.stringify(input),
    }),
  adminUpdatePromotion: (token: string, id: number, input: PromotionInput) =>
    request<Promotion>(`/admin/promotions/${id}`, {
      method: 'PUT',
      headers: auth(token),
      body: JSON.stringify(input),
    }),
  adminTogglePromotion: (token: string, id: number, is_active: boolean) =>
    request<Promotion>(`/admin/promotions/${id}`, {
      method: 'PATCH',
      headers: auth(token),
      body: JSON.stringify({ is_active }),
    }),
  adminDeletePromotion: (token: string, id: number) =>
    request<{ ok: true }>(`/admin/promotions/${id}`, { method: 'DELETE', headers: auth(token) }),

  adminImages: (token: string) => request<AdminImage[]>('/admin/images', { headers: auth(token) }),

  /**
   * Slika se salje kao sirovi bajtovi, ne multipart - server je tako i cita.
   * Content-Type MORA biti tip slike, jer express.raw po njemu odlucuje
   * hoce li tijelo uopste procitati.
   */
  adminUploadImage: (token: string, file: File, name: string) =>
    request<{ path: string }>(`/admin/uploads?name=${encodeURIComponent(name)}`, {
      method: 'POST',
      headers: { ...auth(token), 'Content-Type': file.type },
      body: file,
    }),
}
