import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useCart } from '../../context/CartContext'
import { brand } from '../../config/brand'
import { formatKMFull } from '../../lib/format'
import { backdropVariants, drawerVariants } from '../../motion/variants'
import { LinkButton } from '../ui/Button'
import { GoldRule, Price } from '../ui/Bits'
import { CakeImage } from '../CakeImage'
import { QtyStepper } from './QtyStepper'

/** Jedini pouzdan nacin da znamo je li drawer panel ili bottom sheet. */
function useIsWide() {
  const [wide, setWide] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 640px)').matches : true,
  )
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)')
    const on = (e: MediaQueryListEvent) => setWide(e.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return wide
}

export function CartDrawer() {
  const cart = useCart()
  const wide = useIsWide()
  const reduce = useReducedMotion()

  // Zakljucaj scroll pozadine dok je drawer otvoren.
  // Zavisi od isOpen i close (oba stabilna), ne od cijelog `cart` objekta -
  // inace bi se vrtjelo na svaki render.
  const { isOpen, close } = cart
  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [isOpen, close])

  const delivery = cart.deliveryFening('dostava')

  return (
    <AnimatePresence>
      {cart.isOpen && (
        <div className="fixed inset-0 z-50">
          {/* Ravan scrim, bez backdrop-filter: blur na mobitelu ostavlja
              srednje Android uredjaje da gube frameove. */}
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="show"
            exit="hidden"
            onClick={cart.close}
            className="absolute inset-0 bg-[rgb(33_26_20_/_0.42)]"
            aria-hidden="true"
          />

          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Korpa"
            variants={drawerVariants(wide ? 'x' : 'y')}
            initial="hidden"
            animate="show"
            exit="hidden"
            drag={!wide && !reduce ? 'y' : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.04 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 500) cart.close()
            }}
            className={
              'absolute flex flex-col bg-surface shadow-xl ' +
              'inset-x-0 bottom-0 h-[92dvh] rounded-t-2xl ' +
              'sm:inset-y-0 sm:left-auto sm:right-0 sm:h-auto sm:w-[420px] sm:rounded-none sm:rounded-l-2xl'
            }
          >
            {/* Hvataljka bottom sheeta */}
            <div className="grid shrink-0 place-items-center pt-3 sm:hidden">
              <div className="h-1 w-10 rounded-full bg-cream-400" />
            </div>

            <header className="flex shrink-0 items-center justify-between px-5 pb-4 pt-4 sm:pt-6">
              <div>
                <h2 className="t-h3">Vaša korpa</h2>
                <p className="t-small text-muted">
                  {cart.count === 0
                    ? 'Prazna'
                    : `${cart.count} ${cart.count === 1 ? 'stavka' : 'stavki'}`}
                </p>
              </div>
              <button
                type="button"
                onClick={cart.close}
                aria-label="Zatvori korpu"
                className="grid h-11 w-11 place-items-center rounded-lg text-muted transition-colors duration-150 ease-crisp hover:bg-cocoa-700/[0.06] hover:text-cocoa-700"
              >
                <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden="true">
                  <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </header>

            {cart.notice && (
              <div className="mx-5 mb-3 shrink-0 rounded-md bg-gold-100 px-3 py-2">
                <p className="t-small text-gold-700">{cart.notice}</p>
                <button type="button" onClick={cart.dismissNotice} className="t-small mt-1 underline">
                  U redu
                </button>
              </div>
            )}

            <div className="scroll-soft min-h-0 flex-1 overflow-y-auto px-5">
              {cart.items.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-body">Još niste ništa dodali.</p>
                  <LinkButton variant="secondary" className="mt-5" to="/#ponuda" onClick={cart.close}>
                    Pogledaj ponudu
                  </LinkButton>
                </div>
              ) : (
                <ul className="pb-4">
                  <AnimatePresence initial={false}>
                    {cart.items.map((item) => (
                      <motion.li
                        key={item.key}
                        // layout je dozvoljen SAMO ovdje: mali N, van glavnog scrollera.
                        layout
                        exit={{ opacity: 0, x: 16, height: 0, marginBottom: 0 }}
                        transition={{ duration: 0.26, ease: [0.7, 0, 0.84, 0] }}
                        className="overflow-hidden"
                      >
                        <div className="flex min-h-[88px] gap-3 py-4 sm:min-h-[96px]">
                          <div className="shrink-0">
                            <CakeImage
                              seed={item.slug}
                              src={item.image}
                              alt={item.name}
                              reveal={false}
                              className="w-16 rounded-xl"
                            />
                          </div>

                          <div className="flex min-w-0 flex-1 flex-col gap-2">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="t-card-title line-clamp-2 text-[16px]">{item.name}</p>
                                <p className="t-small text-muted">{item.variantLabel}</p>
                                <p className="t-small text-muted">
                                  {formatKMFull(item.unitPriceFening)} / kom
                                  {item.regularPriceFening && (
                                    <span className="ml-1.5 line-through decoration-mocha-500/70">
                                      {formatKMFull(item.regularPriceFening)}
                                    </span>
                                  )}
                                </p>
                              </div>
                              <Price fening={item.unitPriceFening * item.qty} className="shrink-0 text-[17px]" />
                            </div>

                            <div className="flex items-center justify-between gap-3">
                              <QtyStepper
                                value={item.qty}
                                onChange={(q) => cart.setQty(item.key, q)}
                                size="sm"
                                label={`Količina za ${item.name}`}
                              />
                              {/* Tekst, ne gola kanta: ikona je dvosmislena na
                                  13px i pogodak joj je uvijek premali. */}
                              <button
                                type="button"
                                onClick={() => cart.remove(item.key)}
                                className="t-small px-2 py-2 text-muted transition-colors duration-150 ease-crisp hover:text-rouge-700"
                              >
                                Ukloni
                              </button>
                            </div>
                          </div>
                        </div>
                        <GoldRule />
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </div>

            {cart.items.length > 0 && (
              <footer className="shrink-0 border-t border-hairline bg-surface px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
                <dl className="space-y-1.5">
                  <div className="flex items-baseline justify-between">
                    <dt className="t-small text-muted">Međuzbir</dt>
                    <dd className="tabular text-body">{formatKMFull(cart.subtotalFening)}</dd>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <dt className="t-small text-muted">Dostava</dt>
                    <dd className="tabular t-small text-muted">
                      {delivery === 0 ? 'besplatna' : formatKMFull(delivery)}
                    </dd>
                  </div>
                </dl>

                <GoldRule className="my-3" />

                <div className="flex items-baseline justify-between">
                  <span className="t-eyebrow">Ukupno</span>
                  <Price fening={cart.subtotalFening + delivery} />
                </div>
                <p className="t-small mt-1 text-muted">
                  Konačan iznos ovisi o načinu preuzimanja. {brand.paymentNote}
                </p>

                <LinkButton fullWidth size="lg" className="mt-4" to="/narudzba" onClick={cart.close}>
                  Nastavi na narudžbu
                </LinkButton>
              </footer>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  )
}
