// Typed TextFocus REST client + health-check for the marketing SEO suite
// (marketingIdea: textfocus-rest-integration).
//
// TextFocus (https://www.textfocus.net) is a paid SEO / GEO scoring API. This
// module is the ONE place the rest of the suite talks to it, so the wire-level
// quirks of the service live here and nowhere else. Those quirks were verified
// against the live API and are NOT guesses — get any of them wrong and the
// request fails:
//
//   - Base URL is  https://www.textfocus.net/apis/<op>/  — note textfocus.NET
//     (not .io), POST only, and the TRAILING SLASH is required.
//   - Auth is a FORM FIELD named `key`, NOT an Authorization header. The value
//     is process.env.TEXTFOCUS_API_KEY (set on Vercel + in .env.local).
//   - Body is application/x-www-form-urlencoded (URLSearchParams), never JSON.
//   - A real browser User-Agent is REQUIRED. The default fetch/undici UA is
//     blocked by TextFocus's WAF with a 403, so we send a Chrome UA string.
//   - `force_refetch` must be the INTEGER 1 (sent as the string "1"). Passing
//     the boolean `true` fails — that exact bug is what broke the old MCP, so
//     the wrappers below hard-code 1 and the value is always stringified.
//   - `lang` is a market code like `en-US` (the full list is the free
//     `tf_langs` endpoint); we default every URL-scoped call to `en-US`.
//
// Response envelope (verified):
//   { version, params, result, response, message, timing, creditUsed, method }
// The useful payload is `result`; `response` mirrors the HTTP status; `message`
// is "ok" on success. We throw when the HTTP status is non-2xx OR `message` is
// present and not "ok", and we surface a WAF/UA/key hint on a 403.
//
// FREE ops (0 credits): tf_account, tf_endpoints, tf_langs.
// Paid examples: tf_keyword (1), tf_seo (1, or 5 with a keyword).
// ASYNC ops needing a callback (tf_seo_bulk, tf_geo_bulk, tf_competition) are
// intentionally NOT wrapped here.
//
// RELIABILITY GUARDRAIL: TextFocus is an enrichment, never a hard dependency.
// The health-check NEVER throws, the typed wrappers swallow errors and return
// null, and `withTextFocus` short-circuits to a caller-supplied fallback when
// the service is down. The suite must degrade gracefully when TextFocus is
// unreachable, out of credits, or misconfigured.

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TEXTFOCUS_BASE = 'https://www.textfocus.net/apis'

// A real Chrome UA string. REQUIRED — the WAF 403s the default fetch UA.
const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

// Per-request timeout. One AbortController per call, cleared in a finally.
const REQUEST_TIMEOUT_MS = 10_000

// Default market code. The full list comes from the free `tf_langs` endpoint.
const DEFAULT_LANG = 'en-US'

// ---------------------------------------------------------------------------
// Response envelope + option types
// ---------------------------------------------------------------------------

// The common envelope TextFocus wraps every op in. `result` carries the useful
// payload (its shape is per-op, so it stays generic here); `message` is "ok" on
// success; `response` mirrors the HTTP status. All non-result keys are optional
// because not every op returns every one.
export type TextFocusEnvelope<T = unknown> = {
  result?: T
  response?: number | string
  message?: string
  version?: string
  params?: Record<string, unknown>
  timing?: number | string
  creditUsed?: number
  method?: string
  [key: string]: unknown
}

// Options shared by the URL-scoped wrappers. `lang` defaults to en-US; callers
// can override per market. `forceRefetch` defaults to true (→ sent as "1") to
// bypass TextFocus's per-URL cache; set false to allow a cached score.
export type TextFocusUrlOptions = {
  lang?: string
  forceRefetch?: boolean
  // Any extra op-specific form fields (e.g. a keyword for tf_seo's 5-credit mode).
  extra?: Record<string, string | number>
}

// --- Loosely-typed result shapes for the ops we wrap. Only the keys the brief
// calls out are named; the team can refine the rest from a live call. ---------

