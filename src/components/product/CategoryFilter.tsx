import type { Category } from '../../types'
import { cn } from '../../lib/cn'

export function CategoryFilter({
  categories,
  active,
  onChange,
}: {
  categories: Category[]
  active: string | null
  onChange: (slug: string | null) => void
}) {
  const chip = (isActive: boolean) =>
    cn(
      'inline-flex h-10 shrink-0 snap-start items-center rounded-lg px-3.5 text-[14px] font-medium sm:h-11 sm:px-4',
      'transition-colors duration-150 ease-crisp',
      isActive
        ? 'bg-accent text-onDark'
        : 'border border-hairline bg-surface text-body hover:border-control hover:bg-cocoa-50',
    )

  return (
    <div
      role="group"
      aria-label="Filter po kategoriji"
      className={cn(
        '-mx-gutter flex snap-x gap-2 overflow-x-auto px-gutter pb-1',
        '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        // Zadnji cip se na telefonu uvijek sijece na pola i to izgleda kao
        // greska u layoutu. Maska pretvara rez u blijedjenje — isti piksel,
        // ali sad cita kao "ima jos desno".
        '[mask-image:linear-gradient(to_right,#000_0,#000_calc(100%-2rem),transparent_100%)]',
        'sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:[mask-image:none]',
      )}
    >
      <button type="button" className={chip(active === null)} onClick={() => onChange(null)}>
        Sve
      </button>
      {categories.map((c) => (
        <button
          key={c.slug}
          type="button"
          className={chip(active === c.slug)}
          onClick={() => onChange(c.slug)}
          aria-pressed={active === c.slug}
        >
          {c.name}
          <span className="ml-2 text-[12px] opacity-60 tabular">{c.count}</span>
        </button>
      ))}
    </div>
  )
}
