import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '../../lib/cn'
import { EASE } from '../../motion/tokens'

/**
 * DEKOR ZA DIJELOVE STRANICE BEZ FOTOGRAFIJE
 *
 * Hero tekst, traka iznad ponude i kontakt su velike povrsine cistog krema na
 * kojima se iz samog teksta ne vidi da je rijec o kolacima. Ovdje stoji jedini
 * ukras na sajtu — crtana torta, pipani rub i posip — i svaki je potez tanka
 * linija, nikad ispuna, jer upravo tanka linija na kremu izgleda skupo.
 *
 * Pravila kojih se drze sve tri komponente:
 *   - aria-hidden i pointer-events-none: ni jedan ukras ne ulazi u stablo
 *     pristupacnosti i ni jedan ne presrece klik.
 *   - animira se SAMO transform i opacity (ni filter ni height).
 *   - prefers-reduced-motion: ukras ostaje, kretanje nestaje. Statican crtez
 *     torte i dalje govori sta se prodaje, a to je cijela svrha.
 */

/** Jedno zrno posipa. Pozicije su upisane rucno, ne slucajne: random na svaki
 *  render znaci da posip "preskoci" na svaki re-render roditelja. */
type Zrno = {
  /** procenat sirine / visine kontejnera */
  x: number
  y: number
  rot: number
  /** duzina zrna u px; 0 znaci perla (kruzic) */
  len: number
  boja: string
  dur: number
  delay: number
}

const ZRNA: Zrno[] = [
  { x: 5, y: 16, rot: -24, len: 13, boja: 'bg-gold-500/70', dur: 9, delay: 0 },
  { x: 13, y: 68, rot: 38, len: 11, boja: 'bg-cocoa-300/70', dur: 11, delay: 1.4 },
  { x: 23, y: 7, rot: 12, len: 0, boja: 'bg-gold-500/65', dur: 8, delay: 2.2 },
  { x: 30, y: 86, rot: -48, len: 12, boja: 'bg-rouge-500/40', dur: 12, delay: 0.6 },
  { x: 43, y: 24, rot: 64, len: 10, boja: 'bg-gold-400/80', dur: 10, delay: 3.1 },
  { x: 49, y: 74, rot: -14, len: 0, boja: 'bg-cocoa-300/60', dur: 9.5, delay: 1.1 },
  { x: 59, y: 11, rot: 28, len: 12, boja: 'bg-gold-500/60', dur: 11.5, delay: 2.6 },
  { x: 68, y: 58, rot: -62, len: 11, boja: 'bg-cocoa-200/90', dur: 8.5, delay: 0.3 },
  { x: 77, y: 20, rot: 44, len: 0, boja: 'bg-gold-400/75', dur: 12.5, delay: 1.9 },
  { x: 85, y: 80, rot: -32, len: 13, boja: 'bg-gold-500/55', dur: 10.5, delay: 3.6 },
  { x: 91, y: 38, rot: 18, len: 10, boja: 'bg-cocoa-300/60', dur: 9, delay: 0.9 },
  { x: 96, y: 64, rot: -52, len: 0, boja: 'bg-rouge-500/35', dur: 11, delay: 2.4 },
]

/**
 * Posip koji lagano pluta. Stoji ISPOD teksta (roditelj mu daje z-indeks),
 * pa nikad ne smanjuje kontrast citanja — zrna su van mjere teksta.
 *
 * `gustina` skracuje listu: hero nosi cijelu, kontakt traka samo svako drugo
 * zrno, jer je niza i gusta lista bi se tamo citala kao mrlja.
 */
export function Posip({
  className,
  gustina = 'puna',
}: {
  className?: string
  gustina?: 'puna' | 'tiha'
}) {
  const reduce = useReducedMotion()
  const zrna = gustina === 'tiha' ? ZRNA.filter((_, i) => i % 2 === 0) : ZRNA

  return (
    <div aria-hidden="true" className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      {zrna.map((z, i) => (
        <motion.span
          key={i}
          className={cn('absolute rounded-full', z.boja)}
          style={{
            left: `${z.x}%`,
            top: `${z.y}%`,
            width: z.len ? z.len : 5,
            height: z.len ? 3 : 5,
            rotate: `${z.rot}deg`,
          }}
          initial={reduce ? false : { opacity: 0 }}
          animate={
            reduce
              ? { opacity: 0.7 }
              : {
                  opacity: [0, 0.75, 0.75, 0],
                  y: [8, -10],
                  x: [0, z.rot > 0 ? 6 : -6],
                }
          }
          transition={
            reduce
              ? { duration: 0 }
              : {
                  duration: z.dur,
                  delay: z.delay,
                  repeat: Infinity,
                  repeatType: 'reverse',
                  ease: 'easeInOut',
                }
          }
        />
      ))}
    </div>
  )
}

