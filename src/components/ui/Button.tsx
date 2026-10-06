import { forwardRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { cn } from '../../lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  loading?: boolean
  fullWidth?: boolean
}

// Radius je lg (12px) svuda. Nema pilula - pill dugme je najjaci
// "2021 SaaS template" signal na cijeloj stranici.
const base =
  'relative inline-flex items-center justify-center gap-2 rounded-lg font-sans font-medium ' +
  'tracking-[0.012em] transition-[background-color,border-color,color,transform,box-shadow] ' +
  'duration-150 ease-crisp select-none disabled:cursor-not-allowed ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2'

const variants: Record<Variant, string> = {
  primary:
    'bg-accent text-onDark shadow-sm hover:bg-accent-hover hover:-translate-y-px hover:shadow-md ' +
    'active:bg-accent-press active:translate-y-0 active:scale-[0.975] active:shadow-xs ' +
    'disabled:bg-cream-300 disabled:text-disabled disabled:shadow-none disabled:translate-y-0',
  secondary:
    'border border-cocoa-700 bg-transparent text-cocoa-700 hover:bg-cocoa-50 ' +
    'active:bg-cocoa-100 active:scale-[0.975] ' +
    'disabled:border-cream-400 disabled:text-disabled disabled:bg-transparent',
  ghost:
    'bg-transparent text-cocoa-700 hover:bg-cocoa-700/[0.06] active:bg-cocoa-700/10 ' +
    'active:scale-[0.975] disabled:text-disabled disabled:bg-transparent',
}

// lg je 52px na mobitelu a 48px na desktopu - namjerno obrnuto od uobicajenog,
// jer je mobilni checkout voden palcem.
const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-[14px]',
  md: 'h-11 px-5 text-[15px]',
  lg: 'h-[52px] px-6 text-[15px] sm:h-12',
}

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', fullWidth?: boolean, className?: string) {
  return cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className)
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, fullWidth, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClass(variant, size, fullWidth, className)}
      {...rest}
    >
      {/* Labela ostaje u stablu pristupacnosti i dok se vrti spinner -
          zamjena teksta spinnerom tiho ukloni ime dugmeta iz screen readera. */}
      <span className={cn('inline-flex items-center gap-2', loading && 'opacity-0')}>{children}</span>
      {loading && (
        <span className="absolute inset-0 grid place-items-center">
          <Spinner />
        </span>
      )}
    </button>
  )
})

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-4 w-4 animate-spin', className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

/**
 * Isti izgled kao Button, ali renderuje <a>.
 * Postoji jer je <Link> unutar <button> nevalidan HTML - ugnijezdjeni
 * interaktivni elementi se razlicito ponasaju po browserima i screen readerima.
 */
type LinkButtonProps = LinkProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    variant?: Variant
    size?: Size
    fullWidth?: boolean
  }

export function LinkButton({
  variant = 'primary',
  size = 'md',
  fullWidth,
  className,
  children,
  ...rest
}: LinkButtonProps) {
  return (
    <Link className={buttonClass(variant, size, fullWidth, cn('no-underline', className))} {...rest}>
      {children}
    </Link>
  )
}
