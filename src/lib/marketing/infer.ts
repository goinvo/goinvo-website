/**
 * Pure, dependency-free inference helpers shared between the Sanity Studio
 * marketing tool and the Next.js marketing API routes / UI.
 *
 * Ported VERBATIM from src/sanity/tools/marketingTool.tsx so the Studio and any
 * consumer stay byte-for-byte consistent. Do not change their behavior — only
 * the surrounding module/export boilerplate is new.
 *
 * These helpers map free-text topics/prompts to lightweight string-based
 * heuristics and have no dependency on React, the Sanity client, or any
 * tool-local state/types.
 */

/**
 * Classifies a free-text research prompt into one of 'competitor', 'strategy',
 * or 'topic' based on keyword matching, defaulting to 'topic'.
 */
export function inferResearchProjectType(value: string | undefined) {
  const text = (value || '').toLowerCase()
  if (/\b(competitor|competitive|comparables?|benchmark|landscape|others?|peer|rival)\b/.test(text)) return 'competitor'
  if (/\b(strategy|strategic|positioning|goals?|funnel|campaign direction|roadmap|plan|planning|prioriti[sz]e)\b/.test(text)) return 'strategy'
  return 'topic'
}

/**
 * Derives a topic-cluster label from a topic string: trimmed, with a fallback
 * for blank input and an ellipsis truncation past 80 chars.
 */
export function inferTopicCluster(topic: string) {
  const normalized = topic.trim()
  if (!normalized) return 'Design insight'
  return normalized.length > 80 ? normalized.slice(0, 77).trim() + '...' : normalized
}

/**
 * Derives a small deduped set of target search queries from a topic string,
 * with a fixed fallback list for blank input.
 */
export function inferTargetQueries(topic: string) {
  const normalized = topic.trim()
  if (!normalized) return ['design insight', 'visual explanation', 'healthcare design']
  return Array.from(new Set([normalized, `${normalized} design`, `${normalized} examples`]))
}
