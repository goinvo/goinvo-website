import type { Metadata } from 'next'
import Image from 'next/image'
import { cloudfrontImage } from '@/lib/utils'
import { Divider } from '@/components/ui/Divider'
import { Author } from '@/components/ui/Author'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { PscaAlgorithms } from './PscaAlgorithms'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'
import { References } from '@/components/ui/References'
import refs from '@/data/vision/primary-self-care-algorithms/references.json'

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
          <h2 className="header-lg mb-4">
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
            outcomes at various stages of life<sup><a href="#references">1</a></sup>.
          </p>

          <h2 className="header-lg mt-8 mb-4">
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

          <h2 className="header-lg mt-8 mb-4">
            What is a Primary Self Care algorithm?
          </h2>
          <p className="leading-relaxed mb-4">
            Primary self care algorithms are decision support tools for
            individuals to better understand their health and the steps
            needed to optimize their health status. PSC algorithms include
            clinical decision support (CDS) tools, patient decision aids,
            health assessments, and screening and testing services.
          </p>

          <h2 className="header-lg mt-8 mb-4">
            Why does the PSC Algorithms Project matter?
          </h2>
          <p className="leading-relaxed mb-4">
            Despite being at the core of self care interventions, primary
            self care has been inconsistently defined. In light of the
            growing number of at-home healthcare technologies and services,
            there is a &quot;pressing need for a clearer conceptualization of
            self care&quot; as well as what self-care is not<sup><a href="#references">1</a></sup>. A publicly-available
            knowledge base of PSC algorithms can serve as an instrumental
            resource for patients, policy makers, and healthcare workers.
            This project will also reveal the current gaps in research and
            implementation of PSC models.
          </p>

          <Divider />

          <h1 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light mt-8">
            Top 10 Primary Self Care Algorithms
          </h1>
        </div>

        {/* Interactive Algorithm Section */}
        <PscaAlgorithms />

        {/* Life Stage Table */}
        <div className="max-width content-padding mx-auto my-12">
          <h1 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light mb-4 max-width-md mx-auto">
            Application of Primary Self Care Across Life
          </h1>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-medium">
                  <th className="text-left p-2 min-w-[150px]">Algorithm</th>
                  {['0-5 years old', '6-12', '13-20', '21-30', '31-40', '41-50', '51-60', '61-70', '71-80', '81-90', '90+'].map(
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
                  { name: 'Vaccinations', ages: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
                  { name: 'Blood Pressure', ages: [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1] },
                  { name: 'Urinalysis', ages: [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1] },
                  { name: 'Mental Health', ages: [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
                  { name: 'Vision Test', ages: [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
                  { name: 'Glucose Monitoring', ages: [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1] },
                  { name: 'Breast Self-Exam', ages: [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1] },
                  { name: 'Air Quality Monitor', ages: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
                  { name: 'Pulse Oximetry', ages: [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1] },
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

        {/* Airtable Embed */}
        <div className="max-width content-padding mx-auto my-12">
          <div className="max-width-md mx-auto">
            <h1 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light mb-4">
              Database of Primary Self Care Algorithms
            </h1>
            <p className="leading-relaxed mb-4">
              The AirTable below contains a database of Primary Self Care
              algorithms organized by the impacted bodily health system, the
              relevant social determinants of health, and the type of test or
              assessment. Relevant resources and information about each model
              are provided as well as the most prevalent health condition
              addressed.
            </p>
          </div>
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

        {/* Methods */}
        <div className="bg-secondary/10 py-12">
          <div className="max-width max-width-md content-padding mx-auto">
            <h1 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light mt-8">Methods</h1>
            <h2 className="header-lg mt-8 mb-4">
              Decision Matrix
            </h2>
            <p className="leading-relaxed mb-4">
              The ranking of the 10 top Primary Self Care algorithms were
              determined by rating each algorithm against the following
              decision matrix adapted from methods of evaluating clinical
              decision support<sup><a href="#references">38</a></sup>.
            </p>
            <div className="overflow-x-auto mb-8">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-medium text-gray">
                    <th className="text-left p-2" style={{ width: '25%' }}>Criteria</th>
                    <th className="p-2 text-center" style={{ width: '15%' }}>Weight (1-4)</th>
                    <th className="text-left p-2" style={{ width: '20%' }}>1</th>
                    <th className="text-left p-2" style={{ width: '20%' }}>0</th>
                    <th className="text-left p-2" style={{ width: '20%' }}>-1</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-light">
                    <td className="p-2"><strong>Audience</strong><br />How many patients &amp; clinicians do/or can utilize this algorithm?</td>
                    <td className="p-2 text-center">2</td>
                    <td className="p-2">can be utilized by the majority of people, regardless of health status</td>
                    <td className="p-2">utilized for common or highly prevalent conditions</td>
                    <td className="p-2">utilized for only rare conditions</td>
                  </tr>
                  <tr className="border-b border-gray-light">
                    <td className="p-2"><strong>Effectiveness</strong><br />How much of a difference can the algorithm make on someone&apos;s health status regardless of condition progression?</td>
                    <td className="p-2 text-center">4</td>
                    <td className="p-2">high impact at many stages in disease progression</td>
                    <td className="p-2">moderate impact at some stages in disease progression</td>
                    <td className="p-2">low or no impact at many stages of disease progression</td>
                  </tr>
                  <tr className="border-b border-gray-light">
                    <td className="p-2"><strong>Validity &amp; Reliability</strong><br />Has this algorithm been rigorously tested and have results been replicated?</td>
                    <td className="p-2 text-center">4</td>
                    <td className="p-2">validated and replicated by many credible institutions</td>
                    <td className="p-2">validated by some credible sources, limited replication studies</td>
                    <td className="p-2">not validated or replicated by credible sources</td>
                  </tr>
                  <tr className="border-b border-gray-light">
                    <td className="p-2"><strong>Complexity</strong><br />How easy is it to learn to use and understand results from an algorithm?</td>
                    <td className="p-2 text-center">2</td>
                    <td className="p-2">almost no learning curve, easy to implement and learn from results</td>
                    <td className="p-2">moderate learning curve and results are mostly manageable to interpret</td>
                    <td className="p-2">high learning curve to use and results are difficult to interpret</td>
                  </tr>
                  <tr className="border-b border-gray-light">
                    <td className="p-2"><strong>Cost</strong><br />How expensive are any necessary tools/services?</td>
                    <td className="p-2 text-center">3</td>
                    <td className="p-2">$ low cost or free</td>
                    <td className="p-2">$$</td>
                    <td className="p-2">$$$</td>
                  </tr>
                  <tr className="border-b border-gray-light">
                    <td className="p-2"><strong>Availability</strong><br />How readily available and accessible is this tool?</td>
                    <td className="p-2 text-center">1</td>
                    <td className="p-2">over the counter or diy</td>
                    <td className="p-2">some barrier to access (clinical treatment or prescription, specially ordered, etc.)</td>
                    <td className="p-2">still in development, not openly available</td>
                  </tr>
                  <tr className="border-b border-gray-light">
                    <td className="p-2"><strong>Support</strong><br />How much clinical support or guidance is required?</td>
                    <td className="p-2 text-center">2</td>
                    <td className="p-2">completely independent</td>
                    <td className="p-2">minimal community or clinical involvement</td>
                    <td className="p-2">requires clinical support or intervention</td>
                  </tr>
                  <tr className="border-b border-gray-light">
                    <td className="p-2"><strong>Licensing</strong><br />Is the algorithm open or closed source?</td>
                    <td className="p-2 text-center">2</td>
                    <td className="p-2">open</td>
                    <td className="p-2">unknown licensing</td>
                    <td className="p-2">closed</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h2 className="header-lg mt-8 mb-4">
              Ranking of Top 10 Algorithms
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-medium text-gray">
                    <th className="text-left p-2">Criteria</th>
                    <th className="p-2 text-center">Weight (1-4)</th>
                    <th className="p-2 text-center">Vaccinations</th>
                    <th className="p-2 text-center">Blood Pressure</th>
                    <th className="p-2 text-center">Urinalysis</th>
                    <th className="p-2 text-center">Mental Health</th>
                    <th className="p-2 text-center">Vision Test</th>
                    <th className="p-2 text-center">Glucose Monitoring</th>
                    <th className="p-2 text-center">Breast Self-Exam</th>
                    <th className="p-2 text-center">Birth Control</th>
                    <th className="p-2 text-center">Air Quality Monitor</th>
                    <th className="p-2 text-center">Pulse Oximetry</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-light">
                    <td className="p-2">Audience</td>
                    <td className="p-2 text-center">2</td>
                    <td className="p-2 text-center">1</td>
                    <td className="p-2 text-center">1</td>
                    <td className="p-2 text-center">1</td>
                    <td className="p-2 text-center">1</td>
                    <td className="p-2 text-center">1</td>
                    <td className="p-2 text-center">0</td>
                    <td className="p-2 text-center">1</td>
                    <td className="p-2 text-center">1</td>
                    <td className="p-2 text-center">1</td>
                    <td className="p-2 text-center">0</td>
                  </tr>
                  <tr className="border-b border-gray-light">
                    <td className="p-2">Effectiveness</td>
                    <td className="p-2 text-center">4</td>
                    <td className="p-2 text-center">1</td>
                    <td className="p-2 text-center">1</td>
                    <td className="p-2 text-center">1</td>
                    <td className="p-2 text-center">0</td>
                    <td className="p-2 text-center">0</td>
                    <td className="p-2 text-center">1</td>
                    <td className="p-2 text-center">0</td>
                    <td className="p-2 text-center">1</td>
                    <td className="p-2 text-center">0</td>
                    <td className="p-2 text-center">-1</td>
                  </tr>
                  <tr className="border-b border-gray-light">
                    <td className="p-2">Validity/Reliability</td>
                    <td className="p-2 text-center">4</td>
                    <td className="p-2 text-center">1</td>
                    <td className="p-2 text-center">1</td>
                    <td className="p-2 text-center">1</td>
                    <td className="p-2 text-center">1</td>
                    <td className="p-2 text-center">0</td>
                    <td className="p-2 text-center">1</td>
                    <td className="p-2 text-center">-1</td>
                    <td className="p-2 text-center">1</td>
                    <td className="p-2 text-center">0</td>
                    <td className="p-2 text-center">0</td>
                  </tr>
                  <tr className="border-b border-gray-light">
                    <td className="p-2">Complexity</td>
                    <td className="p-2 text-center">3</td>
                    <td className="p-2 text-center">1</td>
                    <td className="p-2 text-center">1</td>
                    <td className="p-2 text-center">-1</td>
                    <td className="p-2 text-center">1</td>
                    <td className="p-2 text-center">1</td>
                    <td className="p-2 text-center">0</td>
                    <td className="p-2 text-center">1</td>
                    <td className="p-2 text-center">-1</td>
                    <td className="p-2 text-center">0</td>
                    <td className="p-2 text-center">0</td>
                  </tr>
                  <tr className="border-b border-gray-light">
                    <td className="p-2">Cost</td>
                    <td className="p-2 text-center">3</td>
                    <td className="p-2 text-center">1</td>
                    <td className="p-2 text-center">0</td>
                    <td className="p-2 text-center">1</td>
                    <td className="p-2 text-center">1</td>
                    <td className="p-2 text-center">1</td>
                    <td className="p-2 text-center">0</td>
                    <td className="p-2 text-center">1</td>
                    <td className="p-2 text-center">0</td>
                    <td className="p-2 text-center">0</td>
                    <td className="p-2 text-center">0</td>
                  </tr>
                  <tr className="border-b border-gray-light">
                    <td className="p-2">Availability</td>
                    <td className="p-2 text-center">1</td>
                    <td className="p-2 text-center">1</td>
                    <td className="p-2 text-center">1</td>
                    <td className="p-2 text-center">1</td>
                    <td className="p-2 text-center">1</td>
                    <td className="p-2 text-center">1</td>
                    <td className="p-2 text-center">1</td>
                    <td className="p-2 text-center">1</td>
                    <td className="p-2 text-center">1</td>
                    <td className="p-2 text-center">1</td>
                    <td className="p-2 text-center">1</td>
                  </tr>
                  <tr className="border-b border-gray-light">
                    <td className="p-2">Support</td>
                    <td className="p-2 text-center">2</td>
                    <td className="p-2 text-center">-1</td>
                    <td className="p-2 text-center">0</td>
                    <td className="p-2 text-center">1</td>
                    <td className="p-2 text-center">1</td>
                    <td className="p-2 text-center">1</td>
                    <td className="p-2 text-center">0</td>
                    <td className="p-2 text-center">1</td>
                    <td className="p-2 text-center">-1</td>
                    <td className="p-2 text-center">1</td>
                    <td className="p-2 text-center">1</td>
                  </tr>
                  <tr className="border-b border-gray-light">
                    <td className="p-2">Licensing</td>
                    <td className="p-2 text-center">2</td>
                    <td className="p-2 text-center">1</td>
                    <td className="p-2 text-center">1</td>
                    <td className="p-2 text-center">1</td>
                    <td className="p-2 text-center">0</td>
                    <td className="p-2 text-center">0</td>
                    <td className="p-2 text-center">1</td>
                    <td className="p-2 text-center">1</td>
                    <td className="p-2 text-center">1</td>
                    <td className="p-2 text-center">1</td>
                    <td className="p-2 text-center">0</td>
                  </tr>
                  <tr className="border-b border-gray-light font-bold">
                    <td className="p-2">Weighted Totals</td>
                    <td className="p-2 text-center"></td>
                    <td className="p-2 text-center">17</td>
                    <td className="p-2 text-center">16</td>
                    <td className="p-2 text-center">15</td>
                    <td className="p-2 text-center">15</td>
                    <td className="p-2 text-center">11</td>
                    <td className="p-2 text-center">11</td>
                    <td className="p-2 text-center">9</td>
                    <td className="p-2 text-center">8</td>
                    <td className="p-2 text-center">7</td>
                    <td className="p-2 text-center">-1</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="max-width max-width-md content-padding mx-auto py-12">
          <h1 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light mt-8 mb-4">Next Steps</h1>
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

          <h2 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] text-center mt-8 mb-4">Authors</h2>
          <Author name="Arpna Ghanshani" company="GoInvo" />
          <Author name="Chloe Ma" company="GoInvo" />
          <Author name="Juhan Sonin" company="GoInvo" />

          <h3 className="header-md mt-6 mb-3">Contributors</h3>
          <p className="text-gray">
            Samantha Wuu<br />
            Huahua Zhu<br />
            Eric Benoit<br />
            Craig McGinley
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
