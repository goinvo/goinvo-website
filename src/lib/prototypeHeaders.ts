/**
 * Case studies whose header IS a prototype: the homepage study's preview moves into
 * the header and stays there, and a direct visit shows the same header. Data, not a
 * flag set by a click, so a page knows its header from its own slug. Add a case study
 * here to give it a prototype header.
 *
 * The stills are served by the review asset route, which is off in production, so
 * the registry is too. Serving prototype headers on the live site means moving their
 * assets into public/ first.
 */
export type PrototypeHeaderId = 'clinical' | 'prior' | 'facto'

export interface PrototypeHeader {
  id: PrototypeHeaderId
  /** height / width of the design. */
  aspect: number
  /** The design, unpadded, as an image. */
  still: string
  /** The design's own canvas colour, used for the full-width band around it. */
  band: string
}

const header = (id: PrototypeHeaderId, width: number, height: number, band: string): PrototypeHeader =>
  ({ id, aspect: height / width, still: `/design-lab/human/assets/${id}-hero.png`, band })

const registry: Record<string, PrototypeHeader> = {
  'clinical-evidence-engine': header('clinical', 1280, 860, '#e8eef5'),
  'prior-auth': header('prior', 1240, 811, '#d8e1e4'),
  'ipsos-facto': header('facto', 1920, 1273, '#03162d'),
}

const enabled = process.env.NEXT_PUBLIC_VERCEL_ENV !== 'production'

export function prototypeHeaderFor(slug: string): PrototypeHeader | null {
  return enabled ? registry[slug] ?? null : null
}

export function prototypeHeaderById(id: string): PrototypeHeader | null {
  return enabled ? Object.values(registry).find(item => item.id === id) ?? null : null
}
