import Link from 'next/link'
import { cn } from '@/lib/utils'

interface ButtonProps {
  href?: string
  variant?: 'primary' | 'secondary' | 'outline' | 'transparent'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  children: React.ReactNode
  external?: boolean
  onClick?: () => void
  type?: 'button' | 'submit'
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
}: ButtonProps) {
  const baseClasses =
    'inline-flex items-center justify-center font-semibold uppercase tracking-[2px] no-underline transition-all duration-[var(--transition-button)] rounded-none border'
  const variantClasses = {
    primary: 'bg-primary text-white border-primary hover:bg-primary-dark hover:border-primary-dark',
    secondary: 'bg-transparent text-primary border-primary-light hover:bg-primary-lightest',
    outline: 'bg-transparent text-primary border-primary hover:bg-primary-lightest',
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
        <a href={href} className={classes} target="_blank" rel="noopener noreferrer">
          {children}
        </a>
      )
    }
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    )
  }

  return (
    <button type={type} className={classes} onClick={onClick}>
      {children}
    </button>
  )
}
