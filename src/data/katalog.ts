import type { Category, Product } from '../types'

/**
 * Ponuda, ugrađena u build.
 *
 * NE dolazi sa servera. Katalog je statičan sadržaj — devet torti koje se
 * mijenjaju par puta godišnje — pa nema razloga da prvi ekran čeka mrežni
 * zahtjev, ni da sajt zavisi od toga je li API živ.
 *
 * Izvor istine je i dalje `server/seed.js`; ovaj fajl je iz njega generisan:
 *
 *   node --input-type=module -e "..."   (vidi README, sekcija Ponuda)
 *
 * Kad katalog bude trebalo mijenjati kroz admin, `api.products()` se vraća
 * na `fetch` i ovaj fajl ispada iz igre.
 */
export const KATALOG: Product[] = [
  {
    "id": 1,
    "slug": "cokoladna-fantazija",
    "name": "Čokoladna fantazija",
    "category": "cokoladne",
    "short_desc": "Čokoladni krem, praline od lješnjaka i tamni preljev",
    "long_desc": "Biskvit sa čokoladnim kremom, preliven tamnom čokoladom koja se spušta niz stranice. Na vrhu praline od lješnjaka, listići čokolade i vafl štapići, a oko ruba mljeveni lješnjaci. Torta za one koji čokoladu ne uzimaju na pola.",
    "unit": "kom",
    "serves": "",
    "allergens": "Gluten, jaja, mlijeko, orašasti plodovi, soja",
    "image": "/img/cokoladna-fantazija.webp",
    "is_featured": true,
    "is_available": true,
    "sort_order": 0,
    "variants": [
      {
        "id": 1,
        "label": "Mala · 8–10 osoba",
        "price_fening": 7000,
        "effective_price_fening": 7000
      },
      {
        "id": 2,
        "label": "Srednja · 14–16 osoba",
        "price_fening": 9500,
        "effective_price_fening": 9500
      },
      {
        "id": 3,
        "label": "Velika · 20–24 osobe",
        "price_fening": 12500,
        "effective_price_fening": 12500
      }
    ],
    "promo": null,
    "fromPriceFening": 7000,
    "fromRegularPriceFening": 7000
  },
  {
    "id": 2,
    "slug": "cokoladni-drip",
    "name": "Čokoladni drip",
    "category": "cokoladne",
    "short_desc": "Čista čokolada, bez ukrasa koji odvlače pažnju",
    "long_desc": "Najjednostavnija torta iz naše ponude i najčešće naručivana. Čokoladni biskvit, krem od mliječne čokolade i preljev koji se hvata niz stranice. Gore samo vijenac od rozeta, čokoladnih srca i vafl štapića.",
    "unit": "kom",
    "serves": "",
    "allergens": "Gluten, jaja, mlijeko, soja",
    "image": "/img/cokoladni-drip.webp",
    "is_featured": true,
    "is_available": true,
    "sort_order": 1,
    "variants": [
      {
        "id": 4,
        "label": "Mala · 8–10 osoba",
        "price_fening": 6000,
        "effective_price_fening": 6000
      },
      {
        "id": 5,
        "label": "Srednja · 14–16 osoba",
        "price_fening": 8200,
        "effective_price_fening": 8200
      },
      {
        "id": 6,
        "label": "Velika · 20–24 osobe",
        "price_fening": 10800,
        "effective_price_fening": 10800
      }
    ],
    "promo": null,
    "fromPriceFening": 6000,
    "fromRegularPriceFening": 6000
  },
  {
    "id": 3,
    "slug": "kremasta-osamnaestica",
    "name": "Kremasta osamnaestica",
    "category": "prigodne",
    "short_desc": "Vanilin krem, čokoladni preljev i zlatne svjećice",
    "long_desc": "Svijetli biskvit sa kremom od vanile, tamni preljev i vijenac od keksa, pralina i rozeta. Zlatne svjećice sa brojem idu uz tortu — recite nam koji broj treba i stiže postavljen.",
    "unit": "kom",
    "serves": "",
    "allergens": "Gluten, jaja, mlijeko, orašasti plodovi, soja",
    "image": "/img/kremasta-osamnaestica.webp",
    "is_featured": true,
    "is_available": true,
    "sort_order": 2,
    "variants": [
      {
        "id": 7,
        "label": "Mala · 8–10 osoba",
        "price_fening": 7500,
        "effective_price_fening": 7500
      },
      {
        "id": 8,
        "label": "Srednja · 14–16 osoba",
        "price_fening": 10000,
        "effective_price_fening": 10000
      },
      {
        "id": 9,
        "label": "Velika · 20–24 osobe",
        "price_fening": 13000,
        "effective_price_fening": 13000
      }
    ],
    "promo": null,
    "fromPriceFening": 7500,
    "fromRegularPriceFening": 7500
  },
  {
    "id": 4,
    "slug": "slatka-desetka",
    "name": "Slatka desetka",
    "category": "djecije",
    "short_desc": "Čokoladna torta sa mafinima i cake pops na vrhu",
    "long_desc": "Čokoladni krem i preljev, a na vrhu dva mafina sa roze kremom, cake pops na štapićima i zdjelica sa marshmallowima. Oko ruba čokoladni štanglice u šarenim posipima. Broj svjećice birate vi.",
    "unit": "kom",
    "serves": "",
    "allergens": "Gluten, jaja, mlijeko, soja",
    "image": "/img/slatka-desetka.webp",
    "is_featured": false,
    "is_available": true,
    "sort_order": 3,
    "variants": [
      {
        "id": 10,
        "label": "Mala · 8–10 osoba",
        "price_fening": 7200,
        "effective_price_fening": 7200
      },
      {
        "id": 11,
        "label": "Srednja · 14–16 osoba",
        "price_fening": 9600,
        "effective_price_fening": 9600
      },
      {
        "id": 12,
        "label": "Velika · 20–24 osobe",
        "price_fening": 12600,
        "effective_price_fening": 12600
      }
    ],
    "promo": null,
    "fromPriceFening": 7200,
    "fromRegularPriceFening": 7200
  },
  {
    "id": 5,
    "slug": "jednorog",
    "name": "Jednorog",
    "category": "djecije",
    "short_desc": "Bijeli krem, roze preljev i zvjezdice",
    "long_desc": "Vanilin biskvit sa bijelim kremom i roze preljevom, vijenac od rozeta po rubu i zvjezdice sa šljokicama. Figure jednoroga i svjećica sa brojem dolaze uz tortu.",
    "unit": "kom",
    "serves": "",
    "allergens": "Gluten, jaja, mlijeko",
    "image": "/img/jednorog.webp",
    "is_featured": true,
    "is_available": true,
    "sort_order": 4,
    "variants": [
      {
        "id": 13,
        "label": "Mala · 8–10 osoba",
        "price_fening": 6800,
        "effective_price_fening": 6800
      },
      {
        "id": 14,
        "label": "Srednja · 14–16 osoba",
        "price_fening": 9200,
        "effective_price_fening": 9200
      },
      {
        "id": 15,
        "label": "Velika · 20–24 osobe",
        "price_fening": 12000,
        "effective_price_fening": 12000
      }
    ],
    "promo": null,
    "fromPriceFening": 6800,
    "fromRegularPriceFening": 6800
  },
  {
    "id": 6,
    "slug": "princeza",
    "name": "Princeza",
    "category": "djecije",
    "short_desc": "Roze preljev, makaronsi i kruna na vrhu",
    "long_desc": "Roze preljev preko svijetlog krema, rozete u dvije nijanse, makaronsi, šećerne perle i lizalice od puslica. Kruna na vrhu je ukrasna i ostaje djetetu nakon slavlja.",
    "unit": "kom",
    "serves": "",
    "allergens": "Gluten, jaja, mlijeko, orašasti plodovi",
    "image": "/img/princeza.webp",
    "is_featured": false,
    "is_available": true,
    "sort_order": 5,
    "variants": [
      {
        "id": 16,
        "label": "Mala · 8–10 osoba",
        "price_fening": 7800,
        "effective_price_fening": 7800
      },
      {
        "id": 17,
        "label": "Srednja · 14–16 osoba",
        "price_fening": 10400,
        "effective_price_fening": 10400
      },
      {
        "id": 18,
        "label": "Velika · 20–24 osobe",
        "price_fening": 13600,
        "effective_price_fening": 13600
      }
    ],
    "promo": null,
    "fromPriceFening": 7800,
    "fromRegularPriceFening": 7800
  },
  {
    "id": 7,
    "slug": "lutkice",
    "name": "Lutkice",
    "category": "djecije",
    "short_desc": "Roze ombre, puslice i figurice lutkica",
    "long_desc": "Krem u roze ombre prelazu, roze preljev, puslice i pločice roze čokolade. Figurice lutkica i svjećica sa brojem postavljaju se po dogovoru — recite nam koje lutkice dijete voli.",
    "unit": "kom",
    "serves": "",
    "allergens": "Gluten, jaja, mlijeko, soja",
    "image": "/img/lutkice.webp",
    "is_featured": false,
    "is_available": true,
    "sort_order": 6,
    "variants": [
      {
        "id": 19,
        "label": "Mala · 8–10 osoba",
        "price_fening": 7000,
        "effective_price_fening": 7000
      },
      {
        "id": 20,
        "label": "Srednja · 14–16 osoba",
        "price_fening": 9400,
        "effective_price_fening": 9400
      },
      {
        "id": 21,
        "label": "Velika · 20–24 osobe",
        "price_fening": 12200,
        "effective_price_fening": 12200
      }
    ],
    "promo": null,
    "fromPriceFening": 7000,
    "fromRegularPriceFening": 7000
  },
  {
    "id": 8,
    "slug": "prva-godina",
    "name": "Prva godina",
    "category": "djecije",
    "short_desc": "Roze rozete, puslice na štapiću i ime djeteta",
    "long_desc": "Torta za prvi rođendan: rozete u roze i bijeloj nijansi, srce od pipanog krema sa strane i puslice na štapiću. Ime djeteta ispisujemo sa strane, a broj sa krunicom i natpis idu uz tortu. Dva mafina dolaze uz svaku veličinu — jedan za slavljenika, jedan za fotografiju.",
    "unit": "kom",
    "serves": "",
    "allergens": "Gluten, jaja, mlijeko",
    "image": "/img/prva-godina.webp",
    "is_featured": true,
    "is_available": true,
    "sort_order": 7,
    "variants": [
      {
        "id": 22,
        "label": "Mala · 8–10 osoba",
        "price_fening": 7500,
        "effective_price_fening": 7500
      },
      {
        "id": 23,
        "label": "Srednja · 14–16 osoba",
        "price_fening": 10000,
        "effective_price_fening": 10000
      },
      {
        "id": 24,
        "label": "Velika · 20–24 osobe",
        "price_fening": 13000,
        "effective_price_fening": 13000
      }
    ],
    "promo": null,
    "fromPriceFening": 7500,
    "fromRegularPriceFening": 7500
  },
  {
    "id": 9,
    "slug": "navijacka-torta",
    "name": "Navijačka torta",
    "category": "prigodne",
    "short_desc": "Čokoladni štapići, praline i grb kluba",
    "long_desc": "Čokoladni biskvit obložen čokoladnim štapićima i vezan trakom u bojama kluba. Na vrhu praline, čokoladni novčići i grbovi. Radimo za bilo koji klub — grb i boje navedite u napomeni.",
    "unit": "kom",
    "serves": "",
    "allergens": "Gluten, jaja, mlijeko, orašasti plodovi, soja",
    "image": "/img/navijacka-torta.webp",
    "is_featured": false,
    "is_available": true,
    "sort_order": 8,
    "variants": [
      {
        "id": 25,
        "label": "Mala · 8–10 osoba",
        "price_fening": 8000,
        "effective_price_fening": 8000
      },
      {
        "id": 26,
        "label": "Srednja · 14–16 osoba",
        "price_fening": 10600,
        "effective_price_fening": 10600
      },
      {
        "id": 27,
        "label": "Velika · 20–24 osobe",
        "price_fening": 13800,
        "effective_price_fening": 13800
      }
    ],
    "promo": null,
    "fromPriceFening": 8000,
    "fromRegularPriceFening": 8000
  }
]

/** Kategorije sa brojem dostupnih proizvoda — isto kao što je API računao. */
export const KATEGORIJE: Category[] = [
  {
    "slug": "cokoladne",
    "name": "Čokoladne",
    "count": 2
  },
  {
    "slug": "djecije",
    "name": "Dječije",
    "count": 5
  },
  {
    "slug": "prigodne",
    "name": "Prigodne",
    "count": 2
  }
]
