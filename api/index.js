/**
 * Ulaz za Vercel.
 *
 * Vercel ovaj fajl pakuje kao Node serverless funkciju i dodjeljuje joj SVE
 * /api/* putanje (vidi vercel.json). Express aplikacija dobija zahtjev sa
 * originalnim URL-om, pa rute ostaju iste kao lokalno: /api/products, /api/orders…
 *
 * Aplikacija se gradi JEDNOM po instanci funkcije, izvan handlera - tako
 * topla instanca ne gradi router na svaki zahtjev.
 */
import { createApp } from '../server/app.js'

export default createApp()
