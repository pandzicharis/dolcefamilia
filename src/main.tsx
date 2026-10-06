import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'framer-motion'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { CartProvider } from './context/CartContext'
import { DUR, EASE } from './motion/tokens'
import './index.css'

/**
 * Browser po defaultu sam vraca skrol poziciju pri navigaciji ('auto').
 * To se trkalo sa nasim skrolom na sidro: efekt skroluje na sekciju, pa
 * Chrome odmah nakon toga vrati na 0 - nedeterministicki, ponekad radi a
 * ponekad ne. Pozicijom upravljamo sami u App.tsx.
 */
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual'
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* reducedMotion="user" preskace transform/layout animacije a zadrzava
        opacity i boju. To pokriva vecinu sistema bez ijedne linije po
        komponenti; ostatak rjesava useReducedMotion() i CSS blok u index.css. */}
    <MotionConfig reducedMotion="user" transition={{ duration: DUR.base, ease: EASE.crisp }}>
      <BrowserRouter>
        <CartProvider>
          <App />
        </CartProvider>
      </BrowserRouter>
    </MotionConfig>
  </StrictMode>,
)
