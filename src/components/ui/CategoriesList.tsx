'use client'

import { cn } from '@/lib/utils'

interface CategoriesListProps {
  categories: string[]
  activeCategory?: string
  onSelect: (category: string) => void
  className?: string
}

export function CategoriesList({
  categories,
  activeCategory,
  onSelect,
  className,
}: CategoriesListProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 lg:grid-cols-5 w-full lg:w-[90%]',
        className
      )}
    >
      {categories.map((category) => {
        const isActive = activeCategory === category
        return (
          <button
            key={category}
            onClick={() => onSelect(category)}
            className={cn(
              'relative text-left font-serif text-lg font-light py-4 pr-8 border-b border-primary-light transition-colors',
              isActive ? 'text-primary font-normal' : 'text-black hover:text-primary'
            )}
          >
            {category}
            {isActive && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary" />
            )}
          </button>
        )
      })}
    </div>
  )
}
