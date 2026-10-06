import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { api } from '../lib/api'
import { brand } from '../config/brand'
import { cijena, naAkciji } from '../lib/promo'
import type { CartItem, Product, Variant } from '../types'

const STORAGE_KEY = 'la-familia:cart:v1'

type State = { items: CartItem[] }

type Action =
  | { type: 'add'; item: CartItem }
  | { type: 'setQty'; key: string; qty: number }
  | { type: 'remove'; key: string }
  | { type: 'clear' }
  | { type: 'replace'; items: CartItem[] }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'add': {
      const existing = state.items.find((i) => i.key === action.item.key)
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.key === action.item.key ? { ...i, qty: Math.min(i.qty + action.item.qty, 50) } : i,
          ),
        }
      }
      return { items: [...state.items, action.item] }
    }
    case 'setQty':
      return {
        items: state.items.map((i) =>
          i.key === action.key ? { ...i, qty: Math.min(Math.max(action.qty, 1), 50) } : i,
        ),
      }
    case 'remove':
      return { items: state.items.filter((i) => i.key !== action.key) }
    case 'clear':
      return { items: [] }
    case 'replace':
      return { items: action.items }
  }
}

/** localStorage baca u privatnom prozoru i kad su kolacici blokirani. */
function readStored(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (i) =>
          i && typeof i.key === 'string' && typeof i.productId === 'number' && typeof i.qty === 'number',
      )
      // Korpe snimljene prije nego su `image` i akcije dodani nemaju ta polja.
      .map((i): CartItem => ({
        ...i,
        image: i.image ?? null,
        regularPriceFening: i.regularPriceFening ?? null,
      }))
  } catch {
    return []
  }
}

