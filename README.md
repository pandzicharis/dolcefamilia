# Dolce Familia

Web shop za ručno rađene torte i kolače u editorijalnom, premium stilu.

Ime i znak dolaze iz klijentovog logotipa (`assets-original/logo.png`, gitignored).
Projekt se **u fajl sistemu** i dalje zove `la-familia` — ime foldera, baze
(`data/la-familia.db`) i `localStorage` ključeva (`la-familia:cart:v1`,
`la-familia:admin-token`). To je namjerno: preimenovanje baze traži migraciju, a
preimenovanje ključeva bi svakom kupcu ispraznilo korpu i odjavilo admina. Ništa
od toga korisnik ne vidi. Brojevi narudžbi **jesu** promijenjeni u `DF-2026-0001`.

**Jedna stranica** (`/`): kratak hero, odmah ponuda, pa kompaktan kontakt.
Nema navigacije u headeru — samo logo i korpa. Zasebne stranice su checkout,
potvrda i admin. Proizvod nema svoju stranicu: klik na karticu (ili na
„Odaberi" u hero karuselu) otvara modal sa tri veličine i dodaje u korpu.

| Ruta | Šta je |
|---|---|
| `/` | Hero · `#ponuda` · `#kontakt` |
| `/narudzba` | Checkout |
| `/narudzba/hvala/:broj` | Potvrda |
| `/admin` | Pregled i narudžbe |
| `/admin/proizvodi` | Dodavanje i uređivanje proizvoda |
| `/admin/akcije` | Akcije (popusti) |

Stare rute `/kolaci`, `/kolaci/:slug`, `/o-nama` i `/kontakt` preusmjeravaju na
sidra, da bookmarkovi i vanjski linkovi ne puknu.

**Svaki proizvod ima tačno tri veličine** (Mala 8–10 / Srednja 14–16 / Velika
20–24 osobe). To je ugrađeno u seed i u izgled modala za izbor — ako dodajete
proizvod, dajte mu tri varijante.

**Stack:** React 19 · Vite 8 · TypeScript · Tailwind 3 · Framer Motion 14 ·
Express 5 · `node:sqlite` · zod 4

---

## Pokretanje

Projekt traži **Node 22.12+** (`node:sqlite` je ugrađen u Node 22, pa baza nema
nijednu native zavisnost — nema `node-gyp`, nema prebuild download-a).

```bash
nvm use          # čita .nvmrc → 22.21.0
npm install
cp .env.example .env
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:3001 (Vite proxyja `/api` na njega)

Baza se sama kreira u `data/la-familia.db` i popuni sa 12 proizvoda pri prvom
pokretanju. Da krenete iz početka, obrišite taj fajl.

### Skripte

| Komanda | Šta radi |
|---|---|
| `npm run dev` | API + Vite paralelno |
| `npm run build` | Typecheck pa produkcijski build u `dist/` |
| `npm start` | Jedan proces: servira `dist/` **i** API |
| `npm run typecheck` | Samo `tsc` |
| `npm run lint` | oxlint |

U produkciji isti Express proces servira i build i API, uz SPA fallback za sve
što nije `/api`.

---

## Admin

`/admin`, zaštićen jednim dijeljenim tokenom iz `.env` (`ADMIN_TOKEN`). Tri taba
unutar istog ekrana:

| Tab | Šta radi |
|---|---|
| **Narudžbe** | Brojevi za danas / 7 / 30 dana, **šta se kojeg dana preuzima** sa stavkama, najtraženije za 90 dana, pa lista narudžbi sa pretragom (broj, ime, telefon), filterom po statusu i promjenom statusa |
| **Proizvodi** | Dodavanje, uređivanje i brisanje proizvoda sa veličinama i cijenama, učitavanje fotografije, prekidači „Sakrij” i „Istakni” |
| **Akcije** | Popusti: procenat ili fiksni iznos, za cijelu ponudu / kategoriju / jedan proizvod, sa datumima i pauziranjem |

Admin se učitava kao **zasebni chunk** (`lazy()` u `App.tsx`) — forme, upload i
tabele koje nijedan kupac ne otvori ne idu u bundle početne stranice.

> **Ovo nije pravi auth sistem.** Nema korisnika, rotacije, isteka ni rate
> limita — samo sprječava da lista narudžbi bude javna. Prije deploya promijenite
> token, a prije ozbiljne upotrebe ovo zamijenite stvarnom autentikacijom.

### Akcije

Jedna akcija vrijedi za cijelu ponudu, za kategoriju ili za jedan proizvod.
Kad se dvije poklope, **ne sabiraju se**: pobjeđuje uža (proizvod > kategorija >
cijela ponuda), a unutar istog nivoa ona koja kupcu da nižu cijenu. Sabiranje je
najlakši način da torta od 70 KM ispadne 12 KM zato što su dvije akcije slučajno
ostale aktivne.

Cijena se snižava na **jednom mjestu** —
[`server/pricing.js`](server/pricing.js) — a kroz njega prolaze i katalog
(prikaz) i upis narudžbe (naplata), pa se to dvoje ne može razići. Klijent dobija
i `price_fening` (redovna) i `effective_price_fening` (ono što se plaća); UI
računa isključivo sa drugim poljem.

`order_items` uz snapshot imena i cijene drži i `discount_fening` i
`promo_snapshot` (npr. „Jesenja akcija (-15%)”), pa se za šest mjeseci vidi
**zašto** je cijena bila niža, i kad akcija u međuvremenu bude obrisana.

Akcija se čita iz baze u trenutku upisa narudžbe, ne u trenutku dodavanja u
korpu: ko je dodao tortu prije nego je akcija istekla plaća redovnu cijenu — i
obrnuto, akcija koja je u međuvremenu počela se priznaje. `CartContext` pri
učitavanju poredi akcijsku cijenu sa katalogom i javi kupcu ako se promijenila.

---

## Šta treba popuniti prije deploya

### Zaštićeni znakovi

Na fotografijama se vide proizvodi drugih brendova (lješnjak praline, keksi,
krem namaz), figurice licenciranih likova i grb FK Sarajevo. Nazivi i opisi
proizvoda su namjerno pisani opisno (“praline od lješnjaka”, “figurice lutkica”,
“grb kluba”) i ne spominju tuđe zaštićene znakove. Hoće li se te fotografije
koristiti javno je poslovna odluka klijenta — vrijedi provjeriti prije deploya.

Svi brend podaci su na **jednom mjestu**: [`src/config/brand.ts`](src/config/brand.ts).
Svaka linija označena sa `TODO(klijent)` je placeholder — telefon, adresa,
radno vrijeme, društvene mreže, cijena dostave, gradovi, minimalno vrijeme najave.

Cijena dostave postoji i u [`server/routes/orders.js`](server/routes/orders.js)
(`DELIVERY_FEE_FENING`, `FREE_DELIVERY_OVER_FENING`) i **to je namjerno** — klijentska
vrijednost je samo za prikaz, server ima zadnju riječ. Ako mijenjate cijenu
dostave, mijenjajte je na **oba** mjesta.

---

## Odluke koje nisu očigledne iz koda

**Cijene su cijeli broj feninga, nikad float.** `1 KM = 100 feninga`. Float
cijene daju `38.000000000000004` u zbiru korpe i to korisnik vidi. Pretvaranje u
tekst se dešava isključivo u [`src/lib/format.ts`](src/lib/format.ts).

**Nema `Intl` za bosanski.** `bs-BA` se prijavljuje kao podržan locale
(`supportedLocalesOf` ga vrati, `resolvedOptions().locale` kaže `bs-BA`), ali su
CLDR podaci prazni i tiho se pada na engleski:

```
(1234.5).toLocaleString('bs-BA')               → "1,234.5"        (treba "1.234,5")
new Intl.DateTimeFormat('bs-BA', …).format(d)  → "2026-10-12, Mon"
```

Cijena od 1250 KM bi se prikazala kao `1,250,00 KM`. Zato su svi formateri ručni.

**Server ne vjeruje nijednoj cijeni iz klijenta.** `POST /api/orders` prima samo
`{ productId, variantId, qty }` po stavci, pa ponovo čita cijene iz baze i sam
računa `subtotal`/`total`. Sve ide u jednu transakciju da narudžba bez stavki ne
može ostati u bazi.

**`order_items` čuvaju snapshot** imena i cijene. Kad se cjenovnik promijeni za
šest mjeseci, stara narudžba i dalje prikazuje ono što je kupac stvarno platio.

**Admin je izvan `AnimatePresence`-a.** `AnimatePresence` sa `mode="wait"` drži
djecu po ključu; admin ima tri taba unutar jednog ekrana, pa bi — da je unutra —
ili svaki tab odmontirao cijeli admin (ponovna provjera tokena i ponovno
učitavanje svih lista), ili bi, sa zajedničkim ključem, klik na tab promijenio
URL a sadržaj ostao isti. Interni ekran ionako ne treba ulaznu animaciju
stranice. Uslov `jeAdmin` u [`App.tsx`](src/App.tsx) nosi to objašnjenje.

**Brisanje proizvoda ne ruši stare narudžbe.** `order_items.product_id` je
namjerno bez stranog ključa na `products`, pa račun ostaje čitljiv i kad
proizvoda više nema u ponudi. Varijante se pri uređivanju mijenjaju **na
mjestu**, ne brišu i upisuju ponovo: korpe kupaca drže `variantId` u
`localStorage`-u, a obrisan id znači stavka koja tiho ispadne iz korpe.

**Slike su generisani SVG placeholderi.** Prelazak na prave fotografije je jedna
linija po proizvodu — vidi ispod.

---

## Deploy (Vercel)

Sajt je na Vercelu: statički build iz `dist/` servira CDN, a cijeli Express
API radi kao **jedna serverless funkcija** (`api/index.js`). Rute su iste kao
lokalno — `vercel.json` prebacuje `/api/*` na funkciju, a sve ostalo na
`index.html` zbog SPA rutiranja.

### Dva režima

API radi i bez baze. Režim određuje prisustvo `DATABASE_URL`:

| | `katalog: "demo"` | `katalog: "baza"` |
|---|---|---|
| Kad | `DATABASE_URL` nije postavljen | `DATABASE_URL` postavljen |
| Katalog | iz seed podataka ([`server/demo.js`](server/demo.js)) | iz Postgresa |
| Akcije | nema ih | rade |
| Narudžbe | `503` sa porukom | upisuju se |
| Admin | `503` | radi |

Provjera je `GET /api/health`.

Demo režim postoji da svjež deploy **radi i izgleda ispravno prije nego iko
napravi bazu** — katalog, slike, izbor veličine i korpa rade. Ono što ne može
raditi vraća 503 sa jasnom porukom, umjesto da tiho proguta narudžbu.

### Prelazak na pravu bazu

1. U Vercel projektu: **Storage → Create Database → Neon**. Kopirajte
   connection string — **onaj sa `-pooler` u hostu**. Serverless funkcija
   otvara vezu po instanci, a direktni endpoint potroši limit veza prije nego
   sajt primi ozbiljan promet.
2. Za fotografije koje admin učitava: **Storage → Create → Blob**. Token
   (`BLOB_READ_WRITE_TOKEN`) Vercel sam doda u projekat.
3. Environment Variables → dodajte `DATABASE_URL`, `ADMIN_TOKEN` i
   `SHOP_TIMEZONE=Europe/Sarajevo`.
4. Jednom, sa svoje mašine, napunite bazu:
   ```bash
   DATABASE_URL="<neon-pooler-url>" npm run db:setup
   ```
5. Redeploy.

### Zašto SQLite više ne radi

Vercelove funkcije nemaju disk na koji se smije pisati — podižu se i gase sa
praznim fajl sistemom. SQLite fajl i `data/uploads/` bi nestajali sa svakim
hladnim startom, dakle i narudžbe sa njima. Zato baza ide u Postgres, a
učitane fotografije u Vercel Blob ([`server/storage.js`](server/storage.js)),
koji u bazu upisuje puni `https://` URL.

Lokalno ništa od toga ne treba: bez `BLOB_READ_WRITE_TOKEN`-a slike idu na
disk u `data/uploads/` kao i prije.

### Lokalni razvoj sa Postgresom

```bash
npm run db:up      # Postgres 16 u Dockeru na :55432
npm run db:setup   # shema + seed
npm run dev
```

---

## Fotografije

Prave fotografije su u `public/img/`, po dvije po proizvodu:

| Fajl | Širina | Za šta |
|---|---|---|
| `<slug>-640.webp` | 640px | kartica u gridu (~45 KB) |
| `<slug>.webp` | 1200px | hero karusel (~125 KB) |

`srcSet` gradi [`imageSrcSet()`](src/lib/format.ts) iz putanje — kartica nikad
ne povuče sliku od 1200px za okvir od 300px. Originalni PNG-ovi (1254×1254,
~2,2 MB svaki) stoje u `assets-original/`, koji je gitignored.

**Dodavanje nove torte:**

```bash
cwebp -q 82 -resize 1200 0 original.png -o public/img/novi-slug.webp
cwebp -q 80 -resize 640  0 original.png -o public/img/novi-slug-640.webp
```

Pa u `server/seed.js` dodajte proizvod sa `image: '/img/novi-slug.webp'` i tri
varijante, i obrišite `data/la-familia.db` da se seed ponovo izvrši. Seed je
sada samo **početni sadržaj** — proizvodi se dodaju i mijenjaju na
`/admin/proizvodi`.

### Fotografije kroz admin

Forma proizvoda prima fotografiju direktno (WEBP/JPG/PNG do 6 MB). Fajl ide u
`data/uploads/`, **ne** u `public/img/`, i servira ga Express na `/uploads/...`:
`public/` se kopira u `dist/` pri buildu, pa bi slika učitana nakon builda
postojala samo do sljedećeg deploya. U devu Vite proxyja `/uploads` na API.

Učitana slika se **ne smanjuje** (nema `sharp`), pa
[`imageSrcSet()`](src/lib/format.ts) gradi `srcSet` samo za `/img/` putanje —
za `/uploads/` nema `-640` varijante i `srcSet` koji pokazuje na nepostojeći
fajl znači slomljenu sliku na malim ekranima. Kad fotografija ulazi u stalnu
ponudu, vrijedi je propustiti kroz `cwebp` iznad i staviti u `public/img/`.

[`CakeImage`](src/components/CakeImage.tsx) uvijek renderuje isti okvir
(`aspect-square` + `overflow-hidden`), pa je dodavanje ili uklanjanje slike
**layout-identično, nula CLS**. `GeneratedCakePattern` ostaje u kodu kao
fallback za proizvod bez slike ili sa 404.

---

## Dizajn

Minimalistički premium: krem podloga, tanke zlatne linije, Fraunces za naslove
i DM Sans za tekst. Mjera je **koliko brzo kupac dođe do narudžbe**, pa je sve
što je stajalo između hero-a i kataloga uklonjeno.

Brend je u [`src/config/brand.ts`](src/config/brand.ts) — tu su i naslov na
početnoj (`slogan`) i slogan biznisa (`motto`, stoji kao potpis u podnožju).

Logo je klijentov crtež — wordmark „Dolce Familia” sa tortom i srcem — pa ide
kao **slika sa alfa kanalom**, ne SVG:

| Fajl | Veličina | Za šta |
|---|---|---|
| `public/logo-320.webp` | 320×165 | podnožje, 1x ekrani |
| `public/logo.webp` | 640×330 | header od 640px naviše, hero na mobitelu, 2x ekrani |
| `public/mini-logo.webp` | 162×160 | header **ispod 640px** — samo torta sa srcem, bez slova |
| `public/favicon.png` | 256×256 | ikona taba |
| `public/apple-touch-icon.png` | 180×180 | ikona aplikacije na iOS-u |

Originali stoje u `assets-original/` (gitignored):

| Original | Šta je | Ide u |
|---|---|---|
| `logo.png` | 1774×887, alfa | `logo.webp`, `logo-320.webp` |
| `mini-logo-mobile.png` | 1254×1254, alfa | `mini-logo.webp` |
| `mini-logo-bg.png` | 1254×1254, krem podloga | `favicon.png`, `apple-touch-icon.png` |
| `instagram-logo.png`, `logo-bg.png` | krem podloga | ništa na sajtu — materijal za objave |

Dvije stvari koje nisu očite:

**Originali nose prazan rub**, pa se prije konverzije režu na alfa okvir
(`logo.png` je 1774×887, a sam crtež 1647×848). Bez rezanja visinu troši
prozirna margina, pa `h-16` u headeru daje vidljivo manji znak od traženog.

**Ikone idu iz verzije sa kremom, ne iz prozirne.** Apple-touch ikona ne smije
biti prozirna — iOS joj podmetne crnu podlogu i smeđi crtež nestane.

```python
# python3, Pillow — rezanje i skaliranje; cwebp onda radi kompresiju
from PIL import Image
im = Image.open('assets-original/logo.png').convert('RGBA')
im = im.crop(im.getchannel('A').getbbox())            # odrezi prazan rub
im.resize((640, 330), Image.LANCZOS).save('/tmp/logo.png')
```

```bash
# near_lossless cuva ostre rubove crteza, a ~25% je lakse od pravog lossless-a
cwebp -near_lossless 60 -q 90 -m 6 /tmp/logo.png -o public/logo.webp
```

[`Logo`](src/components/ui/Logo.tsx) ima dvije varijante: sam wordmark (header,
podnožje) i `stacked` sa oznakom „Slastičarna · Sarajevo” ispod (hero na
mobitelu). Atributi `width`/`height` na slici nisu ukras — bez njih sticky
header poskoči kad se logo učita.

U headeru zamjena wordmarka za mini znak ide kroz `<picture>` sa `media`
upitom, ne kroz dvije slike sa `hidden`/`sm:hidden`: tako browser skine **samo**
onu koja odgovara ekranu, pa telefon nikad ne povuče wordmark koji ne prikazuje.
Wordmark je širok ~150px na traci od 375px, a na početnoj isti taj wordmark
stoji i u hero-u par centimetara ispod — dvaput ista slika na jednom ekranu
čita se kao greška.

### Dekor na dijelovima bez fotografije

Hero tekst, traka iznad ponude i kontakt su velike površine čistog krema na
kojima se iz teksta ne vidi da je riječ o kolačima.
[`Dekor.tsx`](src/components/ui/Dekor.tsx) nosi tri ukrasa za ta mjesta:

| Komponenta | Gdje | Šta radi |
|---|---|---|
| `SlatkaTraka` | između hero-a i ponude | pipani rub koji se pomjera + crtana torta koja se **ispisuje** kad uđe u vidokrug, sa treperavim plamenom i dimom |
| `Posip` | hero tekst, kontakt traka | zrna posipa koja lagano plutaju; pozicije su upisane ručno, jer `random` na svaki render znači da posip „preskoči” |
| `Rozeta` | uz naslov „Ponuda” | pipana rozeta koja se ispiše pa se vrti jednom u 44 s |

Ovo je **namjeran izuzetak** od pravila „bez ukrasa” niže na listi: ukras ne
nosi tekst, ne odgađa skrol i stoji tačno tamo gdje kupac još nije vidio ni
jednu fotografiju. Pravila kojih se drži: `aria-hidden` + `pointer-events-none`,
animira se samo transform i opacity, a `prefers-reduced-motion` zadržava crtež i
ukida kretanje — statična torta i dalje govori šta se prodaje.

Pipani rub je CSS background (`.traka-krem` u `index.css`), ne rastegnut SVG:
rastegnut `viewBox` na 1440px ekranu daje plitke, razvučene lukove.

### Izbor veličine pri dodavanju

Dugme na kartici **ne dodaje ništa u korpu** — otvara
[`QuickAdd`](src/components/product/QuickAdd.tsx), modal sa tri veličine i
količinom. Nakon dodavanja korpa se otvara sama.

Ranije je kartica tiho dodavala najjeftiniju varijantu, pa je kupac koji je
htio veliku tortu dobijao malu a da to nigdje nije vidio.

### Hero karusel

Hero ima rotirajući prikaz istaknutih torti
([`HeroCarousel.tsx`](src/components/sections/HeroCarousel.tsx)), rađen po uzoru
na referentni reel koji je klijent poslao. Preuzeta je struktura — proizvod u
centru, zlatni lukovi iza njega, tačkice i strelice, slajd svakih 4,5 s — ali ne
i tamna maksimalistička estetika originala.

Autorotacija staje u četiri slučaja, i svaki od njih je namjeran:

| Kad | Zašto |
|---|---|
| `prefers-reduced-motion` | korisnik je tražio manje kretanja |
| miš iznad karusela | gleda konkretnu tortu |
| fokus **sa tastature** (`:focus-visible`) | ne otimamo kontrolu korisniku tastature |
| `document.visibilityState === 'hidden'` | inače se vratiš na tab i zatekneš slajd koji je preskočio pet puta |

Provjera `:focus-visible` nije kozmetika: bez nje klik mišem na tačkicu ostavi
fokus na dugmetu i autoplay se nikad više ne pokrene.

### Validacija korpe

`CartContext` pri učitavanju uporedi snimljenu korpu sa svježim katalogom i
ispravi imena, cijene i veličine, a nedostupne stavke izbaci.

Guard `validated` se u cleanupu **vraća na `false`**. To nije višak: bez toga se
u StrictMode-u validacija nikad ne izvrši — prvi prolaz postavi guard i krene
fetch, cleanup ga otkaže, a drugi prolaz izađe na guardu. Posljedica je korpa
koja prikazuje staro ime i staru cijenu, dok server naplati novu.

Tri stvari koje je lako pokvariti:

- **Slike su `aspect-square`.** U širokoj grid koloni narastu na 700px+ i pojedu
  ekran; gdje je slika veća, širina je eksplicitno ograničena.
- **Grid je dvokolonski već na telefonu.** Jedna kolona znači 10 ekrana skrolanja
  do dna umjesto 4,7.
- **Ne vraćati dekorativne brojeve sekcija i slične ukrase** — upravo su oni bili
  razlog da stranica djeluje pretrpano.
- **Zlatni lukovi iza karusela moraju izlaziti izvan okvira slike**
  (`-inset-10`). Unutar okvira ih zaobljena fotografija potpuno prekrije.

## Pristupačnost i motion

- Svi tekst/pozadina parovi prolaze WCAG AA; granice form kontrola prolaze 1.4.11 (3:1).
- `prefers-reduced-motion` se poštuje kroz **tri** mehanizma: `MotionConfig
  reducedMotion="user"`, eksplicitne `useReducedMotion()` grane (stagger, drag,
  dekorativna zlatna linija, badge bump, curtain reveal, sekvenca potvrde) i CSS
  blok u `index.css` za sve što ne vozi Framer Motion.
- Svaki interaktivni element ima ≥44×44px pogodak.
- `input { font-size: 16px }` je obavezno — iOS Safari inače zumira viewport na
  fokus i razbije checkout usred kucanja.

---

## Poznato / izvan obima prve verzije

Online plaćanje · korisnički nalozi · email/SMS notifikacije · pravi admin auth ·
smanjivanje učitanih fotografija na serveru (`sharp`) · dark mode (tokeni su
pripremljeni: jedan `.dark {}` blok preko ~18 semantičkih aliasa) · i18n ·
stranica "O nama" (sadržaj je sveden na jednu rečenicu u hero-u).

`npm audit` prijavljuje `braces` upozorenje koje dolazi iz Tailwind 3 build
lanca. To je **dev-only** zavisnost (watcher za glob), ne isporučuje se
korisnicima. Popravka bi značila Tailwind 4, što je breaking change za cijeli
token sistem.
