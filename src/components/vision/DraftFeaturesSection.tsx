import Link from 'next/link'
import Image from 'next/image'
import type { ReactNode } from 'react'
import { urlForImage } from '@/sanity/lib/image'
import { NewDraftCard } from '@/components/ui/NewDraftCard'
import { DraftDeleteButton } from '@/components/ui/DraftDeleteButton'
import type { Feature } from '@/types'

function isExternalHref(href: string) {
  return /^(https?:)?\/\//.test(href) || href.startsWith('mailto:') || href.startsWith('tel:')
}

function DraftFeatureCard({ feature }: { feature: Feature }) {
  const imageUrl = feature.image?.asset
    ? urlForImage(feature.image).width(400).height(260).url()
    : null
  const href = feature.externalLink || (feature.slug?.current ? `/vision/${feature.slug.current}` : null)

  const inner = (
    <>
      <div className="h-[200px] overflow-hidden bg-gray-medium">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={feature.title}
            width={400}
            height={260}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray text-sm">
            No image
          </div>
        )}
      </div>
      <div className="p-4">
        <p className="font-bold text-black mb-1 leading-snug">{feature.title}</p>
        {feature.client && (
          <p className="text-gray text-sm mb-1">
            {feature.client}
            {feature.date ? ` | ${feature.date}` : ''}
          </p>
        )}
        {feature.description && (
          <p className="text-gray text-sm">{feature.description}</p>
        )}
      </div>
    </>
  )

  let card: ReactNode

  if (!href) {
    card = (
      <div className="bg-white overflow-hidden shadow-card">
        {inner}
        <p className="px-4 pb-3 text-gray text-xs">No slug set - generate one in the Studio</p>
      </div>
    )
  } else if (feature.externalLink && isExternalHref(href)) {
    card = (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="block bg-white overflow-hidden shadow-card hover:shadow-card-hover transition-shadow duration-500 ease-out no-underline"
      >
        {inner}
      </a>
    )
  } else {
    card = (
      <Link
        href={href}
        className="block bg-white overflow-hidden shadow-card hover:shadow-card-hover transition-shadow duration-500 ease-out no-underline"
      >
        {inner}
      </Link>
    )
  }

  return (
    <div className="group relative">
      {card}
      <DraftDeleteButton
        documentId={feature._draftId}
        type="feature"
        title={feature.title || 'Untitled'}
      />
    </div>
  )
}

interface DraftFeaturesSectionProps {
  features: Feature[]
}

export function DraftFeaturesSection({ features }: DraftFeaturesSectionProps) {
  return (
    <div className="relative border-b border-gray-medium">
      <div
        className="absolute left-0 top-0 bottom-0 w-3"
        style={{
          background: 'repeating-linear-gradient(180deg, #f59e0b 0px, #f59e0b 8px, white 8px, white 16px)',
          maskImage: 'linear-gradient(to right, black, transparent)',
          WebkitMaskImage: 'linear-gradient(to right, black, transparent)',
        }}
      />
      <div className="max-width content-padding py-8">
        <h3 className="font-sans text-sm font-semibold uppercase tracking-[2px] text-tertiary m-0 mb-6">
          Draft Features
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => (
            <DraftFeatureCard key={feature._id} feature={feature} />
          ))}
          <NewDraftCard type="feature" label="New Vision Article" />
        </div>
      </div>
    </div>
  )
}
