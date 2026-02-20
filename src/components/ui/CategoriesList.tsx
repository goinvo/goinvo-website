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
        'grid grid-cols-1 lg:grid-cols-5',
        className
      )}
    >
      {categories.map((category) => {
        const isActive = activeCategory === category
        return (
          <div key={category} className="flex flex-col justify-end">
            <button
              onClick={() => onSelect(category)}
              className={cn(
                'relative block w-full lg:w-[90%] text-left font-serif text-[1.5rem] leading-[2.125rem] font-light',
                'py-4 pr-8 border-b border-primary-light no-underline transition-colors',
                isActive
                  ? 'text-primary font-normal'
                  : 'text-black hover:text-primary'
              )}
            >
              {category}
              {isActive && (
                <span
                  className="absolute top-1/2 right-4 -translate-y-1/2 w-[0.6rem] h-[0.6rem] rounded-full bg-primary"
                />
              )}
            </button>
          </div>
        )
      })}
    </div>
  )
}
