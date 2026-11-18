/**
 * Homepage headline candidates, for review. `?headline=<key>` swaps the line in place,
 * in the real layout, and `?subline=<key>` the line under it; the review picker
 * (TaglinePicker) steps through them. The first headline and the first subline are the
 * defaults: the picker never changes what the page shows without a parameter.
 *
 * Each candidate names its angle (what it is selling) and pairs with a subline. The
 * outcome lines lean on a number, so they pair with a proof line; every figure in those
 * is already published (the homepage study's stats and evidence, the Design Diagnostic).
 */
import type { ReactNode } from 'react'

/** Line lengths run at three sizes, so a long line still fits the opening's narrow column. */
const FIT = {
  short: 'min-[1100px]:max-w-[10ch] min-[1100px]:text-[clamp(3rem,4.6vw,6.5rem)] [@media(min-width:1100px)_and_(max-height:800px)]:text-[clamp(3rem,8.5svh,5rem)]',
  medium: 'min-[1100px]:max-w-[11ch] min-[1100px]:text-[clamp(2.75rem,4.3vw,6rem)] [@media(min-width:1100px)_and_(max-height:800px)]:text-[clamp(2.5rem,6.8svh,4.25rem)]',
  long: 'max-md:text-[2.5rem] min-[1100px]:max-w-[13ch] min-[1100px]:text-[clamp(2.4rem,3.6vw,5rem)] [@media(min-width:1100px)_and_(max-height:800px)]:text-[clamp(2.25rem,6svh,3.75rem)]',
} as const

export interface Tagline {
  key: string
  /** The family of argument, for grouping in the picker. */
  angle: string
  /** One sentence: what this line is selling, and to whom. */
  note: string
  fit: string
  node: ReactNode
  /** The plain line, for the picker's list and for the page title in a screenshot. */
  text: string
  /** The subline it was written to sit over, when no `?subline` is given. */
  pair?: string
}

/**
 * The three directions under review (2026-11-18): the picker offers these and nothing else.
 * The first is the default. A `?headline=` for anything else shows the default.
 */
export const TAGLINES: Tagline[] = [
  // Impact: the studio's position. Design is judged by what it changes.
  { key: 'impact', angle: 'Impact', note: 'The impact angle: design that drives results. The line under it carries the proof.', fit: FIT.short, pair: 'impact', text: 'Design for impact.', node: <>Design for <em>impact</em>.</> },
  // Human: what we know that AI-built software does not, which is how people work.
  { key: 'human', angle: 'Human', note: 'The human angle: complexity turned into something people can use.', fit: FIT.short, pair: 'ai', text: 'Complexity, made human.', node: <>Complexity, made human.</> },
  // Stewardship: the responsibility angle. We ship it, and we stay answerable for it.
  { key: 'ship', angle: 'Stewardship', note: 'The responsibility angle: we ship it, and we stay answerable for it after launch.', fit: FIT.medium, pair: 'return', text: 'Designs that ship, with stewardship.', node: <>Designs that <em>ship</em>, with <em>stewardship</em>.</> },
]

/**
 * Earlier candidates, set aside while the three directions are weighed. Not offered and
 * not reachable by address; move a line up into TAGLINES to bring it back.
 */
