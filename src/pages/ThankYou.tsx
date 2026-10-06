import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useParams } from 'react-router-dom'
import { api } from '../lib/api'
import type { PublicOrder } from '../types'
import { brand } from '../config/brand'
import { formatDate, formatKMFull } from '../lib/format'
import { EmptyState, Eyebrow, GoldRule, Price, Skeleton } from '../components/ui/Bits'
import { LinkButton } from '../components/ui/Button'
import { EASE } from '../motion/tokens'

/** Cetiri takta, bez konfeta. Jedino drugo mjesto na sajtu sa overshootom. */
function ConfirmMark() {
  const reduce = useReducedMotion()

  if (reduce) {
    return (
      <svg viewBox="0 0 96 96" className="h-20 w-20" fill="none" aria-hidden="true">
        <circle cx="48" cy="48" r="42" stroke="rgb(var(--c-gold-400))" strokeWidth="2" />
        <path
          d="M31 49.5 43 61l22-25"
          stroke="rgb(var(--c-cocoa-700))"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  return (
    <motion.svg
      viewBox="0 0 96 96"
      className="h-20 w-20"
      fill="none"
      aria-hidden="true"
      animate={{ scale: [1, 1.06, 1] }}
      transition={{ duration: 0.44, ease: EASE.settle, delay: 0.56 }}
    >
      <motion.circle
        cx="48" cy="48" r="42"
        stroke="rgb(var(--c-gold-400))" strokeWidth="2" strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.52, ease: EASE.silk }}
      />
      <motion.path
        d="M31 49.5 43 61l22-25"
        stroke="rgb(var(--c-cocoa-700))" strokeWidth="3.5"
        strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.38, ease: EASE.silk, delay: 0.3 }}
      />
    </motion.svg>
  )
}

export function ThankYou() {
  const { orderNumber = '' } = useParams()
  const reduce = useReducedMotion()
  const [order, setOrder] = useState<PublicOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    let cancelled = false
    api
      .order(orderNumber)
      .then((o) => !cancelled && setOrder(o))
      .catch(() => !cancelled && setMissing(true))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [orderNumber])

  if (missing) {
    return (
      <div className="container-page py-section">
        <EmptyState
          title="Narudžba nije pronađena"
          description={`Broj ${orderNumber} ne postoji u sistemu. Provjerite link ili nas nazovite.`}
          action={<LinkButton to="/#ponuda">Nazad na ponudu</LinkButton>}
        />
      </div>
    )
  }

  /** Ukupna ušteda na akciji. 0 i kad popusta nije bilo i za starije narudžbe
   *  koje `discount_fening` nemaju. */
  const popust = order?.items.reduce((suma, it) => suma + (it.discount_fening ?? 0), 0) ?? 0

  const fade = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5, ease: EASE.silk, delay },
        }

  return (
    <div className="container-page py-section">
      <div className="mx-auto max-w-content text-center">
        <div className="flex justify-center">
          <ConfirmMark />
        </div>

        <motion.div {...fade(0.7)}>
          <Eyebrow className="mt-8">Narudžba zaprimljena</Eyebrow>
          <h1 className="t-h1 mt-3">Hvala na narudžbi</h1>
          <p className="t-lead mt-4 text-body">
            Javimo se na telefon u najkraćem roku da potvrdimo detalje.
          </p>
        </motion.div>

        {!reduce ? (
          <motion.div
            className="mx-auto mt-8 w-full max-w-[280px] origin-left"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.6, ease: EASE.silk, delay: 0.85 }}
          >
            <GoldRule />
          </motion.div>
        ) : (
          <GoldRule className="mx-auto mt-8 max-w-[280px]" />
        )}

        <motion.p className="mt-8" {...fade(0.9)}>
          <span className="t-eyebrow block">Broj narudžbe</span>
          <span className="mt-2 block font-display text-[32px] tracking-[0.02em] text-heading">
            {orderNumber}
          </span>
        </motion.p>
      </div>

      <motion.div className="mx-auto mt-12 max-w-content" {...fade(1.0)}>
        <div className="rounded-2xl border border-hairline bg-surface p-5 shadow-sm sm:p-7">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : order ? (
            <>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="t-eyebrow">Na ime</dt>
                  <dd className="mt-1 text-body">{order.customer_name}</dd>
                </div>
                <div>
                  <dt className="t-eyebrow">
                    {order.fulfillment === 'dostava' ? 'Datum dostave' : 'Datum preuzimanja'}
                  </dt>
                  <dd className="mt-1 text-body">{formatDate(order.pickup_date)}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="t-eyebrow">
                    {order.fulfillment === 'dostava' ? 'Dostava na' : 'Preuzimanje na'}
                  </dt>
                  <dd className="mt-1 text-body">
                    {order.fulfillment === 'dostava'
                      ? `${order.address}, ${order.city}`
                      : `${brand.address}, ${brand.city}`}
                  </dd>
                </div>
              </dl>

              <GoldRule className="my-6" />

              <ul>
                {order.items.map((it, i) => (
                  <li key={i} className="flex items-start justify-between gap-4 py-2.5">
                    <div>
                      <p className="text-body">{it.name_snapshot}</p>
                      <p className="t-small text-muted">
                        {it.variant_label} · {it.qty} × {formatKMFull(it.unit_price_fening)}
                      </p>
                      {it.promo_snapshot && (
                        <p className="t-small text-gold-700">{it.promo_snapshot}</p>
                      )}
                    </div>
                    <span className="tabular shrink-0 text-body">
                      {formatKMFull(it.line_total_fening)}
                    </span>
                  </li>
                ))}
              </ul>

              <GoldRule className="my-4" />

              {/* Kad je bilo akcije, prvi red je REDOVNA cijena pa usteda ide
                  kao odbitak - "medjuzbir" je vec snizen, i oduzimanje od njega
                  ne bi dalo ukupno. */}
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="t-small text-muted">
                    {popust > 0 ? 'Međuzbir (redovno)' : 'Međuzbir'}
                  </dt>
                  <dd className="tabular text-body">
                    {formatKMFull(order.subtotal_fening + popust)}
                  </dd>
                </div>
                {popust > 0 && (
                  <div className="flex justify-between">
                    <dt className="t-small text-muted">Ušteda na akciji</dt>
                    <dd className="tabular text-gold-700">−{formatKMFull(popust)}</dd>
                  </div>
                )}
                {order.delivery_fening > 0 && (
                  <div className="flex justify-between">
                    <dt className="t-small text-muted">Dostava</dt>
                    <dd className="tabular text-body">{formatKMFull(order.delivery_fening)}</dd>
                  </div>
                )}
              </dl>

              <div className="mt-4 flex items-baseline justify-between">
                <span className="t-eyebrow">Ukupno</span>
                <Price fening={order.total_fening} />
              </div>

              <p className="t-small mt-5 text-muted">{brand.paymentNote}</p>
            </>
          ) : null}
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <LinkButton to="/#ponuda" variant="secondary">
            Nastavi razgledati
          </LinkButton>
          <a
            href={brand.phoneHref}
            className="inline-flex h-11 items-center justify-center rounded-lg px-5 text-[15px] font-medium text-cocoa-700 transition-colors duration-150 ease-crisp hover:bg-cocoa-700/[0.06]"
          >
            Nazovi nas: {brand.phone}
          </a>
        </div>
      </motion.div>
    </div>
  )
}
