import type { Metadata } from 'next'
import Image from 'next/image'
import { ProblemCard } from '@/components/vision/ProblemCard'
import { Divider } from '@/components/ui/Divider'
import problems from '@/data/vision/problems.json'
import { cloudfrontImage } from '@/lib/utils'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'

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
          <h1 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light">US Healthcare Problems</h1>
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

          <Divider />

          {/* Methodology */}
          <section id="references" className="mt-12">
            <h2 className="font-serif text-2xl mb-4">Methodology</h2>
            <p className="leading-relaxed mb-4">
              The US Healthcare Problems list is an ongoing open-source project.
              Problems are ranked by a composite score of deaths, people
              impacted, and spending. Data is updated periodically as new
              research and statistics become available.
            </p>
            <p className="leading-relaxed">
              <strong>Version 3</strong> &mdash; Updated with COVID-19 data,
              new problems, and revised rankings.
            </p>
          </section>
        </div>
      </section>

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
