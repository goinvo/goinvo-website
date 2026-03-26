import type { Metadata } from 'next'
import Image from 'next/image'
import { cloudfrontImage } from '@/lib/utils'
import { Divider } from '@/components/ui/Divider'
import { Author } from '@/components/ui/Author'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { PscaAlgorithms } from './PscaAlgorithms'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'

export const metadata: Metadata = {
  title: 'Primary Self Care Algorithms',
  description:
    'Primary self care algorithms are decision support tools for individuals to better understand their health and the steps needed to optimize their health status.',
}

export default function PrimarySelfCareAlgorithmsPage() {
  return (
    <div>
      <SetCaseStudyHero image={cloudfrontImage('/images/features/primary-self-care-algorithms/primary-self-care-algorithms-hero.jpg')} />

      {/* Content */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h1 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light">Primary Self Care Algorithms</h1>
          <h2 className="font-serif text-2xl mb-4">
            What is Primary Self Care?
          </h2>
          <p className="leading-relaxed mb-4">
            Primary self care (PSC) exists at the intersection of primary
            health care and self-care. With an emphasis on self-management,
            self-testing, and self-awareness, PSC enables individuals to
            understand and optimize their health status through self-care
            interventions. While some PSC methods invite collaboration with
            clinical providers and others are entirely independent of
            healthcare systems, all can be applied to improve health
            outcomes at various stages of life.
          </p>

          <h2 className="font-serif text-2xl mt-8 mb-4">
            Why Primary Self Care?
          </h2>
          <p className="leading-relaxed mb-4">
            According to The World Health Organization, there will be a
            shortage of 18 million physicians by 2030. Primary self care has
            the potential to fill this gap and reduce the burden on
            healthcare systems through better screening and prevention of
            diseases, all while providing more education on self-management
            of conditions. PSC empowers individuals to understand their
            health data and offers ways to effectively act on it. This leads
            to more engagement when patients interact with the healthcare
            system. Primary self care is also a way for individuals to
            personalize their care according to their needs and claim more
            decision making power in their health.
          </p>

          <h2 className="font-serif text-2xl mt-8 mb-4">
            What is a Primary Self Care Algorithm?
          </h2>
          <p className="leading-relaxed mb-4">
            Primary self care algorithms are decision support tools for
            individuals to better understand their health and the steps
            needed to optimize their health status. PSC algorithms include
            clinical decision support (CDS) tools, patient decision aids,
            health assessments, and screening and testing services.
          </p>

          <h2 className="font-serif text-2xl mt-8 mb-4">
            Why Does This Project Matter?
          </h2>
          <p className="leading-relaxed mb-4">
            Despite being at the core of self care interventions, primary
            self care has been inconsistently defined. In light of the
            growing number of at-home healthcare technologies and services,
            there is a &quot;pressing need for a clearer conceptualization of
            self care&quot; as well as what self-care is not. A publicly-available
            knowledge base of PSC algorithms can serve as an instrumental
            resource for patients, policy makers, and healthcare workers.
            This project will also reveal the current gaps in research and
            implementation of PSC models.
          </p>

          <Divider />

          <h2 className="font-serif text-2xl mt-8 mb-4">
            Top 10 Primary Self Care Algorithms
          </h2>
        </div>

        {/* Interactive Algorithm Section */}
        <PscaAlgorithms />

        {/* Airtable Embed */}
        <div className="max-width content-padding mx-auto my-12">
          <h2 className="font-serif text-2xl mb-4 max-width-md mx-auto">
            Full Algorithm Database
          </h2>
          <div className="max-w-[85%] mx-auto">
            <iframe
              src="https://airtable.com/embed/shrWdnWlNj0SIuUzl?backgroundColor=blue&viewControls=on"
              className="w-full border-0"
              style={{ height: 500 }}
              loading="lazy"
              title="Airtable Primary Self Care Algorithms"
            />
          </div>
        </div>

        {/* Life Stage Table */}
        <div className="max-width content-padding mx-auto my-12">
          <h2 className="font-serif text-2xl mb-4 max-width-md mx-auto">
            Application by Life Stage
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-medium">
                  <th className="text-left p-2 min-w-[150px]">Algorithm</th>
                  {['0-5', '6-12', '13-20', '21-30', '31-40', '41-50', '51-60', '61-70', '71-80', '81-90', '90+'].map(
                    (age) => (
                      <th key={age} className="p-2 text-center min-w-[55px]">
                        {age}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'Vaccine Decision Aids', ages: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
                  { name: 'Blood Pressure Monitoring', ages: [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
                  { name: 'At-Home Urinalysis', ages: [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
                  { name: 'Mental Health Assessments', ages: [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
                  { name: 'Vision Tests', ages: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
                  { name: 'Blood Glucose Monitoring', ages: [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1] },
                  { name: 'Breast Self-Exam', ages: [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0] },
                  { name: 'Birth Control Decision Aid', ages: [0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0] },
                  { name: 'Air Quality Monitor', ages: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
                  { name: 'Pulse Oximetry', ages: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
                ].map((row) => (
                  <tr key={row.name} className="border-b border-gray-light">
                    <td className="p-2 font-medium">{row.name}</td>
                    {row.ages.map((applicable, i) => (
                      <td key={i} className="p-2 text-center">
                        {applicable ? (
                          <span className="text-primary font-bold">&#10003;</span>
                        ) : null}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Methods */}
        <div className="bg-secondary/10 py-12">
          <div className="max-width max-width-md content-padding mx-auto">
            <h2 className="font-serif text-2xl mb-4">
              Methods: Decision Matrix
            </h2>
            <p className="leading-relaxed mb-4">
              We evaluated each algorithm against 8 criteria, weighted by
              importance to public health impact:
            </p>
            <div className="overflow-x-auto mb-8">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-medium">
                    <th className="text-left p-2">Criterion</th>
                    <th className="p-2 text-center">Weight</th>
                    <th className="text-left p-2">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { criterion: 'Audience', weight: 2, desc: 'Breadth of applicable population' },
                    { criterion: 'Effectiveness', weight: 4, desc: 'Clinical evidence of impact' },
                    { criterion: 'Validity & Reliability', weight: 4, desc: 'Accuracy and consistency of results' },
                    { criterion: 'Complexity', weight: 2, desc: 'Ease of use for non-clinical users' },
                    { criterion: 'Cost', weight: 3, desc: 'Financial accessibility' },
                    { criterion: 'Availability', weight: 1, desc: 'Market availability of tools' },
                    { criterion: 'Support', weight: 2, desc: 'Availability of guidance and education' },
                    { criterion: 'Licensing', weight: 2, desc: 'Open source or open access' },
                  ].map((row) => (
                    <tr key={row.criterion} className="border-b border-gray-light">
                      <td className="p-2 font-medium">{row.criterion}</td>
                      <td className="p-2 text-center">{row.weight}</td>
                      <td className="p-2 text-gray">{row.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 className="font-serif text-xl mt-8 mb-4">
              Weighted Rankings
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-medium">
                    <th className="text-left p-2">Rank</th>
                    <th className="text-left p-2">Algorithm</th>
                    <th className="p-2 text-center">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { rank: 1, name: 'Vaccine Decision Aids', score: 17 },
                    { rank: 2, name: 'Blood Pressure Monitoring', score: 16 },
                    { rank: 3, name: 'At-Home Urinalysis', score: 15 },
                    { rank: 4, name: 'Mental Health Assessments', score: 15 },
                    { rank: 5, name: 'Vision Tests', score: 11 },
                    { rank: 6, name: 'Blood Glucose Monitoring', score: 11 },
                    { rank: 7, name: 'Breast Self-Exam', score: 9 },
                    { rank: 8, name: 'Birth Control Decision Aid', score: 8 },
                    { rank: 9, name: 'Air Quality Monitor', score: 7 },
                    { rank: 10, name: 'Pulse Oximetry', score: -1 },
                  ].map((row) => (
                    <tr key={row.rank} className="border-b border-gray-light">
                      <td className="p-2">{row.rank}</td>
                      <td className="p-2 font-medium">{row.name}</td>
                      <td className="p-2 text-center">{row.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="max-width max-width-md content-padding mx-auto py-12">
          <h2 className="font-serif text-2xl mb-4">Next Steps</h2>
          <p className="leading-relaxed mb-4">
            Future iterations of the PSC Algorithms Project will include an
            even more comprehensive database and an updated ranking of the
            top algorithms. The decision matrix will also be expanded to
            include the applicability in global settings, compliance, error
            rates, and variability in implementation; there will be a more
            in-depth look at licensing information as well. Additionally,
            this project will inform the editing of Wikipedia&apos;s{' '}
            <a href="https://en.wikipedia.org/wiki/Self-care" className="text-primary underline">self-care</a>{' '}
            page, which does not currently distinguish between primary self
            care and self-care.
          </p>
          <p className="leading-relaxed mb-4">
            The ultimate purpose of the Primary Self Care Algorithms Project
            is to support:
          </p>
          <ol className="list-decimal pl-6 mb-4 leading-relaxed space-y-2">
            <li>
              <strong>Healthcare UX Designers</strong> creating intentional,
              patient-first tools and services.
            </li>
            <li>
              <strong>Providers</strong> tailoring medical care to patient
              needs.
            </li>
            <li>
              <strong>Patients</strong> seeking intuitive, value-adding
              tools as they take ownership over their health.
            </li>
          </ol>

          <Divider />

          <h2 className="font-serif text-2xl mt-8 mb-4">Authors</h2>
          <Author name="Arpna Ghanshani" company="GoInvo" />
          <Author name="Chloe Ma" company="GoInvo" />
          <Author name="Juhan Sonin" company="GoInvo" />

          <h3 className="font-serif text-xl mt-6 mb-3">Contributors</h3>
          <p className="text-gray">
            Samantha Wuu, Huahua Zhu, Eric Benoit, Craig McGinley
          </p>
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
