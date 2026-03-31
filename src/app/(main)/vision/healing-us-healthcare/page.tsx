import type { Metadata } from 'next'
import { UsHealthcareContent } from './UsHealthcareContent'
import './us-healthcare.css'

export const metadata: Metadata = {
  title: 'Healing U.S. Healthcare',
  description:
    "$9,255. That's how much your health costs the U.S. every year. Follow David's healthcare journey and discover our vision for better healthcare.",
}

export default function HealingUsHealthcarePage() {
  return <UsHealthcareContent />
}
