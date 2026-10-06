import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { splitKM } from '../../lib/format'

/** Linija koja se materijalizuje i rastvori - tiskarski ornament, ne ivica. */
export function GoldRule({ short, className }: { short?: boolean; className?: string }) {
  return <hr aria-hidden="true" className={cn(short ? 'rule-gold--short' : 'rule-gold', className)} />
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('t-eyebrow', className)}>{children}</p>
}

export function SectionHeader({
  eyebrow,
  title,
  lead,
  action,
  center = false,
  className,
}: {
  eyebrow?: string
  title: string
  lead?: string
  action?: ReactNode
  center?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        'mb-section-sm flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      {/* Lijevo poravnanje na mobitelu UVIJEK - centriran tekst kratke mjere
          na 390px ekranu izgleda razbijeno sa obje strane. */}
      <div className={cn('max-w-content', center && 'md:mx-auto md:text-center')}>
        {eyebrow && (
          <>
            <Eyebrow>{eyebrow}</Eyebrow>
            <GoldRule short className={cn('mt-2.5', center && 'md:mx-auto')} />
          </>
        )}
        <h2 className={cn('t-h2', eyebrow ? 'mt-3' : '')}>{title}</h2>
        {lead && <p className="t-lead mt-4 max-w-prose text-body">{lead}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode
  tone?: 'neutral' | 'gold' | 'success' | 'error'
  className?: string
}) {
  const tones = {
    neutral: 'bg-cream-300 text-mocha-700',
    gold: 'bg-gold-100 text-gold-700',
    success: 'bg-sage-100 text-sage-700',
    error: 'bg-rouge-100 text-rouge-700',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm px-2 py-1 text-[11px] font-medium uppercase tracking-[0.1em]',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('relative overflow-hidden rounded-md bg-sunken', className)}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-cream-50/60 to-transparent" />
    </div>
  )
}

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-hairline bg-surface shadow-sm">
      <Skeleton className="aspect-square rounded-none" />
      <div className="space-y-3 p-4 lg:p-5">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-11 w-full rounded-lg" />
      </div>
    </div>
  )
}

export function Price({ fening, className }: { fening: number; className?: string }) {
  const { amount, currency } = splitKM(fening)
  return (
    <span className={cn('t-price inline-flex items-baseline gap-1', className)}>
      {/* min-width u ch sprjecava skakanje kolone i ako font nema tnum. */}
      <span className="min-w-[3.5ch] text-right tabular">{amount}</span>
      <span className="t-currency">{currency}</span>
    </span>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="mx-auto max-w-content py-section-sm text-center">
      <h3 className="t-h3">{title}</h3>
      <p className="mt-3 text-body">{description}</p>
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  )
}
