import type { Metadata } from 'next'
import '../disrupt.css'
import { Part4Client } from './Part4Client'

export const metadata: Metadata = {
  title: 'Disrupt! Crowdsourcing Innovation',
  description:
    'Crowdsourcing innovation through citizen scientists, engineers, designers and amateurs is increasing technological progress in unprecedented ways.',
}

/**
 * Disrupt Part 4: Crowdsourcing Innovation
 *
 * Ported from the legacy HTML at goinvo.com/features/disrupt/part-4.html
 * Layout: nav → top hero → article → sci-fi image → article → 20-topic grid → bottom hero → next-part link
 * Effects: scroll-based background color gradient, grid with slideshow overlay.
 */
export default function DisruptPart4Page() {
  return <Part4Client />
}