/** Tri dima iznad svjece. Crtaju se tek kad traka udje u vidokrug. */
const DIMOVI = [
  { d: 'M60 16 c-5 -7 4 -11 -1 -18 c-4 -6 3 -9 0 -14', delay: 0.9 },
  { d: 'M50 22 c-4 -6 3 -9 -1 -15', delay: 1.25 },
  { d: 'M70 22 c4 -6 -3 -9 1 -15', delay: 1.1 },
]

/**
 * Crtana torta sa svjecom. Linija se ISPISUJE (pathLength 0 -> 1) kad udje u
 * vidokrug, plamen potom treperi, a dim se dize u petlji.
 *
 * Sve sto treba da se vidi i bez animacije crta se prvo i bez odgode: ako
 * korisnik proskrola prebrzo, torta je vec tu.
 */
export function CrtanaTorta({ className }: { className?: string }) {
  const reduce = useReducedMotion()

  /** Zajednicko za svaki potez: ispis linije kad udje u vidokrug. */
  const potez = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { pathLength: 0, opacity: 0 },
          whileInView: { pathLength: 1, opacity: 1 },
          viewport: { once: true, amount: 0.6 },
          transition: { duration: 1.1, ease: EASE.silk, delay },
        }

  return (
    <svg
      viewBox="0 0 120 108"
      aria-hidden="true"
      className={cn('h-[62px] w-[70px] shrink-0 sm:h-[88px] sm:w-[98px]', className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* tanjir */}
      <motion.path d="M14 98 h92" {...potez(0)} />
      <motion.ellipse cx="60" cy="94" rx="40" ry="5" {...potez(0.05)} />

      {/* donji sprat */}
      <motion.path d="M24 94 V66 h72 v28" {...potez(0.15)} />
      {/* preljev na donjem spratu - isti luk koji nosi .traka-krem */}
      <motion.path
        d="M24 68 q6 8 12 0 q6 8 12 0 q6 8 12 0 q6 8 12 0 q6 8 12 0 q6 8 12 0"
        {...potez(0.3)}
      />

      {/* gornji sprat */}
      <motion.path d="M38 66 V44 h44 v22" {...potez(0.45)} />
      <motion.path d="M38 46 q5.5 7 11 0 q5.5 7 11 0 q5.5 7 11 0 q5.5 7 11 0" {...potez(0.55)} />

      {/* svjeca */}
      <motion.path d="M60 44 V28" {...potez(0.7)} />

      {/* plamen: ispise se, pa trepeti u petlji. transform-origin je dno
          plamena, inace se pri skaliranju odvoji od fitilja. */}
      <motion.path
        d="M60 28 c-4 -4 0 -8 0 -11 c0 3 4 7 0 11"
        style={{ transformOrigin: '60px 28px' }}
        initial={reduce ? false : { pathLength: 0, opacity: 0 }}
        whileInView={
          reduce
            ? undefined
            : { pathLength: 1, opacity: 1, scaleY: [1, 1.16, 0.94, 1.08, 1], scaleX: [1, 0.94, 1.04, 1] }
        }
        viewport={{ once: true, amount: 0.6 }}
        transition={
          reduce
            ? undefined
            : {
                pathLength: { duration: 0.5, ease: EASE.silk, delay: 0.85 },
                opacity: { duration: 0.3, delay: 0.85 },
                scaleY: { duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: 1.3 },
                scaleX: { duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: 1.3 },
              }
        }
        className="text-gold-500"
        stroke="currentColor"
      />

      {/* dim */}
      {DIMOVI.map((dim, i) => (
        <motion.path
          key={i}
          d={dim.d}
          strokeWidth="1"
          className="text-cocoa-300"
          initial={reduce ? false : { pathLength: 0, opacity: 0, y: 0 }}
          whileInView={
            reduce
              ? { opacity: 0.45 }
              : { pathLength: 1, opacity: [0, 0.5, 0], y: [0, -10] }
          }
          viewport={{ once: true, amount: 0.6 }}
          transition={
            reduce
              ? { duration: 0 }
              : {
                  pathLength: { duration: 1.4, ease: EASE.silk, delay: dim.delay },
                  opacity: { duration: 5.5, repeat: Infinity, delay: dim.delay, ease: 'easeInOut' },
                  y: { duration: 5.5, repeat: Infinity, delay: dim.delay, ease: 'easeInOut' },
                }
          }
        />
      ))}
    </svg>
  )
}

