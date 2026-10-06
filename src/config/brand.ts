/**
 * SVI brend podaci na jednom mjestu.
 *
 * Brojevi i adresa su smislјeni kao prijedlog da sajt izgleda gotovo —
 * sve označeno sa TODO(klijent) treba zamijeniti pravim podacima prije deploya.
 * Telefon je iz 060 opsega koji u BiH nije dodijeljen mobilnim operaterima,
 * pa namjerno ne može pogoditi tuđi pravi broj.
 */
export const brand = {
  name: 'Dolce Familia',
  kind: 'Slastičarna',
  /** Naslov na pocetnoj. Hero ga otkriva rijec po rijec, pa prelom radi sam. */
  slogan: 'Dijelimo trenutke. Za tortu ćemo se dogovoriti.',
  /** Slogan biznisa. Stoji kao potpis u podnozju. */
  motto: 'Za sreću ne treba razlog. Torta je dovoljna.',
  since: 1998,

  /** Jedna rečenica koja stoji ispod naslova na početnoj. */
  intro:
    'Rođendanske i prigodne torte. Birate izgled, veličinu i datum — ostalo je na nama.',

  // --- Kontakt ---------------------------------------------------------------
  phone: '+387 60 123 456',            // TODO(klijent): pravi broj
  phoneHref: 'tel:+38760123456',       // TODO(klijent)
  email: 'narudzbe@dolcefamilia.ba',   // TODO(klijent)
  address: 'Ferhadija 18',             // TODO(klijent)
  city: 'Sarajevo',                    // TODO(klijent)

  hours: [
    { days: 'Pon – Pet', time: '09:00 – 19:00' }, // TODO(klijent)
    { days: 'Subota', time: '09:00 – 16:00' },
    { days: 'Nedjelja', time: 'Zatvoreno' },
  ],

  social: {
    instagram: 'https://instagram.com/',  // TODO(klijent)
  },

  // --- Pravila narudzbe ------------------------------------------------------
  /** Cijena dostave u feninzima. Mora se poklapati sa server/routes/orders.js. */
  deliveryFeeFening: 500,               // 5,00 KM   TODO(klijent)
  /** Iznad ovog iznosa dostava je besplatna. */
  freeDeliveryOverFening: 8000,         // 80,00 KM  TODO(klijent)
  /** Minimalna najava u satima — određuje najraniji datum preuzimanja. */
  minNoticeHours: 48,                   // TODO(klijent)
  deliveryCities: ['Sarajevo', 'Ilidža', 'Vogošća', 'Hadžići'], // TODO(klijent)

  paymentNote: 'Plaćanje gotovinom pri preuzimanju ili dostavi.',
} as const

export const ORDER_STATUSES = {
  nova: 'Nova',
  potvrdjena: 'Potvrđena',
  upripremi: 'U pripremi',
  spremna: 'Spremna',
  zavrsena: 'Završena',
  otkazana: 'Otkazana',
} as const

export type OrderStatus = keyof typeof ORDER_STATUSES
