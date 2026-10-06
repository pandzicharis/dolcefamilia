import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import type { Product } from '../../types'
import { formatKM, imageSrcSet } from '../../lib/format'
import { EASE } from '../../motion/tokens'
import { cn } from '../../lib/cn'

const TRAJANJE_SLAJDA = 4500

/**
 * Zlatni lukovi iza proizvoda. U referentnom reelu su to karamel trake koje
 * uokviruju proizvod; ovdje su svedene na dvije tanke linije u nasem zlatu,
 * jer bi puna traka na krem podlozi bila ono sto smo vec jednom izbacili.
 */
const LUKOVI = [
  { d: 'M -20 330 C 80 170, 300 110, 520 190', o: 0.55, w: 1.5 },
  { d: 'M -20 380 C 110 250, 330 200, 520 255', o: 0.28, w: 1.25 },
  { d: 'M -10 190 C 150 370, 340 400, 510 320', o: 0.3, w: 1.25 },
]

/**
 * Zlatni lukovi iza proizvoda — preuzeto iz referentnog reela, gdje su to
 * karamel trake koje uokviruju proizvod. Ovdje su svedene na tanke linije,
 * a iscrtavaju se umjesto da se pojave gotove.
 *
 * Okvir je namjerno veci od slike (-inset-10): lukovi moraju izlaziti IZVAN
 * fotografije da bi se vidjeli, inace ih zaobljeni okvir prekrije. Zbog toga
 * hero sekcija ima overflow-x-clip.
 */
function ZlatniLukovi() {
  const reduce = useReducedMotion()
  return (
    <svg
      viewBox="0 0 500 500"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="pointer-events-none absolute -inset-10 h-[calc(100%+5rem)] w-[calc(100%+5rem)] sm:-inset-14 sm:h-[calc(100%+7rem)] sm:w-[calc(100%+7rem)]"
    >
      {LUKOVI.map((l, i) => (
        <motion.path
          key={i}
          d={l.d}
          fill="none"
          stroke="rgb(var(--c-gold-400))"
          strokeOpacity={l.o}
          strokeWidth={l.w}
          strokeLinecap="round"
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.6, ease: EASE.silk, delay: 0.3 + i * 0.18 }}
        />
      ))}
    </svg>
  )
}

/**
 * Nekoliko zlatnih mrvica koje lagano kruze oko slike. Odjek "letecih
 * sastojaka" iz reela — tamo su to jagode i keksi na alfa kanalu, sto bez
 * izrezanih fotografija ne mozemo, pa je svedeno na apstraktne tacke.
 */
function Mrvice() {
  const reduce = useReducedMotion()
  if (reduce) return null
  const tacke = [
    { x: '-6%', y: '18%', r: 5, d: 7.5, o: 0.55 },
    { x: '102%', y: '30%', r: 4, d: 9, o: 0.45 },
    { x: '-3%', y: '72%', r: 3, d: 8.2, o: 0.4 },
    { x: '96%', y: '82%', r: 6, d: 10.5, o: 0.5 },
  ]
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      {tacke.map((t, i) => (
        <motion.span
          key={i}
          className="absolute block rounded-full bg-gold-400"
          style={{ left: t.x, top: t.y, width: t.r * 2, height: t.r * 2, opacity: t.o }}
          animate={{ y: [0, -14, 0], x: [0, i % 2 ? 6 : -6, 0] }}
          transition={{ duration: t.d, repeat: Infinity, ease: 'easeInOut', delay: i * 0.6 }}
        />
      ))}
    </div>
  )
}

