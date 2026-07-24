import { afterEach, describe, expect, it } from 'vitest'

import MarketingPrincipalHarnessPage from '@/app/marketing-e2e-harness/principal/page'
import { MarketingPrincipalTestHarness } from '@/app/marketing-e2e-harness/principal/MarketingPrincipalTestHarness'
import MarketingOperationsHarnessPage from '@/app/marketing-e2e-harness/operations/page'
import { MarketingOperationsTestHarness } from '@/app/marketing-e2e-harness/operations/MarketingOperationsTestHarness'

const originalHarnessSetting = process.env.ENABLE_MARKETING_E2E_HARNESS

afterEach(() => {
  if (originalHarnessSetting === undefined) delete process.env.ENABLE_MARKETING_E2E_HARNESS
  else process.env.ENABLE_MARKETING_E2E_HARNESS = originalHarnessSetting
})

describe('Marketing browser harness boundary', () => {
  it.each([
    ['principal', MarketingPrincipalHarnessPage],
    ['operations', MarketingOperationsHarnessPage],
  ] as const)('fails the %s harness closed when the server-only flag is absent', (_name, renderPage) => {
    delete process.env.ENABLE_MARKETING_E2E_HARNESS
    expect(() => renderPage()).toThrow(/NEXT_HTTP_ERROR_FALLBACK;404/)
  })

  it.each([
    ['principal', MarketingPrincipalHarnessPage, MarketingPrincipalTestHarness],
    ['operations', MarketingOperationsHarnessPage, MarketingOperationsTestHarness],
  ] as const)('renders the %s harness only when the server explicitly enables it', (_name, renderPage, component) => {
    process.env.ENABLE_MARKETING_E2E_HARNESS = '1'
    const element = renderPage()
    expect(element.type).toBe(component)
  })
})