/**
 * Putanja pipane rozete: osam latica kao lukovi po krugu. Racuna se jednom,
 * pri ucitavanju modula - deterministicno je, pa nema sta da se memoizuje.
 */
function rozetaPath(r: number, latica: number): string {
  const tocka = (i: number) => {
    const t = ((i * 360) / latica - 90) * (Math.PI / 180)
    return [+(16 + r * Math.cos(t)).toFixed(2), +(16 + r * Math.sin(t)).toFixed(2)]
  }
  let d = `M ${tocka(0)[0]} ${tocka(0)[1]}`
  for (let i = 1; i <= latica; i++) {
    const [x, y] = tocka(i)
    // Luk ispupcen prema van: polumjer malo veci od koraka, pa latica izlazi
    // izvan kruga umjesto da ga sijece.
    d += ` A ${(r * 0.62).toFixed(2)} ${(r * 0.62).toFixed(2)} 0 0 1 ${x} ${y}`
  }
  return `${d} Z`
}

const ROZETA_VAN = rozetaPath(13, 8)
const ROZETA_UNUTRA = rozetaPath(7.5, 8)

/**
 * Pipana rozeta, odozgo. Ispise se kad udje u vidokrug i onda se vrti jednom
 * u 44 sekunde - dovoljno sporo da se ne primijeti kao animacija, a dovoljno
 * da naslov "Ponuda" ne stoji kraj mrtvog ukrasa.
 */
export function Rozeta({ className }: { className?: string }) {
  const reduce = useReducedMotion()

  return (
    <motion.svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={cn('h-7 w-7 shrink-0 text-gold-500', className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinejoin="round"
      animate={reduce ? undefined : { rotate: 360 }}
      transition={reduce ? undefined : { duration: 44, ease: 'linear', repeat: Infinity }}
    >
      {[ROZETA_VAN, ROZETA_UNUTRA].map((d, i) => (
        <motion.path
          key={i}
          d={d}
          initial={reduce ? false : { pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 1 }}
          viewport={{ once: true, amount: 0.8 }}
          transition={{ duration: 0.9, ease: EASE.silk, delay: 0.1 + i * 0.18 }}
        />
      ))}
      <motion.circle
        cx="16"
        cy="16"
        r="2.1"
        initial={reduce ? false : { scale: 0, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true, amount: 0.8 }}
        transition={{ duration: 0.4, ease: EASE.settle, delay: 0.5 }}
        style={{ transformOrigin: '16px 16px' }}
      />
    </motion.svg>
  )
}

/**
 * Traka izmedju hero-a i ponude: pipani rub koji se lagano pomjera, crtana
 * torta u sredini i posip oko nje.
 *
 * Ovo je mjesto gdje je stranica prije bila samo prazan krem - a to je tacno
 * mjesto na kojem kupac jos nije vidio ni jednu fotografiju.
 */
export function SlatkaTraka({ className }: { className?: string }) {
  return (
    <div className={cn('relative overflow-hidden', className)} aria-hidden="true">
      <Posip className="opacity-80" />

      {/* animate-piping je CSS animacija, pa je prefers-reduced-motion blok u
          index.css vec zaustavlja - ovdje ne treba useReducedMotion grana. */}
      <div className="container-page relative flex items-center gap-4 py-5 sm:gap-8 sm:py-7">
        <div className="traka-krem animate-piping flex-1" />
        <CrtanaTorta className="text-cocoa-400" />
        <div className="traka-krem animate-piping flex-1" />
      </div>
    </div>
  )
}
