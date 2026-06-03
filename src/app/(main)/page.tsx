import type { Metadata } from 'next'
import { HomePageRenderer } from '@/components/home/HomePageRenderer'

export const metadata: Metadata = {
  title: {
    absolute: 'Boston UX Design Agency | GoInvo Boston',
  },
  description:
    'GoInvo is a Boston-based UX design agency specializing in healthcare software design. We deliver beautiful, useful experiences for patients, clinicians, and organizations.',
}

export default async function HomePage() {
  return <HomePageRenderer />
}
