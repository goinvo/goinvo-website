import type { BlockAnnotationProps } from 'sanity'

/**
 * Pass-through annotation for the "Text Color" mark.
 *
 * We intentionally do NOT tint the text inside the Studio editor —
 * (a) the editor is dark-themed, so a light tint (e.g. charcoal) is
 * effectively invisible, and (b) editors told us the in-editor tint
 * was distracting. The color is still written to the markDef's
 * `color` field and rendered on the public page by
 * PortableTextRenderer.
 */
export function TextColorAnnotation(props: BlockAnnotationProps) {
  return props.renderDefault(props)
}
