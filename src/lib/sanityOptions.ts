import { stegaClean } from '@sanity/client/stega'

/**
 * Read a Sanity string OPTION field with visual-editing (stega) metadata stripped,
 * so `=== 'literal'` comparisons hold in the Presentation preview too — not only on
 * the published site.
 *
 * WHY THIS EXISTS: Sanity visual editing appends invisible stega characters to
 * string field VALUES in the Presentation preview, so a bare `field === 'literal'`
 * is FALSE while editing (and TRUE once published). That silently breaks any
 * renderer/transform that branches on a closed-set Sanity string field
 * (style / layout / variant / size / tone / columns / background / spacing / …).
 *
 * ALWAYS compare such fields through this helper: `option(block.style) === 'h4'`.
 * An ESLint rule (the stega guard in eslint.config.mjs) makes a bare comparison a
 * build error. stega does NOT encode `_type` or booleans, so those stay bare.
 */
export function option(value: unknown): string {
  return typeof value === 'string' ? stegaClean(value) : ''
}
