import Image from 'next/image'
import { cloudfrontImage } from '@/lib/utils'

export default function NotFound() {
  return (
    <div className="pt-[var(--spacing-header-height)]">
      <div className="max-width content-padding mx-auto pt-8 text-center" style={{ paddingBottom: 0, marginBottom: 0 }}>
        <h1 className="header-xl mb-4" style={{ fontWeight: 700 }}>
          NOT FOUND...
        </h1>
        <p style={{ fontSize: '1.125rem', marginBottom: '12px' }}>
          You just hit a route that doesn&apos;t exist... the sadness.
        </p>
      </div>
      <div style={{ paddingBottom: 0, marginBottom: 0 }}>
        <Image
          src={cloudfrontImage('/images/404/404-website.png')}
          alt="Page not found"
          width={1920}
          height={932}
          className="w-full h-auto block"
          style={{ clipPath: 'inset(24px 3px 0 0)', marginTop: '12px' }}
          priority
        />
      </div>
    </div>
  )
}
