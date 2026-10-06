import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api, ApiError } from '../lib/api'
import { useCart } from '../context/CartContext'
import { brand } from '../config/brand'
import { earliestPickupDate, formatDate, formatKMFull } from '../lib/format'
import { EmptyState, GoldRule, Price } from '../components/ui/Bits'
import { Button, LinkButton } from '../components/ui/Button'
import { SelectField, TextField, TextareaField } from '../components/ui/Field'
import { CakeImage } from '../components/CakeImage'
import { EASE } from '../motion/tokens'
import { cn } from '../lib/cn'

type Fulfillment = 'dostava' | 'preuzimanje'

/** Zaglavlje koraka. Bez rednog broja — naslovi su kratki i sami sebi dovoljni. */
function Korak({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-6">
      <h2 className="font-display text-[21px] leading-tight tracking-[-0.015em] text-heading">
        {title}
      </h2>
      {hint && <p className="t-small mt-1.5 text-muted">{hint}</p>}
      <GoldRule className="mt-4" />
    </div>
  )
}

export function Checkout() {
  const cart = useCart()
  const navigate = useNavigate()

  const [fulfillment, setFulfillment] = useState<Fulfillment>('preuzimanje')
  const [pickupDate, setPickupDate] = useState(() => earliestPickupDate(brand.minNoticeHours))
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)

  const minDate = earliestPickupDate(brand.minNoticeHours)
  const delivery = cart.deliveryFening(fulfillment)
  const total = cart.subtotalFening + delivery
  const doBesplatne = brand.freeDeliveryOverFening - cart.subtotalFening

  if (cart.items.length === 0) {
    return (
      <div className="container-page py-section">
        <EmptyState
          title="Korpa je prazna"
          description="Dodajte nešto iz ponude pa se vratite ovdje."
          action={<LinkButton to="/#ponuda">Pogledaj ponudu</LinkButton>}
        />
      </div>
    )
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setErrors({})
    setFormError(null)

    const fd = new FormData(e.currentTarget)
    const payload = {
      customerName: String(fd.get('customerName') ?? ''),
      phone: String(fd.get('phone') ?? ''),
      email: String(fd.get('email') ?? ''),
      fulfillment,
      address: String(fd.get('address') ?? ''),
      city: String(fd.get('city') ?? ''),
      pickupDate: String(fd.get('pickupDate') ?? ''),
      note: String(fd.get('note') ?? ''),
      // Samo identifikatori i kolicine - cijene racuna server iz baze.
      items: cart.items.map((i) => ({
        productId: i.productId,
        variantId: i.variantId,
        qty: i.qty,
      })),
    }

    try {
      const result = await api.createOrder(payload)
      cart.clear()
      navigate(`/narudzba/hvala/${result.orderNumber}`, { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.fields) setErrors(err.fields)
        setFormError(err.message)
      } else {
        setFormError('Nešto je pošlo po zlu. Pokušajte ponovo.')
      }
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setSubmitting(false)
    }
  }

  /** Veliki izborni blok umjesto obicnog radija - nosi i cijenu i objasnjenje. */
  const izbor = (value: Fulfillment, label: string, line1: string, line2: string) => {
    const opis = `${label}. ${line1}. ${line2}`
    const active = fulfillment === value
    return (
      <label
        className={cn(
          'group relative flex cursor-pointer flex-col justify-between gap-4 overflow-hidden rounded-2xl border p-5 sm:p-6',
          'transition-[border-color,background-color,box-shadow] duration-200 ease-crisp',
          active
            ? 'border-accent bg-cocoa-50 shadow-md'
            : 'border-hairline bg-surface hover:border-control hover:bg-cocoa-50/40',
        )}
      >
        <input
          type="radio"
          name="fulfillment"
          value={value}
          checked={active}
          onChange={() => setFulfillment(value)}
          aria-label={opis}
          className="sr-only"
        />
        <div className="flex items-start justify-between gap-3">
          <span className="font-display text-[20px] leading-tight text-heading">{label}</span>
          <span
            aria-hidden="true"
            className={cn(
              'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors duration-150',
              active ? 'border-accent bg-accent' : 'border-control bg-transparent',
            )}
          >
            {active && (
              <svg viewBox="0 0 12 12" className="h-3 w-3 text-onDark" aria-hidden="true">
                <path d="m2.5 6.2 2.3 2.3L9.5 3.8" stroke="currentColor" strokeWidth="1.8"
                  strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            )}
          </span>
        </div>
        <div>
          <p className="t-small text-body">{line1}</p>
          <p className="t-small mt-0.5 text-muted">{line2}</p>
        </div>
        {/* Zlatna linija koja se izvlaci po izboru - ista gesta kao na kartici. */}
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute inset-x-0 bottom-0 h-px origin-left bg-gold-400 transition-transform duration-300 ease-silk',
            active ? 'scale-x-100' : 'scale-x-0',
          )}
        />
      </label>
    )
  }

  return (
    <div className="container-page py-section-sm">
      <header className="max-w-content">
        <h1 className="t-display">Vaša narudžba</h1>
        <p className="t-lead mt-4 max-w-prose text-body">
          Ne plaćate ništa odmah. Javimo se na telefon da potvrdimo detalje prije nego krenemo
          peći.
        </p>
      </header>

      {formError && (
        <motion.div
          role="alert"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: EASE.crisp }}
          className="mt-10 flex items-start gap-3 rounded-2xl border border-rouge-600 bg-rouge-100 px-5 py-4"
        >
          <svg viewBox="0 0 20 20" className="mt-0.5 h-5 w-5 shrink-0 text-rouge-700" aria-hidden="true">
            <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <path d="M10 6v5M10 13.5v.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
          <p className="text-rouge-700">{formError}</p>
        </motion.div>
      )}

      <div className="mt-12 grid gap-12 lg:grid-cols-[1.35fr_1fr] lg:gap-16">
        {/* -------------------------------------------------------------- FORMA */}
        <form onSubmit={onSubmit} noValidate>
          <section>
            <Korak title="Kako preuzimate" />
            <fieldset className="grid gap-4 sm:grid-cols-2">
              <legend className="sr-only">Način preuzimanja</legend>
              {izbor(
                'preuzimanje',
                'Preuzimam lično',
                `${brand.address}, ${brand.city}`,
                'Bez dodatnih troškova',
              )}
              {izbor(
                'dostava',
                'Dostava',
                brand.deliveryCities.join(', '),
                delivery === 0
                  ? 'Besplatno za ovu narudžbu'
                  : `${formatKMFull(brand.deliveryFeeFening)} · besplatno preko ${formatKMFull(brand.freeDeliveryOverFening)}`,
              )}
            </fieldset>

            {/* Prag besplatne dostave je najkorisniji tacno ovdje, dok korisnik
                jos moze dodati jednu stavku. */}
            {fulfillment === 'dostava' && doBesplatne > 0 && (
              <p className="t-small mt-4 rounded-md bg-gold-100 px-4 py-2.5 text-gold-700">
                Još {formatKMFull(doBesplatne)} do besplatne dostave.
              </p>
            )}
          </section>

          <section className="mt-section-sm">
            <Korak title="Vaši podaci" hint="Zovemo na ovaj broj da potvrdimo narudžbu." />
            <div className="grid gap-x-5 sm:grid-cols-2">
              <TextField
                label="Ime i prezime" name="customerName" autoComplete="name" required
                error={errors.customerName} className="sm:col-span-2"
              />
              <TextField
                label="Telefon" name="phone" type="tel" inputMode="tel" autoComplete="tel"
                placeholder="+387 6x xxx xxx" required error={errors.phone}
              />
              <TextField
                label="E-mail" name="email" type="email" autoComplete="email" optional
                error={errors.email}
              />

              {fulfillment === 'dostava' && (
                <>
                  <TextField
                    label="Adresa za dostavu" name="address" autoComplete="street-address"
                    required error={errors.address} className="sm:col-span-2"
                  />
                  <SelectField
                    label="Grad" name="city" autoComplete="address-level2" required
                    defaultValue="" error={errors.city}
                  >
                    <option value="" disabled>Odaberite grad</option>
                    {brand.deliveryCities.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </SelectField>
                </>
              )}
            </div>
          </section>

          <section className="mt-section-sm">
            <Korak
              title="Kada i kako"
              hint={`Najraniji termin je ${brand.minNoticeHours}h od sada — toliko treba da sve odstoji.`}
            />
            <div className="grid gap-x-5 sm:grid-cols-2">
              <TextField
                label={fulfillment === 'dostava' ? 'Datum dostave' : 'Datum preuzimanja'}
                name="pickupDate" type="date" min={minDate}
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
                required error={errors.pickupDate}
              />
              <div className="hidden sm:block" />
              <TextareaField
                label="Napomena za poslastičara" name="note" optional
                placeholder="Natpis na torti, alergije, vrijeme preuzimanja…"
                error={errors.note} className="sm:col-span-2"
              />
            </div>
          </section>

          <GoldRule className="my-section-sm" />

          <Button type="submit" size="lg" fullWidth loading={submitting} className="sm:w-auto sm:min-w-[280px]">
            Pošalji narudžbu
          </Button>
          <p className="t-small mt-3 max-w-prose text-muted">
            Slanjem narudžbe ne plaćate ništa odmah. {brand.paymentNote}
          </p>
        </form>

        {/* ------------------------------------------------------------ SAŽETAK */}
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="overflow-hidden rounded-3xl border border-hairline bg-surface shadow-lg">
            <div className="border-b border-hairline bg-cream-100/70 px-6 py-5">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-display text-[21px] leading-none text-heading">Sažetak</h2>
                <span className="t-small text-muted">
                  {cart.count} {cart.count === 1 ? 'stavka' : 'stavki'}
                </span>
              </div>
            </div>

            <ul className="px-6">
              {cart.items.map((item, i) => (
                <li key={item.key} className={cn(i > 0 && 'border-t border-cream-300')}>
                  <div className="flex gap-4 py-5">
                    <CakeImage
                      seed={item.slug} src={item.image} alt={item.name} reveal={false}
                      className="w-16 shrink-0 rounded-xl shadow-sm"
                    />
                    <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-display text-[17px] leading-snug text-heading">{item.name}</p>
                        <p className="t-small mt-0.5 text-muted">{item.variantLabel}</p>
                        <p className="t-small mt-1.5 text-muted">
                          <span className="tabular">{item.qty}</span> × {formatKMFull(item.unitPriceFening)}
                        </p>
                      </div>
                      <span className="tabular shrink-0 pt-0.5 text-[15px] text-cocoa-800">
                        {formatKMFull(item.unitPriceFening * item.qty)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="px-6 pb-6">
              <GoldRule className="mb-5" />

              <dl className="space-y-2.5">
                <div className="flex justify-between">
                  <dt className="t-small text-muted">Međuzbir</dt>
                  <dd className="tabular text-body">{formatKMFull(cart.subtotalFening)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="t-small text-muted">
                    {fulfillment === 'dostava' ? 'Dostava' : 'Preuzimanje'}
                  </dt>
                  <dd className={cn('tabular t-small', delivery === 0 ? 'text-sage-700' : 'text-body')}>
                    {delivery === 0 ? 'besplatno' : formatKMFull(delivery)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="t-small text-muted">
                    {fulfillment === 'dostava' ? 'Datum dostave' : 'Datum preuzimanja'}
                  </dt>
                  <dd className="t-small text-body">{formatDate(pickupDate)}</dd>
                </div>
              </dl>

              <GoldRule className="my-5" />

              <div className="flex items-baseline justify-between">
                <span className="t-eyebrow">Ukupno</span>
                <Price fening={total} className="text-[26px]" />
              </div>
            </div>
          </div>

          <p className="t-small mt-5 pl-1 text-muted">
            Imate pitanje prije slanja?{' '}
            <a href={brand.phoneHref} className="text-cocoa-700 underline underline-offset-2">
              {brand.phone}
            </a>
          </p>
        </aside>
      </div>
    </div>
  )
}
