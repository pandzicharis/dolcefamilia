/** @type {import('tailwindcss').Config} */

// Svaka boja živi kao trojka RGB kanala u :root (vidi src/index.css).
// Ovaj helper ih troši tako da Tailwind alpha modifikatori (bg-surface/60) i dalje rade.
const rgb = (v) => `rgb(var(${v}) / <alpha-value>)`

export default {
  // Namjerno ostaje 'class' iako nema nijedne dark: klase.
  // Dodavanje teme kasnije = jedan .dark {} blok preko semantickih aliasa, bez diranja komponenti.
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // --- SIROVE RAMPE: koriste se SAMO u definicijama semantickih aliasa ispod ---
        cream: {
          50: rgb('--c-cream-50'),
          100: rgb('--c-cream-100'),
          200: rgb('--c-cream-200'),
          300: rgb('--c-cream-300'),
          400: rgb('--c-cream-400'),
        },
        mocha: {
          400: rgb('--c-mocha-400'),
          500: rgb('--c-mocha-500'),
          600: rgb('--c-mocha-600'),
          700: rgb('--c-mocha-700'),
          800: rgb('--c-mocha-800'),
          900: rgb('--c-mocha-900'),
        },
        cocoa: {
          50: rgb('--c-cocoa-50'),
          100: rgb('--c-cocoa-100'),
          200: rgb('--c-cocoa-200'),
          300: rgb('--c-cocoa-300'),
          400: rgb('--c-cocoa-400'),
          500: rgb('--c-cocoa-500'),
          600: rgb('--c-cocoa-600'),
          700: rgb('--c-cocoa-700'),
          800: rgb('--c-cocoa-800'),
        },
        gold: {
          100: rgb('--c-gold-100'),
          200: rgb('--c-gold-200'),
          300: rgb('--c-gold-300'),
          400: rgb('--c-gold-400'),
          500: rgb('--c-gold-500'),
          600: rgb('--c-gold-600'),
          700: rgb('--c-gold-700'),
        },
        sage: {
          100: rgb('--c-sage-100'),
          500: rgb('--c-sage-500'),
          700: rgb('--c-sage-700'),
        },
        rouge: {
          100: rgb('--c-rouge-100'),
          500: rgb('--c-rouge-500'),
          600: rgb('--c-rouge-600'),
          700: rgb('--c-rouge-700'),
        },

        // --- SEMANTICKI ALIASI: ovo je ono sto komponente smiju koristiti ---
        page: rgb('--bg-page'),
        surface: rgb('--bg-surface'),
        sunken: rgb('--bg-sunken'),
        accent: {
          DEFAULT: rgb('--accent'),
          hover: rgb('--accent-hover'),
          press: rgb('--accent-press'),
        },
      },
      textColor: {
        heading: rgb('--text-heading'),
        body: rgb('--text-body'),
        muted: rgb('--text-muted'),
        disabled: rgb('--text-disabled'),
        onDark: rgb('--text-on-dark'),
      },
      borderColor: {
        hairline: rgb('--border-hairline'), // DEKORATIVNO - nikad granica form kontrole
        control: rgb('--border-control'),   // form kontrole - prolazi WCAG 1.4.11 (3:1)
      },
      fontFamily: {
        display: ['Fraunces Variable', 'Fraunces', 'Georgia', 'Iowan Old Style', 'Palatino Linotype', 'serif'],
        sans: ['DM Sans Variable', 'DM Sans', 'ui-sans-serif', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      fontSize: {
        // clamp() samo za tri display velicine. Sve ispod 24px ide kroz responsive varijante:
        // fluidni body na 390px telefonu daje 15.4px, sto je regresija u citljivosti.
        display: ['clamp(1.875rem, 5.6vw, 3.75rem)', { lineHeight: '1.08', letterSpacing: '-0.028em' }],
        h1: ['clamp(2rem, 5vw, 3.25rem)', { lineHeight: '1.10', letterSpacing: '-0.025em' }],
        h2: ['clamp(1.625rem, 3.6vw, 2.5rem)', { lineHeight: '1.14', letterSpacing: '-0.02em' }],
      },
      spacing: {
        gutter: 'clamp(1rem, 4vw, 2rem)',
        section: 'clamp(4rem, 9vw, 8rem)',
        'section-sm': 'clamp(2.5rem, 6vw, 4.5rem)',
      },
      maxWidth: {
        container: '77.5rem', // 1240px
        content: '45rem',     // 720px
        prose: '64ch',
      },
      borderRadius: {
        sm: '6px',    // chipovi, badzevi
        md: '10px',   // inputi, selecti
        lg: '12px',   // SVA dugmad - nema pilula
        xl: '16px',   // thumbnail u korpi, toast
        '2xl': '20px', // kartica proizvoda, drawer, modal
        '3xl': '28px', // hero media, 1:1 slika proizvoda
      },
      boxShadow: {
        // Dvoslojne i tople, izvedene iz cocoa-700 (67 45 28).
        // Crna sjena na kremu daje sivo-ljubicasti oreol koji odmah izgleda jeftino.
        // Plafon alfe je 0.20 - iznad toga stranica izgleda sepija-filtrirano.
        xs: '0 1px 2px rgba(67,45,28,0.06)',
        sm: '0 1px 2px rgba(67,45,28,0.05), 0 2px 6px rgba(67,45,28,0.05)',
        md: '0 2px 4px rgba(67,45,28,0.05), 0 8px 20px -4px rgba(67,45,28,0.10)',
        lg: '0 4px 8px rgba(67,45,28,0.05), 0 18px 40px -10px rgba(67,45,28,0.14)',
        xl: '0 6px 12px rgba(67,45,28,0.06), 0 32px 64px -16px rgba(67,45,28,0.20)',
        sunken: 'inset 0 1px 2px rgba(67,45,28,0.07)',
        ring: '0 0 0 3px rgba(107,74,46,0.22)',
        'ring-error': '0 0 0 3px rgba(154,58,36,0.20)',
        none: 'none',
      },
      transitionTimingFunction: {
        silk: 'cubic-bezier(0.16, 1, 0.30, 1)',
        crisp: 'cubic-bezier(0.40, 0, 0.20, 1)',
        exit: 'cubic-bezier(0.70, 0, 0.84, 0)',
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        // Pipani rub se pomjera za TACNO jednu plocicu (48px), pa je petlja
        // nevidljiva. Bilo koja druga vrijednost vidljivo "skoci" na kraju.
        piping: {
          '0%': { backgroundPosition: '0 50%' },
          '100%': { backgroundPosition: '48px 50%' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.4s linear infinite',
        piping: 'piping 18s linear infinite',
      },
    },
  },
  plugins: [],
}
