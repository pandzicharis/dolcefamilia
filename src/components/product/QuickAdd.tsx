import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import type { Product, Variant } from '../../types'
import { useCart } from '../../context/CartContext'
import { formatKMFull } from '../../lib/format'
import { cijena, naAkciji } from '../../lib/promo'
import { AkcijaBadge, StaraCijena } from './AkcijaBadge'
import { EASE } from '../../motion/tokens'
import { cn } from '../../lib/cn'
import { CakeImage } from '../CakeImage'
import { Button } from '../ui/Button'
import { GoldRule, Price } from '../ui/Bits'
import { QtyStepper } from '../cart/QtyStepper'

/**
 * Izbor velicine prije dodavanja u korpu.
 *
 * Ranije je dugme na kartici tiho dodavalo najjeftiniju varijantu, pa je kupac
 * koji je htio veliku tortu dobijao malu a da to nigdje nije vidio. Sad se
 * velicina bira ovdje, i korpa se otvara odmah nakon dodavanja da potvrda bude
 * vidljiva.
 */
export function QuickAdd({
  product,
  open,
  onClose,
}: {
  product: Product | null
  open: boolean
  onClose: () => void
}) {
  const cart = useCart()
  const reduce = useReducedMotion()
  const [variant, setVariant] = useState<Variant | null>(null)
  const [qty, setQty] = useState(1)

  // Svako otvaranje krece od cistog stanja: srednja velicina je najcesci izbor
  // i stoji u sredini, pa je razumna pretpostavka.
  useEffect(() => {
    if (!open || !product) return
    setVariant(product.variants[1] ?? product.variants[0] ?? null)
    setQty(1)
  }, [open, product])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  function dodaj() {
    if (!product || !variant) return
    cart.add(product, variant, qty)
    onClose()
    cart.open()
  }

  return (
    <AnimatePresence>
      {open && product && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24, ease: 'linear' }}
            onClick={onClose}
            className="absolute inset-0 bg-[rgb(33_26_20_/_0.42)]"
            aria-hidden="true"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`Odaberite veličinu — ${product.name}`}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={
              reduce
                ? { opacity: 0 }
                : { opacity: 0, y: 16, scale: 0.98, transition: { duration: 0.2, ease: EASE.exit } }
            }
            transition={{ duration: 0.34, ease: EASE.silk }}
            className="relative w-full max-w-[460px] rounded-t-2xl bg-surface p-5 shadow-xl sm:rounded-2xl sm:p-6"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Zatvori"
              className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-lg text-muted transition-colors duration-150 ease-crisp hover:bg-cocoa-700/[0.06] hover:text-cocoa-700"
            >
              <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden="true">
                <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>

            <div className="flex gap-4 pr-10">
              <CakeImage
                seed={product.slug}
                src={product.image}
                alt={product.name}
                reveal={false}
                className="w-20 shrink-0 rounded-xl shadow-sm"
              />
              <div className="min-w-0">
                {product.promo && <AkcijaBadge promo={product.promo} className="mb-1.5" />}
                <h2 className="font-display text-[20px] leading-tight text-heading">{product.name}</h2>
                <p className="t-small mt-1 line-clamp-2 text-muted">{product.short_desc}</p>
              </div>
            </div>

            <GoldRule className="my-5" />

            <fieldset>
              <legend className="t-eyebrow mb-3">Veličina</legend>
              <div className="space-y-2">
                {product.variants.map((v) => {
                  const active = variant?.id === v.id
                  const [ime, detalj] = v.label.split(' · ')
                  return (
                    <label
                      key={v.id}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-md border px-4 py-3',
                        'transition-colors duration-150 ease-crisp',
                        active
                          ? 'border-accent bg-cocoa-50'
                          : 'border-control bg-surface hover:bg-cocoa-50',
                      )}
                    >
                      <input
                        type="radio"
                        name="quick-variant"
                        value={v.id}
                        checked={active}
                        onChange={() => setVariant(v)}
                        className="h-4 w-4 shrink-0 accent-[rgb(var(--accent))]"
                      />
                      <span className="min-w-0 flex-1 text-[15px]">
                        <span className="font-medium text-heading">{ime}</span>
                        {detalj && <span className="ml-2 text-muted">{detalj}</span>}
                      </span>
                      <span className="shrink-0 text-right text-[15px]">
                        <span className="tabular block font-medium text-cocoa-800">
                          {formatKMFull(cijena(v))}
                        </span>
                        {naAkciji(v) && (
                          <StaraCijena fening={formatKMFull(v.price_fening)} className="t-small block" />
                        )}
                      </span>
                    </label>
                  )
                })}
              </div>
            </fieldset>

            <div className="mt-5 flex items-end justify-between gap-4">
              <div>
                <span className="t-eyebrow block">Ukupno</span>
                <Price fening={(variant ? cijena(variant) : 0) * qty} className="mt-1 text-[24px]" />
                {variant && naAkciji(variant) && (
                  <StaraCijena
                    fening={formatKMFull(variant.price_fening * qty)}
                    className="t-small mt-1 block"
                  />
                )}
              </div>
              <QtyStepper value={qty} onChange={setQty} />
            </div>

            <Button size="lg" fullWidth className="mt-5" onClick={dodaj} disabled={!variant}>
              Dodaj u korpu
            </Button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
