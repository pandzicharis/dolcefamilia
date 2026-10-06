import { brand } from '../../config/brand'
import { formatKMFull } from '../../lib/format'
import { Reveal } from '../ui/Reveal'
import { Posip } from '../ui/Dekor'

/**
 * Kompaktna traka, ne sekcija sa slikom i naslovom.
 * Kupac koji je dosao do dna vec zna sta prodajemo — treba mu broj telefona,
 * adresa i radno vrijeme, u jednom pogledu.
 */
export function Kontakt() {
  return (
    <section id="kontakt" className="relative scroll-mt-20 sm:scroll-mt-24 border-t border-hairline bg-cream-50/70">
      {/* Pipani rub umjesto gole ivice: traka sa kontaktom je zadnja povrsina
          bez fotografije, pa nosi isti luk kao preljev na crtanoj torti. */}
      <div aria-hidden="true" className="traka-krem animate-piping w-full" />
      <Posip gustina="tiha" className="opacity-70" />

      <div className="container-page relative pb-section-sm pt-8 sm:pt-10">
        <Reveal>
          {/* Dvije kolone vec na telefonu: cetiri bloka pune sirine su cetiri
              ekrana skrolanja za podatke koji staju u jedan pogled. */}
          <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:gap-x-8 sm:gap-y-10 lg:grid-cols-4 lg:gap-8">
            <div>
              <p className="t-eyebrow">Telefon</p>
              <a
                href={brand.phoneHref}
                className="mt-2.5 block font-display text-[19px] leading-tight text-heading transition-colors duration-150 ease-crisp hover:text-cocoa-600 sm:text-[21px]"
              >
                {brand.phone}
              </a>
              <a
                href={`mailto:${brand.email}`}
                className="t-small mt-1.5 block break-all text-muted transition-colors duration-150 ease-crisp hover:text-cocoa-700"
              >
                {brand.email}
              </a>
            </div>

            <div>
              <p className="t-eyebrow">Adresa</p>
              <p className="mt-2.5 font-display text-[19px] leading-tight text-heading sm:text-[21px]">
                {brand.address}
              </p>
              <p className="t-small mt-1.5 text-muted">{brand.city}</p>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <p className="t-eyebrow">Radno vrijeme</p>
              <ul className="mt-2.5 space-y-1.5">
                {brand.hours.map((h) => (
                  <li key={h.days} className="flex justify-between gap-4 text-[15px] text-body">
                    <span>{h.days}</span>
                    <span className="tabular text-muted">{h.time}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <p className="t-eyebrow">Dostava</p>
              <p className="mt-2.5 text-[15px] text-body">{brand.deliveryCities.join(', ')}</p>
              <p className="t-small mt-1.5 text-muted">
                {formatKMFull(brand.deliveryFeeFening)} · besplatno preko{' '}
                {formatKMFull(brand.freeDeliveryOverFening)}
              </p>
              <p className="t-small mt-1.5 text-muted">{brand.paymentNote}</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
