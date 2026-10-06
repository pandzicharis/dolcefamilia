import { Hero } from '../components/sections/Hero'
import { Ponuda } from '../components/sections/Ponuda'
import { Kontakt } from '../components/sections/Kontakt'
import { SlatkaTraka } from '../components/ui/Dekor'

/**
 * Tri bloka, bez medjusekcija. Sve sto je stajalo izmedju hero-a i ponude
 * samo je odgadjalo trenutak u kojem kupac vidi kolace.
 *
 * Jedini izuzetak je SlatkaTraka: ne nosi tekst, ne odgadja skrol i stoji
 * tacno na mjestu gdje je prije bio prazan krem izmedju naslova i kataloga.
 */
export function Home() {
  return (
    <>
      <Hero />
      <SlatkaTraka />
      <Ponuda />
      <Kontakt />
    </>
  )
}
