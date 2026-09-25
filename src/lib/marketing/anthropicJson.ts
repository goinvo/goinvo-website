/**
 * Shared Claude (Anthropic) generation for the marketing suite.
 *
 * Replaces the OpenAI Responses-API calls the marketing tools used to make — the
 * studio's OpenAI account is `insufficient_quota`, so anything on OPENAI_API_KEY
 * fails at runtime. Everything here goes through the official `@anthropic-ai/sdk`.
 * The default model is **`claude-opus-4-8`** (best quality — sharper strategic
 * judgment — and actually the fastest for these output-heavy structured
 * generations; per-call cost is ~cents at this volume). Set the
 * `MARKETING_CLAUDE_MODEL` env var to change it suite-wide:
 * `claude-sonnet-4-6` (~3x cheaper, ~equal quality) or `claude-haiku-4-5`
 * (cheapest, rougher). Fail-closed: callers check `isAnthropicConfigured()`.
 *
 * - `generateClaudeText` — one message; optionally enables the built-in
 *   `web_search` server tool (for citation/visibility checks) and returns the
 *   answer text plus any cited URLs / search sources.
 * - `parseJsonObject` — robustly pull the outermost JSON object out of the
 *   answer text (Claude is asked to return JSON; this tolerates stray prose/fences).
 */

import Anthropic from '@anthropic-ai/sdk'
import type { SanityClient } from '@sanity/client'
import { datasetForType } from './datasetRouting'
import { usageFromAnthropic } from './modelLedger'
import { recordModelCall } from './modelLedger.server'
import { dataset as PUBLIC_DATASET } from '@/sanity/env'

export const MARKETING_ALLOWED_CLAUDE_MODELS = [
  'claude-opus-4-8',
  'claude-sonnet-4-6',
  'claude-haiku-4-5',
] as const

export function isAllowedMarketingModel(value: unknown): value is (typeof MARKETING_ALLOWED_CLAUDE_MODELS)[number] {
  return typeof value === 'string' && (MARKETING_ALLOWED_CLAUDE_MODELS as readonly string[]).includes(value)
}

export function isAnthropicConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY)
}

// Resolve the suite-wide model with precedence: explicit override > the Studio
// setting (`marketingSettings.aiModel`, picked from the marketing tool) >
// `MARKETING_CLAUDE_MODEL` env > Opus default. The Studio setting lets non-devs
// change the model from inside the Studio without touching env vars.
export async function resolveMarketingModel(
  client: Pick<SanityClient, 'fetch'> & Partial<Pick<SanityClient, 'withConfig'>>,
  override?: string,
): Promise<string> {
  if (isAllowedMarketingModel(override)) return override
  try {
    // Read the setting from wherever marketingSettings actually lives rather
    // than from the caller's dataset. Callers hand over whatever client they
    // already hold — the outreach routes an outreach-bound one, assist a
    // production-bound one — so without this the model picked in the Studio is
    // honoured by some routes and silently ignored by others, with no error
    // either way. Pinned explicitly in BOTH directions, because clientForType
    // only re-scopes internal types and passes everything else through
    // untouched: before cutover an outreach-bound caller would still read
    // settings from outreach.
    const target = datasetForType('marketingSettings', PUBLIC_DATASET)
    const settingsClient =
      typeof client.withConfig === 'function' ? client.withConfig({ dataset: target }) : client
    const chosen = await settingsClient.fetch<string | null>(`*[_id == "marketingSettings"][0].aiModel`)
    if (isAllowedMarketingModel(chosen)) return chosen
  } catch {
    // Settings unreadable → fall back to env/default.
  }
  return marketingClaudeModel()
}

// The single "model setting" for the marketing suite. Default: Opus 4.8 (best
// quality); set MARKETING_CLAUDE_MODEL (e.g. claude-sonnet-4-6 for ~3x cheaper)
// to change it everywhere.
export function marketingClaudeModel(override?: string): string {
  if (isAllowedMarketingModel(override)) return override
  if (isAllowedMarketingModel(process.env.MARKETING_CLAUDE_MODEL)) return process.env.MARKETING_CLAUDE_MODEL
  return 'claude-opus-4-8'
}

