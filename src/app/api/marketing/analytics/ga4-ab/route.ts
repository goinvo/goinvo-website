import { NextResponse } from 'next/server'

// NEUTRALIZED: GA4-sourced A/B engagement is retired.
//
// Per-variant ENGAGEMENT (sessions, bounce rate, avg time on page) is now
// captured FIRST-PARTY — the same reliable pipeline as the exposure/conversion
// counts: a client engagement beacon -> /api/marketing/analytics/collect ->
// Vercel KV (reserved `__eng_*` fields) -> drain-cron rollup
// (variantEngagementFromKvHash) -> marketingPerformanceSignal.variantEngagement.
//
// GA4's `customEvent:variant` engagement was an unreliable, event-scoped
// approximation that could be smaller than (and disagree with) the first-party
// visit counts. This route therefore NO LONGER reads GA4 or writes
// variantEngagement onto any signal, so it can never overwrite the first-party
// engagement. It is intentionally a no-op that explains the change; the cron
// entry can stay until it is removed from vercel.json.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const NO_OP_MESSAGE =
  'GA4 A/B engagement is retired. Per-variant engagement (sessions, bounce rate, avg time on page) is now captured first-party via the collect beacon + drain-cron rollup and written to marketingPerformanceSignal.variantEngagement. This route is a no-op and never writes engagement.'

function noOpResponse() {
  return NextResponse.json({ configured: false, neutralized: true, source: 'first-party', wrote: false, message: NO_OP_MESSAGE })
}

export async function GET() {
  // Gate-free no-op: it neither reads nor writes anything, so there is nothing to
  // protect. Always returns the explanatory payload.
  return noOpResponse()
}

export async function POST() {
  return noOpResponse()
}
