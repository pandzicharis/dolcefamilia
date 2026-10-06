import { type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, useId } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '../../lib/cn'
import { DUR, EASE } from '../../motion/tokens'

const control =
  'w-full rounded-md bg-sunken px-3.5 text-body shadow-sunken border border-control ' +
  'placeholder:text-mocha-500 transition-[border-color,box-shadow] duration-150 ease-crisp ' +
  'hover:border-mocha-600 focus:border-accent focus:shadow-ring focus:outline-none ' +
  'disabled:bg-cream-300 disabled:text-disabled disabled:cursor-not-allowed'

// 52px na mobitelu / 48px na desktopu - mobilni checkout je voden palcem.
const height = 'h-[52px] sm:h-12'

function Label({ htmlFor, children, optional }: { htmlFor: string; children: React.ReactNode; optional?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block">
      {/* Labela je UVIJEK vidljiva iznad polja. Bosanske labele su duge
          ("Napomena za poslastičara") i prelijevaju floated track, animacija
          labele se tuce sa reduced-motion zahtjevom, a placeholder-kao-labela
          je poznata zamka za screen readere i autofill. */}
      <span className="t-eyebrow">{children}</span>
      {optional && <span className="t-small ml-2 normal-case tracking-normal text-muted">opcionalno</span>}
    </label>
  )
}

/** Prostor je REZERVISAN da forma ne skace kad se greska pojavi. */
function ErrorSlot({ id, message }: { id: string; message?: string }) {
  return (
    <div className="min-h-[20px] pt-1">
      <AnimatePresence mode="wait" initial={false}>
        {message && (
          <motion.p
            key={message}
            id={id}
            role="alert"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: DUR.fast, ease: EASE.crisp }}
            className="t-small text-rouge-700"
          >
            {message}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

type Common = { label: string; error?: string; optional?: boolean; hint?: string }

export function TextField({
  label, error, optional, hint, className, ...rest
}: Common & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId()
  const errId = `${id}-err`
  return (
    <div className={className}>
      <Label htmlFor={id} optional={optional}>{label}</Label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errId : undefined}
        className={cn(control, height, error && 'border-rouge-600 shadow-ring-error')}
        {...rest}
      />
      {hint && !error && <p className="t-small pt-1 text-muted">{hint}</p>}
      {!hint && <ErrorSlot id={errId} message={error} />}
      {hint && error && <ErrorSlot id={errId} message={error} />}
    </div>
  )
}

export function SelectField({
  label, error, optional, children, className, ...rest
}: Common & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId()
  const errId = `${id}-err`
  return (
    <div className={className}>
      <Label htmlFor={id} optional={optional}>{label}</Label>
      <div className="relative">
        <select
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errId : undefined}
          className={cn(control, height, 'appearance-none pr-10', error && 'border-rouge-600 shadow-ring-error')}
          {...rest}
        >
          {children}
        </select>
        <svg
          className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          viewBox="0 0 16 16" fill="none" aria-hidden="true"
        >
          <path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <ErrorSlot id={errId} message={error} />
    </div>
  )
}

export function TextareaField({
  label, error, optional, className, ...rest
}: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId()
  const errId = `${id}-err`
  return (
    <div className={className}>
      <Label htmlFor={id} optional={optional}>{label}</Label>
      <textarea
        id={id}
        rows={4}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errId : undefined}
        className={cn(control, 'resize-y py-3 leading-relaxed', error && 'border-rouge-600 shadow-ring-error')}
        {...rest}
      />
      <ErrorSlot id={errId} message={error} />
    </div>
  )
}
