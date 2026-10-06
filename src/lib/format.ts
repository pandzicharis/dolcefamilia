/**
 * Cijene se SVUDA drze kao cijeli broj feninga (1 KM = 100 feninga).
 * Float cijene daju 38.000000000000004 u zbiru korpe i to korisnik vidi.
 * Ovo je jedini sloj koji ih pretvara u tekst.
 *
 * NAMJERNO BEZ Intl: bs-BA se prijavljuje kao podrzan locale
 * (supportedLocalesOf ga vrati, resolvedOptions().locale kaze 'bs-BA'),
 * ali su CLDR podaci prazni i tiho se pada na engleski:
 *   (1234.5).toLocaleString('bs-BA')                  -> "1,234.5"   (treba "1.234,5")
 *   new Intl.DateTimeFormat('bs-BA', …).format(d)     -> "2026-10-12, Mon"
 * Dakle cijena od 1250 KM bi se prikazala kao "1,250,00 KM". Zato je sve ovdje
 * rucno: tacka za hiljade, zarez za decimale, nasi nazivi dana i mjeseci.
 */

const DANI = ['ned', 'pon', 'uto', 'sri', 'čet', 'pet', 'sub']

const MJESECI = [
  'januar', 'februar', 'mart', 'april', 'maj', 'juni',
  'juli', 'august', 'septembar', 'oktobar', 'novembar', 'decembar',
]

/** 1234567 -> "1.234.567" */
function groupThousands(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

/** 3850 -> "38,50" · 125000 -> "1.250,00" */
export function formatKM(fening: number): string {
  const rounded = Math.round(fening)
  const sign = rounded < 0 ? '-' : ''
  const abs = Math.abs(rounded)
  return `${sign}${groupThousands(Math.floor(abs / 100))},${String(abs % 100).padStart(2, '0')}`
}

/** 3850 -> "38,50 KM" */
export function formatKMFull(fening: number): string {
  return `${formatKM(fening)} KM`
}

/** Razdvojeno za <Price>, koji "KM" prikazuje u drugoj boji i velicini. */
export function splitKM(fening: number): { amount: string; currency: 'KM' } {
  return { amount: formatKM(fening), currency: 'KM' }
}

function parseISODate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return Number.isNaN(d.getTime()) ? null : d
}

const pad = (n: number) => String(n).padStart(2, '0')

/** "2026-10-12" -> "pon, 12.10.2026." */
export function formatDate(iso: string): string {
  const d = parseISODate(iso)
  if (!d) return iso
  return `${DANI[d.getDay()]}, ${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}.`
}

/** "2026-10-12" -> "12. oktobar 2026." */
export function formatDateLong(iso: string): string {
  const d = parseISODate(iso)
  if (!d) return iso
  return `${d.getDate()}. ${MJESECI[d.getMonth()]} ${d.getFullYear()}.`
}

/**
 * SQLite datetime('now') vraca "YYYY-MM-DD HH:MM:SS" u UTC, bez oznake zone.
 * Bez dodanog "Z" bi se citalo kao lokalno vrijeme i pomjerilo za offset.
 */
export function formatDateTime(raw: string): string {
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(raw)
    ? `${raw.replace(' ', 'T')}Z`
    : raw
  const d = new Date(normalized)
  if (Number.isNaN(d.getTime())) return raw
  return (
    `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}.` +
    ` u ${pad(d.getHours())}:${pad(d.getMinutes())}`
  )
}

/** Najraniji dozvoljen datum preuzimanja, kao YYYY-MM-DD u lokalnoj zoni. */
export function earliestPickupDate(minNoticeHours: number): string {
  const d = new Date(Date.now() + minNoticeHours * 3600_000)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * Gradi srcSet iz putanje slike. Konvencija: uz `/img/x.webp` postoji i
 * `/img/x-640.webp`, pa kartica ne povlaci sliku od 1200px za okvir od 300px.
 * Vraca undefined za proizvod bez slike ili za putanju van te konvencije.
 *
 * Samo za `/img/` - fotografije koje admin ucita kroz formu zive u `/uploads/`
 * i NEMAJU -640 varijantu (server ih ne smanjuje). Srcset koji pokazuje na
 * nepostojeci fajl znaci slomljenu sliku na malim ekranima.
 */
export function imageSrcSet(image?: string | null): string | undefined {
  if (!image || !image.startsWith('/img/') || !image.endsWith('.webp')) return undefined
  const mala = image.replace(/\.webp$/, '-640.webp')
  return `${mala} 640w, ${image} 1200w`
}

/**
 * "70", "70,5", "70.50" -> feninzi. Admin forma prima KM jer u feninge niko ne
 * misli, a baza i API rade iskljucivo sa cijelim feninzima.
 * Vraca null za sve sto nije broj - forma to prikaze kao gresku polja.
 */
export function parseKM(raw: string): number | null {
  const t = raw.trim().replace(/\s/g, '').replace(',', '.')
  if (!t || !/^\d+(\.\d{1,2})?$/.test(t)) return null
  return Math.round(Number(t) * 100)
}

/** 7050 -> "70,50" za input polje (bez oznake valute). */
export function toKMInput(fening: number): string {
  return formatKM(fening)
}
