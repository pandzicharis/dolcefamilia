import { lazy, Suspense, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Header } from './components/layout/Header'
import { Footer } from './components/layout/Footer'
import { CartDrawer } from './components/cart/CartDrawer'
import { pageVariants } from './motion/variants'
import { Home } from './pages/Home'
import { Checkout } from './pages/Checkout'
import { ThankYou } from './pages/ThankYou'
import { Skeleton } from './components/ui/Bits'

/**
 * Admin se ucitava odvojeno. Tri admin ekrana nose forme, upload i tabele koje
 * nijedan kupac nikad ne otvori - u glavnom bundleu to je mrtva tezina na
 * prvom ucitavanju pocetne.
 */
const AdminApp = lazy(() =>
  import('./pages/admin/AdminApp').then((m) => ({ default: m.AdminApp })),
)
import { NotFound } from './pages/NotFound'

/**
 * Rute koje su postojale prije nego je sajt postao jedna stranica.
 * Mapiraju se na sidra da stari linkovi i bookmarkovi ne puknu.
 */
/** Pomak korisnika koji prekida nasu korekciju skrola. */
const DOGADJAJI_KORISNIKA = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const

const STARE_RUTE: Record<string, string> = {
  '/kolaci': '#ponuda',
  // Sekcija "o nama" vise ne postoji - sadrzaj je sveden na jednu recenicu
  // u hero-u, pa stara ruta vodi na vrh pocetne.
  '/o-nama': '',
  '/kontakt': '#kontakt',
}

/**
 * Stranice proizvoda vise nema - velicina se bira u modalu nad katalogom.
 * Stari link na `/kolaci/<slug>` zato vodi na katalog, a ne na 404.
 */
function sidroStareRute(pathname: string): string | undefined {
  if (pathname in STARE_RUTE) return STARE_RUTE[pathname]
  if (pathname.startsWith('/kolaci/')) return '#ponuda'
  return undefined
}

