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
    <div className={cn('flex flex-wrap gap-2', className)}>
      {categories.map((category) => (
        <button
          key={category}
          onClick={() => onSelect(category)}
          className={cn(
            'px-4 py-2 text-sm font-semibold uppercase tracking-wider transition-colors duration-[var(--transition-button)]',
            activeCategory === category
              ? 'bg-primary text-white'
              : 'bg-gray-light text-gray hover:bg-gray-medium hover:text-black'
          )}
        >
          {category}
        </button>
      ))}
    </div>
  )
}
