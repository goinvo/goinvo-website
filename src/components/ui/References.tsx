import { cn } from '@/lib/utils'
import type { Reference } from '@/types'

interface ReferencesProps {
  items: Reference[]
  className?: string
  hideTitle?: boolean
}

export function References({ items, className, hideTitle }: ReferencesProps) {
  return (
    <section id="references" className={cn('my-12', className)}>
      {!hideTitle && (
        <h2 className="font-serif text-[1.5rem] leading-[2.125rem] font-light text-center mb-6">
          References
        </h2>
      )}
      <ol className="list-none pl-0 space-y-2">
        {items.map((item, index) => (
          <li key={index} className="text-gray text-sm flex gap-2">
            <span className="text-gray/50 font-semibold shrink-0">{index + 1}.</span>
            <span>
              {item.link ? (
                <>
                  {item.title}
                  {': '}
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-secondary hover:text-primary break-all"
                  >
                    {item.link}
                  </a>
                </>
              ) : (
                item.title
              )}
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}
