import type { Variants } from 'framer-motion'
import { DUR, EASE, STAGGER, STAGGER_CAP } from './tokens'

/** Route tranzicija. AnimatePresence mode="wait" po pathname. */
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: DUR.slow, ease: EASE.silk, when: 'beforeChildren' },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.2, ease: EASE.exit },
  },
}

/** Scroll reveal sekcije. Samo transform + opacity. */
export const revealVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: DUR.reveal, ease: EASE.silk },
  },
}

/**
 * Grid ulazak. Kontejner SAMO orkestrira - kasnjenje zivi na djetetu preko
 * custom={index}, jer staggerChildren na 24 kartice znaci da zadnja ceka 1.4s.
 */
export const gridVariants: Variants = {
  hidden: {},
  show: { transition: { delayChildren: 0.04 } },
}

export const cardVariants: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.985 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: DUR.reveal,
      ease: EASE.silk,
      delay: Math.min(i, STAGGER_CAP) * STAGGER,
    },
  }),
  /** Grana za prefers-reduced-motion: bez staggera, sve odjednom. */
  showFlat: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.2 },
  },
}

/** Backdrop korpe. ease:'linear' namjerno - eased zatamnjenje se cita kao lag. */
export const backdropVariants: Variants = {
  hidden: { opacity: 0, transition: { duration: DUR.base, ease: 'linear' } },
  show: { opacity: 1, transition: { duration: DUR.slow, ease: 'linear' } },
}

/**
 * Drawer: 'x' (desni panel) na >=640px, 'y' (bottom sheet) ispod.
 * Osa se gradi eksplicitno umjesto racunatim kljucem - racunati kljuc
 * TS prosiri u index signature i Variant ga vise ne prihvata.
 */
export const drawerVariants = (axis: 'x' | 'y'): Variants =>
  axis === 'x'
    ? {
        hidden: { x: '100%', transition: { duration: 0.28, ease: EASE.exit } },
        show: { x: 0, transition: { duration: 0.44, ease: EASE.silk } },
      }
    : {
        hidden: { y: '100%', transition: { duration: 0.28, ease: EASE.exit } },
        show: { y: 0, transition: { duration: 0.44, ease: EASE.silk } },
      }

/** Badge korpe - jedno od samo dva mjesta sa overshootom. */
export const badgeVariants: Variants = {
  idle: { scale: 1 },
  bump: {
    scale: [1, 1.22, 1],
    transition: { duration: 0.42, ease: EASE.settle, times: [0, 0.4, 1] },
  },
}

export const badgeDigitVariants: Variants = {
  enter: { y: -8, opacity: 0 },
  center: { y: 0, opacity: 1, transition: { duration: 0.18, ease: EASE.crisp } },
  leave: { y: 8, opacity: 0, transition: { duration: 0.14, ease: EASE.exit } },
}
