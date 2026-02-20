import { cn } from '@/lib/utils'
import type { Reference } from '@/types'

interface ReferencesProps {
  items: Reference[]
  className?: string
}

export function References({ items, className }: ReferencesProps) {
  return (
    <section className={cn('my-12', className)}>
      <h3 className="font-serif text-xl mb-4">References</h3>
      <ol className="list-decimal list-inside space-y-2">
        {items.map((item, index) => (
          <li key={index} className="text-md text-gray">
            {item.link ? (
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary"
              >
                {item.title}
              </a>
            ) : (
              item.title
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}
