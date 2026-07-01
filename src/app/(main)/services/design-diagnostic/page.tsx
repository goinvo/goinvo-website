import type { Metadata } from 'next'
import Image from 'next/image'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'
import { Reveal } from '@/components/ui/Reveal'
import { Video } from '@/components/ui/Video'
import { Quote } from '@/components/ui/Quote'
import { Divider } from '@/components/ui/Divider'
import { Button } from '@/components/ui/Button'
import { CalendlyEmbed } from '@/components/forms/CalendlyEmbed'
import { ContactFormEmbed } from '@/components/forms/ContactFormEmbed'
import { cloudfrontImage } from '@/lib/utils'

export const metadata: Metadata = {
  alternates: { canonical: '/services/design-diagnostic' },
  title: 'Design Diagnostic',
  description:
    'A focused design diagnostic from GoInvo — we assess your product, surface the highest-impact opportunities, and hand you a clear, prioritized plan to move forward.',
}

const heroImageUrl = '/images/services/hero-design-diagnostic.jpg'

// The six ways healthcare products quietly fail.
const failureModes = [
  'Workflows don’t survive reality',
  'Clinicians don’t trust it',
  'Evidence is unclear',
  'Patient burden is underestimated',
  'Operational complexity overwhelms adoption',
  'Products reflect org charts instead of care delivery',
]

// The five risk areas a diagnostic surfaces.
const riskAreas = [
  {
    title: 'Clinical',
    description: 'Does it fit how clinicians actually think, decide, and act?',
  },
  {
    title: 'Operational',
    description: 'Can your organization run it without drowning in complexity?',
  },
  {
    title: 'Workflow',
    description: 'Does it survive the messy reality of day-to-day care?',
  },
  {
    title: 'Trust',
    description: 'Will clinicians and patients believe what it tells them?',
  },
  {
    title: 'Product Strategy',
    description: 'Are you building the right product and not just building it right?',
  },
]