export const PARKED_TAGLINES: Tagline[] = [
  { key: 'results', angle: 'Impact', note: 'The same position, said as what the buyer gets.', fit: FIT.medium, pair: 'impact', text: 'Design that drives results.', node: <>Design that drives <em>results</em>.</> },
  { key: 'design', angle: 'Stewardship', note: 'The same, read as one practice rather than many designs.', fit: FIT.medium, pair: 'return', text: 'Design that ships, with stewardship.', node: <>Design that <em>ships</em>, with <em>stewardship</em>.</> },
  { key: 'stay', angle: 'Stewardship', note: 'Shipping, and not disappearing after it.', fit: FIT.short, pair: 'return', text: 'We ship. Then we stay.', node: <>We ship. Then we stay.</> },
  { key: 'machine', angle: 'Human', note: 'Making complex systems legible.', fit: FIT.medium, pair: 'inside', text: 'Make the machine make sense.', node: <>Make the machine make sense.</> },
  { key: 'used', angle: 'Adoption', note: 'The failure buyers fear most is software that launches and gets ignored.', fit: FIT.medium, pair: 'adoption', text: 'Software people actually use.', node: <>Software people actually <em>use</em>.</> },
  { key: 'admired', angle: 'Adoption', note: 'Names the foil: design judged on looks instead of use.', fit: FIT.medium, pair: 'adoption', text: 'Built to be used, not admired.', node: <>Built to be <em>used</em>, not admired.</> },
  { key: 'launched', angle: 'Adoption', note: 'Puts us in the gap between launch and adoption, where buyers have been burned.', fit: FIT.medium, pair: 'adoption', text: 'The difference between launched and used.', node: <>The difference between launched and <em>used</em>.</> },
  { key: 'strategy', angle: 'Shipping', note: 'Against the consultancy deck that never turns into software.', fit: FIT.short, pair: 'shipped', text: 'Strategy you can ship.', node: <>Strategy you can <em>ship</em>.</> },
  { key: 'whiteboard', angle: 'Shipping', note: 'The whole arc in one line, for buyers who need the full team.', fit: FIT.medium, pair: 'shipped', text: 'From whiteboard to working software.', node: <>From whiteboard to <em>working software</em>.</> },
  { key: 'know', angle: 'Certainty', note: 'Speaks to the executive who owns the budget and the risk.', fit: FIT.long, pair: 'diagnostic', text: 'Know it will work before you build it.', node: <>Know it will <em>work</em> before you build it.</> },
  { key: 'certainty', angle: 'Certainty', note: 'The most direct “outcomes, not pixels” line we already publish (Services).', fit: FIT.medium, pair: 'diagnostic', text: 'What you buy is certainty.', node: <>What you buy is <em>certainty</em>.</> },
  { key: 'seventy', angle: 'Outcome first', note: 'The headline is the result; the line under it says what moved.', fit: FIT.short, pair: 'snap', text: '7% to 70%.', node: <>7% to <em>70%</em>.</> },
  { key: 'number', angle: 'Outcome first', note: 'Every buyer is accountable for a number; this says we move it.', fit: FIT.medium, pair: 'snap', text: 'Design that moves the number.', node: <>Design that moves the <em>number</em>.</> },
  { key: 'people', angle: 'Human', note: 'Our edge over AI-built software: knowing how people work.', fit: FIT.long, pair: 'deep', text: 'AI knows how software works. We know how people do.', node: <>AI knows how software works. We know how <em>people</em> do.</> },
  { key: 'fail', angle: 'Stakes', note: 'Filters for serious buyers in healthcare and government; justifies the price.', fit: FIT.long, pair: 'deep', text: 'For software that can’t afford to fail.', node: <>For software that can’t afford to <em>fail</em>.</> },
  { key: 'obvious', angle: 'Stakes', note: 'A craft promise with the outcome inside: usable gets adopted.', fit: FIT.medium, pair: 'inside', text: 'Make the hard thing obvious.', node: <>Make the hard thing <em>obvious</em>.</> },
]

export interface Subline {
  key: string
  label: string
  node: ReactNode
}

/** Who we are and what we do, or the proof behind the headline. The first is the default. */
export const SUBLINES: Subline[] = [
  { key: 'deep', label: '20 years deep', node: <>A design studio, 20 years deep in healthcare, government and enterprise systems.</> },
  { key: 'inside', label: 'The people inside', node: <>For 20 years, our design studio has made complex systems work for the people inside them.</> },
  { key: 'clinics', label: 'Clinics to agencies', node: <>A design studio for complex systems, from clinics to state agencies, for over 20 years.</> },
  { key: 'ai', label: 'AI and people', node: <>AI knows how <em>software</em> works.<br />We know how <em>people</em> do.</> },
  // Proof lines: published figures only.
  { key: 'impact', label: 'Proof: results', node: <>Design measured by what it changes: SNAP applications online from 7% to 70%, over 90% adoption at Ipsos.</> },
  { key: 'adoption', label: 'Proof: Ipsos adoption', node: <>Over 90% of Ipsos analysts adopted the AI research platform we designed, because it fit how they already worked.</> },
  { key: 'snap', label: 'Proof: SNAP 7% → 70%', node: <>Massachusetts SNAP applications went from 7% to 70% online, once the form fit the people filling it out.</> },
  { key: 'shipped', label: 'Proof: 60+ shipped', node: <>A design studio with 60+ shipped products for hospitals, payers, federal agencies and enterprises.</> },
  { key: 'diagnostic', label: 'Proof: de-risk first', node: <>Before you spend millions on a launch, spend 4–8 weeks finding out what will work.</> },
  { key: 'return', label: 'Proof: 91% return', node: <>91% of our clients come back for a second engagement, without a pitch.</> },
]

export const taglineFor = (key: string | null | undefined) => TAGLINES.find((item) => item.key === key) ?? TAGLINES[0]
/** The subline asked for; else the one the headline was written over; else the default. */
export const sublineFor = (key: string | null | undefined, tagline?: Tagline) =>
  SUBLINES.find((item) => item.key === key) ?? SUBLINES.find((item) => item.key === tagline?.pair) ?? SUBLINES[0]
