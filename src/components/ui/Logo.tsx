import { cn } from '../../lib/cn'
import { brand } from '../../config/brand'

/**
 * Znak je wordmark "Dolce Familia" sa tortom i srcem — rasterski crtež, ne
 * SVG, pa ide kao slika sa alfa kanalom (`public/logo.webp`).
 * Original nosi klijent (`assets-original/logo.png`, 1774×887).
 *
 * Dvije širine u srcSet-u: 320px nosi header i footer, 640px hero i 2x ekrane.
 * Veće od toga nema smisla — najveći prikaz na sajtu je ~190px širine.
 *
 * `width`/`height` su OBAVEZNI: bez njih sticky header poskoči kad se logo
 * učita, jer dok slike nema red je visok koliko i tekst pored njega. Odnos je
 * odnos OBREZANOG crteža — originali nose prazan rub, pa se prije konverzije
 * režu na alfa okvir; inače bi `h-14` davao vidljivo manji znak od traženog.
 */
const PRIRODNA = { w: 640, h: 330 }

/**
 * Mini znak: samo torta sa srcem, bez slova (`public/mini-logo.webp`).
 * Original nosi klijent (`assets-original/mini-logo-mobile.png`) — verzija sa
 * providnom pozadinom; ona sa kremom je ikona taba i aplikacije, ne header.
 */
const MINI = { w: 162, h: 160 }

/** Tacna dopuna Tailwind `sm:` prelomu (min-width: 640px). */
const ISPOD_SM = '(max-width: 639.98px)'

export function LogoZnak({ className }: { className?: string }) {
  return (
    <img
      src="/logo.webp"
      srcSet="/logo-320.webp 320w, /logo.webp 640w"
      sizes="(min-width: 640px) 190px, 150px"
      width={PRIRODNA.w}
      height={PRIRODNA.h}
      alt={brand.name}
      // Logo je iznad preloma na svakoj stranici - lazy bi ga dao tek nakon
      // prvog layouta i header bi se vidljivo presložio.
      decoding="async"
      className={cn('w-auto select-none', className)}
    />
  )
}

/**
 * Puni logo.
 *
 * U headeru stoji SAM wordmark: on već nosi ime, a mikro-oznaka ispod njega
 * pravi tri reda teksta u traci visokoj 64px. `stacked` je verzija za hero —
 * veći znak i oznaka sa gradom ispod.
 *
 * Ispod `sm` header dobije mini znak umjesto wordmarka. Wordmark je širok
 * ~150px na traci od 375px, a ispod njega na početnoj ionako stoji isti taj
 * wordmark u hero-u — dvaput ista slika na jednom ekranu čita se kao greška.
 * `<picture>` sa `media` upitom je ovdje bitan: browser skine SAMO onu sliku
 * koja odgovara ekranu, pa telefon nikad ne povuče wordmark koji ne prikazuje.
 */
export function Logo({
  stacked = false,
  className,
  markClassName,
}: {
  stacked?: boolean
  className?: string
  markClassName?: string
}) {
  if (!stacked) {
    return (
      <picture>
        <source
          media={ISPOD_SM}
          srcSet="/mini-logo.webp"
          width={MINI.w}
          height={MINI.h}
        />
        <img
          src="/logo.webp"
          srcSet="/logo-320.webp 320w, /logo.webp 640w"
          sizes="190px"
          width={PRIRODNA.w}
          height={PRIRODNA.h}
          alt={brand.name}
          decoding="async"
          // Novi znak nosi tortu i srce IZNAD slova, pa na istoj visini kutije
          // daje osjetno manja slova od starog wordmarka. Otuda 76px u traci od
          // 96px - ostaje po 10px zraka gore i dolje, koliko traka podnese.
          className={cn('h-10 w-auto select-none sm:h-[76px]', className, markClassName)}
        />
      </picture>
    )
  }

  return (
    <span className={cn('inline-flex flex-col items-center gap-2 sm:gap-3', className)}>
      <LogoZnak className={cn('h-[76px] sm:h-[108px]', markClassName)} />
      <span className="font-sans text-[11px] uppercase leading-none tracking-[0.3em] text-muted">
        {brand.kind} · {brand.city}
      </span>
    </span>
  )
}
