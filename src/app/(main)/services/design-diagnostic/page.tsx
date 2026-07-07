import type { Metadata } from 'next'
import type { ReactNode } from 'react'
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

// Placeholder box for images the user will upload later. The `label` names the
// expected file so the placeholder → real-image swap is a one-line edit.
function PlaceholderImage({
  label,
  ratio = 'aspect-[4/5]',
  className,
}: {
  label: string
  ratio?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-md border-2 border-dashed border-gray-medium bg-gray-light text-gray text-sm text-center p-4',
        ratio,
        className,
      )}
    >
      {label}
    </div>
  )
}

function SerifBody({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('font-serif text-lg leading-relaxed', className)}>{children}</p>
}

export default function DesignDiagnosticPage() {
  return (
    <div>
      {/* Hero — oversized orange wordmark on white */}
      <Reveal style="slide-up" duration={0.5}>
        <section className="max-width max-width-md content-padding mx-auto pt-[calc(var(--spacing-header-height)+3rem)] pb-8">
          <p className="font-sans text-lg mb-1">GoInvo</p>
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
                <PlaceholderImage
                  label="Image: two-senior-experts.jpg"
                  ratio="aspect-[4/3]"
                  className="mb-3"
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
                <PlaceholderImage
                  label="Image: tangible-tactical-design.jpg"
                  ratio="aspect-[4/3]"
                  className="mb-3"
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
      </article>

      {/* Closing statement — large orange (outside the article so the
          `.case-study-content p` gray override doesn't apply) */}
      <section className="max-width max-width-md content-padding mx-auto py-16">
        <Reveal style="slide-up">
          <p className="display-closing m-0">Building the wrong software is expensive.</p>
          <p className="display-closing mt-10 mb-0">
            Let&rsquo;s find the right product before you build it.
          </p>
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