type CartContextValue = {
  items: CartItem[]
  count: number
  subtotalFening: number
  deliveryFening: (fulfillment: 'dostava' | 'preuzimanje') => number
  totalFening: (fulfillment: 'dostava' | 'preuzimanje') => number
  add: (product: Product, variant: Variant, qty?: number) => void
  setQty: (key: string, qty: number) => void
  remove: (key: string) => void
  clear: () => void
  isOpen: boolean
  open: () => void
  close: () => void
  /** Postavljen kad validacija izbaci stavke koje vise ne postoje. */
  notice: string | null
  dismissNotice: () => void
  /** Raste na svaki `add` - CartBadge ga koristi kao okidac za bump. */
  pulse: number
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => ({ items: readStored() }))
  const [isOpen, setOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [pulse, setPulse] = useState(0)
  const validated = useRef(false)

  // Perzistencija
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items))
    } catch {
      /* privatni prozor - korpa radi, samo ne prezivi refresh */
    }
  }, [state.items])

  /** Uvijek drzi najsvjezije stavke, da efekt ispod ne mora ovisiti o njima. */
  const itemsRef = useRef(state.items)
  useEffect(() => {
    itemsRef.current = state.items
  }, [state.items])

  /**
   * Validacija protiv svjezeg kataloga. Cijene i dostupnost su se mogli
   * promijeniti otkad je korisnik zadnji put bio — bez ovoga bi vidio staru
   * cijenu u korpi a drugu na racunu.
   *
   * `validated` se u cleanupu VRACA na false. Bez toga se u StrictMode-u
   * validacija nikad ne izvrsi: prvi prolaz postavi guard i krene fetch,
   * cleanup ga otkaze, a drugi prolaz izadje na guardu — pa stara stavka
   * ostane u korpi sa pogresnim imenom i cijenom.
   */
  useEffect(() => {
    if (validated.current) return
    validated.current = true

    const items = itemsRef.current
    if (items.length === 0) return

    let cancelled = false
    api
      .products()
      .then((products) => {
        if (cancelled) return
        const byVariant = new Map<number, { p: Product; v: Variant }>()
        for (const p of products) {
          for (const v of p.variants) byVariant.set(v.id, { p, v })
        }

        let dropped = 0
        let repriced = 0
        const next: CartItem[] = []
        for (const item of items) {
          const match = byVariant.get(item.variantId)
          if (!match || !match.p.is_available || match.p.id !== item.productId) {
            dropped++
            continue
          }
          // Poredi se AKCIJSKA cijena: akcija koja je pocela ili istekla
          // otkad je kupac zadnji put bio je isto "cijena se promijenila".
          if (cijena(match.v) !== item.unitPriceFening || match.p.name !== item.name) {
            repriced++
          }
          next.push({
            ...item,
            name: match.p.name,
            slug: match.p.slug,
            image: match.p.image,
            variantLabel: match.v.label,
            unitPriceFening: cijena(match.v),
            regularPriceFening: naAkciji(match.v) ? match.v.price_fening : null,
          })
        }

        if (dropped || repriced) {
          dispatch({ type: 'replace', items: next })
          const parts = []
          if (dropped) parts.push(`${dropped} stavka više nije dostupna i uklonjena je`)
          if (repriced) parts.push(`${repriced} stavka je ažurirana`)
          setNotice(`Korpa je osvježena: ${parts.join(', ')}.`)
        }
      })
      .catch(() => {
        /* offline — radimo sa snimljenom korpom, server ionako racuna ponovo */
      })

    return () => {
      cancelled = true
      validated.current = false
    }
  }, [])

  const add = useCallback((product: Product, variant: Variant, qty = 1) => {
    dispatch({
      type: 'add',
      item: {
        key: `${product.id}:${variant.id}`,
        productId: product.id,
        variantId: variant.id,
        slug: product.slug,
        name: product.name,
        image: product.image,
        variantLabel: variant.label,
        unitPriceFening: cijena(variant),
        regularPriceFening: naAkciji(variant) ? variant.price_fening : null,
        qty,
      },
    })
    setPulse((p) => p + 1)
  }, [])

  const setQty = useCallback(
    (key: string, qty: number) => dispatch({ type: 'setQty', key, qty }),
    [],
  )
  const remove = useCallback((key: string) => dispatch({ type: 'remove', key }), [])
  const clear = useCallback(() => dispatch({ type: 'clear' }), [])
  const open = useCallback(() => setOpen(true), [])
  const close = useCallback(() => setOpen(false), [])
  const dismissNotice = useCallback(() => setNotice(null), [])

  const subtotalFening = useMemo(
    () => state.items.reduce((s, i) => s + i.unitPriceFening * i.qty, 0),
    [state.items],
  )
  const count = useMemo(() => state.items.reduce((s, i) => s + i.qty, 0), [state.items])

  // Mora ostati u skladu sa server/routes/orders.js - server ima zadnju rijec.
  const deliveryFening = useCallback(
    (fulfillment: 'dostava' | 'preuzimanje') =>
      fulfillment === 'dostava' && subtotalFening < brand.freeDeliveryOverFening
        ? brand.deliveryFeeFening
        : 0,
    [subtotalFening],
  )

  const totalFening = useCallback(
    (f: 'dostava' | 'preuzimanje') => subtotalFening + deliveryFening(f),
    [subtotalFening, deliveryFening],
  )

  /**
   * Memoizovano namjerno: bez ovoga je `cart` novi objekat na svaki render,
   * pa svaki useEffect koji zavisi od njega (npr. zakljucavanje scrolla u
   * CartDrawer-u) odradi cleanup i ponovni setup na svaki render.
   */
  const value = useMemo<CartContextValue>(
    () => ({
      items: state.items,
      count,
      subtotalFening,
      deliveryFening,
      totalFening,
      add,
      setQty,
      remove,
      clear,
      isOpen,
      open,
      close,
      notice,
      dismissNotice,
      pulse,
    }),
    [
      state.items, count, subtotalFening, deliveryFening, totalFening,
      add, setQty, remove, clear, isOpen, open, close, notice, dismissNotice, pulse,
    ],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart mora biti unutar <CartProvider>')
  return ctx
}
