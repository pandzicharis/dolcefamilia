import { list, put } from '@vercel/blob'
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Gdje zavrsavaju fotografije koje admin ucita kroz formu.
 *
 * Na Vercelu NE postoji disk na koji se smije pisati - funkcija se gasi i
 * podize sa praznim fajl sistemom, pa bi slika nestala sa prvim sljedecim
 * deployom ili cak prije. Zato ide u Vercel Blob, a u bazu se upisuje puni
 * URL (https://...). `imageSrcSet()` na klijentu propusta samo `/img/`
 * putanje, pa blob URL ispravno ostane bez -640 varijante.
 *
 * Lokalno, bez BLOB_READ_WRITE_TOKEN-a, sve ide na disk kao i prije: dev ne
 * treba Vercelov nalog da bi se forma mogla isprobati.
 */
const TOKEN = process.env.BLOB_READ_WRITE_TOKEN
export const naBlobu = Boolean(TOKEN)

export const UPLOAD_DIR = resolve(process.env.UPLOAD_DIR || './data/uploads')

/** Fotografije koje su dosle sa projektom. Putanja je vezana za modul, ne za
 *  CWD - u Vercelovoj funkciji CWD nije korijen projekta. */
const IMG_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'img')

/** Prefiks unutar blob store-a; drzi ucitane slike odvojeno od svega ostalog. */
const BLOB_PREFIX = 'uploads/'

export async function spremiSliku(ime, bajtovi, contentType) {
  if (naBlobu) {
    const { url } = await put(`${BLOB_PREFIX}${ime}`, bajtovi, {
      access: 'public',
      contentType,
      token: TOKEN,
      // Ime vec nosi vremensku oznaku; dodatni nasumicni sufiks bi samo
      // zamutio putanju, a dvije slike istog imena u istoj milisekundi nema.
      addRandomSuffix: false,
    })
    return url
  }

  mkdirSync(UPLOAD_DIR, { recursive: true })
  writeFileSync(resolve(UPLOAD_DIR, ime), bajtovi)
  return `/uploads/${ime}`
}

/**
 * Ponuda slika za formu proizvoda: fotografije koje su dosle sa projektom i
 * one koje je admin ucitao.
 *
 * -640 varijante se ne nabrajaju - one su dio srcSet konvencije, ne izbor.
 */
export async function sveSlike() {
  return [...izlistajDisk(IMG_DIR, '/img', 'projekt'), ...(await ucitaneSlike())]
}

async function ucitaneSlike() {
  if (!naBlobu) return izlistajDisk(UPLOAD_DIR, '/uploads', 'ucitano')
  try {
    const { blobs } = await list({ prefix: BLOB_PREFIX, token: TOKEN })
    return blobs
      .filter((b) => SLIKA.test(b.pathname))
      .sort((a, b) => a.pathname.localeCompare(b.pathname))
      .map((b) => ({ path: b.url, source: 'ucitano' }))
  } catch (err) {
    console.error('[storage] blob lista nije dostupna:', err)
    return []
  }
}

const SLIKA = /\.(webp|jpg|jpeg|png)$/i

function izlistajDisk(dir, prefix, source) {
  try {
    return readdirSync(dir)
      .filter((f) => SLIKA.test(f) && !/-640\.webp$/i.test(f))
      .sort()
      .map((f) => ({ path: `${prefix}/${f}`, source }))
  } catch {
    return []
  }
}
