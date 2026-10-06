import { motion, useReducedMotion } from 'framer-motion'
import type { Product } from '../../types'
import { gridVariants } from '../../motion/variants'
import { VIEWPORT } from '../../motion/tokens'
import { ProductCardSkeleton } from '../ui/Bits'
import { ProductCard } from './ProductCard'
import { cn } from '../../lib/cn'

export function ProductGrid({
  products,
  loading,
  skeletonCount = 6,
  className,
  onAdd,
}: {
  products: Product[]
  loading?: boolean
  skeletonCount?: number
  className?: string
  onAdd: (p: Product) => void
}) {
  const reduce = useReducedMotion()

  // Dvije kolone vec na telefonu: 12 proizvoda u jednoj koloni znaci 10
  // ekrana skrolanja do dna, a cilj stranice je da kupac brzo nadje kolac.
  const grid = cn(
    'grid grid-cols-2 gap-3 min-[480px]:gap-5 lg:grid-cols-3 lg:gap-8',
    className,
  )

  if (loading) {
    return (
      <div className={grid}>
        {Array.from({ length: skeletonCount }, (_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  return (
    <motion.div
      variants={gridVariants}
      initial="hidden"
      whileInView="show"
      viewport={VIEWPORT}
      className={grid}
    >
      {products.map((p, i) => (
        <ProductCard key={p.slug} product={p} index={reduce ? 0 : i} onAdd={onAdd} />
      ))}
    </motion.div>
  )
}
