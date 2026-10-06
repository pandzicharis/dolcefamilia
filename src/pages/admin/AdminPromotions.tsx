import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { api, ApiError } from '../../lib/api'
import type { Category, Product, PromoKind, PromoScope, Promotion, PromotionInput } from '../../types'
import { formatKM, formatKMFull, parseKM } from '../../lib/format'
import { popustTekst, trajanje, uToku } from '../../lib/promo'
import { Badge, EmptyState, GoldRule, Skeleton } from '../../components/ui/Bits'
import { Button } from '../../components/ui/Button'
import { SelectField, TextField } from '../../components/ui/Field'
import { cn } from '../../lib/cn'
import { EASE } from '../../motion/tokens'
import { useAdminToken } from './adminToken'
import { AdminSection, Checkbox, Greska, neprikazane, Potvrda } from './bits'

/** Polja koja forma crta sa vlastitim mjestom za gresku. `value` je ime sa
 *  servera, `vrijednost` ime u formi - oba vode na isti input. */
const POLJA_FORME = ['title', 'description', 'value', 'vrijednost', 'scope', 'target', 'starts_on', 'ends_on']

/** Cijena na kojoj se pokazuje primjer popusta - srednja torta iz ponude. */
const PRIMJER_FENING = 9500

type Forma = {
  id?: number
  title: string
  description: string
  kind: PromoKind
  /** Procenat ili iznos u KM, kao tekst - parsira se po `kind`. */
  vrijednost: string
  scope: PromoScope
  target: string
  starts_on: string
  ends_on: string
  is_active: boolean
}

const PRAZNA: Forma = {
  title: '',
  description: '',
  kind: 'procenat',
  vrijednost: '',
  scope: 'sve',
  target: '',
  starts_on: '',
  ends_on: '',
  is_active: true,
}

function uFormu(p: Promotion): Forma {
  return {
    id: p.id,
    title: p.title,
    description: p.description,
    kind: p.kind,
    vrijednost: p.kind === 'procenat' ? String(p.value) : formatKM(p.value),
    scope: p.scope,
    target: p.target ?? '',
    starts_on: p.starts_on ?? '',
    ends_on: p.ends_on ?? '',
    is_active: p.is_active,
  }
}

/** Stanje akcije u jednoj rijeci - ono sto admin prvo trazi u listi. */
function stanje(p: Promotion): { label: string; tone: 'neutral' | 'gold' | 'success' | 'error' } {
  if (!p.is_active) return { label: 'Pauzirana', tone: 'neutral' }
  if (uToku(p)) return { label: 'U toku', tone: 'success' }
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const danas = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  if (p.starts_on && p.starts_on > danas) return { label: 'Zakazana', tone: 'gold' }
  return { label: 'Istekla', tone: 'error' }
}

