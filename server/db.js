import pg from 'pg'

const { Pool, types } = pg

/**
 * Postgres vraca BIGINT i NUMERIC kao STRING, da ne izgubi preciznost na
 * vrijednostima vecim od Number.MAX_SAFE_INTEGER. Kod nas su to iskljucivo
 * COUNT(*) i SUM(feninzi) - brojevi koji nikad nece prici toj granici, a
 * klijent ih ocekuje kao brojeve. Bez ovoga `SUM(total_fening)` stigne kao
 * "12500" pa se u JSON-u pojavi kao string i zbrajanje na klijentu zalijepi
 * dva broja umjesto da ih sabere.
 */
types.setTypeParser(types.builtins.INT8, Number)
types.setTypeParser(types.builtins.NUMERIC, Number)

const connectionString = process.env.DATABASE_URL

/**
 * Bez DATABASE_URL-a aplikacija NE puca - prelazi u demo rezim.
 *
 * Katalog se tad servira iz seed podataka (server/demo.js), pa sajt radi i
 * izgleda ispravno na svjezem deployu, prije nego iko napravi bazu. Pisanje
 * (narudzbe, admin) u tom rezimu vraca 503 sa jasnom porukom - tiho gutanje
 * narudzbe bi bilo gore od greske.
 */
export const imaBazu = Boolean(connectionString)

/** Lokalna baza u Dockeru nema TLS; Neon ga trazi i ima ispravan certifikat. */
const jeLokalna = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(connectionString)

/**
 * `max: 1` nije stednja nego nuzda. Na Vercelu svaka instanca funkcije ima
 * svoj pool, a instanci moze biti na desetine; pool od 10 veza po instanci
 * potrosi Neonov limit prije nego sajt uopste primi promet. Jedna veza po
 * instanci je i dovoljna - funkcija ionako obradjuje jedan zahtjev u trenutku.
 * Lokalno (jedan proces, dev i admin istovremeno) ide 5.
 */
export const pool = imaBazu
  ? new Pool({
      connectionString,
      ssl: jeLokalna ? false : { rejectUnauthorized: true },
      max: Number(process.env.PG_POOL_MAX) || (process.env.VERCEL ? 1 : 5),
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
    })
  : null

pool?.on('error', (err) => console.error('[db] neaktivna veza je pukla:', err))

function veza() {
  if (!pool) throw new Error('DATABASE_URL nije postavljen — baza nije dostupna.')
  return pool
}

/**
 * Vremenska zona radnje. SQLite verzija je koristila 'localtime', sto je na
 * serveru u Frankfurtu UTC - narudzba primljena u 01:30 po sarajevskom bi
 * pala u "juce" i admin bi je trazio na pogresnom danu. Zona je zato
 * eksplicitna, ne naslijedjena od hosta.
 */
export const ZONA = process.env.SHOP_TIMEZONE || 'Europe/Sarajevo'

export async function all(text, params = []) {
  const { rows } = await veza().query(text, params)
  return rows
}

export async function one(text, params = []) {
  const { rows } = await veza().query(text, params)
  return rows[0] ?? null
}

/** `changes` imitira SQLite-ov `result.changes` - rute na njemu rade 404. */
export async function run(text, params = []) {
  const { rowCount } = await veza().query(text, params)
  return { changes: rowCount }
}

/**
 * Transakcija na jednoj vezi. Callback dobija klijenta i MORA kroz njega
 * slati sve upite - `all`/`one`/`run` iznad uzimaju proizvoljnu vezu iz
 * poola i zavrsile bi izvan transakcije.
 */
export async function tx(fn) {
  const client = await veza().connect()
  try {
    await client.query('BEGIN')
    const out = await fn(client)
    await client.query('COMMIT')
    return out
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    client.release()
  }
}

/**
 * Sve cijene su INTEGER u feninzima (1 KM = 100 feninga). Nikad REAL.
 *
 * order_items drzi SNAPSHOT imena i cijene: kad se cjenovnik promijeni za
 * sest mjeseci, stara narudzba i dalje prikazuje ono sto je kupac stvarno platio.
 *
 * Datumi bez vremena (pickup_date, starts_on, ends_on) stoje kao TEXT u
 * obliku YYYY-MM-DD, ne kao DATE. Razlog je klijent: `formatDate()` prima
 * tacno taj oblik, a pg bi DATE kolonu vratio kao JS Date pa bi u JSON-u
 * zavrsila kao "2026-10-12T00:00:00.000Z" i pomjerila dan za zonu.
 * Poredjenja (`>=`, `BETWEEN`) na YYYY-MM-DD tekstu su leksikografski tacna.
 */
