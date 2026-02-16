import Link from 'next/link'
import { Button } from '@/components/ui/Button'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center max-width content-padding">
        <h1 className="font-serif text-4xl mb-4">Page Not Found</h1>
        <p className="text-gray text-lg mb-8">
          Sorry, we couldn&apos;t find the page you&apos;re looking for.
        </p>
        <Button href="/" variant="primary" size="lg">
          Go Home
        </Button>
      </div>
    </div>
  )
}
