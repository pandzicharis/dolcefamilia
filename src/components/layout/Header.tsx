import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { brand } from '../../config/brand'
import { cn } from '../../lib/cn'
import { CartBadge } from '../cart/CartBadge'
import { Logo } from '../ui/Logo'

/**
 * Namjerno bez navigacije. Sajt je jedna stranica, pa bi linkovi bili
 * sidra do sekcija koje korisnik ionako prescrolla - a prazan header je
 * dio editorijalnog tona. Ostaju samo logo, telefon i korpa.
 */
/** Telefon i povratak dijele izgled: tiho dugme visine korpe, bez ispune. */
const akcija =
  'inline-flex h-11 min-w-[44px] items-center justify-center gap-1.5 rounded-lg px-2 text-[15px] ' +
  'text-body transition-colors duration-150 ease-crisp hover:bg-cocoa-700/[0.06] ' +
  'hover:text-cocoa-700 sm:px-3'

export function Header() {
  const [scrolled, setScrolled] = useState(false)
  const { pathname } = useLocation()
  const naPocetnoj = pathname === '/'

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cn(
        'sticky top-0 z-40 transition-[background-color,box-shadow,backdrop-filter] duration-200 ease-crisp',
        scrolled ? 'bg-cream-50/85 shadow-xs backdrop-blur-[6px]' : 'bg-transparent',
      )}
    >
      {/* sm:h-24, ne h-20: novi znak trosi visinu na tortu iznad slova, pa mu u
          traci od 80px slova ostaju sitna. Visina trake je vezana za
          `scroll-mt-*` na sekcijama sa sidrom - mijenjaju se zajedno. */}
      <div className="container-page flex h-16 items-center justify-between gap-4 sm:h-24">
        <Link to="/" className="shrink-0" aria-label={`${brand.name} — početna`}>
          <Logo />
        </Link>

        <div className="flex items-center gap-0.5 sm:gap-2">
          {/* Na podstranicama je povratak na ponudu korisniji od broja telefona. */}
          {naPocetnoj ? (
            <a href={brand.phoneHref} className={akcija} aria-label={`Pozovi ${brand.phone}`}>
              {/* Broj od petnaest znakova ne stane kraj logoa na 375px, a
                  prazna traka izmedju logoa i korpe je bila najveca rupa u
                  mobilnom rasporedu. Ispod sm ostaje sama slusalica. */}
              <svg viewBox="0 0 20 20" className="h-[21px] w-[21px] sm:hidden" aria-hidden="true">
                <path
                  d="M6.3 3.2 8 6.1 6.5 7.9c.7 1.7 1.9 2.9 3.6 3.6l1.8-1.5 2.9 1.7-.3 2.4c-.1.7-.7 1.2-1.4 1.1C8.4 14.7 5.3 11.6 4.4 6.9c-.1-.7.4-1.3 1.1-1.4l.8-2.3Z"
                  stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="none"
                />
              </svg>
              <span className="hidden sm:inline">{brand.phone}</span>
            </a>
          ) : (
            /* Ispod sm ostaje skriven: podstranica vec nosi "Nazad na ponudu"
               kao prvi element sadrzaja, pa bi dvije strelice jedna ispod
               druge izgledale kao greska. */
            <Link to="/#ponuda" className={`hidden sm:inline-flex ${akcija}`}>
              ← Ponuda
            </Link>
          )}
          <CartBadge />
        </div>
      </div>
    </header>
  )
}
