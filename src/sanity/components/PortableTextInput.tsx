/**
 * Thin pass-through around Sanity's default Portable Text input.
 *
 * Earlier revisions here injected custom typography, light-themed
 * article-preview chrome, and toolbar affordances on top of the PTE.
 * In practice that made the editor look inconsistent with the rest
 * of the (dark-themed) Studio and could fight with Sanity's own
 * styling on upgrades. We now defer entirely to the default input.
 */
import { type InputProps } from 'sanity'

export function PortableTextInput(props: InputProps) {
  return props.renderDefault(props)
}
