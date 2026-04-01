import type { Metadata } from 'next'
import './disrupt.css'
import { DisruptPageClient } from './DisruptPageClient'

export const metadata: Metadata = {
  title: 'Disrupt! Emerging Technologies',
  description:
    'Emerging technologies from robotics to synthetic biology to the Internet of Things are opening up new possibilities for extending our reach, enabling us to become seemingly superhuman.',
}

/**
 * Disrupt Part 1: Emerging Technologies
 *
 * Ported from the legacy HTML at goinvo.com/features/disrupt/
 * Layout: top hero → nav → article → bottom hero → next-part link
 * Effects: scroll-based background color gradient, title letter-spacing animation,
 *          parallax opacity on hero sections, floating sidebar images.
 */
export default function DisruptPage() {
  return <DisruptPageClient />
}
