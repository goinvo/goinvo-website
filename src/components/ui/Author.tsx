import Image from 'next/image'
import { cn, cloudfrontImage } from '@/lib/utils'
import { teamHeadshots } from '@/data/team-headshots'
import { teamBios } from '@/data/team-bios'

interface AuthorProps {
  name: string
  company?: string
  image?: string
  children?: React.ReactNode
  className?: string
}

export function Author({
  name,
  company = 'GoInvo',
  image,
  children,
  className,
}: AuthorProps) {
  // Auto-resolve headshot from team data if not explicitly provided
  const resolvedImage = image || (teamHeadshots[name] ? cloudfrontImage(teamHeadshots[name]) : undefined)

  // Auto-resolve bio from team data if no children provided
  const bio = children || teamBios[name] || undefined

  return (
    <div className={cn('grid grid-cols-1 gap-6 my-8 items-start', resolvedImage ? 'lg:grid-cols-2' : '', className)}>
      {resolvedImage && (
        <div>
          <Image
            src={resolvedImage}
            alt={name}
            width={400}
            height={300}
            className="w-full h-auto object-cover"
          />
        </div>
      )}
      <div>
        <p>
          <strong>{name}</strong>
          <span className="text-gray">, {company}</span>
        </p>
        {bio && <div className="text-gray mt-1">{bio}</div>}
      </div>
    </div>
  )
}
