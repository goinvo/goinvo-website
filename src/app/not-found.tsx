import Image from 'next/image'
import { cloudfrontImage } from '@/lib/utils'

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
        <p style={{ fontSize: '1.125rem', marginBottom: '12px' }}>
          You just hit a route that doesn&apos;t exist... the sadness.
        </p>
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
