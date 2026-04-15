import type { Metadata } from 'next'
import { LegacyCarePlansArticle } from '../LegacyCarePlansArticle'
import '../careplans.css'

export const metadata: Metadata = {
  title: 'Care Plans Part 2: The Current Landscape',
  description: 'How are care plans being used?',
}

export default function CarePlansPart2Page() {
  return <LegacyCarePlansArticle page="part2" />
}
