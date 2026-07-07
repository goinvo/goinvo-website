/**
 * Shared constants for out-of-Studio draft preview sessions.
 *
 * A tab is a "preview session" when it arrived via /api/draft-mode/enable —
 * either a Presentation "Share" link (no Sanity login needed) or the Studio's
 * "open preview in new tab" button. The enable route tags its redirect with
 * PREVIEW_SESSION_HASH as a URL fragment; DraftModeGuard promotes that to a
 * per-tab sessionStorage marker (PREVIEW_SESSION_STORAGE_KEY) so draft mode
 * survives navigation within that tab, while other tabs sharing the draft
 * cookie still auto-disable (the original stale-cookie-leak protection).
 *
 * Both sides (server route + client guard) must agree on these values —
 * import them, never re-hardcode.
 */
export const PREVIEW_SESSION_HASH = 'sanity-preview'
export const PREVIEW_SESSION_STORAGE_KEY = 'sanity-preview-session'
