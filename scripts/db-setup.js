/**
 * Priprema baze: sema pa seed, oboje bezopasno pri ponovnom pokretanju.
 *
 * Postoji kao zasebna skripta, a ne kao poziv pri startu servera, zbog
 * Vercela: tamo se funkcija hladno podize vise puta dnevno i svaki bi start
 * trosio upite na CREATE TABLE IF NOT EXISTS i na provjeru je li baza prazna.
 *
 *   npm run db:setup          lokalno (cita .env)
 *   DATABASE_URL=... npm run db:setup --   prema Neonu, prije prvog deploya
 */
import { initSchema, pool } from '../server/db.js'
import { seedIfEmpty } from '../server/seed.js'

const cilj = (process.env.DATABASE_URL || '').replace(/:[^:@/]*@/, ':***@')
console.log(`→ ${cilj}`)

await initSchema()
console.log('  shema primijenjena')

const { seeded, count } = await seedIfEmpty()
console.log(seeded ? `  seed upisan: ${count} proizvoda` : `  seed preskocen: vec ima ${count} proizvoda`)

await pool.end()
