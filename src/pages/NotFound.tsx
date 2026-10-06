import { Eyebrow, GoldRule } from '../components/ui/Bits'
import { LinkButton } from '../components/ui/Button'

export function NotFound() {
  return (
    <div className="container-page py-section">
      <div className="mx-auto max-w-content text-center">
        <Eyebrow>404</Eyebrow>
        <GoldRule short className="mx-auto mt-2.5" />
        <h1 className="t-h1 mt-4">Ova stranica ne postoji</h1>
        <p className="t-lead mt-4 text-body">
          Možda je link zastario ili je u adresi greška.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <LinkButton to="/">Na početnu</LinkButton>
          <LinkButton to="/#ponuda" variant="secondary">
            Pogledaj ponudu
          </LinkButton>
        </div>
      </div>
    </div>
  )
}
