import type { Metadata } from 'next'
import Image from 'next/image'
import { cloudfrontImage } from '@/lib/utils'
import { Divider } from '@/components/ui/Divider'
import { Author } from '@/components/ui/Author'

export const metadata: Metadata = {
  title: 'National Cancer Navigation - GoInvo',
  description:
    'Mapping cancer journey pain points and exploring how navigation could support patients and their families.',
}

const images = Array.from(Array(7), (_x, i) => i + 1)

export default function NationalCancerNavigationPage() {
  return (
    <div className="pt-[var(--spacing-header-height)]">
      {/* Hero */}
      <section className="relative min-h-[50vh] flex items-end">
        <Image
          src={cloudfrontImage(
            '/images/features/national-cancer-navigation/hero.png'
          )}
          alt="National Cancer Navigation"
          fill
          className="object-cover object-top"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="relative z-10 max-width content-padding py-12 w-full">
          <span className="text-primary-light text-sm uppercase tracking-wider font-semibold">
            Healthcare / Public Health &amp; Policy
          </span>
          <h1 className="font-serif text-3xl md:text-4xl text-white mt-2">
            National Cancer Navigation
          </h1>
          <p className="text-white/80 text-md mt-2">
            The White House Calls for a Childhood Cancer Service
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h1 className="font-serif text-3xl md:text-4xl mb-4">
            National Cancer Navigation
          </h1>
          <h2 className="font-serif text-2xl mb-4">
            The White House Calls for a Childhood Cancer Service
          </h2>
          <p className="leading-relaxed mb-4">
            Earlier this year (2023), the Biden-Harris administration{' '}
            <a
              href="https://bidenwhitehouse.archives.gov/briefing-room/statements-releases/2023/02/02/fact-sheet-on-one-year-anniversary-of-reignited-cancer-moonshot-biden-harris-administration-announces-new-actions-to-end-cancer-as-we-know-it/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-link"
            >
              announced (archived link)
            </a>{' '}
            a handful of new actions relating to the Cancer Moonshot goals
            to reduce cancer mortality rates and improve the lives of
            patients and survivors.
          </p>
          <p className="leading-relaxed mb-4">
            The first action listed is the creation of CC-DIRECT: Childhood
            Cancer: Data Integration for Research, Education, Care, and
            Clinical Trials — an initiative to support children,
            adolescents, and young adults throughout their cancer journey.
            Among other services, CC-DIRECT would provide patient navigation
            support to families, facilitate research participation, and
            establish a portable, shareable, standardized cancer health
            record.
          </p>
          <p className="leading-relaxed mb-4">
            The National Cancer Institute has been tasked with creating
            CC-DIRECT, and since April 2023, NCI has been laying the
            groundwork with their{' '}
            <a
              href="https://nationalcancerplan.cancer.gov/national-cancer-plan.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="text-link"
            >
              National Cancer Plan
            </a>
            . Although their efforts and strategies are primarily focused on
            research, they have extended a call to action for contributions
            from across different sectors.
          </p>

          <h2 className="font-serif text-2xl mt-8 mb-4">
            7 Underlying Problems in the US Cancer Space
          </h2>
          <p className="leading-relaxed mb-4">
            Our research aims to organize cancer journey pain points and
            underlying problems to support decision-makers in evaluating the
            potential impact of solutions they devise. This work reflects
            what our team has learned so far and is not a comprehensive
            representation of all aspects of the cancer experience. Feedback
            and suggestions are welcome at{' '}
            <a href="mailto:CancerNavigator@goinvo.com" className="text-link">
              CancerNavigator@goinvo.com
            </a>
            .
          </p>
        </div>

        {/* 7 Problem/Solution Image Pairs */}
        <div className="max-width mx-auto">
          {images.map((i) => (
            <div key={i} className="grid grid-cols-1 lg:grid-cols-2 gap-0 mb-8">
              <div className="relative w-full">
                <Image
                  src={cloudfrontImage(
                    `/images/features/national-cancer-navigation/${i}-prob.png`
                  )}
                  alt={`Problem ${i}`}
                  width={1200}
                  height={800}
                  className="w-full h-auto"
                />
              </div>
              <div className="relative w-full">
                <Image
                  src={cloudfrontImage(
                    `/images/features/national-cancer-navigation/${i}-solve.png`
                  )}
                  alt={`Solution ${i}`}
                  width={1200}
                  height={800}
                  className="w-full h-auto"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="max-width max-width-md content-padding mx-auto">
          <p className="leading-relaxed mb-4">
            Disparities exist across all of these problem areas,
            disproportionately impacting individuals from low-income
            backgrounds, minority populations, and rural areas, as well as
            those with disabilities, language barriers, and cultural
            differences. Services must be designed around these communities&apos;
            experiences from the outset if they are to be successful at
            closing the gaps. As we consider these problems, it&apos;s helpful to
            identify the focus of a given approach: is it mostly intended to
            address the underlying, upstream problems, or the more
            immediate, downstream pain points?
          </p>
          <p className="leading-relaxed mb-4">
            The implementation of a national patient navigation service like
            CC-DIRECT could promptly address numerous pain points in cancer
            care, and research strongly highlights the significance and
            impact of human touch in patient care. In fact, the genesis of
            patient navigation resulted from a 1989 report by the American
            Cancer Society that found that poor cancer patients faced
            substantially greater barriers in obtaining care and often did
            not seek care they couldn&apos;t afford. The following year, the
            Harlem Hospital Center implemented the first patient navigation
            program for underserved cancer patients, showing that patient
            navigation could dramatically improve outcomes.
          </p>
          <p className="leading-relaxed mb-4">
            By also expanding our attention to underlying problems like
            delays in detection and diagnosis and the siloed nature of
            health systems, we can decrease the volume of manual
            responsibilities for navigators and maximize the impact and
            scalability of patient navigation.
          </p>

          <h2 className="font-serif text-2xl mt-8 mb-4">
            Reimagining Patient Navigation for Cancer
          </h2>
        </div>

        {/* Interactive Embed */}
        <div className="max-width content-padding mx-auto">
          <iframe
            src="https://goinvo.github.io/cancernavigator/"
            className="w-full border-0"
            style={{ height: 650 }}
            allowFullScreen
            loading="lazy"
            title="Cancer Navigator Interactive Tool"
          />
        </div>

        <div className="max-width max-width-md content-padding mx-auto mt-8">
          <p className="leading-relaxed mb-4">
            This timeline outlines how cancer navigation could look across
            multiple services, each of which is a direct response to
            existing issues with quality and experience of care for
            patients. These services include:
          </p>
          <ul className="list-disc list-outside pl-6 space-y-3 mb-6">
            <li>
              <b>Digital Navigation Tool</b>
              <br />
              Mobile application for facility referral, record sharing, and
              care logistics
            </li>
            <li>
              <b>Patient Navigator</b>
              <br />
              Designated patient advocate who arranges logistics, emotional
              support, and resources on eligibility
            </li>
            <li>
              <b>Financial Navigator</b>
              <br />
              A service that breaks down costs transparency, determine
              eligibility for financial aid
            </li>
            <li>
              <b>SDOH Accommodations</b>
              <br />
              Free transportation and lodging as needed for patients
              traveling for care
            </li>
            <li>
              <b>Patient Education</b>
              <br />
              Resources to help patients further their understanding of
              their health
            </li>
            <li>
              <b>Standard Health Record</b>
              <br />
              A longitudinal, shareable electronic health record
            </li>
          </ul>
          <p className="leading-relaxed mb-6">
            <b>See our progress since November 2022</b>
          </p>

          {/* PDF Preview Images */}
          <div className="mb-8">
            <a
              href="https://www.goinvo.com/pdf/vision/national-cancer-navigation/cancer_nav_process_highlevel_v1.pdf"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image
                src={cloudfrontImage(
                  '/images/features/national-cancer-navigation/highlevel-preview.png'
                )}
                alt="Cancer Navigation Process High Level V1"
                width={1200}
                height={800}
                className="w-full h-auto mb-2"
              />
            </a>
            <a
              href="https://www.goinvo.com/pdf/vision/national-cancer-navigation/cancer_nav_process_highlevel_v1.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="text-link"
            >
              Cancer Navigation Process High Level V1 pdf
            </a>
          </div>

          <div className="mb-8">
            <a
              href="https://www.goinvo.com/pdf/vision/national-cancer-navigation/cancer_nav_process_breakdown_v1.pdf"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image
                src={cloudfrontImage(
                  '/images/features/national-cancer-navigation/breakdown-preview.png'
                )}
                alt="Cancer Navigation Process Breakdown V1"
                width={1200}
                height={800}
                className="w-full h-auto mb-2"
              />
            </a>
            <a
              href="https://www.goinvo.com/pdf/vision/national-cancer-navigation/cancer_nav_process_breakdown_v1.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="text-link"
            >
              Cancer Navigation Process Breakdown V1 pdf
            </a>
          </div>

          <p className="leading-relaxed mb-4">
            <a
              href="https://github.com/goinvo/cancernavigator"
              target="_blank"
              rel="noopener noreferrer"
              className="text-link"
            >
              Github Repo
            </a>
          </p>
          <p className="leading-relaxed mb-4">
            Have feedback? Send it to{' '}
            <a href="mailto:CancerNavigator@goinvo.com" className="text-link">
              CancerNavigator@goinvo.com
            </a>
          </p>

          <Divider />

          <h2 className="font-serif text-2xl mt-8 mb-4">Authors</h2>
          <Author name="Claire Lin" company="GoInvo" />
          <Author name="Tala Habbab" company="GoInvo" />
          <Author name="Sharon Lee" company="GoInvo" />
          <Author name="Craig McGinley" company="GoInvo" />
          <Author name="Samantha Wuu" company="GoInvo" />
          <Author name="Juhan Sonin" company="GoInvo" />

          <h3 className="font-serif text-xl mt-6 mb-3">Contributors</h3>
          <p className="text-gray">
            <a
              href="https://www.linkedin.com/in/gcordovano/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-link"
            >
              Grace Cordovano, PhD
            </a>
            <br />
            <a
              href="https://www.linkedin.com/in/wendi-cross-98153519/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-link"
            >
              Wendi Cross, PhD
            </a>
            <br />
            <a
              href="https://www.linkedin.com/in/daniel-ngo-41953232/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-link"
            >
              Daniel Ngo
            </a>
          </p>

          <Divider />

          {/* References */}
          <h2 className="font-serif text-2xl mt-8 mb-4" id="references">References</h2>
          <ol className="list-decimal list-outside pl-6 space-y-2 text-sm text-gray">
            <li>
              <a
                href="https://link.springer.com/article/10.1186/1472-6963-10-132"
                target="_blank"
                rel="noopener noreferrer"
                className="text-link"
              >
                Walsh, Jennifer, et al. &ldquo;What Are the Current Barriers to Effective Cancer Care Coordination? A Qualitative Study.&rdquo; BMC Health Services Research, vol. 10, no. 1, 20 May 2010
              </a>
            </li>
            <li>
              <a
                href="https://pubmed.ncbi.nlm.nih.gov/36622062/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-link"
              >
                Delamare Fauvel, Alix, et al. &ldquo;Diagnosis of Cancer in the Emergency Department: A Scoping Review.&rdquo; Cancer Medicine, vol. 12, no. 7, 9 Jan. 2023. Accessed 16 Apr. 2023
              </a>
            </li>
            <li>
              <a
                href="https://epi.grants.cancer.gov/emergency-medicine/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-link"
              >
                &ldquo;Cancer and Emergency Medicine | EGRP/DCCPS/NCI/NIH.&rdquo; Accessed 31 May 2023
              </a>
            </li>
            <li>
              <a
                href="https://www.kff.org/racial-equity-and-health-policy/issue-brief/racial-disparities-in-cancer-outcomes-screening-and-treatment/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-link"
              >
                Tong, Michelle, and 2022. &ldquo;Racial Disparities in Cancer Outcomes, Screening, and Treatment.&rdquo; KFF, 3 Feb. 2022
              </a>
            </li>
            <li>
              <a
                href="https://doi.org/10.1093/annonc/mdx265"
                target="_blank"
                rel="noopener noreferrer"
                className="text-link"
              >
                Zhu, J., et al. &ldquo;First-Onset Mental Disorders after Cancer Diagnosis and Cancer-Specific Mortality: A Nationwide Cohort Study.&rdquo; Annals of Oncology, vol. 28, no. 8, 19 May 2017, pp. 1964-1969
              </a>
            </li>
            <li>
              <a
                href="https://doi.org/10.3322/caac.21443"
                target="_blank"
                rel="noopener noreferrer"
                className="text-link"
              >
                Carrera, Pricivel M., et al. &ldquo;The Financial Burden and Distress of Patients with Cancer: Understanding and Stepping-up Action on the Financial Toxicity of Cancer Treatment.&rdquo; CA: A Cancer Journal for Clinicians, vol. 68, no. 2, 16 Jan. 2018, pp. 153-165
              </a>
            </li>
            <li>
              <a
                href="https://www.ncbi.nlm.nih.gov/pubmed/14751707"
                target="_blank"
                rel="noopener noreferrer"
                className="text-link"
              >
                Fallowfield, Lesley, and Valerie Jenkins. &ldquo;Communicating Sad, Bad, and Difficult News in Medicine.&rdquo; Lancet (London, England), vol. 363, no. 9405, 2004, pp. 312-9
              </a>
            </li>
            <li>
              <a
                href="https://pubmed.ncbi.nlm.nih.gov/19646649/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-link"
              >
                Nazemi, Kellie J., and Suman Malempati. &ldquo;Emergency Department Presentation of Childhood Cancer.&rdquo; Emergency Medicine Clinics of North America, vol. 27, no. 3, 1 Aug. 2009, pp. 477-495. Accessed 31 May 2023
              </a>
            </li>
            <li>
              <a
                href="https://doi.org/10.1016/s0027-9684(15)30409-0"
                target="_blank"
                rel="noopener noreferrer"
                className="text-link"
              >
                Hendren, Samantha, et al. &ldquo;Patients&apos; Barriers to Receipt of Cancer Care, and Factors Associated with Needing More Assistance from a Patient Navigator.&rdquo; Journal of the National Medical Association, vol. 103, no. 8, July 2011, pp. 701-710
              </a>
            </li>
            <li>
              <a
                href="https://gis.cancer.gov/mapstory/rural-urban/index.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-link"
              >
                &ldquo;Rural Urban Disparities in Cancer.&rdquo; Gis.cancer.gov
              </a>
            </li>
            <li>
              <a
                href="https://doi.org/10.1002/cncr.23229"
                target="_blank"
                rel="noopener noreferrer"
                className="text-link"
              >
                Onega, Tracy, et al. &ldquo;Geographic Access to Cancer Care in the U.S.&rdquo; Cancer, vol. 112, no. 4, 2008, pp. 909-918
              </a>
            </li>
            <li>
              <a
                href="https://doi.org/10.3322/ca.2007.0011"
                target="_blank"
                rel="noopener noreferrer"
                className="text-link"
              >
                Ward, E., et al. &ldquo;Association of Insurance with Cancer Care Utilization and Outcomes.&rdquo; CA: A Cancer Journal for Clinicians, vol. 58, no. 1, 1 Jan. 2008, pp. 9-31
              </a>
            </li>
            <li>
              <a
                href="https://www.ncbi.nlm.nih.gov/books/NBK542737/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-link"
              >
                Marlow, Nicole M., et al. The Relationship between Insurance Coverage and Cancer Care: A Literature Synthesis. PubMed, Research Triangle Park (NC), RTI Press, 2009
              </a>
            </li>
            <li>
              <a
                href="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3833882/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-link"
              >
                Meijer, Anna, et al. &ldquo;Effects of Screening for Psychological Distress on Patient Outcomes in Cancer: A Systematic Review.&rdquo; Journal of Psychosomatic Research, vol. 75, no. 1, July 2013, pp. 1-17
              </a>
            </li>
            <li>
              <a
                href="https://www.mdedge.com/hematology-oncology/article/257891/breast-cancer/time-cancer-diagnoses-us-averages-5-months"
                target="_blank"
                rel="noopener noreferrer"
                className="text-link"
              >
                Kling, Jim. &ldquo;Time to Cancer Diagnoses in U.S. Averages 5 Months.&rdquo; www.mdedge.com, 15 Sept. 2022. Accessed 31 May 2023
              </a>
            </li>
            <li>
              <a
                href="https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0219971"
                target="_blank"
                rel="noopener noreferrer"
                className="text-link"
              >
                Handtke, Oriana, et al. &ldquo;Culturally Competent Healthcare - a Scoping Review of Strategies Implemented in Healthcare Organizations and a Model of Culturally Competent Healthcare Provision.&rdquo; PLOS ONE, vol. 14, no. 7, 30 July 2019, pp. 1-24
              </a>
            </li>
            <li>
              <a
                href="https://doi.org/10.3322/caac.21249"
                target="_blank"
                rel="noopener noreferrer"
                className="text-link"
              >
                Nekhlyudov, Larissa, et al. &ldquo;Patient-Centered, Evidence-Based, and Cost-Conscious Cancer Care across the Continuum: Translating the Institute of Medicine Report into Clinical Practice.&rdquo; CA: A Cancer Journal for Clinicians, vol. 64, no. 6, 9 Sept. 2014, pp. 408-421
              </a>
            </li>
            <li>
              <a
                href="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC539473/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-link"
              >
                Kessels, Roy P C. &ldquo;Patients&apos; Memory for Medical Information.&rdquo; Journal of the Royal Society of Medicine, vol. 96, no. 5, May 2003, pp. 219-22
              </a>
            </li>
            <li>
              <a
                href="https://pubmed.ncbi.nlm.nih.gov/32023121/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-link"
              >
                Rosenkrantz, Andrew B., et al. &ldquo;Perceptions of Radiologists and Emergency Medicine Providers Regarding the Quality, Value, and Challenges of Outside Image Sharing in the Emergency Department Setting.&rdquo; AJR. American Journal of Roentgenology, vol. 214, no. 4, 1 Apr. 2020, pp. 843-852. Accessed 28 June 2021
              </a>
            </li>
            <li>
              <a
                href="https://doi.org/10.1377/hlthaff.28.1.160"
                target="_blank"
                rel="noopener noreferrer"
                className="text-link"
              >
                Virnig, Beth A., et al. &ldquo;A Matter of Race: Early-versus Late-Stage Cancer Diagnosis.&rdquo; Health Affairs, vol. 28, no. 1, Jan. 2009, pp. 160-168
              </a>
            </li>
            <li>
              <a
                href="https://www.fightcancer.org/releases/survey-majority-cancer-patients-struggle-afford-cancer-care"
                target="_blank"
                rel="noopener noreferrer"
                className="text-link"
              >
                &ldquo;Survey: Majority of Cancer Patients Struggle to Afford Cancer Care.&rdquo; American Cancer Society Cancer Action Network, 15 Dec. 2021
              </a>
            </li>
            <li>
              <a
                href="https://www.jons-online.com/issues/2022/may-2022-vol-13-no-5/4518-availability-and-accessibility-of-cancer-care-delivery-approaches-to-reduce-financial-toxicity-of-rural-and-urban-cancer-patients-in-kentucky"
                target="_blank"
                rel="noopener noreferrer"
                className="text-link"
              >
                Robin Vanderpool, DrPH. &ldquo;Availability and Accessibility of Cancer Care Delivery Approaches to Reduce Financial Toxicity of Rural and Urban Cancer Patients in Kentucky.&rdquo; Www.jons-Online.com, vol. 13, no. 5, 1 June 2022. Accessed 31 May 2023
              </a>
            </li>
            <li>
              <a
                href="https://doi.org/10.1200/op.21.00001"
                target="_blank"
                rel="noopener noreferrer"
                className="text-link"
              >
                Awidi, Muhammad, and Samer Al Hadidi. &ldquo;Participation of Black Americans in Cancer Clinical Trials: Current Challenges and Proposed Solutions.&rdquo; JCO Oncology Practice, vol. 17, no. 5, May 2021, pp. 265-271
              </a>
            </li>
          </ol>
        </div>
      </section>
    </div>
  )
}
