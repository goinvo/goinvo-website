import type { Metadata } from 'next'
import { HomeContent } from '@/components/home/HomeContent'

export const metadata: Metadata = {
  title: {
    absolute: 'Boston UX Design Agency | GoInvo Boston',
  },
  description:
    'GoInvo is a Boston-based UX design agency specializing in healthcare software design. We deliver beautiful, useful experiences for patients, clinicians, and organizations.',
}

export default function HomePage() {
  return <HomeContent />
}
