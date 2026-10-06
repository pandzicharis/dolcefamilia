import { motion, useReducedMotion } from 'framer-motion'
import type { Product } from '../../types'
import { cardVariants } from '../../motion/variants'
import { CakeImage } from '../CakeImage'
import { formatKMFull, imageSrcSet } from '../../lib/format'
import { Badge, Price } from '../ui/Bits'
import { Button } from '../ui/Button'
import { AkcijaBadge, StaraCijena } from './AkcijaBadge'

export function ProductCard({
  product,
  index = 0,
  onAdd,
}: {
  product: Product
  index?: number
  /** Otvara izbor velicine. Kartica sama nista ne dodaje u korpu. */
  onAdd: (p: Product) => void
}) {
  const reduce = useReducedMotion()

  return (
    <motion.article
      custom={index}
      variants={cardVariants}
      // Reduced motion: bez staggera, sve kartice odjednom.
      animate={undefined}
      whileTap={reduce ? undefined : { scale: 0.985 }}
      transition={{ duration: 0.08 }}
      className={
        'group relative flex flex-col overflow-hidden rounded-2xl border border-hairline ' +
        'bg-surface shadow-sm ' +
        // Hover je gated na pointer, ne na breakpoint: tablet u desktop sirini
        // ne smije dobiti hover-only CTA.
        '[@media(hover:hover)_and_(pointer:fine)]:transition-transform ' +
        '[@media(hover:hover)_and_(pointer:fine)]:duration-150 ' +
        '[@media(hover:hover)_and_(pointer:fine)]:ease-crisp ' +
        '[@media(hover:hover)_and_(pointer:fine)]:hover:-translate-y-1'
      }
    >
      {/* Sjena se cross-fade-uje preko pseudo-sloja. Tranzicija box-shadow
          osobine repainta karticu svaki frame. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 shadow-md transition-opacity duration-150 ease-crisp [@media(hover:hover)_and_(pointer:fine)]:group-hover:opacity-100"
      />

      <div className="relative overflow-hidden">
        <div className="[@media(hover:hover)_and_(pointer:fine)]:transition-transform [@media(hover:hover)_and_(pointer:fine)]:duration-[420ms] [@media(hover:hover)_and_(pointer:fine)]:ease-silk [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-[1.045]">
          <CakeImage
            seed={product.slug}
            src={product.image}
            srcSet={imageSrcSet(product.image)}
            sizes="(min-width: 1024px) 380px, (min-width: 480px) 45vw, 48vw"
            alt={product.name}
          />
        </div>

        {!product.is_available && (
          <>
            <span aria-hidden="true" className="absolute inset-0 bg-cream-200/55" />
            <Badge className="absolute left-3 top-3">Rasprodano</Badge>
          </>
        )}

        {/* Akcija se ne prikazuje na rasprodanom proizvodu - popust na nesto
            sto se ne moze kupiti je samo sum.

            Pozicioniranje nosi omotac, ne badz: badz je iznutra `relative`
            (zbog sjaja koji preko njega prelazi), pa bi `absolute` na njemu
            izgubio bitku sa Tailwind poretkom klasa i tiho pao na dno slike. */}
        {product.is_available && product.promo && (
          <div className="absolute left-3 top-3">
            <AkcijaBadge promo={product.promo} />
          </div>
        )}
      </div>

      <div className="relative flex flex-1 flex-col p-3 min-[480px]:p-4 lg:p-5">
        {/* Naslov nosi rastegnuti ::after, pa cijela kartica otvara izbor
            velicine. Rasprodan proizvod gubi taj sloj - nema sta da se bira. */}
        <h3 className="t-card-title !text-[15px] min-[480px]:!text-[17px] lg:!text-[20px]">
          <button
            type="button"
            onClick={() => onAdd(product)}
            disabled={!product.is_available}
            className="line-clamp-2 text-left after:absolute after:inset-0 after:content-[''] enabled:hover:underline disabled:after:hidden"
          >
            {product.name}
          </button>
        </h3>

        <p className="t-small mt-1 line-clamp-2 text-muted max-[479px]:hidden">{product.short_desc}</p>

        {/* mt-auto, ne mt-3: u redu od dvije kartice jedan naslov prelomi u
            dva reda a drugi ne, pa su dugmad zavrsavala na razlicitim
            visinama. Cijena i dugme se sad lijepe za dno kartice. */}
        <div className="mt-auto flex items-end justify-between gap-2 pt-3 min-[480px]:pt-4">
          <div className="min-w-0">
            <span className="t-small block text-muted">od</span>
            <Price fening={product.fromPriceFening} className="!text-[17px] min-[480px]:!text-[20px] lg:!text-[22px]" />
            {product.promo && product.fromRegularPriceFening > product.fromPriceFening && (
              <StaraCijena
                fening={formatKMFull(product.fromRegularPriceFening)}
                className="t-small mt-0.5 block"
              />
            )}
          </div>
          <span className="t-small shrink-0 text-muted max-[479px]:hidden">
            {product.variants.length} veličine
          </span>
        </div>

        {/* z-10 je obavezan: dugme mora biti iznad rastegnutog ::after sloja. */}
        <div className="relative z-10 mt-3 min-[480px]:mt-4">
          <Button
            fullWidth
            variant="primary"
            onClick={() => onAdd(product)}
            disabled={!product.is_available}
            className="!px-3 max-[479px]:!h-11 max-[479px]:!text-[13px] [@media(hover:hover)_and_(pointer:fine)]:h-10"
          >
            {product.is_available ? 'Odaberi veličinu' : 'Rasprodano'}
          </Button>
        </div>
      </div>

    </motion.article>
  )
}
