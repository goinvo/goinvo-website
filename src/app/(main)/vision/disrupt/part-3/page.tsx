import type { Metadata } from 'next'
import '../disrupt.css'
import { Part3Client } from './Part3Client'

export const metadata: Metadata = {
  title: 'Disrupt! Part 3: The Coming Disruption',
  description:
    'What is the nature and magnitude of the disruption before us? Emerging technologies like IoT, robotics, genomics, and synthetic biology will transform every aspect of our lives.',
}

/**
 * Disrupt Part 3: The Coming Disruption
 *
 * Ported from the legacy HTML at goinvo.com/features/disrupt/part-3.html
 * Layout: nav -> top hero with title -> intro -> sci-fi image ->
 *         Living/Eating/Working sub-sections -> bottom hero -> next-part link
 * Effects: scroll-based background color gradient (pink-to-purple),
 *          parallax opacity on hero sections, floating sidebar images.
 */
export default function DisruptPart3Page() {
  return <Part3Client />
}
