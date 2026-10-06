import { one, tx } from './db.js'

export const CATEGORIES = [
  { slug: 'cokoladne', name: 'Čokoladne' },
  { slug: 'djecije', name: 'Dječije' },
  { slug: 'prigodne', name: 'Prigodne' },
]

/** Sve torte imaju iste tri veličine. */
const VELICINE = (mala, srednja, velika) => [
  { label: 'Mala · 8–10 osoba', price_fening: mala },
  { label: 'Srednja · 14–16 osoba', price_fening: srednja },
  { label: 'Velika · 20–24 osobe', price_fening: velika },
]

export const PRODUCTS = [
  {
    slug: 'cokoladna-fantazija',
    name: 'Čokoladna fantazija',
    category: 'cokoladne',
    short_desc: 'Čokoladni krem, praline od lješnjaka i tamni preljev',
    long_desc:
      'Biskvit sa čokoladnim kremom, preliven tamnom čokoladom koja se spušta niz stranice. Na vrhu praline od lješnjaka, listići čokolade i vafl štapići, a oko ruba mljeveni lješnjaci. Torta za one koji čokoladu ne uzimaju na pola.',
    allergens: 'Gluten, jaja, mlijeko, orašasti plodovi, soja',
    image: '/img/cokoladna-fantazija.webp',
    is_featured: true,
    variants: VELICINE(7000, 9500, 12500),
  },
  {
    slug: 'cokoladni-drip',
    name: 'Čokoladni drip',
    category: 'cokoladne',
    short_desc: 'Čista čokolada, bez ukrasa koji odvlače pažnju',
    long_desc:
      'Najjednostavnija torta iz naše ponude i najčešće naručivana. Čokoladni biskvit, krem od mliječne čokolade i preljev koji se hvata niz stranice. Gore samo vijenac od rozeta, čokoladnih srca i vafl štapića.',
    allergens: 'Gluten, jaja, mlijeko, soja',
    image: '/img/cokoladni-drip.webp',
    is_featured: true,
    variants: VELICINE(6000, 8200, 10800),
  },
  {
    slug: 'kremasta-osamnaestica',
    name: 'Kremasta osamnaestica',
    category: 'prigodne',
    short_desc: 'Vanilin krem, čokoladni preljev i zlatne svjećice',
    long_desc:
      'Svijetli biskvit sa kremom od vanile, tamni preljev i vijenac od keksa, pralina i rozeta. Zlatne svjećice sa brojem idu uz tortu — recite nam koji broj treba i stiže postavljen.',
    allergens: 'Gluten, jaja, mlijeko, orašasti plodovi, soja',
    image: '/img/kremasta-osamnaestica.webp',
    is_featured: true,
    variants: VELICINE(7500, 10000, 13000),
  },
  {
    slug: 'slatka-desetka',
    name: 'Slatka desetka',
    category: 'djecije',
    short_desc: 'Čokoladna torta sa mafinima i cake pops na vrhu',
    long_desc:
      'Čokoladni krem i preljev, a na vrhu dva mafina sa roze kremom, cake pops na štapićima i zdjelica sa marshmallowima. Oko ruba čokoladni štanglice u šarenim posipima. Broj svjećice birate vi.',
    allergens: 'Gluten, jaja, mlijeko, soja',
    image: '/img/slatka-desetka.webp',
    variants: VELICINE(7200, 9600, 12600),
  },
  {
    slug: 'jednorog',
    name: 'Jednorog',
    category: 'djecije',
    short_desc: 'Bijeli krem, roze preljev i zvjezdice',
    long_desc:
      'Vanilin biskvit sa bijelim kremom i roze preljevom, vijenac od rozeta po rubu i zvjezdice sa šljokicama. Figure jednoroga i svjećica sa brojem dolaze uz tortu.',
    allergens: 'Gluten, jaja, mlijeko',
    image: '/img/jednorog.webp',
    is_featured: true,
    variants: VELICINE(6800, 9200, 12000),
  },
  {
    slug: 'princeza',
    name: 'Princeza',
    category: 'djecije',
    short_desc: 'Roze preljev, makaronsi i kruna na vrhu',
    long_desc:
      'Roze preljev preko svijetlog krema, rozete u dvije nijanse, makaronsi, šećerne perle i lizalice od puslica. Kruna na vrhu je ukrasna i ostaje djetetu nakon slavlja.',
    allergens: 'Gluten, jaja, mlijeko, orašasti plodovi',
    image: '/img/princeza.webp',
    variants: VELICINE(7800, 10400, 13600),
  },
  {
    slug: 'lutkice',
    name: 'Lutkice',
    category: 'djecije',
    short_desc: 'Roze ombre, puslice i figurice lutkica',
    long_desc:
      'Krem u roze ombre prelazu, roze preljev, puslice i pločice roze čokolade. Figurice lutkica i svjećica sa brojem postavljaju se po dogovoru — recite nam koje lutkice dijete voli.',
    allergens: 'Gluten, jaja, mlijeko, soja',
    image: '/img/lutkice.webp',
    variants: VELICINE(7000, 9400, 12200),
  },
  {
    slug: 'prva-godina',
    name: 'Prva godina',
    category: 'djecije',
    short_desc: 'Roze rozete, puslice na štapiću i ime djeteta',
    long_desc:
      'Torta za prvi rođendan: rozete u roze i bijeloj nijansi, srce od pipanog krema sa strane i puslice na štapiću. Ime djeteta ispisujemo sa strane, a broj sa krunicom i natpis idu uz tortu. Dva mafina dolaze uz svaku veličinu — jedan za slavljenika, jedan za fotografiju.',
    allergens: 'Gluten, jaja, mlijeko',
    image: '/img/prva-godina.webp',
    is_featured: true,
    variants: VELICINE(7500, 10000, 13000),
  },
  {
    slug: 'navijacka-torta',
    name: 'Navijačka torta',
    category: 'prigodne',
    short_desc: 'Čokoladni štapići, praline i grb kluba',
    long_desc:
      'Čokoladni biskvit obložen čokoladnim štapićima i vezan trakom u bojama kluba. Na vrhu praline, čokoladni novčići i grbovi. Radimo za bilo koji klub — grb i boje navedite u napomeni.',
    allergens: 'Gluten, jaja, mlijeko, orašasti plodovi, soja',
    image: '/img/navijacka-torta.webp',
    variants: VELICINE(8000, 10600, 13800),
  },
]

