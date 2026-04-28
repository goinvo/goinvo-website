import { cn } from '@/lib/utils'

interface ArticleMetaProps {
  date?: string | null
  categories?: readonly (string | null | undefined)[]
  className?: string
}

export function ArticleMeta({ date, categories, className }: ArticleMetaProps) {
  const tags = (categories || [])
    .map((category) => category?.trim())
    .filter((category): category is string => Boolean(category))

  if (!date && tags.length === 0) return null

  return (
    <div
      className={cn(
        'mb-4 grid gap-3 sm:flex sm:items-start sm:justify-between',
        className,
      )}
    >
      {date ? (
        <span className="text-sm leading-[1.625rem] text-gray sm:shrink-0">
          {date}
        </span>
      ) : (
        <span className="hidden sm:block" aria-hidden="true" />
      )}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 sm:ml-auto sm:justify-end">
          {tags.map((tag) => (
            <span
              key={tag}
              className="bg-gray-light px-3 py-1 text-xs uppercase tracking-wider text-gray"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