export type TfSeoResult = {
  scoreSeo?: number
  [key: string]: unknown
}

export type TfGeoResult = {
  ia_ready_score?: number
  all_scores?: Record<string, unknown>
  [key: string]: unknown
}

// tf_semantic / tf_keyword / tf_robotstxt: result is loosely typed for now.
export type TfLooseResult = Record<string, unknown>

export type TfAccountResult = {
  credits?: {
    remaining?: number
    [key: string]: unknown
  }
  [key: string]: unknown
}

// ---------------------------------------------------------------------------
// tf<T> — the single low-level request helper.
// ---------------------------------------------------------------------------

/**
 * POST a TextFocus op with the API key + Chrome UA + urlencoded body and return
 * the parsed `result` payload, typed as T.
 *
 * THROWS (so callers that need hard guarantees can catch) when:
 *   - TEXTFOCUS_API_KEY is missing,
 *   - the HTTP status is non-2xx (a 403 is annotated as a WAF/UA or bad-key
 *     problem, since that is the overwhelmingly common cause),
 *   - the body is not valid JSON,
 *   - the envelope's `message` is present and not "ok".
 *
 * The public wrappers below catch these and degrade to null; only the
 * health-check and `withTextFocus` are meant to be called by feature code.
 */
export async function tf<T = unknown>(
  op: string,
  fields: Record<string, string | number> = {},
): Promise<T> {
  const key = process.env.TEXTFOCUS_API_KEY
  if (!key) {
    throw new Error(
      'TextFocus: TEXTFOCUS_API_KEY is not set. Add it to .env.local (and Vercel) — see .env.local.example.',
    )
  }

  // Auth is a FORM FIELD named `key`, not a header. Every value is stringified,
  // which is what keeps force_refetch as "1" rather than a boolean.
  const body = new URLSearchParams()
  body.set('key', key)
  for (const [name, value] of Object.entries(fields)) {
    if (value === undefined || value === null) continue
    body.set(name, String(value))
  }

  // The trailing slash on the op path is required by the API.
  const url = `${TEXTFOCUS_BASE}/${op}/`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        // A real browser UA is REQUIRED — the default fetch UA gets a 403.
        'User-Agent': BROWSER_USER_AGENT,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body,
    })
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    const aborted =
      error instanceof Error &&
      (error.name === 'AbortError' || /abort/i.test(reason))
    throw new Error(
      `TextFocus ${op}: request failed (${aborted ? `timed out after ${REQUEST_TIMEOUT_MS}ms` : reason}).`,
    )
  } finally {
    clearTimeout(timeout)
  }

  if (!res.ok) {
    // 403 is almost always the WAF rejecting a non-browser UA or a bad/blocked
    // key — call that out so the next person doesn't chase the wrong thing.
    if (res.status === 403) {
      throw new Error(
        `TextFocus ${op}: HTTP 403 (forbidden). This usually means the WAF blocked a non-browser User-Agent, or TEXTFOCUS_API_KEY is wrong/blocked. Confirm a real browser UA is sent and the key is valid.`,
      )
    }
    throw new Error(`TextFocus ${op}: HTTP ${res.status} ${res.statusText}.`)
  }

  let envelope: TextFocusEnvelope<T>
  try {
    envelope = (await res.json()) as TextFocusEnvelope<T>
  } catch {
    throw new Error(`TextFocus ${op}: response was not valid JSON.`)
  }

  // `message` is "ok" on success; anything else (and present) is an API error.
  if (envelope.message !== undefined && envelope.message !== 'ok') {
    throw new Error(`TextFocus ${op}: API error — ${envelope.message}.`)
  }

  return envelope.result as T
}

// ---------------------------------------------------------------------------
// textfocusHealthCheck — free liveness + credits probe. NEVER throws.
// ---------------------------------------------------------------------------

export type TextFocusHealth = {
  ok: boolean
  creditsRemaining?: number
  error?: string
}

