import { notFound } from 'next/navigation'

import { MarketingOperationsTestHarness } from './MarketingOperationsTestHarness'

export const dynamic = 'force-dynamic'

export default function MarketingOperationsHarnessPage() {
  if (process.env.ENABLE_MARKETING_E2E_HARNESS !== '1') notFound()
  return <MarketingOperationsTestHarness />
}
