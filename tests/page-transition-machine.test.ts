import { describe, expect, it } from 'vitest'
import { initialTransitionState, transitionReducer, type TransitionEvent, type TransitionState } from '@/context/PageTransitionContext'

const card = { top: 100, left: 40, width: 600, height: 400, image: '/hero.jpg', href: '/work/prior-auth', fromImage: '/preview.png' }
const run = (events: TransitionEvent[], from: TransitionState = initialTransitionState) => events.reduce(transitionReducer, from)
const started = run([{ type: 'START', card, origin: '/design-lab/human' }])

describe('card transition machine', () => {
  it('opens in order: collapsing → navigating → open → idle', () => {
    expect(started.phase).toBe('collapsing')
    const t = started.token
    const navigating = run([{ type: 'NAVIGATED', token: t }], started)
    expect(navigating.phase).toBe('navigating')
    const open = run([{ type: 'ARRIVED', token: t }], navigating)
    expect(open.phase).toBe('open')
    const idle = run([{ type: 'SETTLED', token: t }], open)
    expect(idle).toMatchObject({ phase: 'idle', card: null, last: { origin: '/design-lab/human', card } })
  })

  it('ignores a second click while a run is in flight', () => {
    const again = run([{ type: 'START', card: { ...card, href: '/work/ipsos-facto' }, origin: '/' }], started)
    expect(again).toBe(started)
  })

  it('ignores a step scheduled by an older run (stale token)', () => {
    const cancelled = run([{ type: 'CANCEL' }], started)
    const restarted = run([{ type: 'START', card, origin: '/x' }], cancelled)
    const stale = run([{ type: 'NAVIGATED', token: started.token }], restarted)
    expect(stale.phase).toBe('collapsing')
    expect(run([{ type: 'NAVIGATED', token: restarted.token }], restarted).phase).toBe('navigating')
  })

  it('does not skip a phase: arriving before navigating, or settling before arriving, is a no-op', () => {
    expect(run([{ type: 'ARRIVED', token: started.token }], started).phase).toBe('collapsing')
    expect(run([{ type: 'SETTLED', token: started.token }], started).phase).toBe('collapsing')
  })

  it('cancels mid-morph (Back, or a link elsewhere) and forgets the card, so Back cannot reverse it', () => {
    const navigating = run([{ type: 'NAVIGATED', token: started.token }], started)
    const cancelled = run([{ type: 'CANCEL' }], navigating)
    expect(cancelled).toMatchObject({ phase: 'idle', card: null, last: null })
    expect(run([{ type: 'RETURN' }], cancelled).phase).toBe('idle')
  })

  it('reverses on Back from a settled case study, then returns to idle', () => {
    const t = started.token
    const settled = run([{ type: 'NAVIGATED', token: t }, { type: 'ARRIVED', token: t }, { type: 'SETTLED', token: t }], started)
    const closing = run([{ type: 'RETURN' }], settled)
    expect(closing).toMatchObject({ phase: 'closing', card, last: null })
    expect(run([{ type: 'RETURNED', token: closing.token }], closing)).toMatchObject({ phase: 'idle', card: null })
  })

  it('remembers where the page was scrolled, and hands it to the reverse so Back lands on the card', () => {
    const scrolled = run([{ type: 'START', card, origin: '/work', scrollY: 2207 }])
    const t = scrolled.token
    const settled = run([{ type: 'NAVIGATED', token: t }, { type: 'ARRIVED', token: t }, { type: 'SETTLED', token: t }], scrolled)
    expect(run([{ type: 'RETURN' }], settled)).toMatchObject({ phase: 'closing', scrollY: 2207 })
    expect(run([{ type: 'CANCEL' }], scrolled)).toMatchObject({ phase: 'idle', scrollY: 0, last: null })
  })

  it('only reverses from idle: Back mid-open is a cancel, not a reverse', () => {
    expect(run([{ type: 'RETURN' }], started).phase).toBe('collapsing')
  })
})
