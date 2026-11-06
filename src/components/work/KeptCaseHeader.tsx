import type { PrototypeHeader } from '@/lib/prototypeHeaders'

/**
 * A case study's prototype header: a full-width band in the design's own canvas
 * colour, the design fitted inside it at its own proportions. Pure CSS, so the
 * server renders it in place (no shift on a direct visit). It computes the same
 * boxes as caseHeaderFrame, which the card transition moves the preview into:
 * - band: full width, height = width × aspect, capped at 70vh (50vh under 768px);
 * - design: object-fit contain inside 32px padding (16px sides, none top/bottom, under 768px).
 * Keep the two in step; scripts/verify-card-transitions.mjs measures the hand-off.
 */
export function KeptCaseHeader({ header, alt = '' }: { header: PrototypeHeader; alt?: string }) {
  return (
    <div data-case-header className="mt-[var(--spacing-header-height)] max-h-[50vh] w-full px-4 md:max-h-[70vh] md:p-8" style={{ aspectRatio: `${1 / header.aspect}`, background: header.band }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- the same bytes the transition moved, so the hand-off cannot flicker */}
      <img data-case-header-design src={header.still} alt={alt} className="block h-full w-full object-contain" />
    </div>
  )
}
