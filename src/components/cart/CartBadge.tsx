import { useEffect } from 'react'
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from 'framer-motion'
import { useCart } from '../../context/CartContext'
import { badgeDigitVariants, badgeVariants } from '../../motion/variants'

export function CartBadge() {
  const { count, pulse, open } = useCart()
  const controls = useAnimationControls()
  const reduce = useReducedMotion()

  // Overshoot postoji na tacno dva mjesta na sajtu - ovo je jedno od njih.
  useEffect(() => {
    if (pulse === 0 || reduce) return
    controls.start('bump')
  }, [pulse, controls, reduce])

  return (
    <button
      type="button"
      onClick={open}
      className="relative grid h-11 w-11 place-items-center rounded-lg text-cocoa-700 transition-colors duration-150 ease-crisp hover:bg-cocoa-700/[0.06]"
      aria-label={count > 0 ? `Korpa, ${count} stavki` : 'Korpa, prazna'}
    >
      <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" aria-hidden="true">
        <path
          d="M4 7h16l-1.2 11.2a2 2 0 0 1-2 1.8H7.2a2 2 0 0 1-2-1.8L4 7Z"
          stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"
        />
        <path
          d="M8.5 9.5V6a3.5 3.5 0 1 1 7 0v3.5"
          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
        />
      </svg>

      <AnimatePresence>
        {count > 0 && (
          <motion.span
            variants={badgeVariants}
            initial="idle"
            animate={controls}
            // min-width umjesto animirane sirine: na 9 -> 10 badge ne smije
            // da raste animirano, samo instant.
            className="absolute -right-0.5 -top-0.5 grid h-5 min-w-[20px] place-items-center overflow-hidden rounded-full bg-accent px-1 text-[11px] font-medium leading-none text-onDark"
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={count}
                variants={badgeDigitVariants}
                initial="enter"
                animate="center"
                exit="leave"
                className="tabular"
              >
                {count > 99 ? '99+' : count}
              </motion.span>
            </AnimatePresence>
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  )
}
