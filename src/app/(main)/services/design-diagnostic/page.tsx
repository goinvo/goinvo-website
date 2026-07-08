import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Image from 'next/image'
import { Reveal } from '@/components/ui/Reveal'
import { Video } from '@/components/ui/Video'
import { ContactFormEmbed } from '@/components/forms/ContactFormEmbed'
import { RadarRisks } from '@/components/services/risk-diagram/RadarRisks'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  alternates: { canonical: '/services/design-diagnostic' },
  title: 'Design Diagnostic',
  description:
    'A focused design diagnostic from GoInvo. We assess your product, surface the highest-impact opportunities, and hand you a clear, prioritized plan to move forward.',
}

function SerifBody({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('font-serif text-lg leading-relaxed', className)}>{children}</p>
}

const bulletListClassName = 'list-none p-0 m-0 text-gray space-y-2'

function BulletListItem({ children }: { children: ReactNode }) {
  return (
    <li className="relative mb-0">
      <span
        className="absolute -left-5 top-[0.78em] w-2 h-2 -translate-y-1/2 bg-[url('/images/bullet.svg')] bg-contain bg-center bg-no-repeat"
        aria-hidden
      />
      {children}
    </li>
  )
}

function BulletList({ items, className }: { items: string[]; className?: string }) {
  return (
    <ul className={cn(bulletListClassName, className)}>
      {items.map((item) => (
        <BulletListItem key={item}>{item}</BulletListItem>
      ))}
    </ul>
  )
}

// The engagement, phase by phase. `intro` + `listIntro` on the final deliverable only.
const phases = [
  {
    title: 'Phase 1: Reality Check',
    items: [
      'Stakeholder interviews',
      'Workflow review',
      'Product teardown',
      'Operational + clinical review',
    ],
  },
  {
    title: 'Phase 2: Design to Learn',
    items: [
      'Rapid concept',
      'Alternative workflows',
      'Trust models',
      'AI interaction concepts',
      'Evidence visualization',
      'Prototypes',
    ],
  },
  {
    title: 'Phase 3: Design the Future',
    items: [
      'Future-state product',
      'Product Blueprint',
      'Roadmap',
      'Prototype',
      'Leadership decisions',
    ],
  },
  {
    title: 'Final Phase: Product Blueprint',
    intro:
      'The Product Blueprint captures everything we’ve learned through six weeks of designing, testing, and challenging your product. ',
    listIntro: 'A practical guide for building the right product, which includes:',
    items: [
      'Product thesis and vision',
      'Design principles',
      'Future-state prototype: the future product, expressed through its most important workflows',
      'Reality map: where clinical, operational, regulatory, and adoption risks exist',
      'Product priorities: what to build, what to defer, and what to stop',
      'Opportunity map: the highest-leverage improvements for users and the business',
      'Scale assessment: what works today, what breaks as adoption grows',
      'Leadership decisions: key decisions leadership should make next',
    ],
  },
]

