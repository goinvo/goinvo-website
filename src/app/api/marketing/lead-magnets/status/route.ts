import { NextRequest } from 'next/server'
import { assertStudioOrApiKey, MarketingAuthError } from '@/lib/marketing/auth'
import { privateMarketingJson } from '@/lib/marketing/privateResponse'
import { emailOctopusMissingConfig, isEmailOctopusConfigured } from '@/lib/marketing/emailOctopus'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/marketing/lead-magnets/status — connection summary for the Studio
 * Dashboard panel. Returns only booleans and missing env-var NAMES (never
 * values), mirroring /api/marketing/publish/status.
 */
export async function GET(request: NextRequest) {
  try {
    await assertStudioOrApiKey(request)
  } catch (error) {
    if (error instanceof MarketingAuthError) {
      return privateMarketingJson({ error: error.message }, { status: error.status })
    }
    throw error
  }

  return privateMarketingJson({
    emailOctopus: {
      connected: isEmailOctopusConfigured(),
      missingConfig: emailOctopusMissingConfig(),
    },
  })
}
