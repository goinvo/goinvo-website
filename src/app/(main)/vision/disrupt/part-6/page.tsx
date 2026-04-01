import type { Metadata } from 'next'
import '../disrupt.css'
import { Part6Client } from './Part6Client'

export const metadata: Metadata = {
  title: 'Disrupt! Fukushima and Fragility',
  description:
    'The Fukushima catastrophe revealed the fragility of our systems and the need for resilient design solutions to disasters.',
}

/**
 * Disrupt Part 6: Fukushima and Fragility
 *
 * Ported from the legacy HTML at goinvo.com/features/disrupt/part-6.html
 * Layout: nav → top hero with title overlay → article → bottom hero → closer (book + refs) → contributions
 * This is the last part, so there is no BottomNav.
 */
export default function DisruptPart6Page() {
  return <Part6Client />
}
