/**
 * What the website chat may say about a piece's license and how to cite it.
 *
 * A license is a legal statement, so the chat never infers one. Every entry here names
 * where GoInvo itself states the license (`source`), quoting it; a page-sourced quote is
 * checked against the page file by tests/chat-presets.test.ts. A piece that is not listed
 * gets "I couldn't find a license stated for it" and a human answers.
 *
 * Do NOT scrape license sentences from page text: the Primary Self-Care Algorithms page
 * names CC licenses that belong to the third-party models it cites, not to GoInvo's work.
 *
 * Titles, authors and dates come from the CMS at answer time; an entry only overrides them
 * where the publisher's own citation differs (Determinants of Health: the repo's suggested
 * citation says 2019, the CMS card says Apr.2020) or the CMS has none.
 */

export type LicenseId = 'CC-BY-4.0' | 'CC-BY-3.0' | 'CC-BY-3.0-US' | 'Apache-2.0'

export type PermissionId = 'share' | 'academic' | 'print' | 'adapt' | 'commercial' | 'credit' | 'endorse' | 'restrict'
export type PermissionMark = 'yes' | 'no' | 'must'

export interface LicenseDefinition {
  id: LicenseId
  name: string
  short: string
  url: string
  cells: Record<PermissionId, { mark: PermissionMark; text: string }>
}

/** Plain-language rows, in the order they are shown when nothing in particular was asked. */
export const PERMISSION_ROWS: { id: PermissionId; label: string }[] = [
  { id: 'share', label: 'Share or distribute it' },
  { id: 'academic', label: 'Use or cite it in academic work' },
  { id: 'print', label: 'Print or reproduce it' },
  { id: 'adapt', label: 'Adapt, translate or remix it' },
  { id: 'commercial', label: 'Use it commercially' },
  { id: 'credit', label: 'Credit GoInvo and link the license' },
  { id: 'endorse', label: 'Imply GoInvo endorses you' },
  { id: 'restrict', label: 'Stop others reusing what you share' },
]

const CC_BY_CELLS: LicenseDefinition['cells'] = {
  share: { mark: 'yes', text: 'Yes' },
  academic: { mark: 'yes', text: 'Yes' },
  print: { mark: 'yes', text: 'Yes' },
  adapt: { mark: 'yes', text: 'Yes, say what you changed' },
  commercial: { mark: 'yes', text: 'Yes' },
  credit: { mark: 'must', text: 'Required' },
  endorse: { mark: 'no', text: 'No' },
  restrict: { mark: 'no', text: 'No' },
}

export const LICENSES: Record<LicenseId, LicenseDefinition> = {
  'CC-BY-4.0': {
    id: 'CC-BY-4.0',
    name: 'Creative Commons Attribution 4.0',
    short: 'CC BY 4.0',
    url: 'https://creativecommons.org/licenses/by/4.0/',
    cells: CC_BY_CELLS,
  },
  'CC-BY-3.0': {
    id: 'CC-BY-3.0',
    name: 'Creative Commons Attribution 3.0',
    short: 'CC BY 3.0',
    url: 'https://creativecommons.org/licenses/by/3.0/',
    cells: CC_BY_CELLS,
  },
  'CC-BY-3.0-US': {
    id: 'CC-BY-3.0-US',
    name: 'Creative Commons Attribution 3.0 United States',
    short: 'CC BY 3.0 US',
    url: 'https://creativecommons.org/licenses/by/3.0/us/',
    cells: CC_BY_CELLS,
  },
  'Apache-2.0': {
    id: 'Apache-2.0',
    name: 'Apache License 2.0',
    short: 'Apache 2.0',
    url: 'https://www.apache.org/licenses/LICENSE-2.0',
    cells: {
      share: { mark: 'yes', text: 'Yes, with the license' },
      academic: { mark: 'yes', text: 'Yes' },
      print: { mark: 'yes', text: 'Yes' },
      adapt: { mark: 'yes', text: 'Yes, mark changed files' },
      commercial: { mark: 'yes', text: 'Yes' },
      credit: { mark: 'must', text: 'Keep the notices' },
      endorse: { mark: 'no', text: 'No' },
      restrict: { mark: 'yes', text: 'Only on your changes' },
    },
  },
}

export type CitationAuthor = { given: string; family: string } | { org: string }

export interface PieceRights {
  /** Canonical path on www.goinvo.com. */
  path: string
  /** Other paths that are the same piece (a translation). */
  alsoAt?: string[]
  /** Lowercase names a visitor might type to mean this piece. */
  names: string[]
  title: string
  /** Only where the CMS has none or the publisher's citation differs. */
  authors?: CitationAuthor[]
  year?: string
  /** APA wants sentence case; give it where the heuristic would lowercase a proper noun. */
  sentenceTitle?: string
  /** First grant is the content's, which answers "can I use this?" by default. */
  licenses: { license: LicenseId; covers: string; coversKeywords?: RegExp }[]
  source:
    | { kind: 'page'; file: string; quote: string; label: string }
    | { kind: 'repo'; url: string; quote: string; label: string }
    | { kind: 'cms'; quote: string; label: string }
}

export const GOINVO = { org: 'GoInvo' } as const