export async function initSchema() {
  await veza().query(`
    CREATE TABLE IF NOT EXISTS products (
      id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      slug          TEXT    NOT NULL UNIQUE,
      name          TEXT    NOT NULL,
      category      TEXT    NOT NULL,
      short_desc    TEXT    NOT NULL DEFAULT '',
      long_desc     TEXT    NOT NULL DEFAULT '',
      unit          TEXT    NOT NULL DEFAULT 'kom',
      serves        TEXT    NOT NULL DEFAULT '',
      allergens     TEXT    NOT NULL DEFAULT '',
      image         TEXT,
      is_featured   BOOLEAN NOT NULL DEFAULT FALSE,
      is_available  BOOLEAN NOT NULL DEFAULT TRUE,
      sort_order    INTEGER NOT NULL DEFAULT 0,
      -- Postavlja ga admin forma. Seed ga ostavlja NULL - za proizvode koji
      -- su dosli sa projektom "kad je dodan" nema smisla.
      created_at    TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS product_variants (
      id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      product_id   INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      label        TEXT    NOT NULL,
      price_fening INTEGER NOT NULL,
      sort_order   INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS orders (
      id               INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      order_number     TEXT    NOT NULL UNIQUE,
      customer_name    TEXT    NOT NULL,
      phone            TEXT    NOT NULL,
      email            TEXT,
      fulfillment      TEXT    NOT NULL CHECK (fulfillment IN ('dostava','preuzimanje')),
      address          TEXT,
      city             TEXT,
      pickup_date      TEXT    NOT NULL,
      note             TEXT,
      subtotal_fening  INTEGER NOT NULL,
      delivery_fening  INTEGER NOT NULL DEFAULT 0,
      total_fening     INTEGER NOT NULL,
      status           TEXT    NOT NULL DEFAULT 'nova',
      created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id                INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      order_id          INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id        INTEGER NOT NULL,
      slug_snapshot     TEXT    NOT NULL,
      name_snapshot     TEXT    NOT NULL,
      variant_label     TEXT    NOT NULL,
      -- Cijena koja je STVARNO naplacena (akcijska kad je akcija vazila).
      unit_price_fening INTEGER NOT NULL,
      qty               INTEGER NOT NULL,
      line_total_fening INTEGER NOT NULL,
      -- Ukupan popust na stavku i tekst akcije - da se za pola godine zna
      -- zasto je cijena bila niza, i kad akcija bude obrisana.
      discount_fening   INTEGER NOT NULL DEFAULT 0,
      promo_snapshot    TEXT
    );

    -- Akcije. Jedna akcija moze vazit za cijelu ponudu, za kategoriju ili za
    -- jedan proizvod; najuza akcija pobjedjuje (vidi pricing.js).
    -- value je procenat (1-90) ili iznos u feninzima, zavisno od kind.
    -- starts_on/ends_on su NULL kad akcija nema pocetak odnosno kraj.
    CREATE TABLE IF NOT EXISTS promotions (
      id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      title       TEXT    NOT NULL,
      description TEXT    NOT NULL DEFAULT '',
      kind        TEXT    NOT NULL CHECK (kind IN ('procenat','iznos')),
      value       INTEGER NOT NULL,
      scope       TEXT    NOT NULL CHECK (scope IN ('sve','kategorija','proizvod')),
      target      TEXT,
      starts_on   TEXT,
      ends_on     TEXT,
      is_active   BOOLEAN NOT NULL DEFAULT TRUE,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
    CREATE INDEX IF NOT EXISTS idx_variants_product  ON product_variants(product_id);
    CREATE INDEX IF NOT EXISTS idx_items_order       ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_orders_created    ON orders(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_orders_pickup     ON orders(pickup_date);
    CREATE INDEX IF NOT EXISTS idx_promotions_active ON promotions(is_active);
  `)
}

/**
 * Generise sljedeci broj narudzbe u formatu DF-2026-0001.
 *
 * Mora se zvati UNUTAR transakcije koja upisuje narudzbu, kroz njenog
 * klijenta. Advisory lock drzi mjesto SQLite-ovog `BEGIN IMMEDIATE`: bez
 * njega dva istovremena zahtjeva procitaju isti MAX i dobiju isti broj, pa
 * jedan padne na UNIQUE ogranicenju. Lock se pusta sam na kraju transakcije.
 */
export async function nextOrderNumber(client) {
  const year = new Date().getFullYear()
  const prefix = `DF-${year}-`

  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`orders:${prefix}`])

  const { rows } = await client.query(
    `SELECT order_number FROM orders
      WHERE order_number LIKE $1
      ORDER BY order_number DESC LIMIT 1`,
    [`${prefix}%`],
  )
  const last = rows[0] ? parseInt(String(rows[0].order_number).slice(prefix.length), 10) : 0
  return `${prefix}${String(last + 1).padStart(4, '0')}`
}
