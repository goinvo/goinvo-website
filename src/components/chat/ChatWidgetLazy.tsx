'use client'

import dynamic from 'next/dynamic'

// The chat widget is a large client component that renders nothing until its
// config check enables it, so there is no reason to ship + hydrate it in the
// initial bundle. Loading it client-side after first render keeps its JS off the
// homepage's critical hydration path (cuts Total Blocking Time) with no visible
// change other than the bubble appearing a beat later.
const ChatWidget = dynamic(() => import('./ChatWidget').then((m) => m.ChatWidget), {
  ssr: false,
})

export function ChatWidgetLazy() {
  return <ChatWidget />
}
