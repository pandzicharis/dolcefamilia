import { useEffect, useMemo, useState } from 'react'
import { api } from '../../lib/api'
import type { Category, Product } from '../../types'
import { Button } from '../ui/Button'
import { EmptyState, GoldRule } from '../ui/Bits'
import { Rozeta } from '../ui/Dekor'
import { CategoryFilter } from '../product/CategoryFilter'
import { QuickAdd } from '../product/QuickAdd'
import { ProductGrid } from '../product/ProductGrid'

export function Ponuda() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [category, setCategory] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  /** Proizvod cija se velicina trenutno bira. */
  const [izbor, setIzbor] = useState<Product | null>(null)

  useEffect(() => {
    api.categories().then(setCategories).catch(() => setCategories([]))
  }, [])

  // Cijeli katalog se dohvati jednom; filtriranje je lokalno.
  // Mrezni zahtjev po kliku na cip bio bi vidljiv zastoj usred skrola,
  // a rijec je o dvanaest proizvoda.
  useEffect(() => {
    let cancelled = false
    api
      .products()
      .then((p) => !cancelled && setProducts(p))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [])

  const visible = useMemo(
    () => (category ? products.filter((p) => p.category === category) : products),
    [products, category],
  )

  return (
    <section id="ponuda" className="container-page scroll-mt-20 sm:scroll-mt-24 pb-section-sm">
      <div className="mb-6 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between sm:gap-5">
        <div>
          {/* Rozeta uz naslov: katalog pocinje bez fotografije u vidokrugu na
              mobitelu, pa jedan pipani ukras odmah kaze sta se prodaje. */}
          <div className="flex items-center gap-2.5">
            <Rozeta />
            <h2 className="font-display text-[clamp(1.5rem,3vw,2rem)] leading-tight tracking-[-0.02em] text-heading">
              Ponuda
            </h2>
          </div>
          <p className="t-small mt-1.5 max-w-[46ch] text-muted">
            Svaka torta u tri veličine, od 8 do 24 osobe. Veličinu i cijenu birate pri dodavanju u korpu.
          </p>
        </div>
        <CategoryFilter categories={categories} active={category} onChange={setCategory} />
      </div>

      <GoldRule className="mb-6 sm:mb-10" />

      {error ? (
        <EmptyState
          title="Ponuda se ne može učitati"
          description={error}
          action={<Button onClick={() => window.location.reload()}>Pokušaj ponovo</Button>}
        />
      ) : !loading && visible.length === 0 ? (
        <EmptyState
          title="Nema rezultata"
          description="U ovoj kategoriji trenutno nema proizvoda."
          action={
            <Button variant="secondary" onClick={() => setCategory(null)}>
              Prikaži sve
            </Button>
          }
        />
      ) : (
        <ProductGrid products={visible} loading={loading} skeletonCount={6} onAdd={setIzbor} />
      )}

      <QuickAdd product={izbor} open={izbor !== null} onClose={() => setIzbor(null)} />
    </section>
  )
}
