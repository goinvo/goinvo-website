import type { Metadata } from 'next'
import { LegacyCarePlansArticle } from './LegacyCarePlansArticle'
import './careplans.css'

export const metadata: Metadata = {
  title: 'The Care Plan Series',
  description:
    'A patient guide to manage day-to-day health based on health concerns, goals, and interventions. A three-part feature series on the past, present, and future of care plans.',
}

export default function CarePlansPage() {
  return <LegacyCarePlansArticle page="part1" />
}
