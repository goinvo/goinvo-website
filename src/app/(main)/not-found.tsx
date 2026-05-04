import { cloudfrontImage } from '@/lib/utils'
import { Button } from '@/components/ui/Button'

/**
 * not-found page for routes inside the (main) group (e.g. /work/[slug],
 * /vision/[slug] when the slug doesn't match). The (main) layout already
 * renders <Header /> and <Footer />, so this file deliberately does NOT
 * mount them — otherwise the page renders both twice. The root-level
 * app/not-found.tsx still mounts its own Header/Footer because it
 * handles unmatched routes that don't pass through any layout.
 */
export default function NotFound() {
  return (
    <div className="pt-[var(--spacing-header-height)]">
      <div
        className="max-width content-padding mx-auto text-center"
        style={{ paddingTop: '2rem', paddingBottom: 0, marginBottom: 0 }}
      >
        <h1 className="header-xl" style={{ fontWeight: 700 }}>
          NOT FOUND...
        </h1>
        <p style={{ fontSize: '1.125rem', marginBottom: '24px' }}>
          You just hit a route that doesn&apos;t exist... the sadness.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 mb-4">
          <Button href="/" variant="primary" size="md">
            Go home
          </Button>
          <Button href="/work" variant="secondary" size="md">
            Browse our work
          </Button>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cloudfrontImage('/images/404/404-website.png')}
          alt="Page not found"
          loading="lazy"
          decoding="async"
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
            margin: '12px auto 0',
            clipPath: 'inset(24px 3px 0 0)',
          }}
        />
      </div>
    </div>
  )
}