// The engagement, phase by phase. `intro` + `highlight` mark the final deliverable.
const phases = [
  {
    number: '1',
    title: 'Reality Check',
    items: [
      'Stakeholder interviews',
      'Workflow review',
      'Product teardown',
      'Operational + clinical review',
    ],
  },
  {
    number: '2',
    title: 'Design to Learn',
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
    number: '3',
    title: 'Design the Future',
    items: [
      'Future-state product',
      'Product Blueprint',
      'Roadmap',
      'Prototype',
      'Leadership decisions',
    ],
  },
  {
    number: 'Final',
    title: 'Product Blueprint',
    highlight: true,
    intro:
      'The Product Blueprint captures everything we’ve learned through six weeks of designing, testing, and challenging your product. A practical guide for building the right product, which includes:',
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

const workedAcross = [
  'Federal agencies',
  'Providers',
  'Clinical systems',
  'Research platforms',
  'Patient-facing services',
  'Public health initiatives',
  'Operational infrastructure',
  'Enterprise software',
  'Healthcare standards and interoperability',
]

const meets = [
  'Clinicians',
  'Patients',
  'Operations teams',
  'Legal review',
  'Real-world constraints',
]

const wontGet = [
  'You won’t get a 200-page report.',
  'You won’t get generic UX recommendations.',
  'You won’t get another backlog.',
]

const callUsWhen = [
  'Launch is 3–12 months away.',
  'Clinician adoption is uncertain.',
  'AI recommendations need to earn trust.',
  'Your product feels more complicated every sprint.',
  'Executives disagree on direction.',
  'Sales is promising features engineering can’t support.',
  'You have a working product, but you’re not convinced it’s the right one.',
]

// Add 3–5 example images here to populate the "What it looks like" gallery.
// Each: { image: '/images/services/design-diagnostic/<file>.jpg', title, caption }
// Paths resolve through cloudfrontImage(); the gallery section is hidden while this is empty.
const examples: { image: string; title: string; caption?: string }[] = []

export default function DesignDiagnosticPage() {
  return (
    <div>
      <SetCaseStudyHero image={heroImageUrl} />

      <Reveal style="slide-up" duration={0.5}>
        <div className="max-width max-width-md content-padding mx-auto">
          <h1 className="header-xl mt-8 mb-2">GoInvo Design Diagnostic</h1>
   
          <p className="text-gray mt-0 mb-8">
            Helping healthcare teams build the right product before they scale the
            wrong one.
          </p>
        </div>
      </Reveal>

      <article className="case-study-content design-diagnostic-content">
        {/* Why products flounder */}
        <section className="max-width max-width-md content-padding mx-auto py-12">
          <Reveal style="slide-up">
            <h2 className="header-lg mt-0 mb-0">Why products flounder</h2>
            <p>Healthcare software rarely fails because of technology.</p>
            <p>It falters because:</p>

            <ul className="list-none p-0 m-0 text-gray mb-4 space-y-2">
              {failureModes.map((mode) => (
                <li key={mode} className="relative mb-0">
                  <span
                    className="absolute -left-5 top-[0.78em] w-2 h-2 -translate-y-1/2 bg-[url('/images/bullet.svg')] bg-contain bg-center bg-no-repeat"
                    aria-hidden
                  />
                  {mode}
                </li>
              ))}
            </ul>
            <p>
              Most organizations discover these problems after launch.
              <br />
              We find them before your customers do.
            </p>
          </Reveal>
        </section>

        {/* We use design as a diagnostic tool / What we do */}
        <section className="w-screen relative left-1/2 -ml-[50vw] py-12">
          <div className="max-width max-width-md content-padding mx-auto case-study-content">
            <Reveal style="slide-up">
              <h2
            className="header-lg mt-0 mb-5"
            style={{ viewTransitionName: 'page-title' }}
          >
            <span className="sr-only">We use design as a diagnostic tool.</span>
            <picture>
              <source
                srcSet="/images/services/text-we-use-design-as-a-diagnostic-tool.png"
                type="image/png"
              />
              <img
                src="/images/services/text-we-use-design-as-a-diagnostic-tool.png"
                alt="We use design as a diagnostic tool."
                className="mx-auto max-w-full"
                loading="lazy"
              />
            </picture>
          </h2>
              <h3 className="header-md mb-3">What we do</h3>
              <p>
                A fast clinical product intervention team for high-risk healthcare
                software.
              </p>
              <p>
                In 4–8 weeks, we identify risks most likely to slow adoption,
                undermine trust, frustrate clinicians, confuse patients, and derail product strategy.
              </p>
              <p>
                Those risks usually fall into 5 areas:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
                {riskAreas.map((area) => (
                  <div
                    key={area.title}
                    className="bg-white shadow-card hover:shadow-card-hover transition-shadow duration-500 ease-out rounded-md p-5"
                  >
                    <h4 className="font-sans font-semibold text-base mb-0">
                      {area.title}
                    </h4>
                    <hr className="border-0 h-px w-full my-3 bg-gray-medium" />
                    <p className="text-gray text-md mb-0">{area.description}</p>
                  </div>
                ))}
              </div>
              <p className="mt-8 mb-0">
                We then rapidly redesign the highest-risk areas and establish a
                clear product direction.
              </p>
            </Reveal>
          </div>
        </section>

        {/* Why GoInvo? */}
        <section className="max-width max-width-md content-padding mx-auto py-12">
          <Reveal style="slide-up">
            <h2 className="header-lg mt-0 mb-5">Why GoInvo?</h2>
            <p>We’ve spent two decades designing healthcare software.</p>
            <p>We see how products succeed. And why they fail.</p>
            <p>We use design to make those patterns visible.</p>
            <p>
              Because every sketch, workflow, and prototype reveals something about
              clinical trust, patient behavior, operational complexity, evidence,
              and product strategy.
            </p>
            <p>Our prototypes are decision-making tools.</p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
              <div>
                <h4 className="font-sans font-semibold text-base mb-3">
                  We’ve worked across
                </h4>
                <ul className="ul text-gray mb-0">
                  {workedAcross.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-sans font-semibold text-base mb-3">
                  We understand how it behaves once it meets
                </h4>
                <ul className="ul text-gray mb-0">
                  {meets.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>

            <p className="!mt-4">Few teams have seen that breadth of healthcare.</p>

            <div className="mt-6">
              <Button
                href="https://docs.google.com/document/d/1DHXWSQU35hzXn8oT21jAZhdVmjEhvbcpjD9_oT39lMM/edit?tab=t.0"
                external
                variant="outline"
              >
                GoInvo Design Diagnostic White Paper
              </Button>
            </div>
          </Reveal>
        </section>

        {/* The Engagement */}
        <section className="w-screen relative left-1/2 -ml-[50vw] bg-blue-light py-12">
          <div className="max-width max-width-md content-padding mx-auto">
            <Reveal style="slide-up">
              <h2 className="header-lg mt-0 mb-8">The Engagement</h2>
            </Reveal>
            <div className="flex flex-col gap-8">
              {phases.map((phase, i) => (
                <Reveal
                  key={phase.title}
                  style="slide-up"
                  delay={Math.min(i * 0.05, 0.2)}
                >
                  <div
                    className={
                      phase.highlight
                        ? 'grid grid-cols-[auto_1fr] gap-6 bg-primary-lightest rounded-md p-6'
                        : 'grid grid-cols-[auto_1fr] gap-6'
                    }
                  >
                    <div
                      className={
                        phase.number === 'Final'
                          ? 'header-md text-primary pt-1'
                          : 'font-serif text-[2.25rem] leading-none text-primary'
                      }
                    >
                      {phase.number}
                    </div>
                    <div>
                      <h3 className="font-sans font-semibold text-base mt-0 mb-3">
                        {phase.title}
                      </h3>
                      {phase.intro && (
                        <p className="text-gray text-md mb-3">{phase.intro}</p>
                      )}
                      <ul className="ul text-gray mb-0">
                        {phase.items.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* What you won't get / Call us when */}
        <section className="max-width max-width-md content-padding mx-auto py-12">
          <Reveal style="slide-up">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="header-md mt-0 mb-5">What you won’t get</h3>
                <ul className="ul text-gray">
                  {wontGet.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="header-md mt-0 mb-5">Call us when…</h3>
                <ul className="ul text-gray mb-4">
                  {callUsWhen.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
              <p className="mb-0 text-gray">
                You’ll get a clear product direction, a working prototype, and the
                confidence to make your next product decisions.
              </p>
          </Reveal>
        </section>

        {/* Proof */}
        <section className="w-screen relative left-1/2 -ml-[50vw] py-12">
          <div className="max-width max-width-md content-padding mx-auto">
            <Reveal style="slide-up">
              <h2 className="header-lg mt-0 mb-5">Proof</h2>
              <Video
                sources={[
                  {
                    src: 'https://cdn.sanity.io/files/a1wsimxr/production/2d7b424ab7ac15374b7d82046e47d5651a74618b.mp4',
                    format: 'mp4',
                  },
                ]}
                autoPlay={false}
                controls
                className="mb-8"
              />
              <h3 className="font-sans font-semibold text-base mb-3">
                AI Clinical Workflow
              </h3>
              <ul className="list-none p-0 m-0 text-gray space-y-2 mb-4">
                <li>
                  <strong className="text-black">Problem:</strong> Clinicians
                  couldn’t understand AI recommendations.
                </li>
                <li>
                  <strong className="text-black">Design Diagnostic:</strong>{' '}
                  Redesigned evidence presentation and recommendation workflow.
                </li>
                <li>
                  <strong className="text-black">Result:</strong> Shared product
                  direction across clinical, engineering, and executive teams.
                </li>
              </ul>
              <Divider />
              <p className="mt-8">Software is cheap.</p>
              <p className="mt-8">Building the wrong software is expensive.</p>
              <p className="mt-8">
                Let's find the right product before you build the rest of it.
              </p>
            </Reveal>
          </div>
        </section>

        {/* What it looks like — example gallery (populate the `examples` array above) */}
        {examples.length > 0 && (
          <section className="max-width content-padding mx-auto py-12">
            <Reveal style="slide-up">
              <h2 className="header-lg mt-0 mb-8 text-center">What it looks like</h2>
            </Reveal>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {examples.map((example, i) => (
                <Reveal
                  key={example.image}
                  style="slide-up"
                  delay={Math.min(i * 0.05, 0.3)}
                  className="h-full"
                >
                  <figure className="bg-white shadow-card hover:shadow-card-hover transition-shadow duration-500 ease-out rounded-md overflow-hidden h-full flex flex-col m-0">
                    <div className="relative h-[250px] overflow-hidden">
                      <Image
                        src={cloudfrontImage(example.image)}
                        alt={example.title}
                        fill
                        className="object-cover image--interactive"
                      />
                    </div>
                    <figcaption className="p-4">
                      <p className="font-sans font-semibold text-base mb-1">
                        {example.title}
                      </p>
                      {example.caption && (
                        <p className="text-gray text-md mb-0">{example.caption}</p>
                      )}
                    </figcaption>
                  </figure>
                </Reveal>
              ))}
            </div>
          </section>
        )}
      </article>

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
