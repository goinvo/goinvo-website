/**
 * Where a prototype sits once it has become a case study's header. Two boxes:
 * - `band`: full width, under the site header, in the design's own canvas colour;
 * - `design`: the design itself, at its own proportions, centred in the band.
 * The band is as tall as the design at full width, capped (about 70% of the screen),
 * so the card visibly morphs out to the edges without cropping the design. On small
 * screens the band is the design (constrained, no side colour).
 *
 * The card transition and the case study both place the header with this one
 * function, so the two can never disagree.
 */
export interface Frame { top: number; left: number; width: number; height: number }

export function headerHeight() {
  if (typeof document === 'undefined') return 50
  return parseInt(getComputedStyle(document.documentElement).getPropertyValue('--spacing-header-height')) || 50
}

export function caseHeaderFrame(aspect: number, viewport?: { width: number; height: number }, header = headerHeight()): { band: Frame; design: Frame } {
  const width = viewport?.width ?? document.documentElement.clientWidth
  const height = viewport?.height ?? window.innerHeight
  const wide = width >= 768
  const pad = wide ? 32 : 16
  const bandHeight = Math.min(width * aspect, height * (wide ? 0.7 : 0.5))
  const band = { top: header, left: 0, width, height: bandHeight }
  // The design, fitted inside the band with a little air.
  let designHeight = bandHeight - (wide ? pad * 2 : 0)
  let designWidth = designHeight / aspect
  if (designWidth > width - pad * 2) { designWidth = width - pad * 2; designHeight = designWidth * aspect }
  const design = { top: header + (bandHeight - designHeight) / 2, left: (width - designWidth) / 2, width: designWidth, height: designHeight }
  return { band, design }
}