export interface GenerateClaudeOptions {
  system: string
  user: string
  model?: string
  maxTokens?: number
  /** Enable the built-in live web_search server tool. */
  webSearch?: boolean
  timeoutMs?: number
  /**
   * Which part of the suite is spending. Recorded on the ledger so the bill can
   * be attributed. Unset shows up as "unlabelled", which the spend view calls
   * out rather than hides.
   */
  feature?: string
}

export interface ClaudeTextResult {
  text: string
  /** URLs Claude actually cited inline (from web_search citations). */
  citedUrls: string[]
  /** Cited sources (title + url), preferred for display. */
  sources: { title: string; url: string }[]
  model: string
  /**
   * Why the model stopped. `max_tokens` means the answer was CUT OFF, not
   * finished — callers that parse JSON out of this should treat it as a failure
   * rather than try to repair a truncated object.
   *
   * Optional only so existing test doubles stay valid; the real path always
   * sets it.
   */
  stopReason?: string | null
}

export async function generateClaudeText(opts: GenerateClaudeOptions): Promise<ClaudeTextResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured.')
  const model = marketingClaudeModel(opts.model)
  const client = new Anthropic({ apiKey, maxRetries: 1 })
  const feature = opts.feature || 'unlabelled'
  const startedAt = Date.now()

  // Every Claude call in the suite comes through here, which is the whole
  // reason the ledger hangs off this function rather than each caller: a new
  // feature is metered the day it ships, without anyone remembering to add it.
  let message: Awaited<ReturnType<ReturnType<typeof client.messages.stream>['finalMessage']>>
  try {
    // Stream so an (optional) web_search loop can't trip an HTTP timeout. Adaptive
    // thinking only — Opus 4.8 rejects temperature / top_p / budget_tokens.
    const stream = client.messages.stream(
      {
        model,
        max_tokens: opts.maxTokens ?? 2600,
        system: opts.system,
        messages: [{ role: 'user', content: opts.user }],
        ...(opts.webSearch
          ? { tools: [{ type: 'web_search_20260209' as const, name: 'web_search' as const }] }
          : {}),
      },
      { timeout: opts.timeoutMs ?? 120000 },
    )
    message = await stream.finalMessage()
  } catch (error) {
    // A failure is a call that happened and cost latency, so it belongs on the
    // ledger too — otherwise a route that fails every time looks free.
    await recordModelCall({
      feature,
      model,
      usage: { inputTokens: 0, outputTokens: 0 },
      latencyMs: Date.now() - startedAt,
      ok: false,
      errorKind: (error as { constructor?: { name?: string } })?.constructor?.name || 'Error',
    })
    throw error
  }

  await recordModelCall({
    feature,
    model,
    usage: usageFromAnthropic((message as unknown as { usage?: unknown }).usage),
    latencyMs: Date.now() - startedAt,
    ok: true,
    stopReason: (message as unknown as { stop_reason?: string | null }).stop_reason ?? null,
  })

  let text = ''
  const citedUrls: string[] = []
  const sources: { title: string; url: string }[] = []
  const addSource = (url?: string, title?: string) => {
    if (url && !sources.some((s) => s.url === url)) sources.push({ title: title || url, url })
  }
  for (const block of message.content as unknown as Array<Record<string, unknown>>) {
    if (block.type === 'text') {
      text += (text ? '\n' : '') + ((block.text as string) || '')
      for (const c of (block.citations as Array<Record<string, unknown>>) || []) {
        const url = c.url as string | undefined
        if (url) {
          if (!citedUrls.includes(url)) citedUrls.push(url)
          addSource(url, c.title as string)
        }
      }
    } else if (block.type === 'web_search_tool_result') {
      const inner = Array.isArray(block.content) ? (block.content as Array<Record<string, unknown>>) : []
      for (const r of inner) {
        if (r?.type === 'web_search_result') addSource(r.url as string, r.title as string)
      }
    }
  }
  return {
    text,
    citedUrls,
    sources,
    model,
    stopReason: (message as unknown as { stop_reason?: string | null }).stop_reason ?? null,
  }
}

export function parseJsonObject<T = Record<string, unknown>>(text: string): T | null {
  if (!text) return null
  const cleaned = text.replace(/```json\s*|```/g, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1) return null
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as T
  } catch {
    return null
  }
}
