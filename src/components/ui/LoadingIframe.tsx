'use client'

import { useState, type ComponentProps } from 'react'
import { cn } from '@/lib/utils'

interface LoadingIframeProps extends ComponentProps<'iframe'> {
  /** Height used for the skeleton placeholder */
  skeletonClassName?: string
}

/**
 * An iframe that shows a pulsing skeleton placeholder until the
 * content has finished loading, then fades in.
 */
export function LoadingIframe({
  className,
  skeletonClassName,
  ...props
}: LoadingIframeProps) {
  const [loaded, setLoaded] = useState(false)

  return (
    <div className="relative w-full h-full">
      {!loaded && (
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center bg-gray-100 animate-pulse',
            skeletonClassName,
          )}
        >
          <Spinner />
        </div>
      )}
      <iframe
        {...props}
        onLoad={() => setLoaded(true)}
        className={cn(
          'transition-opacity duration-500',
          loaded ? 'opacity-100' : 'opacity-0',
          className,
        )}
      />
    </div>
  )
}

function Spinner() {
  return (
    <svg
      className="h-6 w-6 animate-spin text-gray-400"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}
