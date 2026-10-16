import type { Metadata } from 'next'
import { HomePageRenderer } from '@/components/home/HomePageRenderer'

export const metadata: Metadata = {
  alternates: { canonical: '/' },
  title: {
    absolute: 'Boston UX Design Agency | GoInvo Boston',
  },
  description:
    'Better business by Design. GoInvo is a business and systems reinvention studio. We design businesses, systems, products, and software.',
}

export default async function HomePage() {
  return (
    <HomePageRenderer />
  )
}
