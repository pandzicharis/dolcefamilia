import { DatabaseSync } from 'node:sqlite'
import { dirname, resolve } from 'node:path'
import { mkdirSync } from 'node:fs'

const DB_PATH = resolve(process.env.DB_PATH || './data/la-familia.db')
mkdirSync(dirname(DB_PATH), { recursive: true })

export const db = new DatabaseSync(DB_PATH)

db.exec('PRAGMA journal_mode = WAL')
db.exec('PRAGMA foreign_keys = ON')

/**
 * Sve cijene su INTEGER u feninzima (1 KM = 100 feninga). Nikad REAL.
 *
 * order_items drzi SNAPSHOT imena i cijene: kad se cjenovnik promijeni za
 * sest mjeseci, stara narudzba i dalje prikazuje ono sto je kupac stvarno platio.
 */
export function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      slug          TEXT    NOT NULL UNIQUE,
      name          TEXT    NOT NULL,
      category      TEXT    NOT NULL,
      short_desc    TEXT    NOT NULL DEFAULT '',
      long_desc     TEXT    NOT NULL DEFAULT '',
      unit          TEXT    NOT NULL DEFAULT 'kom',
      serves        TEXT    NOT NULL DEFAULT '',
      allergens     TEXT    NOT NULL DEFAULT '',
      image         TEXT,
      is_featured   INTEGER NOT NULL DEFAULT 0,
      is_available  INTEGER NOT NULL DEFAULT 1,
      sort_order    INTEGER NOT NULL DEFAULT 0,
      /* Postavlja ga admin forma. Seed ga ostavlja NULL - za proizvode koji
         su dosli sa projektom "kad je dodan" nema smisla. */
      created_at    TEXT
    );

    CREATE TABLE IF NOT EXISTS product_variants (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      label       TEXT    NOT NULL,
      price_fening INTEGER NOT NULL,
      sort_order  INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS orders (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
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
      created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id         INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id       INTEGER NOT NULL,
      slug_snapshot    TEXT    NOT NULL,
      name_snapshot    TEXT    NOT NULL,
      variant_label    TEXT    NOT NULL,
      /* Cijena koja je STVARNO naplacena (akcijska kad je akcija vazila). */
      unit_price_fening INTEGER NOT NULL,
      qty              INTEGER NOT NULL,
      line_total_fening INTEGER NOT NULL,
      /* Ukupan popust na stavku i tekst akcije - da se za pola godine zna
         zasto je cijena bila niza, i kad akcija bude obrisana. */
      discount_fening  INTEGER NOT NULL DEFAULT 0,
      promo_snapshot   TEXT
    );

    /**
     * Akcije. Jedna akcija moze vazit za cijelu ponudu, za kategoriju ili za
     * jedan proizvod; najuza akcija pobjedjuje (vidi pricing.js).
     *
     * value je procenat (1-90) ili iznos u feninzima, zavisno od kind.
     * starts_on/ends_on su NULL kad akcija nema pocetak odnosno kraj.
     */
    CREATE TABLE IF NOT EXISTS promotions (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      title       TEXT    NOT NULL,
      description TEXT    NOT NULL DEFAULT '',
      kind        TEXT    NOT NULL CHECK (kind IN ('procenat','iznos')),
      value       INTEGER NOT NULL,
      scope       TEXT    NOT NULL CHECK (scope IN ('sve','kategorija','proizvod')),
      target      TEXT,
      starts_on   TEXT,
      ends_on     TEXT,
      is_active   INTEGER NOT NULL DEFAULT 1,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
    CREATE INDEX IF NOT EXISTS idx_variants_product  ON product_variants(product_id);
    CREATE INDEX IF NOT EXISTS idx_items_order       ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_orders_created    ON orders(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_orders_pickup     ON orders(pickup_date);
    CREATE INDEX IF NOT EXISTS idx_promotions_active ON promotions(is_active);
  `)

  migrate()
}

/**
 * Za baze nastale prije akcija: kolone iznad postoje u CREATE TABLE, ali
 * CREATE se na postojecu tabelu ne primjenjuje. ALTER se izvrsava samo ako
 * kolone stvarno nema, pa je ovo bezopasno pri svakom startu i ne radi nista
 * na svjezoj bazi.
 */
function migrate() {
  addColumn('order_items', 'discount_fening', 'INTEGER NOT NULL DEFAULT 0')
  addColumn('order_items', 'promo_snapshot', 'TEXT')
  addColumn('products', 'created_at', 'TEXT')
}

function addColumn(table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all()
  if (cols.some((c) => c.name === column)) return
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
}

/**
 * Generise sljedeci broj narudzbe u formatu DF-2026-0001.
 * Mora se zvati UNUTAR transakcije koja upisuje narudzbu, inace dva
 * istovremena zahtjeva dobiju isti broj.
 */
export function nextOrderNumber() {
  const year = new Date().getFullYear()
  const prefix = `DF-${year}-`
  const row = db
    .prepare(
      `SELECT order_number FROM orders
        WHERE order_number LIKE ?
        ORDER BY order_number DESC LIMIT 1`,
    )
    .get(`${prefix}%`)
  const last = row ? parseInt(String(row.order_number).slice(prefix.length), 10) : 0
  return `${prefix}${String(last + 1).padStart(4, '0')}`
}
