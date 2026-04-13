import type { ReactNode } from 'react'
import Image from 'next/image'
import { cloudfrontImage } from '@/lib/utils'

type Citation = {
  label: string
}

type Stage = {
  age: string
  lobe: string
  brainImage: string
  babyImage: string
  description: ReactNode
}

type Group = {
  title: string
  titleBackground: string
  titleCitation?: Citation
  description: string
  stages: Stage[]
  borderColor: string
  innerBorderColor: string
  outerClassName?: string
}

const groups: Group[] = [
  {
    title: 'CONSPEC',
    titleBackground: '#f6f6f6',
    titleCitation: { label: '8, 9, 10, 11, 12, 13' },
    description: "Guides an infant's preferences for facelike patterns from birth.",
    borderColor: '#f6f6f6',
    innerBorderColor: '#f6f6f6',
    outerClassName: 'mt-8',
    stages: [
      {
        age: '2 Days Old',
        lobe: 'Frontal Lobe',
        brainImage: '/images/features/faces-in-health-communication/10-brain1.jpg',
        babyImage: '/images/features/faces-in-health-communication/10-baby1.jpg',
        description: (
          <>
            Infants spend a longer time looking at face that are arranged properly. As early as two days old,
            newborns are able to discriminate between averting eye gaze and direct gaze.
          </>
        ),
      },
    ],
  },
  {
    title: 'CONLERN',
    titleBackground: '#f8fafe',
    titleCitation: { label: '14, 15, 16, 17, 18, 19' },
    description: 'A cortical visuomotor mechanism. These subcortical structures support the development of specialized cortical circuits that we use as adults.',
    borderColor: '#f8fafe',
    innerBorderColor: '#f6f6f6',
    outerClassName: 'mt-8',
    stages: [
      {
        age: '2 Months Old',
        lobe: 'Motor Cortex',
        brainImage: '/images/features/faces-in-health-communication/10-brain2.jpg',
        babyImage: '/images/features/faces-in-health-communication/10-baby2.jpg',
        description: (
          <>
            Infants learn to <strong>prefer a realistic human face</strong> through their cortical visuomotor mechanism.
          </>
        ),
      },
      {
        age: '4 Months Old',
        lobe: 'Occipital Lobe',
        brainImage: '/images/features/faces-in-health-communication/10-brain3.jpg',
        babyImage: '/images/features/faces-in-health-communication/10-baby3.jpg',
        description: (
          <>
            Infants can simulate neural responses in their temporal lobe to a level similar to adults.
            <br />
            The lower level of the visual processing system in the occipital lobe is responsible for <strong>analyzing non-facial images</strong>.
          </>
        ),
      },
      {
        age: '9 Months Old',
        lobe: 'Temporal Lobe',
        brainImage: '/images/features/faces-in-health-communication/10-brain4.jpg',
        babyImage: '/images/features/faces-in-health-communication/10-baby4.jpg',
        description: (
          <>
            Infants <strong>develop joint attention</strong>, where they can purposefully coordinate their attention with that of another person.
          </>
        ),
      },
    ],
  },
]

function CitationLink({ label }: Citation) {
  return (
    <sup>
      <a href="#references" className="!text-primary !no-underline hover:!underline hover:!text-black">
        {label}
      </a>
    </sup>
  )
}

function StageCard({
  stage,
  borderColor,
  innerBorderColor,
}: {
  stage: Stage
  borderColor: string
  innerBorderColor: string
}) {
  return (
    <div
      className="border-[2px] border-t-0"
      style={{ borderColor }}
    >
      <div
        className="px-4 py-4 text-center font-sans text-base font-semibold uppercase"
        style={{ borderBottom: `2px solid ${innerBorderColor}`, lineHeight: '26px' }}
      >
        {stage.age}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-[214px_1fr]">
        <div
          className="flex items-center justify-center"
          style={{ borderRight: `2px solid ${innerBorderColor}` }}
        >
          <div className="px-4 py-4">
            <div className="font-sans text-base font-semibold uppercase text-center leading-[26px] mb-2">
              {stage.lobe}
            </div>
            <Image
              src={cloudfrontImage(stage.brainImage)}
              alt=""
              width={2000}
              height={2000}
              className="w-full max-w-[181px] h-auto mx-auto"
            />
          </div>
        </div>

        <div className="flex items-center justify-center">
          <div className="px-4 py-4">
            <Image
              src={cloudfrontImage(stage.babyImage)}
              alt=""
              width={2000}
              height={2000}
              className="w-full max-w-[344px] h-auto mx-auto"
            />
          </div>
        </div>
      </div>

      <div
        className="px-4 py-4 leading-[26px]"
        style={{ borderTop: `2px solid ${innerBorderColor}` }}
      >
        {stage.description}
      </div>
    </div>
  )
}

export function FIHCFaceDevelopmentSection() {
  return (
    <div className="my-8 max-w-[648px] mx-auto">
      {groups.map((group) => (
        <div key={group.title} className={group.outerClassName}>
          <div
            className="border-[2px]"
            style={{ borderColor: group.borderColor }}
          >
            <div
              className="px-4 py-4 text-center"
              style={{ backgroundColor: group.titleBackground }}
            >
              <p className="font-serif text-[2.25rem] leading-[2.625rem] text-black">{group.title}</p>
              <div className="pt-2 text-sm leading-[26px] text-black">
                {group.description} {group.titleCitation && <CitationLink label={group.titleCitation.label} />}
              </div>
            </div>
          </div>

          {group.stages.map((stage) => (
            <StageCard
              key={`${group.title}-${stage.age}`}
              stage={stage}
              borderColor={group.borderColor}
              innerBorderColor={group.innerBorderColor}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
