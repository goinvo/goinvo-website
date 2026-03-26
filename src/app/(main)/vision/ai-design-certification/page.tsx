import type { Metadata } from 'next'
import Image from 'next/image'
import { cloudfrontImage } from '@/lib/utils'
import { Author } from '@/components/ui/Author'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'

export const metadata: Metadata = {
  title: 'Human-Assisted AI Design Certification for Healthcare',
  description:
    'What passes and what fails is defined by a shared standard: safety, data integrity, regulatory fit, usability, language, bias, and how the flow works together. This is the certifiable surface layer.',
}

const schemaItems = [
  { title: 'SAFETY', desc: 'No diagnosis, clear uncertainty, calm tone, false-positive control' },
  { title: 'BIAS', desc: 'Works across age, sex, medications, and baseline variation' },
  { title: 'ACCESSIBILITY', desc: 'Plain language, readable, screen-reader safe for clinician and patient' },
  { title: 'PROVENANCE', desc: 'Users can see what data drove the insight' },
  { title: 'REGULATORY FIT', desc: 'Wellness guidance vs. medical advice — clearly scoped' },
  { title: 'SCOPE OF PRACTICE', desc: 'What the software may and may not assert' },
  { title: 'USABILITY', desc: 'Actionable, not alarming. Clinician and patient readable rationale' },
  { title: 'HUMAN ESCALATION', desc: 'When and how a clinician must intervene' },
]

const certPrinciples = [
  {
    title: 'Certify outputs, not models',
    desc: 'Certification attaches to a specific artifact version (screen, flow, copy, visual), its intended use, and its risk profile — not to the AI system that produced it.',
  },
  {
    title: 'Human-in-the-loop tuning',
    desc: 'Domain experts — hello Juhan and Goinvo Design — adjust and validate AI outputs; their changes and rationale are captured as structured signals that improve future generations and reviews.',
  },
  {
    title: 'Verifiable certification',
    desc: 'Issue a versioned, auditable certificate bound to an artifact hash, rubric version, reviewer, scope, and expiration. Clear for procurement, legal, and regulators.',
  },
  {
    title: 'Workflow-native integration',
    desc: '"Request certification" lives where work happens: GitHub PRs, Figma, design systems, CMSs. Certification as a button, not a process.',
  },
  {
    title: 'Risk-based gates',
    desc: 'Hard pass/fail thresholds scale with risk (e.g., marketing site vs clinical intake). Higher risk = stricter gates, named reviewers, shorter cert lifetimes.',
  },
  {
    title: 'Drift and change detection',
    desc: 'Any meaningful artifact change invalidates the cert and triggers re-review, which can prevent silent regression after approval.',
  },
  {
    title: 'Public signal, private audit trail',
    desc: (
      <>
        A simple badge teams can show externally, backed by a detailed internal
        record that stands up to scrutiny.{' '}
        <strong>Example:</strong> Project Crucible that measured EHR vendor
        compliance with FHIR.
      </>
    ),
  },
]

const nonNegotiableChecks = [
  'Safety',
  'Scope of Practice',
  'Bias',
  'Accessibility',
  'Data provenance',
  'Regulatory fit',
  'Usability',
  'Human escalation',
]

