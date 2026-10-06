import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { api, ApiError } from '../../lib/api'
import { ORDER_STATUSES, type OrderStatus } from '../../config/brand'
import type { AdminOrder, AdminSummary } from '../../types'
import { formatDate, formatDateLong, formatDateTime, formatKMFull } from '../../lib/format'
import { Badge, EmptyState, GoldRule, Skeleton } from '../../components/ui/Bits'
import { Button } from '../../components/ui/Button'
import { cn } from '../../lib/cn'
import { EASE } from '../../motion/tokens'
import { useAdminToken } from './adminToken'
import { AdminSection, Greska, StatCard } from './bits'

const STATUS_TONE: Record<string, 'neutral' | 'gold' | 'success' | 'error'> = {
  nova: 'gold',
  potvrdjena: 'neutral',
  upripremi: 'neutral',
  spremna: 'success',
  zavrsena: 'success',
  otkazana: 'error',
}

const selectKlase =
  'h-11 rounded-md border border-control bg-surface px-3 pr-8 text-[14px] text-body ' +
  'focus:border-accent focus:shadow-ring focus:outline-none'

export function AdminOrders() {
  const token = useAdminToken()
  const reduce = useReducedMotion()

  const [summary, setSummary] = useState<AdminSummary | null>(null)
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [pickup, setPickup] = useState('')
  const [upit, setUpit] = useState('')
  /** Odgodjen `upit` - svako slovo ne smije biti jedan mrezni zahtjev. */
  const [trazi, setTrazi] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setTrazi(upit.trim()), 300)
    return () => clearTimeout(t)
  }, [upit])

  const ucitajSummary = useCallback(() => {
    api
      .adminSummary(token)
      .then(setSummary)
      .catch(() => setSummary(null))
  }, [token])

  const ucitajNarudzbe = useCallback(() => {
    setLoading(true)
    setError(null)
    api
      .adminOrders(token, { status: status || undefined, q: trazi || undefined, pickup: pickup || undefined })
      .then(setOrders)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Greška pri učitavanju.'))
      .finally(() => setLoading(false))
  }, [token, status, trazi, pickup])

  useEffect(() => { ucitajSummary() }, [ucitajSummary])
  useEffect(() => { ucitajNarudzbe() }, [ucitajNarudzbe])

  async function postaviStatus(id: number, noviStatus: OrderStatus) {
    setBusyId(id)
    try {
      await api.adminSetStatus(token, id, noviStatus)
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: noviStatus } : o)))
      // Brojevi u pregledu zavise od statusa (otkazano ne ulazi u prihod),
      // pa se pregled osvjezava zajedno sa listom.
      ucitajSummary()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Status nije promijenjen.')
    } finally {
      setBusyId(null)
    }
  }

  const filterAktivan = Boolean(status || pickup || trazi)

  const statusChipovi = useMemo(() => {
    if (!summary) return []
    return (Object.keys(ORDER_STATUSES) as OrderStatus[])
      .map((k) => ({ k, label: ORDER_STATUSES[k], n: summary.statusi[k] ?? 0 }))
      .filter((s) => s.n > 0)
  }, [summary])

  return (
    <div>
      {error && <Greska>{error}</Greska>}

      {/* ----------------------------------------------------------- PREGLED */}
      {summary ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            index={0}
            label="Danas"
            value={String(summary.danas.n)}
            hint={`${formatKMFull(summary.danas.total)} prometa`}
          />
          <StatCard
            index={1}
            label="Zadnjih 7 dana"
            value={String(summary.sedmica.n)}
            hint={`${formatKMFull(summary.sedmica.total)} prometa`}
          />
          <StatCard
            index={2}
            label="Zadnjih 30 dana"
            value={String(summary.mjesec.n)}
            hint={`${formatKMFull(summary.mjesec.total)} prometa`}
          />
          <StatCard
            index={3}
            label="Popusti (30 dana)"
            value={formatKMFull(summary.popustMjesec)}
            hint={`${summary.brojAkcija} ${summary.brojAkcija === 1 ? 'aktivna akcija' : 'aktivnih akcija'}`}
          />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[108px] rounded-2xl" />
          ))}
        </div>
      )}

      {statusChipovi.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="t-eyebrow">Sve narudžbe</span>
          {statusChipovi.map((s) => (
            <button
              key={s.k}
              type="button"
              onClick={() => { setStatus(status === s.k ? '' : s.k); setPickup('') }}
              className={cn(
                'inline-flex h-8 items-center gap-2 rounded-sm border px-2.5 text-[13px]',
                'transition-colors duration-150 ease-crisp',
                status === s.k
                  ? 'border-accent bg-cocoa-50 text-heading'
                  : 'border-hairline bg-surface text-body hover:bg-cocoa-50',
              )}
              aria-pressed={status === s.k}
            >
              {s.label}
              <span className="tabular text-muted">{s.n}</span>
            </button>
          ))}
        </div>
      )}

      {/* --------------------------------------------- STA SE KAD PREUZIMA */}
      {summary && summary.pickup.length > 0 && (
        <AdminSection title="Šta se kad preuzima">
          <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {summary.pickup.map((dan, i) => (
              <motion.li
                key={dan.pickup_date}
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: EASE.silk, delay: Math.min(i, 6) * 0.04 }}
                className={cn(
                  'rounded-2xl border bg-surface p-4 shadow-sm transition-colors duration-150 ease-crisp',
                  pickup === dan.pickup_date ? 'border-accent' : 'border-hairline',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-[17px] leading-tight text-heading">
                      {formatDateLong(dan.pickup_date)}
                    </p>
                    <p className="t-small mt-0.5 text-muted">
                      {dan.n} {dan.n === 1 ? 'narudžba' : 'narudžbe'} · {formatKMFull(dan.total)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setStatus('')
                      setPickup(pickup === dan.pickup_date ? '' : dan.pickup_date)
                    }}
                    className="t-small shrink-0 rounded-md px-2 py-1.5 text-cocoa-700 underline underline-offset-2 transition-colors duration-150 ease-crisp hover:bg-cocoa-700/[0.06]"
                  >
                    {pickup === dan.pickup_date ? 'Očisti' : 'Prikaži'}
                  </button>
                </div>

                <GoldRule className="my-3" />

                <ul className="space-y-1 text-[14px]">
                  {dan.items.map((it, j) => (
                    <li key={j} className="flex justify-between gap-3">
                      <span className="text-body">
                        {it.name_snapshot}
                        <span className="text-muted"> · {it.variant_label}</span>
                      </span>
                      <span className="tabular shrink-0 font-medium text-heading">{it.qty}×</span>
                    </li>
                  ))}
                </ul>
              </motion.li>
            ))}
          </ul>
        </AdminSection>
      )}

      {/* ------------------------------------------------------ TOP PROIZVODI */}
      {summary && summary.topProizvodi.length > 0 && (
        <AdminSection title="Najtraženije (90 dana)">
          <ul className="divide-y divide-hairline overflow-hidden rounded-2xl border border-hairline bg-surface">
            {summary.topProizvodi.map((p) => (
              <li key={p.name_snapshot} className="flex items-center justify-between gap-4 px-4 py-3">
                <span className="text-[15px] text-body">{p.name_snapshot}</span>
                <span className="t-small shrink-0 text-muted">
                  <span className="tabular font-medium text-heading">{p.qty}×</span>{' '}
                  · {formatKMFull(p.total)}
                </span>
              </li>
            ))}
          </ul>
        </AdminSection>
      )}

      {/* ---------------------------------------------------------- NARUDZBE */}
      <AdminSection
        title="Narudžbe"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2">
              <span className="sr-only">Pretraga</span>
              <input
                type="search"
                value={upit}
                onChange={(e) => setUpit(e.target.value)}
                placeholder="Broj, ime ili telefon"
                className="h-11 w-[200px] rounded-md border border-control bg-surface px-3 text-[14px] text-body placeholder:text-mocha-500 focus:border-accent focus:shadow-ring focus:outline-none"
              />
            </label>
            <label className="flex items-center gap-2">
              <span className="t-small text-muted">Status</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={selectKlase}
              >
                <option value="">Sve</option>
                {Object.entries(ORDER_STATUSES).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </label>
            <Button variant="secondary" onClick={() => { ucitajNarudzbe(); ucitajSummary() }} loading={loading}>
              Osvježi
            </Button>
          </div>
        }
      >
        {pickup && (
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-md border border-hairline bg-sunken px-4 py-2.5">
            <span className="t-small text-body">
              Prikazane su samo narudžbe za preuzimanje <strong>{formatDate(pickup)}</strong>
            </span>
            <button
              type="button"
              onClick={() => setPickup('')}
              className="t-small text-cocoa-700 underline underline-offset-2"
            >
              Prikaži sve
            </button>
          </div>
        )}

        {loading && orders.length === 0 ? (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <EmptyState
            title="Nema narudžbi"
            description={
              filterAktivan
                ? 'Nijedna narudžba ne odgovara filteru.'
                : 'Još nije stigla nijedna narudžba.'
            }
            action={
              filterAktivan ? (
                <Button
                  variant="secondary"
                  onClick={() => { setStatus(''); setPickup(''); setUpit('') }}
                >
                  Očisti filter
                </Button>
              ) : undefined
            }
          />
        ) : (
          <ul className="space-y-4">
            <AnimatePresence initial={false}>
              {orders.map((o) => {
                const popust = o.items.reduce((s, i) => s + (i.discount_fening ?? 0), 0)
                return (
                  <motion.li
                    key={o.id}
                    layout={reduce ? false : 'position'}
                    initial={reduce ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, transition: { duration: 0.15 } }}
                    transition={{ duration: 0.3, ease: EASE.silk }}
                    className={cn(
                      'rounded-2xl border border-hairline bg-surface p-5 shadow-sm transition-opacity',
                      busyId === o.id && 'pointer-events-none opacity-55',
                    )}
                    aria-busy={busyId === o.id || undefined}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="font-display text-[20px] tracking-[0.02em] text-heading">
                            {o.order_number}
                          </span>
                          <Badge tone={STATUS_TONE[o.status] ?? 'neutral'}>
                            {ORDER_STATUSES[o.status as OrderStatus] ?? o.status}
                          </Badge>
                          {popust > 0 && <Badge tone="gold">Akcija</Badge>}
                        </div>
                        <p className="t-small mt-1 text-muted">Primljeno {formatDateTime(o.created_at)}</p>
                      </div>
                      <select
                        value={o.status}
                        onChange={(e) => postaviStatus(o.id, e.target.value as OrderStatus)}
                        aria-label={`Status narudžbe ${o.order_number}`}
                        className={cn(selectKlase, 'bg-sunken')}
                      >
                        {Object.entries(ORDER_STATUSES).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    </div>

                    <GoldRule className="my-4" />

                    <div className="grid gap-5 md:grid-cols-[1fr_1.2fr]">
                      <dl className="space-y-2.5 text-[14px]">
                        <div>
                          <dt className="t-eyebrow">Kupac</dt>
                          <dd className="mt-0.5 text-body">{o.customer_name}</dd>
                        </div>
                        <div>
                          <dt className="t-eyebrow">Telefon</dt>
                          <dd className="mt-0.5">
                            <a href={`tel:${o.phone.replace(/\s/g, '')}`} className="text-cocoa-700 hover:underline">
                              {o.phone}
                            </a>
                          </dd>
                        </div>
                        {o.email && (
                          <div>
                            <dt className="t-eyebrow">E-mail</dt>
                            <dd className="mt-0.5">
                              <a href={`mailto:${o.email}`} className="break-all text-cocoa-700 hover:underline">
                                {o.email}
                              </a>
                            </dd>
                          </div>
                        )}
                        <div>
                          <dt className="t-eyebrow">
                            {o.fulfillment === 'dostava' ? 'Dostava' : 'Preuzimanje'} · {formatDate(o.pickup_date)}
                          </dt>
                          {o.fulfillment === 'dostava' && (
                            <dd className="mt-0.5 text-body">{o.address}, {o.city}</dd>
                          )}
                        </div>
                        {o.note && (
                          <div>
                            <dt className="t-eyebrow">Napomena</dt>
                            <dd className="mt-0.5 whitespace-pre-wrap text-body">{o.note}</dd>
                          </div>
                        )}
                      </dl>

                      <div>
                        <p className="t-eyebrow mb-2">Stavke</p>
                        <ul className="space-y-1.5 text-[14px]">
                          {o.items.map((it, i) => (
                            <li key={i} className="flex justify-between gap-4">
                              <span className="text-body">
                                {it.qty} × {it.name_snapshot}
                                <span className="text-muted"> · {it.variant_label}</span>
                                {/* Zasto je cijena bila niza - snapshot ostaje
                                    citljiv i kad akcija vise ne postoji. */}
                                {it.promo_snapshot && (
                                  <span className="t-small block text-gold-700">{it.promo_snapshot}</span>
                                )}
                              </span>
                              <span className="tabular shrink-0 text-body">
                                {formatKMFull(it.line_total_fening)}
                              </span>
                            </li>
                          ))}
                        </ul>

                        <GoldRule className="my-3" />

                        {/* Kad je bilo popusta, prvi red je REDOVNA cijena, pa
                            usteda ide kao odbitak - inace "medjuzbir" (koji je
                            vec snizen) minus usteda ne daje ukupno i racun
                            izgleda pogresno. */}
                        <div className="space-y-1 text-[14px]">
                          <div className="flex justify-between">
                            <span className="text-muted">
                              {popust > 0 ? 'Međuzbir (redovno)' : 'Međuzbir'}
                            </span>
                            <span className="tabular">
                              {formatKMFull(o.subtotal_fening + popust)}
                            </span>
                          </div>
                          {popust > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted">Ušteda na akciji</span>
                              <span className="tabular text-gold-700">−{formatKMFull(popust)}</span>
                            </div>
                          )}
                          {o.delivery_fening > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted">Dostava</span>
                              <span className="tabular">{formatKMFull(o.delivery_fening)}</span>
                            </div>
                          )}
                          <div className="flex justify-between pt-1 font-medium text-heading">
                            <span>Ukupno</span>
                            <span className="tabular">{formatKMFull(o.total_fening)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.li>
                )
              })}
            </AnimatePresence>
          </ul>
        )}
      </AdminSection>
    </div>
  )
}
