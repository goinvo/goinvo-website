'use client'

import { openChatEntry } from '@/lib/chat/entry'

export function PosterChatCta() {
  return (
    <button
      type="button"
      onClick={() => openChatEntry('posters')}
      data-poster-chat-cta
      className="self-start lg:self-auto bg-primary text-white font-semibold px-6 py-3 hover:bg-primary-dark transition-colors whitespace-nowrap"
    >
      Chat about posters
    </button>
  )
}