export default function DesignDiagnosticPage() {
  return (
    <div>
      {/* Hero — oversized orange wordmark on white */}
      <Reveal style="slide-up" duration={0.5}>
        <section className="max-width max-width-md content-padding mx-auto pt-[calc(var(--spacing-header-height)+3rem)] pb-8">
          <p className="font-serif text-lg leading-relaxed text-gray mb-1">GoInvo</p>
          <h1 className="display-hero m-0">
            Design
            <br />
            Diagnostic
          </h1>
          <p className="text-gray text-md mt-4 mb-0 max-w-xl">
            Helping healthcare teams build the right product before they scale the
            wrong one.
          </p>
        </section>
      </Reveal>

      <article className="case-study-content design-diagnostic-content">
        {/* De-risk pitch */}
        <section className="max-width max-width-md content-padding mx-auto py-10">
          <Reveal style="slide-up">
            <SerifBody className="mb-6">
              Before you spend Millions on a product launch.
              <br />
              Spend 4-8 weeks to de-risk.
            </SerifBody>
            <SerifBody className="mb-0">
              We identify risks most likely to slow adoption, undermine trust,
              frustrate clinicians, confuse patients, and derail product strategy.
            </SerifBody>
          </Reveal>
        </section>

        {/* Five risks — interactive radar */}
        <section className="max-width content-padding mx-auto py-10">
          <Reveal style="slide-up">
            <RadarRisks />
          </Reveal>
        </section>

        {/* Clearly Designed — two-image proof */}
        <section className="max-width max-width-md content-padding mx-auto py-12">
          <Reveal style="slide-up">
            <h2 className="display-md mt-0 mb-5">Clearly Designed</h2>
            <SerifBody className="mb-8">
              We&rsquo;ve spent two decades designing healthcare software.
              <br />
              We see how products succeed. And why they fail.
              <br />
              We use design to make those patterns visible.
            </SerifBody>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <Image
                  src="/images/services/design-diagnostic-collaboration.png"
                  alt="Two senior GoInvo experts collaborating on a product diagnostic"
                  width={1182}
                  height={1389}
                  className="w-full h-auto rounded-md mb-3"
                />
                <h3 className="font-sans font-semibold text-base mt-0 mb-1">
                  2 Senior Experts
                </h3>
                <p className="text-gray text-md mb-0">
                  100% focused on your product to deliver actionable steps and real
                  results.
                </p>
              </div>
              <div>
                <Image
                  src="/images/services/design-diagnostic-prototype.png"
                  alt="Tangible prototype and tactical design deliverables from a GoInvo diagnostic"
                  width={1182}
                  height={1383}
                  className="w-full h-auto rounded-md mb-3"
                />
                <h3 className="font-sans font-semibold text-base mt-0 mb-1">
                  Tangible &amp; Tactical Design
                </h3>
                <p className="text-gray text-md mb-0">
                  Top risks ranked, product priorities, prototype, and an action plan
                  for a successful product launch.
                </p>
              </div>
            </div>
          </Reveal>
        </section>

        {/* An insurance policy for software — heading + video */}
        <section className="max-width max-width-md content-padding mx-auto py-12">
          <Reveal style="slide-up">
            <h2 className="display-md mt-0 mb-5">An insurance policy for software</h2>
            <SerifBody className="mb-8">
              A Design Diagnostic is less than 2% of a software initiative.
              <br />
              This protects the other 98%.
            </SerifBody>
            <Video
              sources={[
                {
                  src: 'https://cdn.sanity.io/files/a1wsimxr/production/2d7b424ab7ac15374b7d82046e47d5651a74618b.mp4',
                  format: 'mp4',
                },
              ]}
              autoPlay
              muted
              controls
              className="rounded-md overflow-hidden"
            />
          </Reveal>
        </section>

        {/* The Engagement — phase by phase */}
        <section className="w-screen relative left-1/2 -ml-[50vw] py-12">
          <div className="max-width max-width-md content-padding mx-auto">
            <Reveal style="slide-up">
              <h2 className="display-md mt-0 mb-8">The Engagement</h2>
            </Reveal>
            <div className="flex flex-col gap-8">
              {phases.map((phase, i) => (
                <Reveal
                  key={phase.title}
                  style="slide-up"
                  delay={Math.min(i * 0.05, 0.2)}
                >
                  <h3 className="font-sans font-semibold text-base mt-0 mb-3">
                    {phase.title}
                  </h3>
                  {phase.intro && <p>{phase.intro}</p>}
                  {phase.listIntro && <p className="!mb-4">{phase.listIntro}</p>}
                  <BulletList items={phase.items} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      </article>

      {/* Closing statement — large orange (outside the article so the
          `.case-study-content p` gray override doesn't apply) */}
      <section className="max-width max-width-md content-padding mx-auto py-16">
        <Reveal style="slide-up">
          <p className="display-closing m-0">Let's find the rough edges before your customers do.</p>
        </Reveal>
      </section>

      {/* Contact Form */}
      <div className="bg-gray-light">
        <div className="py-8">
          <div className="max-width max-width-md content-padding">
            <ContactFormEmbed />
          </div>
        </div>
      </div>
    </div>
  )
}
