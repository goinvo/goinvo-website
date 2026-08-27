/**
 * Where a script's text generation goes — and whether it costs anything.
 *
 * The marketing scripts were calling the Anthropic API per source per claim,
 * which added up fast for what is mostly small, mechanical judgement. This puts
 * that choice in one place so a run can be pointed at a local model, or told to
 * do no generation at all.
 *
 * The default is deliberately `none`. A script that silently falls back to a
 * paid API is how a bill appears without anyone choosing it, so spending has to
 * be asked for explicitly (MARKETING_LLM_PROVIDER=anthropic).
 *
 * Worth knowing before reaching for `ollama`: quote EXISTENCE needs no model at
 * all — it is string containment, and `scripts/check-org-quotes.ts` does it for
 * free. The only step that genuinely wants judgement is entailment, and that is
 * the step where a small local model is weakest, because being strict is the
 * whole job. A 3B model that cheerfully says "supported" is worse than no check.
 */

export type ProviderName = 'none' | 'ollama' | 'anthropic'

export function resolveProviderName(explicit?: string): ProviderName {
  const value = String(explicit || process.env.MARKETING_LLM_PROVIDER || 'none').toLowerCase()
  return value === 'ollama' || value === 'anthropic' ? value : 'none'
}

export const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434'
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1:8b'

export type GenerateArgs = {
  system: string
  user: string
  maxTokens?: number
  timeoutMs?: number
}

/** Is a local Ollama actually listening, and does it have the model we want? */
export async function ollamaStatus(): Promise<{ up: boolean; models: string[]; hasModel: boolean }> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, { signal: AbortSignal.timeout(4000) })
    if (!response.ok) return { up: false, models: [], hasModel: false }
    const body = (await response.json()) as { models?: { name?: string }[] }
    const models = (body.models || []).map((model) => String(model.name || ''))
    return { up: true, models, hasModel: models.includes(OLLAMA_MODEL) }
  } catch {
    return { up: false, models: [], hasModel: false }
  }
}

/**
 * Generate with a local Ollama model.
 *
 * `stream: false` so the whole reply arrives at once, and a low temperature
 * because every use here is classification or extraction, not writing.
 */
export async function generateWithOllama(args: GenerateArgs): Promise<string> {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(args.timeoutMs ?? 120000),
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      stream: false,
      options: { temperature: 0, num_predict: args.maxTokens ?? 400 },
      messages: [
        // Ollama has no separate system field on /api/chat messages beyond a
        // system role; a local model shares none of this session's context, so
        // the instructions must travel with every single call.
        { role: 'system', content: args.system },
        { role: 'user', content: args.user },
      ],
    }),
  })
  if (!response.ok) throw new Error(`Ollama returned ${response.status}`)
  const body = (await response.json()) as { message?: { content?: string } }
  return String(body.message?.content || '')
}
