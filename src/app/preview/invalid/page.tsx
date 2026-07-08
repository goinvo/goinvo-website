import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Preview link unavailable',
  robots: { index: false, follow: false },
}

export default function PreviewInvalidPage() {
  return (
    <main className="min-h-[70vh] flex items-center justify-center px-6 py-24">
      <div className="max-w-xl text-center">
        <p className="text-sm font-sans uppercase tracking-widest text-tertiary mb-4">Draft preview</p>
        <h1 className="text-3xl sm:text-4xl font-serif mb-4">This preview link isn’t available</h1>
        <p className="text-gray-600 font-sans leading-relaxed mb-8">
          The link may have expired, been revoked, or the draft is no longer shared. Ask whoever sent it to
          generate a fresh preview link from the CMS.
        </p>
        <Link
          href="/"
          className="inline-block bg-tertiary text-white no-underline px-5 py-2.5 rounded font-sans text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          Go to goinvo.com
        </Link>
      </div>
    </main>
  )
}
