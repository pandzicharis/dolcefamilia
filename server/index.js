import { createApp } from './app.js'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIST = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist')
const PORT = Number(process.env.PORT) || 3001

createApp().listen(PORT, () => {
  console.log(`  Dolce Familia API  →  http://localhost:${PORT}`)
  if (!existsSync(DIST)) console.log('  (dist/ ne postoji — frontend servira Vite na :5173)')
})
