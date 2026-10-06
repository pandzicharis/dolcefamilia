import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { VIEWPORT } from '../../motion/tokens'
import { revealVariants } from '../../motion/variants'

/** Scroll reveal omotac. Samo transform + opacity — nikad height ili filter. */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  return (
    <motion.div
      variants={revealVariants}
      initial="hidden"
      whileInView="show"
      viewport={VIEWPORT}
      transition={{ delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
