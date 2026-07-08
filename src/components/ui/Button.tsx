'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { trackButtonClick } from '@/lib/analytics'

interface ButtonProps {
  href?: string
  variant?: 'primary' | 'secondary' | 'outline' | 'tertiary' | 'transparent'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  children: React.ReactNode
  external?: boolean
  onClick?: (event: React.MouseEvent<HTMLElement>) => void
  type?: 'button' | 'submit'
  // Opt out of the blanket button_click analytics event (e.g. a control that is not
  // a meaningful click to measure). Purpose-built CTAs keep their own events too.
  noTrack?: boolean
}

export function Button({
  href,
  variant = 'primary',
  size = 'md',
  className,
  children,
  external,
  onClick,
  type = 'button',
  noTrack = false,
}: ButtonProps) {
  // Blanket click coverage for every Button, then run the caller's own handler
  // (which may fire a purpose-built CTA/conversion event).
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    if (!noTrack) {
      trackButtonClick({
        button_text: event.currentTarget.textContent?.trim().slice(0, 120) || undefined,
        button_href: href,
        button_variant: variant,
      })
    }
    onClick?.(event)
  }
  const baseClasses =
    'inline-flex items-center justify-center font-semibold uppercase tracking-[2px] no-underline transition-all duration-[var(--transition-button)] rounded-none border'
  const variantClasses = {
    primary: 'bg-primary text-white border-primary hover:bg-primary-dark hover:border-primary-dark',
    secondary: 'bg-transparent text-primary border-primary-light hover:bg-primary-lightest',
    outline: 'bg-transparent text-primary border-primary hover:bg-primary-lightest',
    tertiary:
      'bg-transparent text-tertiary border-tertiary hover:bg-tertiary-lightest hover:text-tertiary active:bg-tertiary active:border-tertiary active:text-white',
    transparent: 'bg-transparent text-black border-transparent hover:text-primary',
  }
  const sizeClasses = {
    sm: 'text-xs px-4 py-1.5',
    md: 'text-md px-4 py-[0.375rem]',
    lg: 'text-md px-8 py-3 w-full lg:w-auto lg:min-w-[330px]',
  }

  const classes = cn(baseClasses, variantClasses[variant], sizeClasses[size], className)

  if (href) {
    if (external) {
      return (
        <a href={href} className={classes} target="_blank" rel="noopener noreferrer" onClick={handleClick}>
          {children}
        </a>
      )
    }
    return (
      <Link href={href} className={classes} onClick={handleClick}>
        {children}
      </Link>
    )
  }

  return (
    <button type={type} className={classes} onClick={handleClick}>
      {children}
    </button>
  )
}
