import type { Metadata } from 'next'
import { ProblemCard } from '@/components/vision/ProblemCard'
import { Divider } from '@/components/ui/Divider'
import { Author } from '@/components/ui/Author'
import { AboutGoInvo } from '@/components/ui/AboutGoInvo'
import problems from '@/data/vision/problems.json'
import { cloudfrontImage } from '@/lib/utils'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'
import { References } from '@/components/ui/References'
import refs from '@/data/vision/us-healthcare-problems/references.json'

export const metadata: Metadata = {
  title: 'US Healthcare Problems',
  description:
    'A visual list of the biggest problems in US healthcare, ranked by deaths, people impacted, and dollars spent.',
}

export default function USHealthcareProblemsPage() {
  return (
    <div>
      <SetCaseStudyHero image={cloudfrontImage('/images/features/us-healthcare-problems/us-healthcare-problems-hero3.jpg')} />

      {/* Intro */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h1 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light">
            US Healthcare Problems
          </h1>
          <p className="leading-relaxed mb-4">
            The United States is home to some of the best and worst care.
            The US Healthcare Problems list is the product of GoInvo&apos;s
            efforts to understand why these gaps exist and how they impact
            us. By drawing attention to the most prominent problems faced in
            our healthcare system, we can start to envision how it may be
            redesigned.
          </p>
          <p className="leading-relaxed mb-4">
            GoInvo has spent the last two months researching and breaking
            down these problems. The result is a list ranked based on
            several quantitative indicators, such as number of deaths,
            number of American people impacted, dollars spent or lost, and
            number of related problems. The interconnected nature of the US
            healthcare system makes it extremely challenging to separate
            these problems. We have coupled analytical skills and interest
            in health policy to bring to light this complex web of menacing
            realities. Unsurprisingly, all problems can be attributed to the
            fee-for-service system in some way.
          </p>
          <p className="leading-relaxed mb-4">
            We encourage you to be appalled by these statistics... and then
            do something about it.
          </p>
          <p className="leading-relaxed mb-4">
            Rally your friends (virtually), pick a problem, and dive in. Use
            the &ldquo;What&apos;s being done&rdquo; column in Airtable to evaluate current
            efforts and potentially join them. Copy over our Airtable and
            continue researching, adding metrics, and brainstorming
            solutions. Create an interesting data viz. However you choose to
            get started, this is an opportunity to understand healthcare&apos;s
            complexity and contribute to the efforts of improvement.
          </p>

          <Divider />

          {/* Problem cards */}
          {problems.map((problem, i) => (
            <ProblemCard
              key={problem.id}
              number={i + 1}
              title={problem.title}
              description={problem.description}
              deaths={problem.deaths || undefined}
              peopleImpacted={problem.peopleImpacted || undefined}
              spending={problem.spending || undefined}
              references={problem.references || undefined}
            />
          ))}
        </div>
      </section>

      {/* Feedback + About */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h2 className="font-serif text-[1.5rem] leading-[2.125rem] font-light text-center mb-2 mt-8">
            We&apos;d Like Your Feedback
          </h2>
          <p className="text-gray mb-4">
            We&apos;ve highlighted the top problems related to healthcare in the
            US. We&apos;d like to acknowledge that some of the problems you may
            expect are not present; this may be due to ongoing research by
            our team or inconclusive data. Racial inequities in healthcare
            and medical bill errors are two prominent issues that are at the
            top of our radar. Where data is available, we&apos;ve listed
            quantitative metrics supporting the severity of each problem. We
            encourage you to explore the list and references, and send your
            feedback on this draft to{' '}
            <a href="mailto:hello@goinvo.com">hello@goinvo.com</a>.
          </p>
          <p className="text-gray mb-4">
            Licensed under Creative Commons Attribution 4.0 license.
          </p>

          <AboutGoInvo />
        </div>
      </section>

      {/* Methodology */}
      <section className="bg-blue text-white py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <div id="methodology">
            <h2 className="font-serif text-[2.25rem] leading-[2.625rem] font-light text-center">
              Methodology
            </h2>

            <h3 className="header-md mt-8 mb-2 !text-white/70">
              v3 - 1.Apr.2021
            </h3>
            <p className="text-white/80 mb-4">
              The list has been expanded to include the top 50 US healthcare
              problems. We have started linking resources to organizations
              that are tackling these problems, and are exploring an API
              integration for Airtable so the list automatically updates as
              we make changes.
            </p>

            <h3 className="header-md mt-8 mb-2 !text-white/70">
              v2 - 17.Feb.2021
            </h3>
            <p className="text-white/80 mb-4">
              The list has been expanded to include the top 40 US healthcare
              problems. We have updated the ranking algorithm to consider a
              weighted average of each of the quantitative metrics.
            </p>
            <p className="text-white/80 text-sm mb-4 font-mono break-all">
              =0.25*(deaths/max(deaths))+0.25*(spending/max(spending))+0.25*(peopleimpacted/max(peopleimpacted))+0.25*(relatedprobs/max(relatedprobs))
            </p>
            <p className="text-white/80 mb-4">
              The equal (0.25) weighting may be adjusted over time with
              supporting literature.
            </p>
            <p className="text-white/80 mb-4">
              Stay tuned for V03 where we will include a visual
              representation of the connectedness of these problems, and
              showcase the current status of each problem being addressed.
            </p>

            <h3 className="header-md mt-8 mb-2 !text-white/70">
              v1 - 11.Feb.2021
            </h3>
            <p className="text-white/80 mb-4">
              The US Healthcare Problems list began as a google spreadsheet
              research effort, with sources including &ldquo;The Long Fix&rdquo; by
              Vivian Lee, CDC, and CMS. Our team aimed to pool relevant
              quantitative and anecdotal information for each outlined
              problem, making it possible to start to prioritize what needs
              addressing. Ideally, the move away from a fee-for-service
              system and towards a value-based approach would alleviate some
              of this burden.
            </p>
            <p className="text-white/80 mb-4">
              Fee-for-service: payment is dependent on the quantity of care
            </p>
            <p className="text-white/80 mb-4">
              Value-based: payment is dependent on the quality of care
            </p>
            <p className="text-white/80">
              The initial ranking is based on the quantitative data as well
              as the prevalence of the problem as explained in research.
            </p>
          </div>
        </div>

        {/* Airtable embed */}
        <div className="mt-8">
          <iframe
            src="https://airtable.com/embed/shrAt658WwPvlLJZw?backgroundColor=gray&viewControls=on"
            className="w-full border-0"
            style={{ height: 600 }}
            title="Airtable Top Healthcare Problems"
          />
        </div>
      </section>

      {/* Authors */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h2 className="font-serif text-[2.25rem] leading-[2.625rem] font-light text-center">
            Authors
          </h2>
          <Author name="Hannah Sennik" company="GoInvo" />
          <Author name="Juhan Sonin" company="GoInvo, MIT" />
          <Author name="Eric Benoit" company="GoInvo" />

          <h3 className="header-md mt-8 mb-3">Additional Contributors</h3>
          <p className="text-gray">
            Brad Dumke
            <br />
            Megan Janas
            <br />
            Susan Woods, MD
          </p>
        </div>
      </section>

      {/* References */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <References items={refs} />
        </div>
      </section>

      {/* Newsletter */}
      <section className="bg-gray-lightest py-8">
        <div className="max-width max-width-md content-padding mx-auto">
          <div className="bg-white shadow-card py-6 px-4 md:px-8">
            <NewsletterForm />
          </div>
        </div>
      </section>
    </div>
  )
}
