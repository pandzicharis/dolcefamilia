import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { api, ApiError } from '../../lib/api'
import type { AdminImage, Category, Product, ProductInput } from '../../types'
import { formatKM, formatKMFull, parseKM } from '../../lib/format'
import { naAkciji } from '../../lib/promo'
import { Badge, EmptyState, GoldRule, Skeleton } from '../../components/ui/Bits'
import { Button } from '../../components/ui/Button'
import { SelectField, TextField, TextareaField } from '../../components/ui/Field'
import { cn } from '../../lib/cn'
import { EASE } from '../../motion/tokens'
import { useAdminToken } from './adminToken'
import { AdminSection, Checkbox, Greska, neprikazane, Potvrda } from './bits'

/** Polja koja forma crta sa vlastitim mjestom za gresku. */
const POLJA_FORME = ['name', 'slug', 'category', 'short_desc', 'long_desc', 'variants']

/** Tri veličine koje svaki proizvod ima - ista konvencija kao u server/seed.js. */
const VELICINE = ['Mala · 8–10 osoba', 'Srednja · 14–16 osoba', 'Velika · 20–24 osobe']

const inputKlase =
  'h-11 w-full rounded-md border border-control bg-sunken px-3 text-[15px] text-body ' +
  'placeholder:text-mocha-500 focus:border-accent focus:shadow-ring focus:outline-none'

type VarijantaForme = { id?: number; label: string; cijena: string }

type Forma = {
  id?: number
  name: string
  slug: string
  category: string
  short_desc: string
  long_desc: string
  allergens: string
  image: string
  is_featured: boolean
  is_available: boolean
  variants: VarijantaForme[]
}

const PRAZNA: Forma = {
  name: '',
  slug: '',
  category: '',
  short_desc: '',
  long_desc: '',
  allergens: '',
  image: '',
  is_featured: false,
  is_available: true,
  variants: VELICINE.map((label) => ({ label, cijena: '' })),
}

/**
 * Bosanska slova u URL oznaku. `normalize('NFD')` sam rjesava samo akcente;
 * đ i ž nemaju dekompoziciju koja bi dala golo slovo, pa idu kroz mapu.
 */
const MAPA: Record<string, string> = { č: 'c', ć: 'c', ž: 'z', š: 's', đ: 'dj' }

function uSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[čćžšđ]/g, (m) => MAPA[m] ?? m)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

function uFormu(p: Product): Forma {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    category: p.category,
    short_desc: p.short_desc,
    long_desc: p.long_desc,
    allergens: p.allergens,
    image: p.image ?? '',
    is_featured: p.is_featured,
    is_available: p.is_available,
    variants: p.variants.map((v) => ({ id: v.id, label: v.label, cijena: formatKM(v.price_fening) })),
  }
}