export function HeroCarousel({
  products,
  onOdaberi,
}: {
  products: Product[]
  /** Otvara izbor velicine. Karusel sam nista ne dodaje u korpu. */
  onOdaberi: (p: Product) => void
}) {
  const reduce = useReducedMotion()
  const [index, setIndex] = useState(0)
  const [pauza, setPauza] = useState(false)
  const n = products.length

  const idi = useCallback((smjer: 1 | -1) => {
    setIndex((i) => (i + smjer + n) % n)
  }, [n])

  /**
   * Autorotacija stoji kad: korisnik trazi manje animacija, kad je mis/fokus
   * na karuselu, i kad je tab u pozadini. Zadnje je bitno jer bi se inace
   * vratio na tab i zatekao slajd koji je preskocio pet puta.
   */
  useEffect(() => {
    if (reduce || pauza || n < 2) return
    const skriven = () => document.visibilityState === 'hidden'
    const t = setInterval(() => {
      if (!skriven()) setIndex((i) => (i + 1) % n)
    }, TRAJANJE_SLAJDA)
    return () => clearInterval(t)
  }, [reduce, pauza, n])

  const dodirStart = useRef<number | null>(null)

  if (n === 0) return null
  const aktivna = products[index]

  return (
    <div
      className="relative mx-auto w-full max-w-[420px]"
      onMouseEnter={() => setPauza(true)}
      onMouseLeave={() => setPauza(false)}
      onFocusCapture={(e) => {
        // Samo tastatura pauzira. Klik misem na tackicu takodjer fokusira
        // dugme, a fokus tu i ostane - bez :focus-visible provjere autoplay
        // se nakon jednog klika nikad vise ne bi pokrenuo.
        if ((e.target as HTMLElement).matches?.(':focus-visible')) setPauza(true)
      }}
      onBlurCapture={() => setPauza(false)}
      role="group"
      aria-roledescription="karusel"
      aria-label="Istaknute torte"
    >
      <ZlatniLukovi />
      <Mrvice />

      <div
        className="relative aspect-square overflow-hidden rounded-3xl bg-sunken shadow-xl"
        onTouchStart={(e) => { dodirStart.current = e.touches[0].clientX }}
        onTouchEnd={(e) => {
          if (dodirStart.current === null) return
          const d = e.changedTouches[0].clientX - dodirStart.current
          if (Math.abs(d) > 40) idi(d < 0 ? 1 : -1)
          dodirStart.current = null
        }}
      >
        {/* mode="popLayout" bi ovdje izvadio odlazecu sliku iz toka i okvir bi
            na tren ostao prazan. Obje slike su apsolutne, pa se preklapaju. */}
        <AnimatePresence initial={false}>
          <motion.div
            key={aktivna.slug}
            className="absolute inset-0"
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.06 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.5, ease: EASE.exit } }}
            transition={{
              opacity: { duration: 0.7, ease: EASE.silk },
              scale: { duration: 5.2, ease: 'linear' },
            }}
          >
            <img
              src={aktivna.image ?? undefined}
              srcSet={imageSrcSet(aktivna.image)}
              sizes="(min-width: 1024px) 460px, 90vw"
              alt={aktivna.name}
              loading={index === 0 ? 'eager' : 'lazy'}
              fetchPriority={index === 0 ? 'high' : 'auto'}
              decoding="async"
              className="h-full w-full object-cover"
            />
          </motion.div>
        </AnimatePresence>

        {/* Naziv i cijena u donjem uglu, na mekom gradijentu da tekst ostane citljiv
            bez obzira koja je fotografija ispod. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[rgb(33_26_20_/_0.72)] via-[rgb(33_26_20_/_0.28)] to-transparent p-5 pt-16">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={aktivna.slug}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6, transition: { duration: 0.18 } }}
              transition={{ duration: 0.4, ease: EASE.silk, delay: 0.12 }}
              className="flex items-end justify-between gap-3"
            >
              <div className="min-w-0 text-left">
                <p className="font-display text-[19px] leading-tight text-cream-50">
                  {aktivna.name}
                </p>
                <p className="text-[12px] uppercase tracking-[0.14em] text-gold-300">
                  od {formatKM(aktivna.fromPriceFening)} KM
                  {aktivna.promo && (
                    <span className="ml-2 normal-case tracking-normal text-cream-50/70 line-through">
                      {formatKM(aktivna.fromRegularPriceFening)}
                    </span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOdaberi(aktivna)}
                className="pointer-events-auto shrink-0 rounded-lg bg-cream-50/95 px-3.5 py-2 text-[13px] font-medium text-cocoa-800 transition-colors duration-150 ease-crisp hover:bg-cream-50"
              >
                Odaberi
              </button>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Strelice se pojavljuju samo na uredjajima sa misem. */}
        {n > 1 && (
          <div className="pointer-events-none absolute inset-y-0 left-0 right-0 hidden items-center justify-between px-2 [@media(hover:hover)_and_(pointer:fine)]:flex">
            {([-1, 1] as const).map((smjer) => (
              <button
                key={smjer}
                type="button"
                onClick={() => idi(smjer)}
                aria-label={smjer === -1 ? 'Prethodna torta' : 'Sljedeća torta'}
                className="pointer-events-auto grid h-10 w-10 place-items-center rounded-full bg-cream-50/80 text-cocoa-800 opacity-0 shadow-sm backdrop-blur-[2px] transition-opacity duration-200 ease-crisp hover:bg-cream-50 group-hover:opacity-100 focus-visible:opacity-100"
              >
                <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
                  <path
                    d={smjer === -1 ? 'M12 4 6 10l6 6' : 'M8 4l6 6-6 6'}
                    stroke="currentColor" strokeWidth="1.75"
                    strokeLinecap="round" strokeLinejoin="round" fill="none"
                  />
                </svg>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tackice: i indikator i kontrola. */}
      {n > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {products.map((p, i) => (
            <button
              key={p.slug}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Prikaži ${p.name}`}
              aria-current={i === index || undefined}
              className="tap-safe grid h-6 place-items-center px-0.5"
            >
              <span
                className={cn(
                  'block h-[3px] rounded-full transition-all duration-300 ease-crisp',
                  i === index ? 'w-7 bg-cocoa-700' : 'w-3 bg-cream-400 hover:bg-cocoa-300',
                )}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
