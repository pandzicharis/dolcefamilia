import { cn } from '../../lib/cn'

export function QtyStepper({
  value,
  onChange,
  min = 1,
  max = 50,
  size = 'md',
  label = 'Količina',
}: {
  value: number
  onChange: (next: number) => void
  min?: number
  max?: number
  size?: 'sm' | 'md'
  label?: string
}) {
  // 44px na mobitelu uvijek; 36px vizuelno na desktopu za kompaktnu varijantu.
  const btn = cn(
    'grid place-items-center rounded-md border border-control text-cocoa-700',
    'transition-colors duration-150 ease-crisp hover:bg-cocoa-50',
    'disabled:border-cream-400 disabled:text-disabled disabled:hover:bg-transparent',
    size === 'sm' ? 'h-11 w-11 sm:h-9 sm:w-9' : 'h-11 w-11',
  )

  return (
    <div className="inline-flex items-center gap-1" role="group" aria-label={label}>
      <button
        type="button"
        className={btn}
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
        aria-label="Smanji količinu"
      >
        <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
          <path d="M3 8h10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      </button>

      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        aria-label={label}
        onChange={(e) => {
          const n = parseInt(e.target.value.replace(/\D/g, ''), 10)
          if (!Number.isNaN(n)) onChange(Math.min(Math.max(n, min), max))
        }}
        className={cn(
          'h-11 w-12 rounded-md border border-control bg-sunken text-center tabular text-body',
          'shadow-sunken focus:border-accent focus:shadow-ring focus:outline-none',
          size === 'sm' && 'sm:h-9',
        )}
      />

      <button
        type="button"
        className={btn}
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label="Povećaj količinu"
      >
        <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
          <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}
