import { cookies } from 'next/headers'

export const HOME_AI_SEARCH_COOKIE = 'home_ai_search'

/**
 * Whether the homepage AI search band renders for this request.
 * Enabled by the HOME_AI_SEARCH=1 env var (deploy-wide), or per-browser via
 * the preview cookie set by /api/search/preview?on=1 while the feature ships
 * dark. The A/B experiment wiring will supersede this at launch.
 */
export async function isHomeAiSearchEnabled(): Promise<boolean> {
  if (process.env.HOME_AI_SEARCH === '1') return true
  try {
    const store = await cookies()
    return store.get(HOME_AI_SEARCH_COOKIE)?.value === '1'
  } catch {
    return false
  }
}
