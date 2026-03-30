import Image from 'next/image'
import { cloudfrontImage } from '@/lib/utils'

export default function NotFound() {
  return (
    <div className="pt-[var(--spacing-header-height)]">
      <div className="max-width content-padding mx-auto py-12 text-center">
        <h1 className="header-xl mb-4" style={{ fontWeight: 700 }}>
          NOT FOUND...
        </h1>
        <p className="text-gray text-lg mb-8">
          You just hit a route that doesn&apos;t exist... the sadness.
        </p>
        <Image
          src={cloudfrontImage('/images/404/404-website.png')}
          alt="Page not found"
          width={956}
          height={464}
          className="w-full max-w-[600px] h-auto mx-auto"
          style={{ clipPath: 'inset(24px 3px 0 0)' }}
          priority
        />
      </div>
    </div>
  )
}
