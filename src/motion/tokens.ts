/**
 * Dvije discipline koje cine razliku izmedju "premium" i "igracka":
 *
 * 1. Overshoot postoji na TACNO dva mjesta na cijelom sajtu - badge korpe
 *    i kvacica potvrde. Vrh `settle` je 1.26, ne 1.56 kao tipican backOut.
 * 2. Izlasci traju ~60% ulaska i koriste EASE.exit. Stvari odlaze odlucno,
 *    dolaze polako.
 */
export const EASE = {
  /** Duga usporavajuca repina. Ulasci, scroll reveal, drawer, reveal slike. */
  silk: [0.16, 1, 0.3, 1],
  /** Suzdrzan overshoot. SAMO trenuci potvrde. */
  settle: [0.34, 1.26, 0.64, 1],
  /** Simetricno i brzo. Hover, fokus, boja, mikro-stanja. */
  crisp: [0.4, 0, 0.2, 1],
  /** Ubrzavajuce. Sve sto napusta ekran. */
  exit: [0.7, 0, 0.84, 0],
} as const

export const DUR = {
  instant: 0.08,
  fast: 0.16,
  base: 0.24,
  slow: 0.38,
  reveal: 0.62,
} as const

export const STAGGER = 0.06
/** Kljucno: 24 proizvoda x 60ms znaci da zadnja kartica ceka 1.38s,
 *  a donja dva reda nisu ni u viewportu. Ovim je plafon 420ms. */
export const STAGGER_CAP = 7

/** Zajednicki viewport za scroll reveal. */
export const VIEWPORT = { once: true, amount: 0.2, margin: '0px 0px -8% 0px' } as const
