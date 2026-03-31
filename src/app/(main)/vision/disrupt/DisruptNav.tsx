'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { parts } from './disrupt-shared'

export function DisruptNav() {
  const pathname = usePathname()

  return (
    <nav className="mb-8 flex flex-wrap gap-2">
      {parts.map((part) => {
        const isActive = pathname === part.href
        return (
          <Link
            key={part.id}
            href={part.href}
            className={`text-sm px-3 py-1 border transition-colors ${
              isActive
                ? 'border-primary bg-primary text-white'
                : 'border-gray-light text-gray hover:bg-gray-lightest'
            }`}
          >
            {part.number}. {part.label}
          </Link>
        )
      })}
    </nav>
  )
}
