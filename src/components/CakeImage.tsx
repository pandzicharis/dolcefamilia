import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '../lib/cn'
import { EASE } from '../motion/tokens'

export type CakeImageProps = {
  /** Slug proizvoda. Sjeme za generisani uzorak I stabilan kljuc za SVG id-ove. */
  seed: string
  /** Prava fotografija. Kad postoji, placeholder se uopste ne renderuje. */
  src?: string | null
  srcSet?: string
  sizes?: string
  /** Uvijek obavezno: placeholder ga koristi kao aria-label, fotografija kao alt. */
  alt: string
  /** Iznad preloma: eager + fetchpriority=high. */
  priority?: boolean
  /** Zavjesa pri ulasku u viewport. Iskljuci za slike koje su odmah vidljive. */
  reveal?: boolean
  className?: string
}

/** Determinističan 32-bitni hash iz slug-a - isti slug uvijek daje isti uzorak. */
function hash(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

/**
 * Odozgo gledana apstrakcija torte: topla baza, tanjir, tijelo torte,
 * zlatni prstenovi, prsten tackica umjesto pipane ivice, linije rezova i
 * "LF" monogram. Slug pomjera rotaciju, broj tackica, broj rezova i
 * polumjere, pa se svaka kartica razlikuje a ostaje u paleti.
 *
 * Inline SVG, ne data-URI: nasljedjuje CSS varijable, pa placeholder ostaje
 * na paleti ako se brend pomjeri. Base64 bi zamrznuo hex i napuhao bundle.
 *
 * Kontrast je namjerno jaci nego sto "placeholder" trazi - na krem pozadini
 * blijed uzorak se cita kao prazna kutija, a ovo klijent vidi prije nego
 * fotografije postoje.
 */
function GeneratedCakePattern({ seed, label }: { seed: string; label: string }) {
  const h = hash(seed)
  const startAngle = (h % 360) / 10
  const dotCount = 14 + (h % 7) // 14-20
  const sliceCount = [6, 8, 10, 12][(h >> 5) % 4]
  const bodyR = 128 + ((h >> 2) % 10) // 128-137
  const plateR = 166
  const innerR = 54 + ((h >> 7) % 14) // 54-67

  const polar = (r: number, deg: number) => {
    const t = (deg * Math.PI) / 180
    return [+(200 + r * Math.cos(t)).toFixed(1), +(200 + r * Math.sin(t)).toFixed(1)] as const
  }

  const dots = Array.from({ length: dotCount }, (_, i) =>
    polar(bodyR - 14, startAngle + (i * 360) / dotCount),
  )
  const slices = Array.from({ length: sliceCount }, (_, i) => {
    const deg = startAngle + (i * 360) / sliceCount
    return { a: polar(innerR + 6, deg), b: polar(bodyR - 26, deg) }
  })

  // SVG <defs> id-ovi su globalni za dokument. Dvanaest kartica sa id="lf-bg"
  // -> browser sve razrijesi na prvu, jedanaest placeholdera tiho renderuje
  // pogresan gradijent. Sufiks slug-om to rjesava besplatno.
  const bgId = `lf-bg-${seed}`
  const bodyId = `lf-body-${seed}`
  const sheenId = `lf-sheen-${seed}`

  return (
    <svg
      viewBox="0 0 400 400"
      role="img"
      aria-label={label}
      xmlns="http://www.w3.org/2000/svg"
      className="h-full w-full"
    >
      <defs>
        <radialGradient id={bgId} cx="50%" cy="30%" r="82%">
          <stop offset="0%" stopColor="rgb(var(--c-cream-200))" />
          <stop offset="62%" stopColor="rgb(var(--c-cream-300))" />
          <stop offset="100%" stopColor="rgb(var(--c-cream-400))" />
        </radialGradient>
        <radialGradient id={bodyId} cx="42%" cy="30%" r="78%">
          <stop offset="0%" stopColor="rgb(var(--c-cream-50))" />
          <stop offset="55%" stopColor="rgb(var(--c-cream-200))" />
          <stop offset="100%" stopColor="rgb(var(--c-cocoa-200))" />
        </radialGradient>
        <linearGradient id={sheenId} x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor="rgb(var(--c-cream-50))" stopOpacity="0.5" />
          <stop offset="46%" stopColor="rgb(var(--c-cream-50))" stopOpacity="0" />
          <stop offset="100%" stopColor="rgb(var(--c-cocoa-700))" stopOpacity="0.07" />
        </linearGradient>
      </defs>

      <rect width="400" height="400" fill={`url(#${bgId})`} />

      {/* tanjir */}
      <circle cx="200" cy="200" r={plateR} fill="rgb(var(--c-cream-100))" />
      <circle
        cx="200" cy="200" r={plateR}
        fill="none" stroke="rgb(var(--c-gold-400))" strokeOpacity="0.55" strokeWidth="1"
      />

      {/* sjena tijela torte na tanjiru */}
      <ellipse cx="203" cy="208" rx={bodyR} ry={bodyR} fill="rgb(var(--c-cocoa-700) / 0.10)" />

      {/* tijelo torte */}
      <circle cx="200" cy="200" r={bodyR} fill={`url(#${bodyId})`} />
      <circle
        cx="200" cy="200" r={bodyR}
        fill="none" stroke="rgb(var(--c-cocoa-400))" strokeOpacity="0.35" strokeWidth="1.25"
      />

      {/* linije rezova */}
      <g stroke="rgb(var(--c-cocoa-400))" strokeOpacity="0.22" strokeWidth="1" strokeLinecap="round">
        {slices.map((s, i) => (
          <line key={i} x1={s.a[0]} y1={s.a[1]} x2={s.b[0]} y2={s.b[1]} />
        ))}
      </g>

      {/* pipana ivica */}
      <g fill="rgb(var(--c-gold-500))" fillOpacity="0.85">
        {dots.map((d, i) => (
          <circle key={i} cx={d[0]} cy={d[1]} r="4.5" />
        ))}
      </g>

      {/* srediste + monogram */}
      <circle cx="200" cy="200" r={innerR} fill="rgb(var(--c-cream-50))" fillOpacity="0.75" />
      <circle
        cx="200" cy="200" r={innerR}
        fill="none" stroke="rgb(var(--c-gold-400))" strokeOpacity="0.8" strokeWidth="1.25"
      />
      <text
        x="200" y="218"
        textAnchor="middle"
        fontFamily="Fraunces Variable, Fraunces, Georgia, serif"
        fontSize="46" fontWeight="500" letterSpacing="0.04em"
        fill="rgb(var(--c-cocoa-700))" fillOpacity="0.5"
      >
        LF
      </text>

      <rect width="400" height="400" fill={`url(#${sheenId})`} />
    </svg>
  )
}

/**
 * Okvir je UVIJEK isti (aspect-square + overflow-hidden) i fotografija ide
 * object-cover, pa je prelazak na prave slike layout-identican, nula CLS.
 * Migracija = dodati `image` u zapis proizvoda. Nista drugo se ne mijenja.
 */
export function CakeImage({
  seed,
  src,
  srcSet,
  sizes,
  alt,
  priority = false,
  reveal = true,
  className,
}: CakeImageProps) {
  const reduce = useReducedMotion()
  const showCurtain = reveal && !reduce

  return (
    <div className={cn('relative aspect-square overflow-hidden bg-sunken', className)}>
      {src ? (
        <motion.img
          src={src}
          srcSet={srcSet}
          sizes={sizes}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
          className="h-full w-full object-cover"
          initial={showCurtain ? { scale: 1.06 } : false}
          whileInView={showCurtain ? { scale: 1 } : undefined}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.9, ease: EASE.silk }}
        />
      ) : (
        <motion.div
          className="h-full w-full"
          initial={showCurtain ? { scale: 1.06 } : false}
          whileInView={showCurtain ? { scale: 1 } : undefined}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.9, ease: EASE.silk }}
        >
          <GeneratedCakePattern seed={seed} label={alt} />
        </motion.div>
      )}

      {/* Zavjesa, ne fade. Fade slike se cita kao spora mreza; zavjesa se cita
          kao namjerno otkrivanje, sto je pravi glagol za tortu.
          Boja mora biti ista kao okolina, inace se vidi pravougaonik. */}
      {showCurtain && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 origin-top bg-sunken"
          initial={{ scaleY: 1 }}
          whileInView={{ scaleY: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, ease: EASE.silk }}
        />
      )}
    </div>
  )
}
