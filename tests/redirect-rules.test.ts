import { describe, expect, it } from 'vitest'

import redirects from '../redirects.json'
import { redirectDestination, toRedirectRules } from '../src/lib/redirectRules'

const pathOf = (url: string) => url.split(/[?#]/)[0].replace(/\/+$/, '') || '/'

describe('redirect rules', () => {
  it('trims a trailing slash from internal destinations, keeping the query and fragment', () => {
    expect(redirectDestination('/vision/care-plans/')).toBe('/vision/care-plans')
    expect(redirectDestination('/thank-you/#career')).toBe('/thank-you#career')
    expect(redirectDestination('/work/?tag=ai')).toBe('/work?tag=ai')
    expect(redirectDestination('/')).toBe('/')
    expect(redirectDestination('https://yes.goinvo.com/articles/x/')).toBe('https://yes.goinvo.com/articles/x/')
  })

  it('reaches every internal destination in one hop: no trailing slash, and no destination is another rule', () => {
    const rules = toRedirectRules(redirects)
    const sources = new Set(rules.map((rule) => pathOf(rule.source)))
    const extraHop = rules
      .filter((rule) => rule.destination.startsWith('/') && !rule.destination.startsWith('//'))
      .filter((rule) => (pathOf(rule.destination) !== rule.destination.split(/[?#]/)[0]) || sources.has(pathOf(rule.destination)))
      .map((rule) => `${rule.source} -> ${rule.destination}`)
    expect(extraHop).toEqual([])
  })
})
