import type { Metadata } from 'next'
import { Part2Client } from './Part2Client'

export const metadata: Metadata = {
  title: 'Disrupt! From Horse to Horsepower',
  description:
    'To envision our future and the possible effects of technological disruption, it is helpful to consider the historical context of the Second Industrial Revolution.',
}

/**
 * Disrupt Part 2: From Horse to Horsepower
 *
 * Ported from the legacy HTML at goinvo.com/features/disrupt/part-2.html
 * Layout: nav → top hero with section title → article → sci-fi image → article → bottom hero → next-part link
 * Effects: scroll-based background color gradient (orange → pink), parallax opacity on hero sections.
 */
export default function DisruptPart2Page() {
  return <Part2Client />
}
