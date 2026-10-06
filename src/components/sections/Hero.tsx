import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { api } from '../../lib/api'
import { brand } from '../../config/brand'
import type { Product } from '../../types'
import { DUR, EASE } from '../../motion/tokens'
import { GoldRule, Skeleton } from '../ui/Bits'
import { Posip } from '../ui/Dekor'
import { buttonClass, LinkButton } from '../ui/Button'
import { Logo } from '../ui/Logo'
import { QuickAdd } from '../product/QuickAdd'
import { HeroCarousel } from './HeroCarousel'

/** Tri obecanja ispod zlatne linije. Uvijek tri — nosiva greda rasporeda. */
const FAKTI: Array<[string, string]> = [
  ['Tri veličine', '8 do 24 osobe'],
  [`${brand.minNoticeHours}h najave`, 'sve po narudžbi'],
  ['Dostava', `${brand.city} i okolina`],
]

/**
 * Hero u tri bloka: brend i naslov, karusel, pa poziv na akciju sa faktima.
 *
 * Redoslijed u DOM-u je ujedno i mobilni raspored, pa nema `order` klasa:
 * telefon prvo vidi IME, pa OBECANJE, pa TORTU, pa DUGME. Fotografija ulazi
 * prije dugmeta namjerno — prodavnica torti u kojoj se na prvom ekranu ne
 * vidi nijedna torta prodaje tekst, ne kolace.
 *
 * Na desktopu isti ta tri bloka padaju u dvije kolone: karusel preuzme desnu
 * kolonu kroz oba reda (`lg:row-span-2`), pa naslov i akcija ostanu lijevo
 * jedno ispod drugog — tacno kako je i bilo.
 */
export function Hero() {
  const reduce = useReducedMotion()
  const [istaknute, setIstaknute] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  /** Proizvod cija se velicina trenutno bira — isti modal kao u ponudi. */
  const [izbor, setIzbor] = useState<Product | null>(null)

  useEffect(() => {
    let cancelled = false
    api
      .products({ featured: true })
      .then((p) => !cancelled && setIstaknute(p.filter((x) => x.image).slice(0, 5)))
      .catch(() => !cancelled && setIstaknute([]))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [])

  const rise = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: DUR.reveal, ease: EASE.silk, delay },
        }

  const rijeci = brand.slogan.split(' ')

  return (
    // overflow-x-clip jer zlatni lukovi namjerno izlaze izvan okvira slike i
    // inace prosire stranicu. `clip` umjesto `hidden`: ne pravi scroll
    // kontejner, pa sticky header i dalje radi.
    <section className="container-page relative overflow-x-clip pb-9 pt-4 sm:pb-14 sm:pt-10">
      {/* Posip nosi cijeli hero, ne samo tekst kolonu: na mobitelu tekst i slika
          vise nisu jedna do druge nego jedno ispod drugog, pa bi posip vezan za
          tekst stao na pola sekcije i izgledao kao da je nesto odsjeceno. */}
      <div className="pointer-events-none absolute inset-x-0 -inset-y-6">
        <Posip />
      </div>

      <div className="relative grid gap-7 sm:gap-9 lg:grid-cols-[1fr_0.85fr] lg:items-center lg:gap-x-16 lg:gap-y-9">
        {/* ------------------------------------------------- BREND I NASLOV */}
        <div className="text-center lg:text-left">
          {/* Samo na mobitelu: na desktopu je isti logo vec u headeru
              dva centimetra iznad, pa bi ponavljanje izgledalo kao greska. */}
          <motion.div className="flex justify-center lg:hidden" {...rise(0)}>
            <Logo stacked />
          </motion.div>

          {/* Naslov se otkriva rijec po rijec. mask-clip nosi kompenzaciju
              jer kvacice na Č/Ž sjede iznad em kutije i inace se odsijecaju. */}
          <h1 className="t-display mt-5 lg:mt-0">
            <span className="mask-clip flex flex-wrap justify-center gap-x-[0.28em] lg:justify-start">
              {rijeci.map((rijec, i) => (
                <motion.span
                  key={`${rijec}-${i}`}
                  className="inline-block"
                  initial={reduce ? false : { opacity: 0, y: '0.5em' }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.75, ease: EASE.silk, delay: 0.1 + i * 0.09 }}
                >
                  {rijec}
                </motion.span>
              ))}
            </span>
          </h1>

          {/* max-w u ch, ne u prose: na telefonu je mjera od 64ch sira od
              ekrana, pa recenica pada u tri neujednacena reda. */}
          <motion.p
            className="t-lead mx-auto mt-3.5 max-w-[36ch] text-body sm:mt-5 sm:max-w-prose lg:mx-0"
            {...rise(0.1 + rijeci.length * 0.09)}
          >
            {brand.intro}
          </motion.p>
        </div>

        {/* ---------------------------------------------------------- KARUSEL */}
        <motion.div
          className="group lg:row-span-2"
          initial={reduce ? false : { opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: EASE.silk, delay: 0.1 }}
        >
          {loading ? (
            <Skeleton className="mx-auto aspect-square w-full max-w-[420px] rounded-3xl" />
          ) : (
            <HeroCarousel products={istaknute} onOdaberi={setIzbor} />
          )}
        </motion.div>

        {/* -------------------------------------------------- AKCIJA I FAKTI */}
        <motion.div {...rise(0.2)}>
          {/* Dva dugmeta, ne dugme pa goli link. Telefon ispod punog dugmeta
              bez okvira izgleda kao zalutali tekst, a na telefonu je poziv
              ravnopravna radnja sa narudzbom. */}
          <div className="flex flex-col gap-2.5 sm:flex-row sm:justify-center lg:justify-start">
            <LinkButton to="/#ponuda" size="lg" className="sm:min-w-[190px]">
              Naruči tortu
            </LinkButton>
            <a
              href={brand.phoneHref}
              className={buttonClass('secondary', 'lg', false, 'gap-2.5 tabular')}
            >
              <svg viewBox="0 0 20 20" className="h-[18px] w-[18px] shrink-0" aria-hidden="true">
                <path
                  d="M6.3 3.2 8 6.1 6.5 7.9c.7 1.7 1.9 2.9 3.6 3.6l1.8-1.5 2.9 1.7-.3 2.4c-.1.7-.7 1.2-1.4 1.1C8.4 14.7 5.3 11.6 4.4 6.9c-.1-.7.4-1.3 1.1-1.4l.8-2.3Z"
                  stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="none"
                />
              </svg>
              {brand.phone}
            </a>
          </div>

          <GoldRule className="mt-7 sm:mt-9" />
          {/* Tri jednake kolone, ne flex-wrap: na 375px se trece obecanje
              prelamalo u svoj red i stajalo centrirano ispod prva dva, pa je
              traka izgledala kao da joj nesto fali. */}
          <dl className="grid grid-cols-3 divide-x divide-hairline pt-4 sm:pt-5 lg:max-w-[32rem]">
            {FAKTI.map(([k, v]) => (
              <div key={k} className="px-2 text-center first:pl-0 last:pr-0 lg:px-5 lg:text-left">
                <dt className="font-display text-[15px] leading-tight text-heading sm:text-[17px]">
                  {k}
                </dt>
                <dd className="t-small mt-1 text-muted">{v}</dd>
              </div>
            ))}
          </dl>
        </motion.div>
      </div>

      <QuickAdd product={izbor} open={izbor !== null} onClose={() => setIzbor(null)} />
    </section>
  )
}
