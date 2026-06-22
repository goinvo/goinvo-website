/**
 * Open the site chat widget from anywhere (e.g. a homepage CTA). The widget
 * (src/components/chat/ChatWidget) is otherwise self-contained — it only opens
 * via its own bubble — so a CTA dispatches this event and the widget listens for
 * it. Single-sourced so the dispatcher and listener can't drift.
 */
export const OPEN_CHAT_EVENT = 'goinvo:open-chat'

export function openChatWidget() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(OPEN_CHAT_EVENT))
}
