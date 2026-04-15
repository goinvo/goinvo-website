import { cn } from '@/lib/utils'
import { getSectionBandClassName, resolveSectionBackground, type SectionBackground } from '@/lib/sectionBackgrounds'
import type { Reference } from '@/types'

interface ReferencesProps {
  items: Reference[]
  className?: string
  hideTitle?: boolean
  variant?: 'default' | 'legacy'
  background?: SectionBackground
}

export function References({ items, className, hideTitle, variant = 'default', background = 'white' }: ReferencesProps) {
  const resolvedBackground = resolveSectionBackground(background)
  const backgroundClassName = getSectionBandClassName(resolvedBackground)

  if (variant === 'legacy') {
    const content = (
      <div className={cn(!backgroundClassName && className)}>
        {!hideTitle && (
          <h2 id="references" className="header-lg text-center mt-8 mb-6">
            References
          </h2>
        )}
        <ol className="references">
          {items.map((item, index) => (
            <li
              key={item.link && item.link.length ? item.link : item.title}
              className="text--gray margin-bottom"
              id={`ref-${index + 1}`}
            >
              <span id={`fn-${index + 1}`}>{item.title}</span>
              {item.link ? (
                <span>
                  :{' '}
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {item.link}
                  </a>
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    )

    if (backgroundClassName) {
      return (
        <section id="references" className={cn('my-12 w-screen relative left-1/2 -ml-[50vw] py-12', backgroundClassName, className)}>
          <div className="max-width max-width-md content-padding mx-auto">
            {content}
          </div>
        </section>
      )
    }

    return content
  }

  const content = (
    <>
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
    </>
  )

  if (backgroundClassName) {
    return (
      <section id="references" className={cn('my-12 w-screen relative left-1/2 -ml-[50vw] py-12', backgroundClassName, className)}>
        <div className="max-width max-width-md content-padding mx-auto">
          {content}
        </div>
      </section>
    )
  }

  return (
    <section id="references" className={cn('my-12', className)}>
      {content}
    </section>
  )
}