export async function seedIfEmpty() {
  const { n } = await one('SELECT COUNT(*) AS n FROM products')
  if (n > 0) return { seeded: false, count: n }

  await tx(async (client) => {
    for (const [i, p] of PRODUCTS.entries()) {
      const { rows } = await client.query(
        `INSERT INTO products
           (slug, name, category, short_desc, long_desc, unit, serves, allergens,
            image, is_featured, is_available, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING id`,
        [
          p.slug,
          p.name,
          p.category,
          p.short_desc,
          p.long_desc,
          p.unit ?? 'kom',
          p.serves ?? '',
          p.allergens ?? '',
          p.image ?? null,
          Boolean(p.is_featured),
          p.is_available ?? true,
          i,
        ],
      )
      const id = rows[0].id

      // Varijante jednog proizvoda idu jednim INSERT-om sa vise VALUES redova:
      // tri odvojena upita po proizvodu bi na udaljenoj bazi bilo 27 skokova.
      const vrijednosti = []
      const params = []
      p.variants.forEach((v, vi) => {
        const b = params.length
        vrijednosti.push(`($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4})`)
        params.push(id, v.label, v.price_fening, vi)
      })
      await client.query(
        `INSERT INTO product_variants (product_id, label, price_fening, sort_order)
         VALUES ${vrijednosti.join(', ')}`,
        params,
      )
    }
  })

  return { seeded: true, count: PRODUCTS.length }
}
