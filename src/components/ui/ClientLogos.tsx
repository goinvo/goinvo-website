'use client'

import { cn } from '@/lib/utils'

interface Logo {
  name: string
  file: string
  hiddenOnMobile?: boolean
}

const governmentLogos: Logo[] = [
  { name: 'NIH', file: 'logo-nih-2.svg' },
  { name: 'Commonwealth of Massachusetts', file: 'logo-mass.svg' },
  { name: 'DTA Connect', file: 'logo-dtaconnect.svg' },
  { name: 'CMS', file: 'logo-cms.svg' },
  { name: 'MITRE', file: 'logo-mitre.svg' },
]

const homepageLogos: Logo[] = [
  { name: '3M', file: 'logo-3m.svg' },
  { name: 'Partners Healthcare', file: 'logo-partners.svg' },
  { name: 'BD', file: 'logo-bd.svg' },
  { name: 'InfoBionic', file: 'logo-infobionic.svg', hiddenOnMobile: true },
  { name: 'Mass General Hospital', file: 'logo-mgh.svg', hiddenOnMobile: true },
  { name: 'Johnson & Johnson', file: 'logo-jnj.svg' },
  { name: 'Mount Sinai', file: 'logo-mountsinai.svg' },
  { name: 'WuXi NextCODE', file: 'logo-wuxinextcode.svg' },
  { name: 'Walgreens', file: 'logo-walgreens.svg' },
  { name: 'Journal of Participatory Medicine', file: 'logo-journalofparticipatorymedicine.svg', hiddenOnMobile: true },
  { name: 'National Science Foundation', file: 'logo-nationalsciencefoundation.svg', hiddenOnMobile: true },
  { name: 'NIH', file: 'logo-nih.svg' },
  { name: 'Personal Genome Project', file: 'logo-pgp.svg', hiddenOnMobile: true },
  { name: 'MITRE', file: 'logo-mitre.svg', hiddenOnMobile: true },
  { name: 'Commonwealth of Massachusetts', file: 'logo-mass.svg', hiddenOnMobile: true },
]

interface ClientLogosProps {
  className?: string
  variant?: 'default' | 'government'
}

export function ClientLogos({ className, variant = 'default' }: ClientLogosProps) {
  const logos = variant === 'government' ? governmentLogos : homepageLogos
  return (
    <ul className={cn('list-none m-0 p-0 flex flex-wrap', className)}>
      {logos.map((logo) => (
        <li
          key={logo.name}
          className={cn(
            'w-1/2 h-[70px] md:w-1/4 md:h-[80px] lg:w-1/5 flex items-center justify-center p-3',
            logo.hiddenOnMobile && 'hidden md:flex'
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/images/logos/${logo.file}`}
            alt={logo.name}
            className="w-full h-full object-contain"
          />
        </li>
      ))}
    </ul>
  )
}
