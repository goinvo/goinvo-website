import type { Metadata } from 'next'
import '../disrupt.css'
import { Part5Client } from './Part5Client'

export const metadata: Metadata = {
  title: 'Disrupt! The Future of Design',
  description:
    'Designers have only just begun to think about the implications of emerging technologies for the human condition. We can and should be involved early.',
}

/**
 * Disrupt Part 5: The Future of Design
 *
 * Ported from the legacy HTML at goinvo.com/features/disrupt/part-5.html
 * Layout: top hero → nav → intro → sci-fi image → 8 sub-sections → bottom hero → next-part link
 * Effects: scroll-based background color gradient, floating sidebar images.
 */
export default function DisruptPart5Page() {
  return <Part5Client />
}