export function AdminProducts() {
  const token = useAdminToken()
  const reduce = useReducedMotion()

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [images, setImages] = useState<AdminImage[]>([])
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
      .adminProducts(token)
      .then(setProducts)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Greška pri učitavanju.'))
      .finally(() => setLoading(false))
  }, [token])

  useEffect(() => { ucitaj() }, [ucitaj])

  useEffect(() => {
    api.categories().then(setCategories).catch(() => setCategories([]))
    api.adminImages(token).then(setImages).catch(() => setImages([]))
  }, [token])

  async function prekidac(p: Product, flags: { is_available?: boolean; is_featured?: boolean }) {
    setBusyId(p.id)
    setError(null)
    try {
      const azuriran = await api.adminProductFlags(token, p.id, flags)
      setProducts((prev) => prev.map((x) => (x.id === p.id ? azuriran : x)))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Promjena nije sačuvana.')
    } finally {
      setBusyId(null)
    }
  }

  async function obrisi(p: Product) {
    setBusyId(p.id)
    setError(null)
    try {
      await api.adminDeleteProduct(token, p.id)
      setProducts((prev) => prev.filter((x) => x.id !== p.id))
      setBrisem(null)
      javi(`"${p.name}" je obrisan iz ponude.`)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Proizvod nije obrisan.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      {error && <Greska>{error}</Greska>}
      <AnimatePresence>{potvrda && <Potvrda key={potvrda}>{potvrda}</Potvrda>}</AnimatePresence>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="t-small text-muted">
          {products.length} {products.length === 1 ? 'proizvod' : 'proizvoda'} u ponudi. Cijene su po
          veličini; svaki proizvod bi trebao imati sve tri.
        </p>
        <Button
          onClick={() => {
            setForma(forma && !forma.id ? null : { ...PRAZNA, category: categories[0]?.slug ?? '' })
            setBrisem(null)
          }}
        >
          {forma && !forma.id ? 'Zatvori formu' : 'Novi proizvod'}
        </Button>
      </div>

      <AnimatePresence initial={false}>
        {forma && (
          <motion.div
            key={forma.id ?? 'novi'}
            initial={reduce ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            transition={{ duration: 0.34, ease: EASE.silk }}
            className="mt-6"
          >
            <ProizvodForma
              forma={forma}
              categories={categories}
              images={images}
              onImages={setImages}
              onClose={() => setForma(null)}
              onSaved={(p, novi) => {
                setProducts((prev) =>
                  novi ? [...prev, p] : prev.map((x) => (x.id === p.id ? p : x)),
                )
                setForma(null)
                javi(novi ? `"${p.name}" je dodan u ponudu.` : `"${p.name}" je sačuvan.`)
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AdminSection title="Ponuda">
        {loading && products.length === 0 ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            title="Ponuda je prazna"
            description="Dodajte prvi proizvod da se pojavi na početnoj stranici."
          />
        ) : (
          <ul className="space-y-3">
            {products.map((p) => {
              const cijene = p.variants.map((v) => v.price_fening)
              const odDo = cijene.length
                ? `${formatKM(Math.min(...cijene))} – ${formatKMFull(Math.max(...cijene))}`
                : '—'
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
                    {/* Kvadrat fiksne velicine: lista mora ostati citljiva i
                        kad proizvod nema sliku. */}
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-sunken">
                      {p.image && (
                        <img src={p.image} alt="" className="h-full w-full object-cover" loading="lazy" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="t-card-title !text-[17px]">{p.name}</span>
                        {!p.is_available && <Badge tone="error">Nije dostupno</Badge>}
                        {p.is_featured && <Badge tone="gold">Istaknuto</Badge>}
                        {p.promo && p.variants.some(naAkciji) && (
                          <Badge tone="gold">Akcija · {p.promo.title}</Badge>
                        )}
                      </div>
                      <p className="t-small mt-0.5 text-muted">
                        {p.slug} · {categories.find((c) => c.slug === p.category)?.name ?? p.category}
                      </p>
                      <p className="t-small mt-1 tabular text-body">{odDo}</p>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => { setForma(uFormu(p)); setBrisem(null) }}
                      >
                        Uredi
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => prekidac(p, { is_available: !p.is_available })}
                      >
                        {p.is_available ? 'Sakrij' : 'Prikaži'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => prekidac(p, { is_featured: !p.is_featured })}
                      >
                        {p.is_featured ? 'Skini istaknuto' : 'Istakni'}
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

                  {brisem === p.id && (
                    <p className="t-small mt-3 text-rouge-700">
                      Brisanje je trajno. Stare narudžbe ostaju čitljive — one drže svoj snimak imena i
                      cijene. Ako proizvod samo trenutno ne radite, bolje je “Sakrij”.
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </AdminSection>
    </div>
  )
}

/** Forma za jedan proizvod. Ista i za novi i za uredjivanje - razlikuje ih `forma.id`. */
function ProizvodForma({
  forma,
  categories,
  images,
  onImages,
  onSaved,
  onClose,
}: {
  forma: Forma
  categories: Category[]
  images: AdminImage[]
  onImages: (i: AdminImage[]) => void
  onSaved: (p: Product, novi: boolean) => void
  onClose: () => void
}) {
  const token = useAdminToken()
  const [stanje, setStanje] = useState<Forma>(forma)
  const [greske, setGreske] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [greska, setGreska] = useState<string | null>(null)
  /** Kad je korisnik sam dirao slug, naziv ga vise ne prepisuje. */
  const [slugRucno, setSlugRucno] = useState(Boolean(forma.id))

  const novi = !forma.id
  const polje = <K extends keyof Forma>(k: K, v: Forma[K]) => setStanje((s) => ({ ...s, [k]: v }))

  function promijeniNaziv(v: string) {
    setStanje((s) => ({ ...s, name: v, slug: slugRucno ? s.slug : uSlug(v) }))
  }

  function varijanta(i: number, patch: Partial<VarijantaForme>) {
    setStanje((s) => ({
      ...s,
      variants: s.variants.map((v, j) => (j === i ? { ...v, ...patch } : v)),
    }))
  }

  async function ucitajSliku(file: File) {
    setUploading(true)
    setGreska(null)
    try {
      const { path } = await api.adminUploadImage(token, file, stanje.slug || stanje.name || 'slika')
      onImages([...images, { path, source: 'ucitano' }])
      polje('image', path)
    } catch (e) {
      setGreska(e instanceof ApiError ? e.message : 'Slika nije učitana.')
    } finally {
      setUploading(false)
    }
  }

  async function sacuvaj() {
    const lokalne: Record<string, string> = {}
    if (stanje.name.trim().length < 2) lokalne.name = 'Unesite naziv proizvoda.'
    if (stanje.slug.length < 2) lokalne.slug = 'Unesite URL oznaku.'
    if (!stanje.category) lokalne.category = 'Odaberite kategoriju.'

    const variants: ProductInput['variants'] = []
    stanje.variants.forEach((v, i) => {
      const fening = parseKM(v.cijena)
      if (!v.label.trim()) lokalne[`variant-${i}`] = 'Unesite naziv veličine.'
      else if (fening === null) lokalne[`variant-${i}`] = 'Cijena npr. 70 ili 70,50.'
      else if (fening < 100) lokalne[`variant-${i}`] = 'Najmanje 1,00 KM.'
      else variants.push({ id: v.id, label: v.label.trim(), price_fening: fening })
    })

    setGreske(lokalne)
    if (Object.keys(lokalne).length > 0) return

    const payload: ProductInput = {
      name: stanje.name.trim(),
      slug: stanje.slug,
      category: stanje.category,
      short_desc: stanje.short_desc.trim(),
      long_desc: stanje.long_desc.trim(),
      allergens: stanje.allergens.trim(),
      image: stanje.image || null,
      is_featured: stanje.is_featured,
      is_available: stanje.is_available,
      variants,
    }

    setSaving(true)
    setGreska(null)
    try {
      const p = novi
        ? await api.adminCreateProduct(token, payload)
        : await api.adminUpdateProduct(token, forma.id as number, payload)
      onSaved(p, novi)
    } catch (e) {
      if (e instanceof ApiError) {
        // Greske za polja koja forma crta idu pod to polje; one za polja koja
        // forma NE crta (npr. putanja slike) idu u traku - inace server kaze
        // "provjerite podatke" a nigdje se ne vidi sta.
        setGreska([e.message, ...neprikazane(e.fields, POLJA_FORME)].join(' '))
        if (e.fields) setGreske(e.fields)
      } else {
        setGreska('Proizvod nije sačuvan.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-2xl border border-hairline bg-surface p-5 shadow-md sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-[20px] leading-tight text-heading">
          {novi ? 'Novi proizvod' : `Uredi: ${forma.name}`}
        </h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Odustani
        </Button>
      </div>

      <GoldRule className="my-5" />

      {greska && <Greska>{greska}</Greska>}

      <div className="grid gap-x-5 sm:grid-cols-2">
        <TextField
          label="Naziv"
          value={stanje.name}
          onChange={(e) => promijeniNaziv(e.target.value)}
          error={greske.name}
          placeholder="Čokoladna fantazija"
        />
        <TextField
          label="URL oznaka"
          value={stanje.slug}
          onChange={(e) => { setSlugRucno(true); polje('slug', uSlug(e.target.value)) }}
          error={greske.slug}
          hint="Interna oznaka proizvoda — stoji u korpi i u narudžbama."
        />
        <SelectField
          label="Kategorija"
          value={stanje.category}
          onChange={(e) => polje('category', e.target.value)}
          error={greske.category}
        >
          <option value="">Odaberite…</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </SelectField>
        <TextField
          label="Alergeni"
          value={stanje.allergens}
          onChange={(e) => polje('allergens', e.target.value)}
          optional
          placeholder="Gluten, jaja, mlijeko"
        />
      </div>

      <TextField
        label="Kratki opis"
        value={stanje.short_desc}
        onChange={(e) => polje('short_desc', e.target.value)}
        error={greske.short_desc}
        hint="Jedna linija koja stoji na kartici u ponudi."
        placeholder="Čokoladni krem, praline i tamni preljev"
      />

      <TextareaField
        label="Opis u modalu za izbor"
        value={stanje.long_desc}
        onChange={(e) => polje('long_desc', e.target.value)}
        error={greske.long_desc}
        optional
      />

      {/* ------------------------------------------------------------- SLIKA */}
      <fieldset className="mt-2">
        <legend className="t-eyebrow mb-2">Fotografija</legend>
        <div className="flex flex-wrap items-start gap-4">
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-hairline bg-sunken">
            {stanje.image && (
              <img src={stanje.image} alt="" className="h-full w-full object-cover" />
            )}
          </div>

          <div className="min-w-[240px] flex-1">
            <select
              value={stanje.image}
              onChange={(e) => polje('image', e.target.value)}
              aria-label="Odaberite fotografiju"
              className={inputKlase}
            >
              <option value="">Bez fotografije (crtani uzorak)</option>
              {images.map((i) => (
                <option key={i.path} value={i.path}>
                  {i.path.replace(/^\/(img|uploads)\//, '')}
                  {i.source === 'ucitano' ? ' (učitano)' : ''}
                </option>
              ))}
            </select>

            <label className="mt-2 inline-flex min-h-[44px] cursor-pointer items-center text-[14px] text-cocoa-700 underline underline-offset-2">
              {uploading ? 'Učitavanje…' : 'Učitaj novu fotografiju'}
              <input
                type="file"
                accept="image/webp,image/jpeg,image/png"
                className="sr-only"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  // Input se resetuje da se ista slika moze ucitati dva puta.
                  e.target.value = ''
                  if (f) ucitajSliku(f)
                }}
              />
            </label>
            <p className="t-small text-muted">
              WEBP, JPG ili PNG do 6 MB. Učitana slika se ne smanjuje — za najbrži prikaz pripremite
              kvadratnu fotografiju oko 1200 px.
            </p>
          </div>
        </div>
      </fieldset>

      {/* ---------------------------------------------------------- VELICINE */}
      <fieldset className="mt-6">
        <legend className="t-eyebrow mb-2">Veličine i cijene</legend>
        <ul className="space-y-2">
          {stanje.variants.map((v, i) => (
            <li key={i}>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={v.label}
                  onChange={(e) => varijanta(i, { label: e.target.value })}
                  aria-label={`Naziv veličine ${i + 1}`}
                  placeholder="Mala · 8–10 osoba"
                  className={cn(inputKlase, 'min-w-[200px] flex-1')}
                />
                <span className="flex items-center gap-2">
                  <input
                    value={v.cijena}
                    onChange={(e) => varijanta(i, { cijena: e.target.value })}
                    aria-label={`Cijena za veličinu ${i + 1}`}
                    inputMode="decimal"
                    placeholder="70,00"
                    className={cn(inputKlase, 'w-[110px] tabular text-right')}
                  />
                  <span className="t-small text-muted">KM</span>
                </span>
                {stanje.variants.length > 1 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setStanje((s) => ({ ...s, variants: s.variants.filter((_, j) => j !== i) }))
                    }
                  >
                    Ukloni
                  </Button>
                )}
              </div>
              {greske[`variant-${i}`] && (
                <p role="alert" className="t-small pt-1 text-rouge-700">{greske[`variant-${i}`]}</p>
              )}
            </li>
          ))}
        </ul>
        {greske.variants && (
          <p role="alert" className="t-small pt-1 text-rouge-700">{greske.variants}</p>
        )}
        {stanje.variants.length < 6 && (
          <Button
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={() =>
              setStanje((s) => ({
                ...s,
                variants: [...s.variants, { label: VELICINE[s.variants.length] ?? '', cijena: '' }],
              }))
            }
          >
            Dodaj veličinu
          </Button>
        )}
      </fieldset>

      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        <Checkbox
          label="Dostupno"
          hint="Skinuto sa ponude se ne može naručiti."
          checked={stanje.is_available}
          onChange={(v) => polje('is_available', v)}
        />
        <Checkbox
          label="Istaknuto"
          hint="Ulazi u karusel na početnoj."
          checked={stanje.is_featured}
          onChange={(v) => polje('is_featured', v)}
        />
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button size="lg" onClick={sacuvaj} loading={saving} className="sm:min-w-[200px]">
          {novi ? 'Dodaj u ponudu' : 'Sačuvaj izmjene'}
        </Button>
        <Button size="lg" variant="secondary" onClick={onClose}>
          Odustani
        </Button>
      </div>
    </div>
  )
}
