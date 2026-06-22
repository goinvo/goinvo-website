'use client'

import { Button } from '@/components/ui/Button'
import { trackCtaClick } from '@/lib/analytics'
import { openChatWidget } from '@/lib/chatOpen'

interface HomeConceptChatCtaProps {
  label: string
  location: string
  className?: string
  children: React.ReactNode
}

/**
 * A homepage CTA that opens the site chat widget — the lower-friction, async-OK
 * path to a conversation with the team (vs. committing to a calendar slot). Tracks
 * a cta_click so CTA engagement is visible; the qualified-lead conversion itself
 * fires from the widget on the first message sent (chat_message_sent).
 */
export function HomeConceptChatCta({ label, location, className, children }: HomeConceptChatCtaProps) {
  const handleClick = () => {
    trackCtaClick({ cta_text: label, cta_location: location, cta_url: 'chat' })
    openChatWidget()
  }

  return (
    <Button type="button" className={className} onClick={handleClick}>
      {children}
    </Button>
  )
}
