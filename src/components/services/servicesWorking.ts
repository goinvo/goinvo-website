/**
 * What working with GoInvo is like: who you work with, when we are in the room, and how
 * the work moves when we are not. Shown on the services page (new design).
 *
 * Where each line comes from:
 * - PUBLISHED: the studio's address (contact page); "two senior designers" and "full design
 *   team" (services/content.ts TIERS); "a principal, not a salesperson" (services booking
 *   copy); workshops with client teams (the Inspired EHRs and FasterCures case studies);
 *   weekly sessions with a client's engineers and clinicians (the AHRQ and MITRE case
 *   studies); Ipsos working in 50+ countries (the "15 tools to one" case study).
 * - THE OWNER'S WORDS, 2026-11-18, not yet published anywhere: that the studio works both
 *   in person and asynchronously with teams anywhere. The sentences that say HOW (shared
 *   files and written notes between sessions; one standing call when no hours are shared)
 *   are drafted from that and need the studio's confirmation before this page ships.
 * - ARITHMETIC: the shared hours. Both working days are taken as 9 to 5 local time; the
 *   studio's is Eastern. `offset` is hours ahead of Eastern (daylight-saving weeks differ
 *   by an hour for some places, hence "about" in the copy).
 */
export const WHAT_WE_DO =
  'GoInvo is a design studio. We research, design and ship software for healthcare, government and enterprise, working with your team in person or from anywhere.'

export interface WorkingWay {
  id: string
  title: string
  body: string
}

export const WORKING_WAYS: WorkingWay[] = [
  { id: 'people', title: 'Senior people, from the first call.', body: 'You talk to a principal, not a salesperson. Two senior designers run a Diagnostic; a full design team takes a product to launch.' },
  { id: 'room', title: 'In the room when it matters.', body: 'Kickoffs, workshops and research with the people who will use it, at your site or at our studio in Arlington, Massachusetts.' },
  { id: 'async', title: 'Moving between sessions.', body: 'A working session with your team every week. Between sessions the work moves in shared files and written notes, so nobody waits for a meeting.' },
]

export interface Place {
  id: string
  label: string
  /** Hours ahead of US Eastern time. */
  offset: number
  /** What that means for working together. */
  means: string
}

export const PLACES: Place[] = [
  { id: 'boston', label: 'Greater Boston', offset: 0, means: 'Same city, same hours. Workshops and reviews in person, at your office or ours.' },
  { id: 'pacific', label: 'US West Coast', offset: -3, means: 'Your morning is our afternoon. Live sessions then; you start each day with our morning’s work waiting.' },
  { id: 'europe', label: 'London', offset: 5, means: 'Our morning is your afternoon. Live sessions then; our afternoon’s work is waiting when you start.' },
  { id: 'asia', label: 'Singapore', offset: 12, means: 'No shared office hours. One standing call at an hour that works for both, and everything else in writing.' },
]

export const WORKDAY = { start: 9, end: 17 }

/** A working day somewhere else, as hour ranges on the Eastern clock (split where it crosses midnight). */
export function hoursInEastern(offset: number): [number, number][] {
  const start = (((WORKDAY.start - offset) % 24) + 24) % 24
  const end = start + (WORKDAY.end - WORKDAY.start)
  return end <= 24 ? [[start, end]] : [[start, 24], [0, end - 24]]
}

/** The hours both working days share, on the Eastern clock. */
export function sharedHours(offset: number): [number, number][] {
  return hoursInEastern(offset)
    .map(([a, b]) => [Math.max(a, WORKDAY.start), Math.min(b, WORKDAY.end)] as [number, number])
    .filter(([a, b]) => b > a)
}

export const sharedCount = (offset: number) => sharedHours(offset).reduce((sum, [a, b]) => sum + (b - a), 0)

/** 13 -> "1pm", 0 or 24 -> "midnight", 12 -> "noon". */
export function clock(hour: number): string {
  const h = ((hour % 24) + 24) % 24
  if (h === 0) return 'midnight'
  if (h === 12) return 'noon'
  return `${h > 12 ? h - 12 : h}${h >= 12 ? 'pm' : 'am'}`
}

/** A place served as proof that distance works: a client whose own teams are spread out. */
export const FAR_PROOF = { text: 'Ipsos works in more than 50 countries. Over 90% of its analysts adopted the research platform we designed with them.', href: '/work/ipsos-facto', link: 'Read the Ipsos Facto case study' }
