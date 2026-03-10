import Image from 'next/image'
import Link from 'next/link'
import { cloudfrontImage } from '@/lib/utils'

interface ExperimentCardProps {
  title: string
  image: string
  learnMoreLink?: string
  downloadLink?: string
}

export function ExperimentCard({
  title,
  image,
  learnMoreLink,
  downloadLink,
}: ExperimentCardProps) {
  const imgSrc = cloudfrontImage(image)

  return (
    <div className="mt-8">
      <div className="overflow-hidden">
        {learnMoreLink ? (
          <Link href={learnMoreLink} className="block no-underline">
            <Image
              src={imgSrc}
              alt={title}
              width={600}
              height={400}
              className="w-full h-auto object-cover image--interactive"
            />
          </Link>
        ) : (
          <Image
            src={imgSrc}
            alt={title}
            width={600}
            height={400}
            className="w-full h-auto object-cover"
          />
        )}
      </div>
      <h4 className="font-serif text-lg mt-3 mb-2">{title}</h4>
      <div className="flex flex-col gap-2">
        {downloadLink && (
          <a
            href={downloadLink}
            className="inline-flex items-center justify-center font-semibold uppercase tracking-[2px] text-md px-4 py-[0.375rem] bg-transparent text-primary border border-primary-light hover:bg-primary-lightest no-underline transition-all duration-[var(--transition-button)] rounded-none w-full text-center"
            target="_blank"
            rel="noopener noreferrer"
          >
            Download
          </a>
        )}
        {learnMoreLink && (
          <Link
            href={learnMoreLink}
            className="inline-flex items-center justify-center font-semibold uppercase tracking-[2px] text-md px-4 py-[0.375rem] bg-transparent text-primary border border-primary-light hover:bg-primary-lightest no-underline transition-all duration-[var(--transition-button)] rounded-none w-full text-center"
          >
            Learn More
          </Link>
        )}
      </div>
    </div>
  )
}