export default function AIDesignCertificationPage() {
  return (
    <div>
      <SetCaseStudyHero image={cloudfrontImage('/images/features/ai-design-certification/ai-design-certification-hero.jpg')} />

      {/* Content */}
      <div className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h1 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light mb-6">
            Human-Assisted AI Design Certification for Healthcare
          </h1>

          {/* What is AI design certification? */}
          <h2 className="font-serif text-2xl mt-8 mb-4">
            What is AI design certification?
          </h2>
          <p className="leading-relaxed mb-4">
            We certify outputs: discrete, versioned, viewable artifacts —
            screens, flows, diagrams, data visualizations. We are not certifying
            that &quot;this AI is good,&quot; but that &quot;this specific artifact is fit for
            purpose under these conditions.&quot;
          </p>
          <p className="leading-relaxed mb-4">
            What passes and what fails is defined by a shared standard: safety,
            data integrity, regulatory fit, usability, language, bias, and how
            the flow works together. This is the certifiable surface layer.
          </p>
          <p className="bg-[#faf6f4] border-l-4 border-primary my-4 py-4 pr-4 pl-5 leading-relaxed">
            The key distinction: Certification attaches to a specific artifact
            version and its intended use — not to the AI system that produced
            it. A screen, a flow, a piece of copy. Not a model.
          </p>
          <div className="lg:w-1/2 mt-8 mb-2">
            <a
              href="mailto:hello@goinvo.com?subject=Certify%20Health%20AI"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center border border-[#ffb992] text-primary no-underline uppercase tracking-[2px] text-[15px] font-semibold leading-relaxed py-1.5 px-4 hover:bg-[#fff6f1] transition-colors"
            >
              Certify Your Health AI Today
            </a>
          </div>

          {/* Product vision */}
          <h2 className="font-serif text-2xl mt-8 mb-4">
            Product vision
          </h2>
          <p className="leading-relaxed mb-4">
            We certify AI-generated design outputs — screens, flows, copy, and
            visuals — through non-negotiable human review for safety,
            accessibility, bias, provenance, and regulatory fit. The result is a
            trusted design health layer that turns fast AI output into
            production-ready work teams can ship, defend, and buy.
          </p>
          <p className="leading-relaxed mb-4">
            That requires four things: a shared standard, human judgment at the
            right moment, verifiable proof, and tight integration into existing
            workflows.
          </p>

          {/* Design Health Schema */}
          <div className="mt-8">
            <h3 className="font-sans flex items-start gap-2 -ml-5 text-base font-semibold leading-[1.1875rem] mb-2">
              <span className="text-primary text-xs leading-[1.5] shrink-0">&#9670;</span>
              Design Health Schema
            </h3>
            <p className="leading-relaxed mb-4">
              A machine-readable rule set (YAML/JSON) defining the non-negotiables:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              {schemaItems.map((item) => (
                <div
                  key={item.title}
                  className="bg-white border border-[#e4e3e3] rounded-[6px] p-4"
                >
                  <strong className="block mb-2 font-sans font-bold">{item.title}</strong>
                  <p className="text-[0.9375rem] leading-relaxed m-0">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Certification Principles */}
          {certPrinciples.map((principle) => (
            <div key={principle.title} className="mt-8">
              <h3 className="font-sans flex items-start gap-2 -ml-5 text-base font-semibold leading-[1.1875rem] mb-2">
                <span className="text-primary text-xs leading-[1.5] shrink-0">&#9670;</span>
                {principle.title}
              </h3>
              <p className="leading-relaxed m-0">{principle.desc}</p>
            </div>
          ))}

          {/* Why it matters now */}
          <h2 className="font-serif text-2xl mt-8 mb-4">
            Why it matters now
          </h2>
          <p className="leading-relaxed mb-4">
            AI tools are generating healthcare UX at unprecedented speed. Cursor,
            Claude, and similar systems can produce working screens in minutes.
            But speed without accountability is dangerous in healthcare — where a
            single poorly-worded insight could prompt a patient to ignore symptoms
            that need clinical attention.
          </p>
          <p className="leading-relaxed mb-4">
            Existing review processes weren&apos;t designed for artifact-level AI
            output. They assume a human designer made intentional choices about
            language, logic, and display. When AI produces the artifact, those
            assumptions break down. Certification closes that gap.
          </p>

          {/* Real-world example: Apple Health */}
          <h2 className="font-serif text-2xl mt-8 mb-4">
            Real-world example: Apple Health
          </h2>
          <p className="leading-relaxed mb-4">
            Using Apple Health as a concrete summary.
          </p>

          {/* 1. What the AI does */}
          <h2 className="font-sans text-[15px] leading-[1.375rem] font-semibold uppercase tracking-[2px] text-primary mt-8 mb-[1.625rem] md:-ml-6">
            1. What the AI does
          </h2>
          <p className="leading-relaxed mb-4">
            The app generates short health insight cards from your data (sleep,
            heart rate, activity). It&apos;s making clinical guidance from patient
            data.
          </p>
          <p className="leading-relaxed mb-4">
            Example: &quot;Your resting heart rate is higher this week and your sleep
            is down. Consider resting today.&quot;
          </p>
          <p className="leading-relaxed mb-4">
            This is copy + logic + UI, not &quot;the model.&quot; And, this is medical
            advice delivered by software.
          </p>

          {/* 2. What gets certified */}
          <h2 className="font-sans text-[15px] leading-[1.375rem] font-semibold uppercase tracking-[2px] text-primary mt-8 mb-[1.625rem] md:-ml-6">
            2. What gets certified
          </h2>
          <p className="leading-relaxed mb-4">
            Before shipping, the team submits the actual outputs:
          </p>
          <ul className="list-disc list-outside pl-6 mb-[1.625rem]">
            <li className="leading-[1.5rem] py-[0.2rem]">The text users will read</li>
            <li className="leading-[1.5rem] py-[0.2rem]">The rules that trigger it</li>
            <li className="leading-[1.5rem] py-[0.2rem]">The data sources used</li>
            <li className="leading-[1.5rem] py-[0.2rem]">How it&apos;s shown (color, urgency, notifications)</li>
          </ul>
          <p className="leading-relaxed mb-4">
            In this case, it&apos;s the medical artifact being approved.
          </p>

          {/* 3. Non-negotiable checks */}
          <h2 className="font-sans text-[15px] leading-[1.375rem] font-semibold uppercase tracking-[2px] text-primary mt-8 mb-[1.625rem] md:-ml-6">
            3. Non-negotiable checks
          </h2>
          <p className="leading-relaxed mb-4">
            Each output is reviewed against a standard schema:
          </p>
          <ul className="list-disc list-outside pl-6 mb-[1.625rem]">
            {nonNegotiableChecks.map((check) => (
              <li key={check} className="leading-[1.5rem] py-[0.2rem]">{check}</li>
            ))}
          </ul>

          {/* 4. Human review catches problems */}
          <h2 className="font-sans text-[15px] leading-[1.375rem] font-semibold uppercase tracking-[2px] text-primary mt-8 mb-[1.625rem] md:-ml-6">
            4. Human review catches problems
          </h2>

          {/* REJECTED review card */}
          <div className="rounded-[10px] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.12)] my-6 md:-ml-5">
            <div className="bg-[#363636] text-white flex items-center gap-2 text-[0.9375rem] px-5 py-4">
              <span className="w-2 h-2 rounded-full bg-[#d62e17] shrink-0" />
              Review result — cardiac insight v1.2
            </div>
            <div className="bg-white px-5 py-5">
              <span className="inline-block text-[#d62e17] bg-[#fdeaea] text-sm font-semibold uppercase rounded-full px-3 py-1 mb-4">
                Rejected
              </span>
              <p className="font-serif italic text-[1.5rem] leading-[1.35] text-[#1d1b1a] mb-3">
                &quot;This suggests early atrial fibrillation.&quot;
              </p>
              <p className="text-[#787473] text-sm font-semibold mb-1">
                Why it fails
              </p>
              <p className="text-[#8c8887] text-sm m-0">
                Diagnostic language. High regulatory and patient-anxiety risk.
              </p>
            </div>
          </div>

          <p className="leading-relaxed mb-4">
            If we&apos;re in the wellness world, this must be rewritten to a safe,
            non-diagnostic version before approval. If we&apos;re in the medical
            world, we&apos;ll need to:
          </p>
          <ul className="list-disc list-outside pl-6 mb-[1.625rem]">
            <li className="leading-[1.5rem] py-[0.2rem]">Narrow scope</li>
            <li className="leading-[1.5rem] py-[0.2rem]">Add uncertainty</li>
            <li className="leading-[1.5rem] py-[0.2rem]">Trigger clinical follow-up — not just self-action</li>
          </ul>

          {/* 5. What "Certified" means */}
          <h2 className="font-sans text-[15px] leading-[1.375rem] font-semibold uppercase tracking-[2px] text-primary mt-8 mb-[1.625rem] md:-ml-6">
            5. What &quot;Certified&quot; means
          </h2>
          <p className="leading-relaxed mb-4">
            Approval issues a verifiable medical certificate tied to:
          </p>
          <ul className="list-disc list-outside pl-6 mb-[1.625rem]">
            <li className="leading-[1.5rem] py-[0.2rem]">The exact wording</li>
            <li className="leading-[1.5rem] py-[0.2rem]">The logic used</li>
            <li className="leading-[1.5rem] py-[0.2rem]">The UI shown</li>
            <li className="leading-[1.5rem] py-[0.2rem]">The regulatory claim made</li>
          </ul>
          <p className="leading-relaxed mb-4">
            Once approved, the insight gets a verifiable certificate tied to that
            exact copy, logic, and UI.
          </p>
          <ul className="list-disc list-outside pl-6 mb-[1.625rem]">
            <li className="leading-[1.5rem] py-[0.2rem]">It ships with the app</li>
            <li className="leading-[1.5rem] py-[0.2rem]">It&apos;s auditable later</li>
            <li className="leading-[1.5rem] py-[0.2rem]">
              If something goes wrong, you know what was approved and why
            </li>
          </ul>

          {/* 6. What approval looks like */}
          <h2 className="font-sans text-[15px] leading-[1.375rem] font-semibold uppercase tracking-[2px] text-primary mt-8 mb-[1.625rem] md:-ml-6">
            6. What approval looks like
          </h2>

          {/* CERTIFIED review card */}
          <div className="rounded-[10px] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.12)] my-6 md:-ml-5">
            <div className="bg-[#363636] text-white flex items-center gap-2 text-[0.9375rem] px-5 py-4">
              <span className="w-2 h-2 rounded-full bg-[#64dd17] shrink-0" />
              Review result — cardiac insight v1.5
            </div>
            <div className="bg-white px-5 py-5">
              <span className="inline-block text-[#00a000] bg-[#e0ffef] text-sm font-semibold uppercase rounded-full px-3 py-1 mb-4">
                Certified
              </span>
              <p className="font-serif italic text-[1.5rem] leading-[1.35] text-[#1d1b1a] mb-3">
                &quot;Your resting heart rate is higher this week and your sleep is
                down. Consider resting today.&quot;
              </p>
              <p className="text-[#8c8887] text-sm m-0">
                Non-diagnostic. Actionable. Calm. Wellness scope confirmed. Data
                provenance tagged to Apple Watch HR sensor + sleep algorithm v3.1.
                Accessible at Grade 7 reading level.
              </p>
            </div>
          </div>

          {/* Audit trail */}
          <div className="flex flex-wrap mt-8">
            <div className="w-full lg:w-1/2">
              <Image
                src={cloudfrontImage(
                  '/images/features/ai-design-certification/certified-example-hand.jpg'
                )}
                alt="Certified example"
                width={600}
                height={400}
                className="w-full h-auto rounded"
              />
            </div>
            <div className="w-full lg:w-1/2 pt-8 lg:pt-0 lg:pl-12">
              <p className="leading-relaxed">
                Any meaningful artifact change
                <br />
                invalidates the certificate
                <br />
                and triggers re-review,
                <br />
                preventing silent regression after approval.
                <br />
                This is not a one-time stamp
                <br />
                — <strong>it is a living audit trail.</strong>
              </p>
            </div>
          </div>

          {/* 7. The point */}
          <h2 className="font-sans text-[15px] leading-[1.375rem] font-semibold uppercase tracking-[2px] text-primary mt-8 mb-[1.625rem] md:-ml-6">
            7. The point
          </h2>
          <p className="leading-relaxed mb-4">
            Treat AI outputs as the medical devices at the UI layer.
            <br />
            You&apos;re not trusting an AI model.
            <br />
            You&apos;re certifying the health insight itself,
            <br />
            the thing a human actually sees,
            <br />
            so teams can move fast and stay safe.
          </p>

          {/* How it works in your workflow */}
          <h2 className="font-serif text-2xl mt-8 mb-4">
            How it works in your workflow
          </h2>
          <p className="leading-relaxed mb-4">
            Certification lives where work happens. A &quot;Request Certification&quot;
            button embedded in GitHub pull requests, Figma, design systems, and
            CMSs. Certification as a button, not a process.
          </p>
          <p className="leading-relaxed mb-4">
            Risk-based gates scale thresholds with context: a marketing site and
            a clinical intake form are not the same artifact. Higher risk means
            stricter gates, named reviewers, and shorter certificate lifetimes.
          </p>
          <p className="bg-[#faf6f4] border-l-4 border-primary my-4 py-4 pr-4 pl-5 leading-relaxed">
            Landing zone:{' '}
            <a
              href="https://github.com/goinvo/AIDesignCertification"
              target="_blank"
              rel="noopener noreferrer"
            >
              github.com/goinvo/AIDesignCertification
            </a>{' '}
            — Open source license: Apache 2.0
          </p>

          {/* CTA */}
          <h2 className="font-serif text-2xl mt-12 mb-4">
            We&apos;re building this in the open:
          </h2>
          <p className="leading-relaxed mb-4">
            If you&apos;ve got a real or prototype healthcare product, let&apos;s together
            run it through the cert so we can pressure-test it on reality.
          </p>
          <div className="flex flex-wrap mb-4">
            <div className="w-full lg:w-1/2 lg:pr-4">
              <a
                href="mailto:hello@goinvo.com?subject=Certify%20Health%20AI"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center border border-[#ffb992] text-primary no-underline uppercase tracking-[2px] text-[15px] font-semibold leading-relaxed py-1.5 px-4 mt-8 mb-2 hover:bg-[#fff6f1] transition-colors"
              >
                Certify Your Health AI Today
              </a>
            </div>
            <div className="w-full lg:w-1/2 lg:pr-4">
              <a
                href="tel:617-504-3390"
                className="block w-full text-center border border-[#ffb992] text-primary no-underline uppercase tracking-[2px] text-[15px] font-semibold leading-relaxed py-1.5 px-4 mt-8 mb-2 hover:bg-[#fff6f1] transition-colors"
              >
                Call Juhan @ 617-504-3390
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Authors */}
      <div className="py-8">
        <div className="max-width max-width-md content-padding mx-auto">
          <h2 className="font-serif text-2xl mt-8 mb-4">
            Authors
          </h2>
          <Author name="Chloe Ma" company="GoInvo" />
          <Author name="Juhan Sonin" company="GoInvo" />

          <h3 className="header-md mt-8 mb-3">Contributors</h3>
          <Author name="Eric Benoit" company="GoInvo" />

          <h3 className="header-md mt-8 mb-3">
            Special thanks to...
          </h3>
          <p className="leading-relaxed">
            ...
            <a
              href="https://www.linkedin.com/in/mark-begale-7ab25814/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Mark Begale
            </a>
            {' '}and{' '}
            <a
              href="https://www.linkedin.com/in/venus-wong-phd-bcba-199b8994/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Venus Wong
            </a>
            {' '}for gently tapping the AI Certification idea into our skulls, and
            to Venus Wong for volunteering as the brave first test subject.
            They&apos;re both continuing to poke holes in it... to make it better.
          </p>
        </div>
      </div>

      {/* Newsletter */}
      <section className="bg-gray-lightest py-8">
        <div className="max-width max-width-md content-padding mx-auto">
          <div className="bg-white shadow-card px-10 py-4">
            <NewsletterForm />
          </div>
        </div>
      </section>
    </div>
  )
}
