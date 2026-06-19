/**
 * Single source of truth for portable-text block option VALUES and their Sanity
 * editor option lists.
 *
 * Imported by BOTH:
 *  - the schema (`src/sanity/schemas/objects/portableText.ts`) for `options.list`, and
 *  - the renderer (`src/components/portable-text/PortableTextRenderer.tsx`) for value comparisons.
 *
 * So the two can never drift: rename/add a value here and both the editor options
 * and the rendering logic update together. The `*_VALUES` objects are `as const`
 * (typed, no magic strings); the `*_OPTIONS` arrays are the `{title, value}` lists
 * Sanity wants.
 *
 * The `value`s are the values stored in content — DO NOT change them without a
 * content migration. Titles are editor-facing and safe to reword.
 */

// ---- Width (shared by columns + cardGrid) ----
export const Width = { Default: 'default', Wide: 'wide', Bleed: 'bleed' } as const
export const WIDTH_OPTIONS = [
  { title: 'Default (follow article width)', value: Width.Default },
  { title: 'Wide (fixed 1020px)', value: Width.Wide },
  { title: 'Full bleed (spans the whole page)', value: Width.Bleed },
]

// ---- Background (shared) ----
export const Background = { None: 'none', Gray: 'gray', Teal: 'teal', Warm: 'warm' } as const

// ---- Columns block: layout ----
export const ColumnLayout = {
  Two: '2',
  TwoOne: '2:1',
  OneTwo: '1:2',
  Three: '3',
  Four: '4',
  Storyboard: 'storyboard',
} as const
export const COLUMN_LAYOUT_OPTIONS = [
  { title: '2 columns (equal)', value: ColumnLayout.Two },
  { title: '2 columns (2:1 ratio)', value: ColumnLayout.TwoOne },
  { title: '2 columns (1:2 ratio)', value: ColumnLayout.OneTwo },
  { title: '3 columns', value: ColumnLayout.Three },
  { title: '4 columns', value: ColumnLayout.Four },
  { title: 'Storyboard (image above text, vertically stacked)', value: ColumnLayout.Storyboard },
]

// ---- Columns block: variant ----
export const ColumnVariant = { Default: 'default', Centered: 'centered', Cards: 'cards' } as const
export const COLUMN_VARIANT_OPTIONS = [
  { title: 'Default', value: ColumnVariant.Default },
  { title: 'Centered comparison', value: ColumnVariant.Centered },
  { title: 'Cards', value: ColumnVariant.Cards },
]

// ---- Card grid: column count ----
export const CardGridColumns = { Two: '2', Three: '3', Four: '4' } as const
export const CARDGRID_COLUMNS_OPTIONS = [
  { title: '2 columns', value: CardGridColumns.Two },
  { title: '3 columns', value: CardGridColumns.Three },
  { title: '4 columns', value: CardGridColumns.Four },
]

// ---- Card grid: variant ----
export const CardGridVariant = { Default: 'default', Stat: 'statNumber' } as const
export const CARDGRID_VARIANT_OPTIONS = [
  { title: 'Default (small uppercase label)', value: CardGridVariant.Default },
  { title: 'Stat — big orange numbers', value: CardGridVariant.Stat },
]