/**
 * Probe TextFocus with the FREE `tf_account` op (0 credits). Returns
 * `{ ok: true, creditsRemaining }` on success, `{ ok: false, error }` on any
 * failure (missing key, non-2xx, WAF block, bad JSON, thrown error). This
 * function NEVER throws — it is the gate `withTextFocus` and the UI rely on.
 */
export async function textfocusHealthCheck(): Promise<TextFocusHealth> {
  try {
    const result = await tf<TfAccountResult>('tf_account')
    const remaining = result?.credits?.remaining
    return {
      ok: true,
      creditsRemaining: typeof remaining === 'number' ? remaining : undefined,
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

// ---------------------------------------------------------------------------
// Thin typed wrappers — return `result`, NEVER throw (catch → null).
// ---------------------------------------------------------------------------

// Build the form fields for a URL-scoped op from the shared options, applying
// the en-US default and the force_refetch=1 (integer) cache-bypass default.
function urlFields(
  url: string,
  opts: TextFocusUrlOptions = {},
): Record<string, string | number> {
  const fields: Record<string, string | number> = {
    url,
    lang: opts.lang ?? DEFAULT_LANG,
    // INTEGER 1, never boolean true — the wire value becomes the string "1".
    force_refetch: (opts.forceRefetch ?? true) ? 1 : 0,
    ...(opts.extra ?? {}),
  }
  return fields
}

/** tf_seo → result.scoreSeo (+ the rest of the SEO result). null on any failure. */
export async function tfSeo(
  url: string,
  opts: TextFocusUrlOptions = {},
): Promise<TfSeoResult | null> {
  try {
    return await tf<TfSeoResult>('tf_seo', urlFields(url, opts))
  } catch {
    return null
  }
}

/** tf_geo → result.ia_ready_score + result.all_scores. null on any failure. */
export async function tfGeo(
  url: string,
  opts: TextFocusUrlOptions = {},
): Promise<TfGeoResult | null> {
  try {
    return await tf<TfGeoResult>('tf_geo', urlFields(url, opts))
  } catch {
    return null
  }
}

/** tf_semantic → loosely-typed result. null on any failure. */
export async function tfSemantic(
  url: string,
  opts: TextFocusUrlOptions = {},
): Promise<TfLooseResult | null> {
  try {
    return await tf<TfLooseResult>('tf_semantic', urlFields(url, opts))
  } catch {
    return null
  }
}

/**
 * tf_keyword → loosely-typed result. Keyword-scoped (no URL), so it takes the
 * keyword + an optional lang; force_refetch does not apply. null on any failure.
 */
export async function tfKeyword(
  keyword: string,
  opts: { lang?: string; extra?: Record<string, string | number> } = {},
): Promise<TfLooseResult | null> {
  try {
    return await tf<TfLooseResult>('tf_keyword', {
      keyword,
      lang: opts.lang ?? DEFAULT_LANG,
      ...(opts.extra ?? {}),
    })
  } catch {
    return null
  }
}

/** tf_robotstxt → loosely-typed result. null on any failure. */
export async function tfRobotsTxt(
  url: string,
  opts: TextFocusUrlOptions = {},
): Promise<TfLooseResult | null> {
  try {
    return await tf<TfLooseResult>('tf_robotstxt', urlFields(url, opts))
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// withTextFocus — the reliability guardrail.
// ---------------------------------------------------------------------------

/**
 * Run `fn` only if TextFocus is healthy; otherwise return `fallback`. The plan's
 * "never a hard dependency" guarantee: a down/misconfigured/credit-exhausted
 * TextFocus must degrade the feature, not break it. Runs the free health-check
 * first; if it reports not-ok, short-circuits to `fallback` without calling
 * `fn`. If `fn` itself throws, `fallback` is returned too (this function never
 * throws).
 */
export async function withTextFocus<T>(
  fn: () => Promise<T>,
  fallback: T,
): Promise<T> {
  const health = await textfocusHealthCheck()
  if (!health.ok) return fallback
  try {
    return await fn()
  } catch {
    return fallback
  }
}