export default function App() {
  const stvarnaLokacija = useLocation()
  const navigate = useNavigate()

  const staroSidro = sidroStareRute(stvarnaLokacija.pathname)
  const jeStaraRuta = staroSidro !== undefined

  /**
   * Stara ruta se odmah tretira kao "/" sa sidrom, umjesto da se renderuje
   * <Navigate> unutar <Routes>.
   *
   * Razlog: AnimatePresence ima mode="wait". <Navigate> promijeni rutu usred
   * izlazne animacije, pa AnimatePresence zadrzi stari cvor dok se nova ruta
   * vec primijenila - rezultat je prazan <div> i stranica bez sadrzaja.
   * Ovako redirecta nema u animacijskom sloju: korisnik odmah dobije pocetnu,
   * a URL se tiho ispravi u efektu ispod.
   */
  const location = jeStaraRuta
    ? { ...stvarnaLokacija, pathname: '/', hash: staroSidro ?? '' }
    : stvarnaLokacija

  useEffect(() => {
    if (jeStaraRuta) navigate(`/${staroSidro ?? ''}`, { replace: true })
  }, [jeStaraRuta, staroSidro, navigate])

  /**
   * Admin se renderuje IZVAN AnimatePresence-a (vidi ispod), pa mu treba
   * vlastita provjera rute.
   */
  const jeAdmin = location.pathname === '/admin' || location.pathname.startsWith('/admin/')

  const prevPath = useRef(location.pathname)
  /** Prvi skrol nakon ucitavanja je dolazak, ne pomak unutar stranice. */
  const prviSkrol = useRef(true)

  /**
   * Skrol na sidro, otporan na tri stvari koje ga inace promase:
   *
   * 1. Sekcija jos nije u DOM-u. Dolazak sa druge rute ide kroz
   *    AnimatePresence mode="wait", pa se sekcija montira tek nakon izlazne
   *    animacije (~200ms).
   * 2. Stranica raste NAKON skrola. Katalog prikaze 6 skeletona pa ih zamijeni
   *    sa 12 kartica — sekcija ispod se pomjeri za par hiljada piksela i skrol
   *    zavrsi na pola puta. Zato se pozicija ispravlja svakih 120ms tokom 4s;
   *    ResizeObserver na <body> se za ovo pokazao nepouzdanim, a 4s je potrebno
   *    jer se slike i fontovi dovrsavaju i nakon prve sekunde.
   * 3. Tab je u pozadini. requestAnimationFrame se tamo uopste ne izvrsava, pa
   *    bi rAF petlja znacila da link otvoren u pozadinskom tabu nikad ne skrola.
   *    setTimeout se u pozadini usporava, ali se izvrsava.
   *
   * Prvi skrol nakon ucitavanja je trenutan: korisnik koji otvori /#kontakt
   * dolazi na tu sekciju i nema odakle da klizi. Gladak ostaje samo klik na
   * sidro dok je vec na stranici.
   *
   * Sve se prekida na prvi korisnikov pomak — nikad mu ne otimamo skrol.
   */
  useEffect(() => {
    if (!location.hash) return
    const id = location.hash.slice(1)

    let otkazano = false
    let tajmer: ReturnType<typeof setTimeout> | null = null

    const prekini = () => {
      otkazano = true
      if (tajmer) clearTimeout(tajmer)
      for (const ev of DOGADJAJI_KORISNIKA) window.removeEventListener(ev, prekini)
    }

    for (const ev of DOGADJAJI_KORISNIKA) {
      window.addEventListener(ev, prekini, { passive: true, once: true })
    }

    const kraj = Date.now() + 4000
    let prvi = true

    const uskladi = () => {
      if (otkazano) return
      const el = document.getElementById(id)

      if (el) {
        // scrollIntoView sam racuna scroll-margin; ako smo vec na mjestu,
        // poziv je bez efekta, pa ne treba posebna provjera "jesmo li blizu".
        const nacin: ScrollBehavior = prvi && !prviSkrol.current ? 'smooth' : 'instant'
        el.scrollIntoView({ behavior: nacin, block: 'start' })
        if (prvi) {
          prvi = false
          prviSkrol.current = false
        }
      }

      if (Date.now() < kraj) tajmer = setTimeout(uskladi, 120)
      else prekini()
    }

    uskladi()
    return prekini
  }, [location.hash, location.pathname])

  /**
   * Prelaz storefront <-> admin ne prolazi kroz onExitComplete (admin nije u
   * AnimatePresence-u), pa se skrol vraca ovdje. Prvi render se preskace:
   * tada skrol pripada sidru iz URL-a, ne nama.
   */
  const prviRenderRef = useRef(true)
  useEffect(() => {
    if (prviRenderRef.current) {
      prviRenderRef.current = false
      return
    }
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [jeAdmin])

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <a
        href="#sadrzaj"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-onDark"
      >
        Preskoči na sadržaj
      </a>

      <Header />

      <main id="sadrzaj" className="flex-1">
        {/* Admin stoji IZVAN AnimatePresence-a, i to je namjerno.
            AnimatePresence sa mode="wait" drzi djecu po kljucu: dok se kljuc
            ne promijeni, renderuje ISTE elemente, pa nova lokacija nikad ne
            dodje do njih. Admin ima tri taba (narudzbe / proizvodi / akcije)
            unutar jednog ekrana - da je unutra, ili bi se na svaki tab
            odmontirao cijeli admin (ponovna provjera tokena i ponovno
            ucitavanje svih lista), ili bi, sa zajednickim kljucem, klik na tab
            promijenio URL a sadrzaj ostao isti. Interni ekran ionako ne treba
            ulaznu animaciju stranice. */}
        {jeAdmin ? (
          <Suspense
            fallback={
              <div className="container-page py-section-sm">
                <Skeleton className="h-8 w-48" />
              </div>
            }
          >
            <AdminApp />
          </Suspense>
        ) : (
        /* mode="wait" kosta ~200ms percipirane latencije, ali crossfade dvije
           krem stranice sa preklopljenim serifnim naslovima izgleda kao bug. */
        <AnimatePresence
          mode="wait"
          initial={false}
          onExitComplete={() => {
            // Scroll na vrh ide OVDJE, ne u route effect - inace odlazeca
            // stranica vidljivo skokne na vrh usred fade-a.
            // Sidro preskacemo: njega rjesava useEffect iznad.
            if (prevPath.current !== location.pathname && !location.hash) {
              window.scrollTo({ top: 0, behavior: 'instant' })
            }
            prevPath.current = location.pathname
          }}
        >
          <motion.div
            key={location.pathname}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <Routes location={location}>
              <Route path="/" element={<Home />} />
              <Route path="/narudzba" element={<Checkout />} />
              <Route path="/narudzba/hvala/:orderNumber" element={<ThankYou />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
        )}
      </main>

      <Footer />
      <CartDrawer />

      {/* Zrno mora biti fiksirano za viewport, kao da je na staklu. */}
      <div className="grain" aria-hidden="true" />
    </div>
  )
}