export const PIECE_RIGHTS: PieceRights[] = [
  {
    path: '/vision/determinants-of-health',
    alsoAt: ['/vision/determinantes-de-la-salud'],
    names: ['determinants of health', 'social determinants of health', 'determinantes de la salud', 'health determinants'],
    title: 'Determinants of Health',
    authors: [
      { given: 'Edwin', family: 'Choi' },
      { given: 'Juhan', family: 'Sonin' },
    ],
    year: '2019',
    licenses: [
      { license: 'CC-BY-4.0', covers: 'content and poster' },
      { license: 'Apache-2.0', covers: 'code', coversKeywords: /\b(code|software|source code|repo|repository|github|app|library|scripts?)\b/i },
    ],
    source: {
      kind: 'repo',
      url: 'https://github.com/goinvo/HealthDeterminants#license',
      quote: 'The Health Determinants content and poster is licensed under Creative Commons Attribution v4.',
      label: 'the Determinants of Health repository',
    },
  },
  {
    path: '/vision/us-healthcare-problems',
    names: ['us healthcare problems', 'u.s. healthcare problems', 'healthcare problems'],
    title: 'US Healthcare Problems',
    sentenceTitle: 'US healthcare problems',
    licenses: [{ license: 'CC-BY-4.0', covers: 'content' }],
    source: {
      kind: 'page',
      file: 'src/app/(main)/vision/us-healthcare-problems/page.tsx',
      quote: 'Licensed under Creative Commons Attribution 4.0 license.',
      label: 'the US Healthcare Problems page',
    },
  },
  {
    path: '/vision/coronavirus',
    names: ['understanding the 2019 novel coronavirus', 'novel coronavirus', 'coronavirus guide', 'covid-19 guide'],
    title: 'Understanding the 2019 Novel Coronavirus',
    sentenceTitle: 'Understanding the 2019 novel coronavirus',
    authors: [
      { given: 'Patricia', family: 'Nguyen' },
      { given: 'Colleen', family: 'Tang Poy' },
      { given: 'Parsuree', family: 'Vatanasirisuk' },
      { given: 'Craig', family: 'McGinley' },
    ],
    licenses: [{ license: 'CC-BY-4.0', covers: 'content' }],
    source: {
      kind: 'page',
      file: 'src/app/(main)/vision/coronavirus/page.tsx',
      quote: 'Licensed under Creative Commons Attribution 4.0 license',
      label: 'the coronavirus page',
    },
  },
  {
    path: '/vision/understanding-zika',
    names: ['understanding zika', 'zika'],
    title: 'Understanding Zika',
    sentenceTitle: 'Understanding Zika',
    authors: [GOINVO],
    licenses: [{ license: 'CC-BY-3.0', covers: 'content' }],
    source: {
      kind: 'page',
      file: 'src/app/(main)/vision/understanding-zika/page.tsx',
      quote: 'Licensed under Creative Commons Attribution v3',
      label: 'the Understanding Zika page',
    },
  },
  {
    path: '/vision/health-visualizations',
    names: ['health visualizations', 'health posters'],
    title: 'Health Visualizations',
    authors: [GOINVO],
    licenses: [{ license: 'CC-BY-3.0-US', covers: 'poster designs' }],
    source: {
      kind: 'page',
      file: 'src/app/(main)/vision/health-visualizations/page.tsx',
      quote: 'https://creativecommons.org/licenses/by/3.0/us/',
      label: 'the Health Visualizations page',
    },
  },
  {
    path: '/vision/living-health-lab',
    names: ['living health lab'],
    title: 'Living Health Lab',
    licenses: [{ license: 'CC-BY-4.0', covers: 'content' }],
    source: {
      kind: 'cms',
      quote: 'Living Health Lab content will be available to the public for free use under the Creative Commons Attribution 4.0 International License.',
      label: 'the Living Health Lab article',
    },
  },
  {
    path: '/vision/own-your-health-data',
    names: ['own your health data'],
    title: 'Own Your Health Data',
    licenses: [{ license: 'CC-BY-4.0', covers: 'content' }],
    source: {
      kind: 'repo',
      url: 'https://github.com/goinvo/OwnYourHealthData/blob/master/LICENSE',
      quote: 'CC-BY-4.0',
      label: 'the Own Your Health Data repository',
    },
  },
]

export const SITE_ORIGIN = 'https://www.goinvo.com'

/** The site path a URL or path points at, without a trailing slash or query. */
export function sitePath(value: string | undefined | null) {
  if (!value) return undefined
  try {
    const url = new URL(value, SITE_ORIGIN)
    if (!/(^|\.)goinvo\.com$|^localhost$|^127\.0\.0\.1$|\.vercel\.app$/i.test(url.hostname)) return undefined
    const path = url.pathname.replace(/\/+$/, '')
    return path || '/'
  } catch {
    return undefined
  }
}

export function rightsForPath(path: string | undefined) {
  if (!path) return undefined
  return PIECE_RIGHTS.find((piece) => piece.path === path || piece.alsoAt?.includes(path))
}

/** A piece named in the visitor's own words, longest name first ("social determinants of health" before "determinants of health"). */
export function rightsNamedIn(text: string) {
  const lower = text.toLowerCase().replace(/[’']/g, "'")
  let best: { piece: PieceRights; length: number } | undefined
  for (const piece of PIECE_RIGHTS) {
    for (const name of piece.names) {
      const at = lower.indexOf(name)
      if (at === -1) continue
      const before = at === 0 ? ' ' : lower[at - 1]
      const after = lower[at + name.length] ?? ' '
      if (/[a-z0-9]/.test(before) || /[a-z0-9]/.test(after)) continue
      if (!best || name.length > best.length) best = { piece, length: name.length }
    }
  }
  return best?.piece
}
