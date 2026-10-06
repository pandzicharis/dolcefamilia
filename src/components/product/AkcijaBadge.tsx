import { motion, useReducedMotion } from 'framer-motion'
import type { ProductPromo } from '../../types'
import { popustOznaka } from '../../lib/promo'
import { cn } from '../../lib/cn'
import { EASE } from '../../motion/tokens'

/**
 * Oznaka akcije na kartici i u modalu za izbor veličine.
 *
 * Jedina popunjena zlatna povrsina na sajtu — i to je namjerno: akcija je
 * jedina informacija koja smije prekinuti mirnu paletu. Sjaj prelazi preko
 * nje svakih sest sekundi, dovoljno rijetko da se ne cita kao reklama koja
 * blinka.
 */
export function AkcijaBadge({
  promo,
  className,
}: {
  promo: Pick<ProductPromo, 'kind' | 'value'>
  className?: string
}) {
  const reduce = useReducedMotion()

  return (
    <motion.span
      initial={reduce ? false : { opacity: 0, scale: 0.86, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE.settle }}
      className={cn(
        'relative inline-flex select-none items-center gap-1.5 overflow-hidden rounded-sm',
        'bg-gold-600 px-2 py-1 text-[11px] font-medium uppercase tracking-[0.1em] text-cream-50',
        'shadow-xs',
        className,
      )}
    >
      <span className="relative z-10">Akcija</span>
      <span className="relative z-10 tabular tracking-[0.06em]">{popustOznaka(promo)}</span>

      {!reduce && (
        <motion.span
          aria-hidden="true"
          className="absolute inset-y-0 -left-full w-full bg-gradient-to-r from-transparent via-cream-50/45 to-transparent"
          animate={{ x: ['0%', '300%'] }}
          transition={{ duration: 1.1, ease: EASE.crisp, repeat: Infinity, repeatDelay: 5 }}
        />
      )}
    </motion.span>
  )
}

/**
 * Precrtana redovna cijena. Stoji UZ akcijsku, nikad umjesto nje.
 * `line-through` sa decoration-from-font bi u Fraunces-u presjekao brojke
 * po sredini x-visine, pa je linija eksplicitno tanka i prigusena.
 */
export function StaraCijena({ fening, className }: { fening: string; className?: string }) {
  return (
    <span
      className={cn(
        'tabular text-muted line-through decoration-mocha-500/70 decoration-[1.5px]',
        className,
      )}
    >
      {fening}
    </span>
  )
}
