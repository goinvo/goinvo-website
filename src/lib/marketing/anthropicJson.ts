/**
 * Shared Claude (Anthropic) generation for the marketing suite.
 *
 * Replaces the OpenAI Responses-API calls the marketing tools used to make — the
 * studio's OpenAI account is `insufficient_quota`, so anything on OPENAI_API_KEY
 * fails at runtime. Everything here goes through the official `@anthropic-ai/sdk`.
 * The default model is **`claude-sonnet-4-6`** — fast + high-quality enough for
 * these setup/research tasks (Opus was ~10–20x slower for no real gain here);
 * override with the `MARKETING_CLAUDE_MODEL` env var. Fail-closed: callers check
 * `isAnthropicConfigured()` or handle the thrown error.
 *
 * - `generateClaudeText` — one message; optionally enables the built-in
 *   `web_search` server tool (for citation/visibility checks) and returns the
 *   answer text plus any cited URLs / search sources.
 * - `parseJsonObject` — robustly pull the outermost JSON object out of the
 *   answer text (Claude is asked to return JSON; this tolerates stray prose/fences).
 */

import Anthropic from '@anthropic-ai/sdk'

export function isAnthropicConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY)
}

// The single "model setting" for the marketing suite. Default: Sonnet 4.6 (fast,
// strong); set MARKETING_CLAUDE_MODEL to change it everywhere.
export function marketingClaudeModel(override?: string): string {
  return override || process.env.MARKETING_CLAUDE_MODEL || 'claude-sonnet-4-6'
}

export interface GenerateClaudeOptions {
  system: string
  user: string
  model?: string
  maxTokens?: number
  /** Enable the built-in live web_search server tool. */
  webSearch?: boolean
  timeoutMs?: number
}

export interface ClaudeTextResult {
  text: string
  /** URLs Claude actually cited inline (from web_search citations). */
  citedUrls: string[]
  /** Cited sources (title + url), preferred for display. */
  sources: { title: string; url: string }[]
  model: string
}

export async function generateClaudeText(opts: GenerateClaudeOptions): Promise<ClaudeTextResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured.')
  const model = marketingClaudeModel(opts.model)
  const client = new Anthropic({ apiKey, maxRetries: 1 })

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
  const message = await stream.finalMessage()

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
  return { text, citedUrls, sources, model }
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
