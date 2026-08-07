export const CHAT_OPEN_EVENT = 'goinvo:open-chat'
export const CHAT_ENTRY_STORAGE_KEY = 'goinvo-chat-entry-v1'

export type ChatEntryFlow = 'posters'

export const POSTER_USE_OPTIONS = [
  { value: 'home', label: 'Home or personal space' },
  { value: 'clinic', label: 'Clinic or healthcare setting' },
  { value: 'classroom', label: 'Classroom or training' },
  { value: 'workplace', label: 'Workplace or studio' },
  { value: 'event', label: 'Event or conference' },
  { value: 'other', label: 'Other' },
] as const

export type PosterUse = (typeof POSTER_USE_OPTIONS)[number]['value']

export interface PosterInquiryDetails {
  use: PosterUse
  otherUse?: string
  posters: string
  quantity: string
  destination: string
  timeline?: string
}

export function openChatEntry(flow: ChatEntryFlow) {
  if (typeof window === 'undefined') return

  window.sessionStorage.setItem(CHAT_ENTRY_STORAGE_KEY, flow)
  window.dispatchEvent(new CustomEvent(CHAT_OPEN_EVENT, { detail: { flow } }))
}

export function formatPosterInquiryMessage(details: PosterInquiryDetails) {
  const option = POSTER_USE_OPTIONS.find((candidate) => candidate.value === details.use)
  const intendedUse =
    details.use === 'other' && details.otherUse?.trim()
      ? details.otherUse.trim()
      : option?.label || details.use

  return [
    'Poster print inquiry',
    `Intended use: ${intendedUse}`,
    `Posters or topics: ${details.posters.trim()}`,
    `Approximate quantity: ${details.quantity.trim()}`,
    `Shipping destination: ${details.destination.trim()}`,
    `Needed by: ${details.timeline?.trim() || 'Flexible'}`,
  ].join('\n')
}
