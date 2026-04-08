import type { Metadata } from 'next'
import { cloudfrontImage } from '@/lib/utils'
import { Divider } from '@/components/ui/Divider'
import { Author } from '@/components/ui/Author'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { PscaAlgorithms } from './PscaAlgorithms'
import { PscaTable } from './PscaTable'
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
          <h1 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light mb-4">Primary Self Care Algorithms</h1>
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
        <div className="my-12 px-4 lg:px-16">
          <h1 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light mb-8 max-width-md mx-auto">
            Application of Primary Self Care Across Life
          </h1>
          <PscaTable>
            <table className="table-fixed text-sm w-full" style={{ borderCollapse: 'unset' }}>
              <thead>
                <tr>
                  <th className="text-left py-2 px-3 w-[180px] bg-white sticky left-0 z-10 align-top font-normal"> </th>
                  {['0-5 years old', '6-12', '13-20', '21-30', '31-40', '41-50', '51-60', '61-70', '71-80', '81-90', '90+'].map(
                    (age) => (
                      <th key={age} className="py-2 px-3 w-[80px] text-left align-top font-normal">
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
                ].map((row, rowIdx) => (
                  <tr key={row.name} className={rowIdx % 2 === 0 ? 'bg-[#f9f9f9]' : 'bg-white'}>
                    <td className="py-2 px-3 sticky left-0 z-10 bg-inherit align-top">{row.name}</td>
                    {row.ages.map((applicable, i) => (
                      <td key={i} className="py-2 px-3 text-left align-top">
                        {applicable ? (
                          <img
                            src="/images/vision/primary-self-care-algorithms/checkmark-required.svg"
                            alt="Required"
                            className="w-5 h-5"
                          />
                        ) : null}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </PscaTable>
        </div>

        {/* Airtable Embed */}
        <div className="my-12 px-4 lg:px-16">
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
          <iframe
            src="https://airtable.com/embed/shrWdnWlNj0SIuUzl?backgroundColor=blue&viewControls=on"
            className="w-full border-0 max-w-full lg:max-w-none"
            style={{ height: 500 }}
            loading="lazy"
            title="Airtable Primary Self Care Algorithms"
          />
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
          </div>
          <div className="px-4 lg:px-16">
            <PscaTable>
              <table className="w-full text-sm" style={{ borderCollapse: "unset" }}>
                <thead>
                  <tr className="text-gray">
                    <th className="text-left py-[5px] px-[10px] align-top font-normal" style={{ width: '25%' }}>Criteria</th>
                    <th className="py-[5px] px-[10px] text-left align-top font-normal" style={{ width: '15%' }}>Weight (1-4)</th>
                    <th className="text-left py-[5px] px-[10px] align-top font-normal" style={{ width: '20%' }}>1</th>
                    <th className="text-left py-[5px] px-[10px] align-top font-normal" style={{ width: '20%' }}>0</th>
                    <th className="text-left py-[5px] px-[10px] align-top font-normal" style={{ width: '20%' }}>-1</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="">
                    <td className="py-[5px] px-[10px] align-top"><strong>Audience</strong><br />How many patients &amp; clinicians do/or can utilize this algorithm?</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">2</td>
                    <td className="py-[5px] px-[10px] align-top">can be utilized by the majority of people, regardless of health status</td>
                    <td className="py-[5px] px-[10px] align-top">utilized for common or highly prevalent conditions</td>
                    <td className="py-[5px] px-[10px] align-top">utilized for only rare conditions</td>
                  </tr>
                  <tr className="">
                    <td className="py-[5px] px-[10px] align-top"><strong>Effectiveness</strong><br />How much of a difference can the algorithm make on someone&apos;s health status regardless of condition progression?</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">4</td>
                    <td className="py-[5px] px-[10px] align-top">high impact at many stages in disease progression</td>
                    <td className="py-[5px] px-[10px] align-top">moderate impact at some stages in disease progression</td>
                    <td className="py-[5px] px-[10px] align-top">low or no impact at many stages of disease progression</td>
                  </tr>
                  <tr className="">
                    <td className="py-[5px] px-[10px] align-top"><strong>Validity &amp; Reliability</strong><br />Has this algorithm been rigorously tested and have results been replicated?</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">4</td>
                    <td className="py-[5px] px-[10px] align-top">validated and replicated by many credible institutions</td>
                    <td className="py-[5px] px-[10px] align-top">validated by some credible sources, limited replication studies</td>
                    <td className="py-[5px] px-[10px] align-top">not validated or replicated by credible sources</td>
                  </tr>
                  <tr className="">
                    <td className="py-[5px] px-[10px] align-top"><strong>Complexity</strong><br />How easy is it to learn to use and understand results from an algorithm?</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">2</td>
                    <td className="py-[5px] px-[10px] align-top">almost no learning curve, easy to implement and learn from results</td>
                    <td className="py-[5px] px-[10px] align-top">moderate learning curve and results are mostly manageable to interpret</td>
                    <td className="py-[5px] px-[10px] align-top">high learning curve to use and results are difficult to interpret</td>
                  </tr>
                  <tr className="">
                    <td className="py-[5px] px-[10px] align-top"><strong>Cost</strong><br />How expensive are any necessary tools/services?</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">3</td>
                    <td className="py-[5px] px-[10px] align-top">$ low cost or free</td>
                    <td className="py-[5px] px-[10px] align-top">$$</td>
                    <td className="py-[5px] px-[10px] align-top">$$$</td>
                  </tr>
                  <tr className="">
                    <td className="py-[5px] px-[10px] align-top"><strong>Availability</strong><br />How readily available and accessible is this tool?</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">1</td>
                    <td className="py-[5px] px-[10px] align-top">over the counter or diy</td>
                    <td className="py-[5px] px-[10px] align-top">some barrier to access (clinical treatment or prescription, specially ordered, etc.)</td>
                    <td className="py-[5px] px-[10px] align-top">still in development, not openly available</td>
                  </tr>
                  <tr className="">
                    <td className="py-[5px] px-[10px] align-top"><strong>Support</strong><br />How much clinical support or guidance is required?</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">2</td>
                    <td className="py-[5px] px-[10px] align-top">completely independent</td>
                    <td className="py-[5px] px-[10px] align-top">minimal community or clinical involvement</td>
                    <td className="py-[5px] px-[10px] align-top">requires clinical support or intervention</td>
                  </tr>
                  <tr className="">
                    <td className="py-[5px] px-[10px] align-top"><strong>Licensing</strong><br />Is the algorithm open or closed source?</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">2</td>
                    <td className="py-[5px] px-[10px] align-top">open</td>
                    <td className="py-[5px] px-[10px] align-top">unknown licensing</td>
                    <td className="py-[5px] px-[10px] align-top">closed</td>
                  </tr>
                </tbody>
              </table>
            </PscaTable>
          </div>
          <div className="max-width max-width-md content-padding mx-auto">
            <h2 className="header-lg mt-8 mb-4">
              Ranking of Top 10 Algorithms
            </h2>
          </div>
          <div className="px-4 lg:px-16">
            <PscaTable>
              <table className="w-full text-sm" style={{ borderCollapse: "unset" }}>
                <thead>
                  <tr className="text-gray">
                    <th className="text-left py-[5px] px-[10px] align-top font-normal">Criteria</th>
                    <th className="py-[5px] px-[10px] text-left align-top font-normal">Weight (1-4)</th>
                    <th className="py-[5px] px-[10px] text-left align-top font-normal">Vaccinations</th>
                    <th className="py-[5px] px-[10px] text-left align-top font-normal">Blood Pressure</th>
                    <th className="py-[5px] px-[10px] text-left align-top font-normal">Urinalysis</th>
                    <th className="py-[5px] px-[10px] text-left align-top font-normal">Mental Health</th>
                    <th className="py-[5px] px-[10px] text-left align-top font-normal">Vision Test</th>
                    <th className="py-[5px] px-[10px] text-left align-top font-normal">Glucose Monitoring</th>
                    <th className="py-[5px] px-[10px] text-left align-top font-normal">Breast Self-Exam</th>
                    <th className="py-[5px] px-[10px] text-left align-top font-normal">Birth Control</th>
                    <th className="py-[5px] px-[10px] text-left align-top font-normal">Air Quality Monitor</th>
                    <th className="py-[5px] px-[10px] text-left align-top font-normal">Pulse Oximetry</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="">
                    <td className="py-[5px] px-[10px] align-top">Audience</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">2</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">1</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">1</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">1</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">1</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">1</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">0</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">1</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">1</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">1</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">0</td>
                  </tr>
                  <tr className="">
                    <td className="py-[5px] px-[10px] align-top">Effectiveness</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">4</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">1</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">1</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">1</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">0</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">0</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">1</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">0</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">1</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">0</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">-1</td>
                  </tr>
                  <tr className="">
                    <td className="py-[5px] px-[10px] align-top">Validity/Reliability</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">4</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">1</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">1</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">1</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">1</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">0</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">1</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">-1</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">1</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">0</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">0</td>
                  </tr>
                  <tr className="">
                    <td className="py-[5px] px-[10px] align-top">Complexity</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">3</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">1</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">1</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">-1</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">1</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">1</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">0</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">1</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">-1</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">0</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">0</td>
                  </tr>
                  <tr className="">
                    <td className="py-[5px] px-[10px] align-top">Cost</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">3</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">1</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">0</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">1</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">1</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">1</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">0</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">1</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">0</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">0</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">0</td>
                  </tr>
                  <tr className="">
                    <td className="py-[5px] px-[10px] align-top">Availability</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">1</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">1</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">1</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">1</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">1</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">1</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">1</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">1</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">1</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">1</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">1</td>
                  </tr>
                  <tr className="">
                    <td className="py-[5px] px-[10px] align-top">Support</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">2</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">-1</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">0</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">1</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">1</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">1</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">0</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">1</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">-1</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">1</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">1</td>
                  </tr>
                  <tr className="">
                    <td className="py-[5px] px-[10px] align-top">Licensing</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">2</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">1</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">1</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">1</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">0</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">0</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">1</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">1</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">1</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">1</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">0</td>
                  </tr>
                  <tr className="border-b border-gray-light font-bold">
                    <td className="py-[5px] px-[10px] align-top">Weighted Totals</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal"></td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">17</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">16</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">15</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">15</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">11</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">11</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">9</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">8</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">7</td>
                    <td className="py-[5px] px-[10px] text-left align-top font-normal">-1</td>
                  </tr>
                </tbody>
              </table>
            </PscaTable>
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

      {/* Newsletter */}
      <section className="bg-gray-lightest py-8">
        <div className="max-width max-width-md content-padding mx-auto">
          <div className="bg-white shadow-card py-6 px-4 md:px-8">
            <NewsletterForm />
          </div>
        </div>
      </section>

      {/* References */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <References items={refs} />
        </div>
      </section>
    </div>
  )
}