export function AdminPromotions() {
  const token = useAdminToken()
  const reduce = useReducedMotion()

  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [potvrda, setPotvrda] = useState<string | null>(null)
  const [forma, setForma] = useState<Forma | null>(null)
  const [brisem, setBrisem] = useState<number | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const tajmer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (tajmer.current) clearTimeout(tajmer.current) }, [])

  const javi = useCallback((tekst: string) => {
    setPotvrda(tekst)
    if (tajmer.current) clearTimeout(tajmer.current)
    tajmer.current = setTimeout(() => setPotvrda(null), 4000)
  }, [])

  const ucitaj = useCallback(() => {
    setLoading(true)
    api
      .adminPromotions(token)
      .then(setPromotions)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Greška pri učitavanju.'))
      .finally(() => setLoading(false))
  }, [token])

  useEffect(() => { ucitaj() }, [ucitaj])

  useEffect(() => {
    api.categories().then(setCategories).catch(() => setCategories([]))
    api.adminProducts(token).then(setProducts).catch(() => setProducts([]))
  }, [token])

  async function prekidac(p: Promotion) {
    setBusyId(p.id)
    setError(null)
    try {
      await api.adminTogglePromotion(token, p.id, !p.is_active)
      setPromotions((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, is_active: !p.is_active } : x)),
      )
      javi(p.is_active ? `"${p.title}" je pauzirana.` : `"${p.title}" je aktivirana.`)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Promjena nije sačuvana.')
    } finally {
      setBusyId(null)
    }
  }

  async function obrisi(p: Promotion) {
    setBusyId(p.id)
    setError(null)
    try {
      await api.adminDeletePromotion(token, p.id)
      setPromotions((prev) => prev.filter((x) => x.id !== p.id))
      setBrisem(null)
      javi(`"${p.title}" je obrisana.`)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Akcija nije obrisana.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      {error && <Greska>{error}</Greska>}
      <AnimatePresence>{potvrda && <Potvrda key={potvrda}>{potvrda}</Potvrda>}</AnimatePresence>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="t-small max-w-prose text-muted">
          Akcija snižava cijenu u ponudi i na računu. Kad se dvije akcije poklope, <strong>ne</strong>{' '}
          sabiraju se — važi uža (proizvod ispred kategorije, kategorija ispred cijele ponude).
        </p>
        <Button
          onClick={() => {
            setForma(forma && !forma.id ? null : { ...PRAZNA })
            setBrisem(null)
          }}
        >
          {forma && !forma.id ? 'Zatvori formu' : 'Nova akcija'}
        </Button>
      </div>

      <AnimatePresence initial={false}>
        {forma && (
          <motion.div
            key={forma.id ?? 'nova'}
            initial={reduce ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            transition={{ duration: 0.34, ease: EASE.silk }}
            className="mt-6"
          >
            <AkcijaForma
              forma={forma}
              categories={categories}
              products={products}
              onClose={() => setForma(null)}
              onSaved={(p, nova) => {
                // Server vraca red bez `target_label`, a lista ga prikazuje -
                // pa se nakon upisa lista ponovo dohvata umjesto da se slaze
                // na slijepo.
                ucitaj()
                setForma(null)
                javi(nova ? `"${p.title}" je dodana.` : `"${p.title}" je sačuvana.`)
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AdminSection title="Akcije">
        {loading && promotions.length === 0 ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
        ) : promotions.length === 0 ? (
          <EmptyState
            title="Nema akcija"
            description="Dodajte akciju da se na karticama pojavi oznaka sa sniženom cijenom."
          />
        ) : (
          <ul className="space-y-3">
            {promotions.map((p) => {
              const s = stanje(p)
              return (
                <li
                  key={p.id}
                  className={cn(
                    'rounded-2xl border border-hairline bg-surface p-4 shadow-sm transition-opacity',
                    busyId === p.id && 'pointer-events-none opacity-55',
                  )}
                  aria-busy={busyId === p.id || undefined}
                >
                  <div className="flex flex-wrap items-start gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="t-card-title !text-[17px]">{p.title}</span>
                        <Badge tone={s.tone}>{s.label}</Badge>
                      </div>
                      <p className="t-small mt-1 text-body">
                        <span className="tabular font-medium text-heading">−{popustTekst(p)}</span>
                        {' · '}
                        {p.target_label}
                        {' · '}
                        {trajanje(p)}
                      </p>
                      {p.description && <p className="t-small mt-1 text-muted">{p.description}</p>}
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => { setForma(uFormu(p)); setBrisem(null) }}
                      >
                        Uredi
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => prekidac(p)}>
                        {p.is_active ? 'Pauziraj' : 'Aktiviraj'}
                      </Button>
                      {brisem === p.id ? (
                        <span className="flex items-center gap-2">
                          <Button size="sm" variant="secondary" onClick={() => obrisi(p)}>
                            Potvrdi brisanje
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setBrisem(null)}>
                            Ne
                          </Button>
                        </span>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => setBrisem(p.id)}>
                          Obriši
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </AdminSection>
    </div>
  )
}

function AkcijaForma({
  forma,
  categories,
  products,
  onSaved,
  onClose,
}: {
  forma: Forma
  categories: Category[]
  products: Product[]
  onSaved: (p: Promotion, nova: boolean) => void
  onClose: () => void
}) {
  const token = useAdminToken()
  const [stanje, setStanje] = useState<Forma>(forma)
  const [greske, setGreske] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [greska, setGreska] = useState<string | null>(null)

  const nova = !forma.id
  const polje = <K extends keyof Forma>(k: K, v: Forma[K]) => setStanje((s) => ({ ...s, [k]: v }))

  /** Vrijednost popusta u jedinici koju server ocekuje: procenat ili feninzi. */
  function vrijednostUBroj(): number | null {
    if (stanje.kind === 'procenat') {
      const n = Number(stanje.vrijednost.trim().replace(',', '.'))
      return Number.isInteger(n) && n > 0 && n <= 90 ? n : null
    }
    return parseKM(stanje.vrijednost)
  }

  const broj = vrijednostUBroj()
  const primjer =
    broj === null
      ? null
      : stanje.kind === 'procenat'
        ? Math.round((PRIMJER_FENING * (100 - broj)) / 100)
        : Math.max(PRIMJER_FENING - broj, 100)

  async function sacuvaj() {
    const lokalne: Record<string, string> = {}
    if (stanje.title.trim().length < 2) lokalne.title = 'Unesite naziv akcije.'
    if (broj === null) {
      lokalne.vrijednost =
        stanje.kind === 'procenat' ? 'Cijeli broj od 1 do 90.' : 'Iznos npr. 5 ili 5,50.'
    }
    if (stanje.scope !== 'sve' && !stanje.target) {
      lokalne.target = stanje.scope === 'kategorija' ? 'Odaberite kategoriju.' : 'Odaberite proizvod.'
    }
    if (stanje.starts_on && stanje.ends_on && stanje.ends_on < stanje.starts_on) {
      lokalne.ends_on = 'Kraj ne može biti prije početka.'
    }

    setGreske(lokalne)
    if (Object.keys(lokalne).length > 0) return

    const payload: PromotionInput = {
      title: stanje.title.trim(),
      description: stanje.description.trim(),
      kind: stanje.kind,
      value: broj as number,
      scope: stanje.scope,
      target: stanje.scope === 'sve' ? null : stanje.target,
      starts_on: stanje.starts_on || null,
      ends_on: stanje.ends_on || null,
      is_active: stanje.is_active,
    }

    setSaving(true)
    setGreska(null)
    try {
      const p = nova
        ? await api.adminCreatePromotion(token, payload)
        : await api.adminUpdatePromotion(token, forma.id as number, payload)
      onSaved(p, nova)
    } catch (e) {
      if (e instanceof ApiError) {
        setGreska([e.message, ...neprikazane(e.fields, POLJA_FORME)].join(' '))
        // `value` sa servera pokazuje na input koji se u formi zove
        // `vrijednost` - bez preslikavanja greska se nigdje ne bi pojavila.
        if (e.fields) setGreske({ ...e.fields, vrijednost: e.fields.value ?? '' })
      } else {
        setGreska('Akcija nije sačuvana.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-2xl border border-hairline bg-surface p-5 shadow-md sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-[20px] leading-tight text-heading">
          {nova ? 'Nova akcija' : `Uredi: ${forma.title}`}
        </h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Odustani
        </Button>
      </div>

      <GoldRule className="my-5" />

      {greska && <Greska>{greska}</Greska>}

      <div className="grid gap-x-5 sm:grid-cols-2">
        <TextField
          label="Naziv akcije"
          value={stanje.title}
          onChange={(e) => polje('title', e.target.value)}
          error={greske.title}
          placeholder="Jesenja akcija"
        />
        <TextField
          label="Opis"
          value={stanje.description}
          onChange={(e) => polje('description', e.target.value)}
          error={greske.description}
          optional
          placeholder="Za sve torte do kraja mjeseca"
        />

        <SelectField
          label="Vrsta popusta"
          value={stanje.kind}
          onChange={(e) => polje('kind', e.target.value as PromoKind)}
        >
          <option value="procenat">Procenat (%)</option>
          <option value="iznos">Fiksni iznos (KM)</option>
        </SelectField>
        <TextField
          label={stanje.kind === 'procenat' ? 'Popust u procentima' : 'Popust u KM'}
          value={stanje.vrijednost}
          onChange={(e) => polje('vrijednost', e.target.value)}
          error={greske.vrijednost || undefined}
          inputMode="decimal"
          placeholder={stanje.kind === 'procenat' ? '15' : '5,00'}
          hint={
            primjer !== null
              ? `Primjer: torta od ${formatKM(PRIMJER_FENING)} KM → ${formatKMFull(primjer)}`
              : undefined
          }
        />

        <SelectField
          label="Odnosi se na"
          value={stanje.scope}
          onChange={(e) => polje('scope', e.target.value as PromoScope)}
        >
          <option value="sve">Cijelu ponudu</option>
          <option value="kategorija">Jednu kategoriju</option>
          <option value="proizvod">Jedan proizvod</option>
        </SelectField>

        {stanje.scope === 'kategorija' && (
          <SelectField
            label="Kategorija"
            value={stanje.target}
            onChange={(e) => polje('target', e.target.value)}
            error={greske.target}
          >
            <option value="">Odaberite…</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </SelectField>
        )}

        {stanje.scope === 'proizvod' && (
          <SelectField
            label="Proizvod"
            value={stanje.target}
            onChange={(e) => polje('target', e.target.value)}
            error={greske.target}
          >
            <option value="">Odaberite…</option>
            {products.map((p) => (
              <option key={p.id} value={String(p.id)}>{p.name}</option>
            ))}
          </SelectField>
        )}

        {/* Cijela ponuda nema polje za cilj, pa bez ove prazne celije datumi
            kliznu u drugu kolonu i razdvoje se - "Počinje" lijevo, "Završava"
            u sljedecem redu desno. */}
        {stanje.scope === 'sve' && <div aria-hidden="true" className="hidden sm:block" />}

        <TextField
          label="Počinje"
          type="date"
          value={stanje.starts_on}
          onChange={(e) => polje('starts_on', e.target.value)}
          error={greske.starts_on}
          optional
          hint="Prazno znači: važi odmah."
        />
        <TextField
          label="Završava"
          type="date"
          value={stanje.ends_on}
          onChange={(e) => polje('ends_on', e.target.value)}
          error={greske.ends_on}
          optional
          hint="Prazno znači: bez roka."
        />
      </div>

      <div className="mt-4 max-w-[360px]">
        <Checkbox
          label="Aktivna"
          hint="Pauzirana akcija ne snižava nijednu cijenu."
          checked={stanje.is_active}
          onChange={(v) => polje('is_active', v)}
        />
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button size="lg" onClick={sacuvaj} loading={saving} className="sm:min-w-[200px]">
          {nova ? 'Dodaj akciju' : 'Sačuvaj izmjene'}
        </Button>
        <Button size="lg" variant="secondary" onClick={onClose}>
          Odustani
        </Button>
      </div>
    </div>
  )
}
