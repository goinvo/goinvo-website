import { describe, expect, it, vi } from 'vitest'

import { createDebouncedRefresh } from '../src/components/sanity/refreshScheduler'

describe('live preview refresh scheduler', () => {
  it('debounces mutations while resolving every queued refresh promise', async () => {
    vi.useFakeTimers()
    const refresh = vi.fn()
    const scheduler = createDebouncedRefresh(refresh, 1500)

    const first = scheduler.schedule()
    vi.advanceTimersByTime(1000)
    const second = scheduler.schedule()

    vi.advanceTimersByTime(1499)
    expect(refresh).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    await expect(Promise.all([first, second])).resolves.toEqual([undefined, undefined])
    expect(refresh).toHaveBeenCalledTimes(1)

    vi.useRealTimers()
  })

  it('resolves pending refreshes when canceled', async () => {
    vi.useFakeTimers()
    const refresh = vi.fn()
    const scheduler = createDebouncedRefresh(refresh, 1500)

    const pending = scheduler.schedule()
    scheduler.cancel()

    await expect(pending).resolves.toBeUndefined()
    expect(refresh).not.toHaveBeenCalled()

    vi.useRealTimers()
  })
})
