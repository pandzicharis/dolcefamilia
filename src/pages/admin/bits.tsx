import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '../../lib/cn'
import { EASE } from '../../motion/tokens'

/**
 * Kartica sa jednim brojem. Broj je u display fontu i tabularnim ciframa -
 * admin ih cita jedan ispod drugog i nejednake sirine cifara cine kolonu
 * nervoznom.
 */
export function StatCard({
  label,
  value,
  hint,
  index = 0,
}: {
  label: string
  value: string
  hint?: string
  index?: number
}) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE.silk, delay: Math.min(index, 5) * 0.05 }}
      className="rounded-2xl border border-hairline bg-surface p-4 shadow-sm sm:p-5"
    >
      <p className="t-eyebrow">{label}</p>
      <p className="tabular mt-2 font-display text-[26px] leading-none text-heading sm:text-[30px]">
        {value}
      </p>
      {hint && <p className="t-small mt-1.5 text-muted">{hint}</p>}
    </motion.div>
  )
}

/** Naslov grupe unutar admin ekrana. */
export function AdminSection({
  title,
  action,
  children,
  className,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('mt-10', className)}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-[20px] leading-tight text-heading">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

/**
 * Checkbox sa labelom. Field.tsx pokriva text/select/textarea, ali ne i ovo -
 * admin forma je jedino mjesto na sajtu sa checkboxom.
 *
 * Cijeli red je pogodak (>=44px), jer je ovo forma koju neko puni na telefonu
 * u radionici.
 */
export function Checkbox({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-md border border-hairline bg-surface px-3.5 py-2.5 transition-colors duration-150 ease-crisp hover:bg-cocoa-50">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-[18px] w-[18px] shrink-0 accent-[rgb(var(--accent))]"
      />
      <span className="min-w-0">
        <span className="block text-[15px] font-medium text-heading">{label}</span>
        {hint && <span className="t-small block text-muted">{hint}</span>}
      </span>
    </label>
  )
}

/**
 * Poruke za polja koja forma ne crta. Server validira vise polja nego sto ih
 * forma prikazuje (putanja slike, vrijednosti iz selecta), pa bi bez ovoga
 * ostala samo opsta poruka "Provjerite unesene podatke" bez ijednog traga.
 */
export function neprikazane(
  fields: Record<string, string> | undefined,
  poznata: string[],
): string[] {
  if (!fields) return []
  return Object.entries(fields)
    .filter(([k]) => !poznata.includes(k) && !k.startsWith('variant'))
    .map(([, v]) => v)
}

/** Traka sa greskom. Isti izgled na svim admin ekranima. */
export function Greska({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="mb-6 rounded-md border border-rouge-600 bg-rouge-100 px-4 py-3">
      <p className="text-rouge-700">{children}</p>
    </div>
  )
}

/** Traka sa potvrdom. Nestaje sama - pozivatelj drzi tajmer. */
export function Potvrda({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      role="status"
      initial={reduce ? false : { opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.18 } }}
      transition={{ duration: 0.3, ease: EASE.silk }}
      className="mb-6 rounded-md border border-sage-500 bg-sage-100 px-4 py-3"
    >
      <p className="text-sage-700">{children}</p>
    </motion.div>
  )
}
