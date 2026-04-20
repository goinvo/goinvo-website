/**
 * Thin pass-through around Sanity's default Portable Text input.
 *
 * Earlier revisions here injected custom typography, light-themed
 * article-preview chrome, and toolbar affordances on top of the PTE.
 * In practice that made the editor look inconsistent with the rest
 * of the (dark-themed) Studio and could fight with Sanity's own
 * styling on upgrades. We keep the default UI intact and only add a
 * wrapper hook for narrowly scoped Studio layout tweaks.
 */
import { type InputProps } from 'sanity'

export function PortableTextInput(props: InputProps) {
  return <div data-goinvo-portable-text-input="true">{props.renderDefault(props)}</div>
}
