import { Link } from 'react-router-dom'
import { brand } from '../../config/brand'
import { LogoZnak } from '../ui/Logo'

// Izvan rendera: godina se ne mijenja tokom zivota stranice, a new Date()
// u renderu je necista funkcija.
const GODINA = new Date().getFullYear()

/** Jedna traka. Svi kontakt podaci su vec iznad, u sekciji kontakta. */
export function Footer() {
  return (
    <footer className="border-t border-hairline">
      <div className="container-page flex flex-col items-center gap-4 py-8 sm:flex-row sm:justify-between sm:gap-5 sm:py-10">
        {/* Wordmark vec nosi ime, pa se ono ne ponavlja kao tekst. Ispod
            njega stoji slogan - ovo je jedino mjesto na sajtu gdje stalno
            stoji, kao potpis. */}
        <div className="flex flex-col items-center gap-2 sm:items-start">
          <LogoZnak className="h-11" />
          <p className="t-small italic text-muted">{brand.motto}</p>
          <p className="t-small text-muted">
            {brand.kind} · {brand.city} · od {brand.since}
          </p>
        </div>

        <nav className="flex items-center gap-6" aria-label="Podnožje">
          <Link to="/#ponuda" className="t-small text-muted transition-colors hover:text-cocoa-700">
            Ponuda
          </Link>
          <Link to="/#kontakt" className="t-small text-muted transition-colors hover:text-cocoa-700">
            Kontakt
          </Link>
          <a
            href={brand.social.instagram}
            target="_blank"
            rel="noreferrer noopener"
            className="t-small text-muted transition-colors hover:text-cocoa-700"
          >
            Instagram
          </a>
        </nav>

        <p className="t-small text-muted">© {GODINA} {brand.name}</p>
      </div>
    </footer>
  )
}
