import type { BlockAnnotationProps } from 'sanity'
import { ARTICLE_TEXT_COLOR_HEX, isArticleTextColor } from '@/lib/articleTextColors'

export function TextColorAnnotation(props: BlockAnnotationProps) {
  const colorValue = (props.value as { color?: unknown } | undefined)?.color
  const resolvedColor = isArticleTextColor(colorValue)
    ? ARTICLE_TEXT_COLOR_HEX[colorValue]
    : ARTICLE_TEXT_COLOR_HEX.teal

  return props.renderDefault({
    ...props,
    textElement: (
      <span style={{ color: resolvedColor }}>
        {props.textElement}
      </span>
    ),
  })
}
