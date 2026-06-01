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
  const hasDate = Boolean(date)

  if (!date && tags.length === 0) return null

  return (
    <div
      className={cn(
        // Keep the date and tags together as one compact, left-aligned row
        // (they wrap to a second line only when they truly don't fit) rather
        // than pushing the date hard-left and the tags hard-right.
        'mb-4 flex flex-wrap items-center gap-x-3 gap-y-2',
        className,
      )}
    >
      {hasDate && (
        <span className="text-sm leading-[1.625rem] text-gray">
          {date}
        </span>
      )}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
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
