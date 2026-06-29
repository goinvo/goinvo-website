import type { Metadata } from 'next'
import Link from 'next/link'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'
import { Reveal } from '@/components/ui/Reveal'
import { Video } from '@/components/ui/Video'
import { CalendlyEmbed } from '@/components/forms/CalendlyEmbed'
import { ContactFormEmbed } from '@/components/forms/ContactFormEmbed'
import { cloudfrontImage } from '@/lib/utils'

export const metadata: Metadata = {
  alternates: { canonical: '/services/design-diagnostic' },
  title: 'Design Diagnostic',
  description:
    'A focused design diagnostic from GoInvo — we assess your product, surface the highest-impact opportunities, and hand you a clear, prioritized plan to move forward.',
}

const heroImageUrl = cloudfrontImage('/images/services/hgraph-gold.jpg')

export default function DesignDiagnosticPage() {
  return (
    <div>
      <SetCaseStudyHero image={heroImageUrl} />

      <Reveal style="slide-up" duration={0.5}>
        <div className="max-width max-width-md content-padding mx-auto">
          <h1
            className="header-xl mt-8 mb-2"
            style={{ viewTransitionName: 'page-title' }}
          >
            Design Diagnostic
          </h1>
          <p className="text-gray mt-0 mb-8">Helping healthcare teams build the right product before they scale the wrong one.</p>
        </div>
      </Reveal>

      <article>
        <div className="max-width max-width-md content-padding mx-auto py-12 case-study-content">
          <h2 className="header-lg mt-8 mb-5">Why products flounder</h2>
          <p>
          Healthcare software rarely fails because of technology.
          </p>

          <p>It falters because:</p>
          
          <ul>
            <li>workflows don’t survive reality</li>
            <li>clinicians don’t trust it</li>
            <li>evidence is unclear</li>
            <li>patient burden is underestimated</li>
            <li>operational complexity overwhelms adoption</li>
            <li>products reflect org charts instead of care delivery</li>
          </ul> 

          <p>
            Most organizations discover these problems after launch.<br />
            We find them before your customers do.
          </p>

          <h2 className="header-lg mt-8 mb-5">We use design as a diagnostic tool.</h2>
          <p>
            A diagnostic is a low-risk first step. From there, we can partner on
            the full engagement — research, strategy, design, and delivery.{' '}
            <Link href="/services">Explore all of our services</Link>.
          </p>

          <h3 className="header-md mt-8 mb-5">What we do</h3>

          <p>
            A fast clinical product intervention team for high-risk healthcare software.
          </p>
          <p>
            In 4-8 weeks, we identify risks most likely to slow adoption, undermine trust, frustrate clinicians, confuse patients, and derail product strategy.
          </p>
          <p>
            Those risks usually fall into 5 areas:
          </p>

          <ul>
            <li>Clinical</li>
            <li>Operational</li>
            <li>Workflow</li>
            <li>Trust</li>
            <li>Product Strategy</li>
          </ul>

          <p>We then rapidly redesign the highest-risk areas and establish a clear product direction.</p>

          <h3 className="header-md mt-8 mb-5">Why GoInvo?</h3>

          <p>We’ve spent two decades designing healthcare software.</p>

<p>We see how products succeed. And why they fail.</p>

<p>We use design to make those patterns visible.</p>

<p>Because every sketch, workflow, and prototype reveals something about:</p>

<ul>
  <li>clinical trust</li>
  <li>patient behavior</li>
  <li>operational complexity</li>
  <li>Evidence</li>
  <li>product strategy</li>
</ul>

<p>Our prototypes are decision-making tools.</p>

<p>We’ve worked across</p>

<ul>
  <li>federal agencies</li>
  <li>providers</li>
  <li>clinical systems</li>
  <li>research platforms</li>
  <li>patient-facing services</li>
  <li>Public health initiatives</li>
  <li>operational infrastructure</li>
  <li>enterprise software</li>
  <li>healthcare standards and interoperability.</li>
</ul>

<p>We understand how healthcare software behaves once it meets:</p>
<ul>
  <li>Clinicians</li>
  <li>Patients</li>
  <li>Operations teams</li>
  <li>Legal review</li>
  <li>Real-world constraints</li>
</ul>

<p>Few teams have seen that breadth of healthcare.</p>

        <div className="mt-8 mb-8">
          <a
            href="https://docs.google.com/document/d/1DHXWSQU35hzXn8oT21jAZhdVmjEhvbcpjD9_oT39lMM/edit?tab=t.0"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-link underline hover:no-underline"
          >
            WHITE PAPER on GOINVO RED TEAM
          </a>
        </div>
   
        <h3 className="header-md mt-8 mb-5">The Engagement</h3>

        <p>
          Phase 1
          <br />
          Reality Check
        </p>

<ul>
  <li>stakeholder interviews</li>
  <li>workflow review</li>
  <li>product teardown</li>
  <li>Operational + clinical review</li>
</ul>


  <p>
    Phase 2
    <br />
    Design to Learn
  </p>

<ul>
  <li>Rapid concept</li>
  <li>Alternative workflows</li>
  <li>Trust Models</li>
  <li>AI interaction concepts</li>
  <li>Evidence visualization</li>
  <li>Prototypes</li>
</ul>


<p>
  Phase 3
  <br />
  Design the Future
</p>

<ul>
  <li>Future-state product</li>
  <li>Product Blueprint</li>
  <li>Roadmap</li>
  <li>Prototype</li>
  <li>Leadership decisions</li>
</ul>

<p>
  Final
  <br />
  Product Blueprint
</p>

<p>The Product Blueprint captures everything we’ve learned through six weeks of designing, testing, and challenging your product.</p>

<p>A practical guide for building the right product, which includes:</p>
<ul>
  <li>Product thesis and vision</li>
  <li>Design Principles</li>
  <li>Future-state prototype: the future product, expressed through its most important workflows</li>
  <li>Reality map: where clinical, operational, regulatory, and adoption risks exist</li>
  <li>Product priorities: what to build, what to defer, and what to stop</li>
  <li>Opportunity map: the highest-leverage improvements for users and the business</li>
  <li>Scale assessment: what works today, what breaks as adoption grows</li>
  <li>Leadership decisions: key decisions leadership should make next</li>
</ul>

<h3 className="header-md mt-8 mb-5">What you won’t get.</h3>

<p>You won’t get a 200-page report.</p>

<p>You won’t get generic UX recommendations.</p>

<p>You won’t get another backlog.</p>

<p>You’ll get a clear product direction, a working prototype, and the confidence to make your next product decisions.</p>

<p>Call us when…</p>

<ul>
  <li>Launch is 3–12 months away.</li>
  <li>Clinician adoption is uncertain.</li>
  <li>AI recommendations need to earn trust.</li>
  <li>Your product feels more complicated every sprint.</li>
  <li>Executives disagree on direction.</li>
  <li>Sales is promising features engineering can’t support.</li>
  <li>You have a working product, but you’re not convinced it’s the right one.</li>
</ul>

<h3 className="header-md mt-8 mb-5">Proof</h3>

<Video
  sources={[
    {
      src: '/videos/design-diagnostic/goinvo-design-diagnostic.mp4',
      format: 'mp4',
    },
  ]}
  autoPlay={false}
  controls
  className="mb-8"
/>

<p>
  AI Clinical Workflow, Orphic<br />
  Problem: Clinicians couldn’t understand AI recommendations.<br />
  Design Diagnostic: Redesigned evidence presentation and recommendation workflow.<br />
  Result: Shared product direction across clinical, engineering, and executive teams.
</p>


<p>AI Clinical Workflow, Orphic</p>
<p>Problem: Clinicians couldn’t understand AI recommendations.</p>
<p>Design Diagnostic: Redesigned evidence presentation and recommendation workflow.</p>
<p>Result: Shared product direction across clinical, engineering, and executive teams.</p>

<p>Software is cheap.</p>

<p>Building the wrong software is expensive.<br />
Let’s find the right product before you build the rest of it.</p>


        </div>
      </article>

      {/* Calendly */}
      <div className="max-width content-padding py-8 mb-8">
        <div className="max-width content-padding py-8">
          <h2
            className="font-serif text-[1.5rem] leading-[2.125rem] font-light text-center"
            id="calendly-open-office-hours"
            style={{ marginBottom: '-50px' }}
          >
            Choose a time to talk about your project.
          </h2>
          <CalendlyEmbed
            formLocation="design-diagnostic-page"
            formName="design_diagnostic_call"
          />
        </div>
      </div>

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
