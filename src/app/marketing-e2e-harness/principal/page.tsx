import { notFound } from 'next/navigation'

import { MarketingPrincipalTestHarness } from './MarketingPrincipalTestHarness'

export const dynamic = 'force-dynamic'

export default function MarketingPrincipalHarnessPage() {
  if (process.env.ENABLE_MARKETING_E2E_HARNESS !== '1') notFound()
  return <MarketingPrincipalTestHarness />
}
