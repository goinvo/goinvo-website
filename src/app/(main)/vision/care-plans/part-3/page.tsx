import type { Metadata } from 'next'
import { LegacyCarePlansArticle } from '../LegacyCarePlansArticle'
import '../careplans.css'

export const metadata: Metadata = {
  alternates: { canonical: '/vision/care-plans/part-3' },
  title: 'Care Plans Part 3: The Future',
  description: 'What is the future of care plans?',
}

export default function CarePlansPart3Page() {
  return <LegacyCarePlansArticle page="part3" />
}
