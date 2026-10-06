import { useEffect, useState, type FormEvent } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { api, ApiError } from '../../lib/api'
import { Eyebrow, GoldRule, Skeleton } from '../../components/ui/Bits'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/Field'
import { cn } from '../../lib/cn'
import { AdminTokenContext, clearToken, readToken, writeToken } from './adminToken'
import { AdminOrders } from './AdminOrders'
import { AdminProducts } from './AdminProducts'
import { AdminPromotions } from './AdminPromotions'

const TABOVI = [
  { to: '/admin', label: 'Narudžbe', end: true },
  { to: '/admin/proizvodi', label: 'Proizvodi', end: false },
  { to: '/admin/akcije', label: 'Akcije', end: false },
]

function naslov(pathname: string): string {
  if (pathname.startsWith('/admin/proizvodi')) return 'Proizvodi'
  if (pathname.startsWith('/admin/akcije')) return 'Akcije'
  return 'Narudžbe'
}

/**
 * Admin: jedna kapija (token) i tri ekrana ispod nje.
 *
 * Rute su ovdje, a ne u App.tsx, da promjena taba ne odmontira cijeli admin
 * (ponovna provjera tokena i ponovno ucitavanje svih lista). App.tsx zato
 * renderuje ovu komponentu izvan AnimatePresence-a - detaljno objasnjenje je
 * tamo, uz uslov `jeAdmin`.
 */
export function AdminApp() {
  const location = useLocation()
  const [token, setToken] = useState(readToken)
  const [authed, setAuthed] = useState(false)
  const [checking, setChecking] = useState(Boolean(readToken()))
  const [loginError, setLoginError] = useState<string | null>(null)

  // Token iz prethodne sesije - provjeri ga prije nego pokazemo podatke.
  useEffect(() => {
    const saved = readToken()
    if (!saved) return
    api
      .adminCheck(saved)
      .then(() => setAuthed(true))
      .catch(() => {
        clearToken()
        setToken('')
      })
      .finally(() => setChecking(false))
  }, [])

  /**
   * Skrol na vrh pri promjeni taba. App.tsx ovo radi samo kad se promijeni
   * kljuc animacije, a cijeli /admin dijeli jedan kljuc - bez ovoga klik na
   * "Proizvodi" sa dna liste narudzbi otvori formu izvan vidokruga.
   */
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [location.pathname])

  async function onLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoginError(null)
    const value = String(new FormData(e.currentTarget).get('token') ?? '')
    try {
      await api.adminCheck(value)
      writeToken(value)
      setToken(value)
      setAuthed(true)
    } catch (err) {
      setLoginError(err instanceof ApiError ? err.message : 'Prijava nije uspjela.')
    }
  }

  function odjava() {
    clearToken()
    setToken('')
    setAuthed(false)
  }

  if (checking) {
    return (
      <div className="container-page py-section-sm">
        <Skeleton className="h-8 w-48" />
      </div>
    )
  }

  if (!authed) {
    return (
      <div className="container-page py-section">
        <div className="mx-auto max-w-[420px]">
          <Eyebrow>Interno</Eyebrow>
          <GoldRule short className="mt-2.5" />
          <h1 className="t-h1 mt-3">Prijava</h1>
          <p className="t-small mt-3 text-muted">
            Token je u <code className="rounded-sm bg-sunken px-1">.env</code> kao{' '}
            <code className="rounded-sm bg-sunken px-1">ADMIN_TOKEN</code>.
          </p>
          <form onSubmit={onLogin} className="mt-7">
            <TextField
              label="Pristupni token"
              name="token"
              type="password"
              autoComplete="off"
              required
              error={loginError ?? undefined}
            />
            <Button type="submit" size="lg" fullWidth className="mt-2">
              Prijavi se
            </Button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <AdminTokenContext.Provider value={token}>
      <div className="container-page py-section-sm">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Eyebrow>Interno</Eyebrow>
            <GoldRule short className="mt-2.5" />
            <h1 className="t-h1 mt-3">{naslov(location.pathname)}</h1>
          </div>
          <Button variant="ghost" onClick={odjava}>
            Odjavi se
          </Button>
        </header>

        <nav aria-label="Admin" className="-mx-gutter mt-7 flex gap-2 overflow-x-auto px-gutter pb-1 sm:mx-0 sm:px-0">
          {TABOVI.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                cn(
                  'inline-flex h-11 shrink-0 items-center rounded-lg px-4 text-[15px] font-medium no-underline',
                  'transition-colors duration-150 ease-crisp',
                  isActive
                    ? 'bg-accent text-onDark'
                    : 'border border-hairline bg-surface text-body hover:border-control hover:bg-cocoa-50',
                )
              }
            >
              {t.label}
            </NavLink>
          ))}
        </nav>

        <GoldRule className="mb-8 mt-6" />

        {/* Apsolutne putanje: App renderuje <AdminApp /> direktno, ne kroz
            rutu /admin/*, pa nema roditelja prema kojem bi se racunale. */}
        <Routes>
          <Route path="/admin" element={<AdminOrders />} />
          <Route path="/admin/proizvodi" element={<AdminProducts />} />
          <Route path="/admin/akcije" element={<AdminPromotions />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </div>
    </AdminTokenContext.Provider>
  )
}
