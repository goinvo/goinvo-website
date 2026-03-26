import type { Metadata } from 'next'
import Image from 'next/image'
import { cloudfrontImage } from '@/lib/utils'
import { Divider } from '@/components/ui/Divider'
import { Author } from '@/components/ui/Author'
import { Button } from '@/components/ui/Button'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'
import { References } from '@/components/ui/References'
import refs from '@/data/vision/faces-in-health-communication/references.json'

export const metadata: Metadata = {
  title: 'Faces in Health Communication',
  description:
    'The Benefits of Information Graphics and Human Faces for Improved Patient Understanding.',
}

function Img({
  src,
  alt,
  className = '',
}: {
  src: string
  alt: string
  className?: string
}) {
  return (
    <Image
      src={cloudfrontImage(
        `/images/features/faces-in-health-communication/${src}`
      )}
      alt={alt}
      width={1200}
      height={800}
      className={`w-full h-auto ${className}`}
    />
  )
}

export default function FacesInHealthCommunicationPage() {
  return (
    <div>
      <SetCaseStudyHero image={cloudfrontImage('/images/features/faces-in-health-communication/hero-2.jpg')} />

      {/* Content */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h1 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light">Faces in Health Communication</h1>
          <p className="leading-relaxed mb-4">
            In healthcare, clear communication that can be easily understood
            by a broad patient audience is more important now than ever.
          </p>
          <p className="leading-relaxed mb-4">
            But all too often, complex medical information is unsuccessfully
            communicated to populations with poor health literacy, which can
            have devastating outcomes.
          </p>
          <p className="leading-relaxed mb-4">
            Our research explores how incorporating visual information in
            healthcare communication, and specifically the use of human
            faces in health infographics, can improve patients&apos;
            understanding of critical instructions and information.
          </p>
          <div className="mb-8 text-center">
            <Button
              href="https://www.goinvo.com/pdf/vision/faces-in-health-communication/faces-in-health-communication.pdf"
              variant="secondary"
              external
            >
              Download PDF
            </Button>
          </div>

          <Divider />

          <h2 className="font-serif text-2xl mt-8 mb-4 text-center">
            Problem: The High Cost of Low Health Literacy
          </h2>
          <Img src="02-HHS-defines-health-literacy.jpg" alt="HHS defines health literacy" />
          <p className="leading-relaxed my-4">
            The U.S. Department of Health and Human Services (HHS) defines
            health literacy as &ldquo;the degree to which individuals have the
            capacity to obtain, process, and understand basic health
            information needed to make appropriate health decisions.&rdquo;
          </p>
          <Img src="03-36.jpg" alt="36% of US adults have basic or below basic health literacy" />
          <p className="leading-relaxed my-4">
            More than a third of Americans have low health literacy,
            especially among the elderly, individuals with lower socioeconomic
            status, and those with low English proficiency.
          </p>
          <p className="leading-relaxed mb-4">
            People with low health literacy are often unable to derive
            meaningful information from health education materials, which are
            often written at high school or college level.<sup>1</sup>
          </p>
          <Img src="04-numerical-skill.jpg" alt="Numerical skill and health literacy" />
          <p className="leading-relaxed my-4">
            Many Americans have low numeracy skills, increasing the effort
            patients exert in calculating risk and comparing options when
            making medical decisions.<sup>2</sup>
          </p>
          <p className="leading-relaxed mb-8">
            Not unexpectedly, healthcare outcomes worsen, and costs
            substantially increase for Americans with low health literacy.
            Compared to those with proficient health literacy, adults who have
            low health literacy experience:<sup>2</sup>
          </p>
        </div>

        {/* Full-width section: Cost of poor literacy */}
        <div className="max-width content-padding mx-auto my-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <Img src="05-236B-1.jpg" alt="2-day longer hospital stays" />
              <p className="uppercase text-center font-bold mt-2">
                2-day longer hospital stays
              </p>
            </div>
            <div className="text-center">
              <Img src="05-236B-2.jpg" alt="6% more hospital visits" />
              <p className="uppercase text-center font-bold mt-2">
                6% more hospital visits
              </p>
            </div>
            <div className="text-center">
              <Img src="05-236B-3.jpg" alt="4x higher healthcare costs" />
              <p className="uppercase text-center font-bold mt-2">
                4x higher healthcare costs
              </p>
            </div>
          </div>
          <p className="font-serif text-lg leading-relaxed my-8">
            Through all of its impact &ndash; medical errors, increased illness
            and disability, loss of wages, and compromised public health &ndash;
            low health literacy is estimated to cost the U.S. economy up
            to $238B per year.<sup>3</sup>
          </p>
          <Img src="05-236B-4.jpg" alt="$238 billion cost of low health literacy" />
        </div>

        <div className="max-width max-width-md content-padding mx-auto">
          <Divider />

          <h2 className="font-serif text-2xl mt-8 mb-4 text-center">
            The Benefits of Visual Healthcare Communication
          </h2>
          <p className="leading-relaxed mb-4">
            When conveying complex information, there are a number of benefits
            that come from incorporating visuals.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div className="flex flex-col items-center">
              <Img src="06-icon1.jpg" alt="Visual communication benefit 1" />
              <p className="leading-relaxed mt-4">
                Incorporating visuals adds several benefits in
                communication, increases people&apos;s understanding of
                information significantly, from 70% to 95%.<sup>4</sup>
              </p>
            </div>
            <div className="flex flex-col items-center">
              <Img src="06-icon2.jpg" alt="Visual communication benefit 2" />
              <p className="leading-relaxed mt-4">
                People following directions with text and illustration do
                323% better than those without illustrations.<sup>4</sup>
              </p>
            </div>
            <div className="flex flex-col items-center">
              <Img src="06-icon3.jpg" alt="Visual communication benefit 3" />
              <p className="leading-relaxed mt-4">
                Overall, visual information is faster and more effective,
                taking nearly 1/10 of a second to process compared to the 60
                seconds needed to understand an equal amount of written
                information.<sup>5</sup>
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <Img src="07-more-likely.jpg" alt="People are more likely to remember information with visuals" />
            </div>
            <div>
              <p className="leading-relaxed mb-4">
                Healthcare communications should have visuals for
                individuals to best process the information at hand.
              </p>
              <p className="leading-relaxed mb-4">
                In one study published in the{' '}
                <em>Annals of Emergency Medicine</em>, patients were tested
                with <strong>discharge instructions</strong> with and without
                illustrations.
              </p>
              <p className="leading-relaxed mb-4">
                Patients given illustrations were{' '}
                <strong>
                  <span className="text-xl">1.5x</span> more likely to
                  choose 5 or more correct responses
                </strong>{' '}
                than those without illustrations <strong>(65% vs 43%)</strong>.<sup>6</sup>
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-4">
            <div>
              <Img src="08-wound-care-b.jpg" alt="Wound care visual communication example" />
            </div>
            <div>
              <p className="leading-relaxed mb-4">
                Similarly, another study that used{' '}
                <strong>wound care instructions</strong> received similar results,
                with{' '}
                <strong>
                  better results for clarity, ease of understanding,
                  correct answers, and compliance to care
                </strong>{' '}
                for illustrations rather than instructions with no
                illustrations.<sup>7</sup>
              </p>
            </div>
          </div>

          <Divider />

          <h2 className="font-serif text-2xl mt-8 mb-4 text-center">
            Human Faces and Communication
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <Img src="09-born-to-look-at-faces1.jpg" alt="Born to look at faces 1" />
            <Img src="09-born-to-look-at-faces2.jpg" alt="Born to look at faces 2" />
            <Img src="09-born-to-look-at-faces3.jpg" alt="Born to look at faces 3" />
            <Img src="09-born-to-look-at-faces4.jpg" alt="Born to look at faces 4" />
          </div>
          <p className="font-serif text-lg text-center leading-relaxed my-4">
            Humans are born to look at faces.
          </p>
          <p className="leading-relaxed mb-4">
            From the very beginning of our lives, we look to others&apos; faces
            to ascertain vital information. <strong>CONSPEC/CONLERN</strong>, a
            two-process theory of infant face recognition proposed by
            Johnson and Morton,{' '}
            <strong>
              explains how newborns use innate knowledge about the structure
              of faces.
            </strong><sup>8, 10</sup>
          </p>

          {/* CONSPEC Box */}
          <div className="border-2 border-gray-300 mt-8">
            <div className="bg-gray-200 p-4 text-center">
              <span className="font-serif text-xl">CONSPEC</span>
              <div className="text-sm mt-2">
                Guides an infant&apos;s preferences for facelike patterns from
                birth.<sup>8, 9, 10, 11, 12, 13</sup>
              </div>
            </div>
            <div className="p-4 border-b-2 border-gray-300 font-bold text-center uppercase">
              2 Days Old
            </div>
            <div className="grid grid-cols-2 md:grid-cols-[1fr_2fr] gap-4 p-4">
              <div className="text-center">
                <div className="uppercase font-bold text-center mb-2">Frontal Lobe</div>
                <Img src="10-brain1.jpg" alt="Frontal lobe" />
              </div>
              <div className="flex items-center">
                <Img src="10-baby1.jpg" alt="2-day-old infant face recognition" />
              </div>
            </div>
            <div className="p-4 border-t-2 border-gray-300">
              Infants spend a longer time looking at face that are arranged
              properly. As early as two days old, newborns are able to
              discriminate between averting eye gaze and direct gaze.
            </div>
          </div>

          {/* CONLERN Box */}
          <div className="border-2 border-secondary mt-8">
            <div className="bg-secondary/20 p-4 text-center">
              <span className="font-serif text-xl">CONLERN</span>
              <div className="text-sm mt-2">
                A cortical visuomotor mechanism. These subcortical structures
                support the development of specialized cortical circuits that
                we use as adults.<sup>14, 15, 16, 17, 18, 19</sup>
              </div>
            </div>
            <div className="p-4 border-b-2 border-gray-300 font-bold text-center uppercase">
              2 Months Old
            </div>
            <div className="grid grid-cols-2 md:grid-cols-[1fr_2fr] gap-4 p-4">
              <div className="text-center">
                <div className="uppercase font-bold text-center mb-2">Motor Cortex</div>
                <Img src="10-brain2.jpg" alt="Motor cortex" />
              </div>
              <div className="flex items-center">
                <Img src="10-baby2.jpg" alt="2-month-old infant face recognition" />
              </div>
            </div>
            <div className="p-4 border-t-2 border-gray-300">
              Infants learn to <strong>prefer a realistic human face</strong> through
              their cortical visuomotor mechanism.
            </div>
          </div>

          {/* 4 Months Old */}
          <div className="border-2 border-secondary border-t-0">
            <div className="p-4 border-b-2 border-gray-300 font-bold text-center uppercase">
              4 Months Old
            </div>
            <div className="grid grid-cols-2 md:grid-cols-[1fr_2fr] gap-4 p-4">
              <div className="text-center">
                <div className="uppercase font-bold text-center mb-2">Occipital Lobe</div>
                <Img src="10-brain3.jpg" alt="Occipital lobe" />
              </div>
              <div className="flex items-center">
                <Img src="10-baby3.jpg" alt="4-month-old infant face recognition" />
              </div>
            </div>
            <div className="p-4 border-t-2 border-gray-300">
              Infants can simulate neural responses in their temporal lobe to
              a level similar to adults.
              <br />
              The lower level of the visual processing system in the occipital
              lobe is responsible for <strong>analyzing non-facial images</strong>.
            </div>
          </div>

          {/* 9 Months Old */}
          <div className="border-2 border-secondary border-t-0">
            <div className="p-4 border-b-2 border-gray-300 font-bold text-center uppercase">
              9 Months Old
            </div>
            <div className="grid grid-cols-2 md:grid-cols-[1fr_2fr] gap-4 p-4">
              <div className="text-center">
                <div className="uppercase font-bold text-center mb-2">Temporal Lobe</div>
                <Img src="10-brain4.jpg" alt="Temporal lobe" />
              </div>
              <div className="flex items-center">
                <Img src="10-baby4.jpg" alt="9-month-old infant face recognition" />
              </div>
            </div>
            <div className="p-4 border-t-2 border-gray-300">
              Infants <strong>develop joint attention</strong>, where they can
              purposefully coordinate their attention with that of another
              person.
            </div>
          </div>

          <p className="font-serif text-lg text-center leading-relaxed my-8">
            Although we may share the same biological networks for
            processing faces,{' '}
            <span className="text-primary">
              individuals from different cultural backgrounds have different
              methodologies for looking at faces.
            </span><sup>20</sup>
          </p>

          <h3 className="font-serif text-xl mt-8 mb-4">
            How We Look at Faces
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-center">
            <div>
              <Img src="11-how-we-look-at-face-triangle.jpg" alt="Face scanning triangle pattern" />
              <p className="leading-relaxed mt-2">
                Western Caucasians tend to fixate more on the eyes and
                single details, forming a triangular scan of one&apos;s face.<sup>20</sup>
              </p>
            </div>
            <div>
              <Img src="11-how-we-look-at-face-circle.jpg" alt="Face scanning circular pattern" />
              <p className="leading-relaxed mt-2">
                East Asians tend to integrate information holistically by
                focusing on the center of the face.<sup>20</sup>
              </p>
            </div>
          </div>

          <h3 className="font-serif text-xl mt-8 mb-4">Own-Race Bias (ORB)</h3>
          <p className="leading-relaxed mb-4">
            Unsurprisingly, humans tend to gravitate towards faces similar to
            their own. Infants have shown the <strong>own-race bias (ORB)</strong><sup>21</sup>, recognizing their own faces better than the faces of another
            race.
          </p>
          <Img src="12-ORB.jpg" alt="Own-race bias in face recognition" className="mb-4" />
          <p className="leading-relaxed mb-4">
            Eye-tracking surveys revealed that infants consistently fixate
            longer on their own-race face regardless of age, compared to a
            decline in fixation time as they age for other-race faces.<sup>22</sup>
          </p>
          <p className="leading-relaxed mb-4">
            This declining trend is associated with decreased recognition
            memory for other race faces. This trend continues into adulthood.
            After thirty years of investigating the own race bias, ORB has
            been consistently found across different cultures and races,
            including individuals with Caucasian, African, and Asian ancestry<sup>23</sup>{' '}
            and in both adults<sup>24</sup>{' '}
            and children<sup>25</sup>{' '}
            as young as 3-month old infants.<sup>26</sup>
          </p>
          <Img src="13-consistent-ORB.jpg" alt="Consistent own-race bias across studies" className="mb-4" />
          <p className="leading-relaxed mb-4">
            Our brains are wired to engage and respond to human faces, which
            making them critical to communication. Not only do humans
            naturally gravitate to faces, but they{' '}
            <strong>
              remember better and mentally engage with information depicting
              individuals who are similar to them
            </strong>.
          </p>
          <Img src="14-PC-engaged-emotions.jpg" alt="Engaged emotions in health communication" className="mb-4" />

          <Divider />

          <h2 className="font-serif text-2xl mt-8 mb-4 text-center">
            Healthcare Graphics, Persuasion, and Emotion
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-[2fr_3fr] gap-8 mb-8">
            <div>
              <Img src="15-plot-message-self-referent1.jpg" alt="Healthcare graphics and emotion" />
            </div>
            <div>
              <p className="leading-relaxed mb-4">
                <strong>
                  Healthcare graphics and health campaigns rely heavily on
                  emotion to motivate behavior.
                </strong>{' '}
                When individuals are exposed to these messages, they may
                express three pathways of emotions<sup>27</sup>{' '}
                &mdash; plot-referent, message-referent, and self-referent.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 text-center">
            <div>
              <Img src="15-plot-message-self-referent3.jpg" alt="Message-referent emotion" />
              <p className="uppercase font-bold mt-2 mb-0">Message-referent</p>
              <p className="text-sm mt-1">
                Anti-smoking messaging and images: Disgusted to the tar lining
              </p>
            </div>
            <div>
              <Img src="15-plot-message-self-referent4.jpg" alt="Plot-referent emotion" />
              <p className="uppercase font-bold mt-2 mb-0">Plot-referent</p>
              <p className="text-sm mt-1">
                Anger and sadness for the smoker
              </p>
            </div>
            <div>
              <Img src="15-plot-message-self-referent5.jpg" alt="Self-referent emotion" />
              <p className="uppercase font-bold mt-2 mb-0">Self-referent</p>
              <p className="text-sm mt-1">
                Shame for their own smoking
              </p>
            </div>
          </div>

          <Img
            src="16-PC-impact-what-we-believe.jpg"
            alt="Impact on beliefs - desktop"
            className="mb-4 hidden md:block"
          />
          <Img
            src="16-mobile-impact-what-we-believe.jpg"
            alt="Impact on beliefs - mobile"
            className="mb-4 md:hidden"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <Img src="17-quit-smoking.jpg" alt="Quit smoking communication example" />
            </div>
            <div>
              <p className="leading-relaxed mb-4">
                We fully experience the self-referent emotion when we
                recognize a relationship between a message and ourselves.
                This emotion influences how we perceive the possible
                outcomes and severity of consequences of an action.<sup>27</sup>{' '}
                <strong>
                  There is a clear distinction between recognizing a risk
                  which triggers an emotional response and experiencing an
                  &ldquo;enduring perception of future risk&rdquo; influenced by
                  self-referential emotions.
                </strong><sup>27</sup>
              </p>
              <p className="leading-relaxed mb-4">
                For example, adult smokers reduced cigarette consumption and
                increased intentions to quit when they could see themselves
                reflected in the messaging.<sup>28</sup>
              </p>
            </div>
          </div>

          <p className="font-serif text-lg leading-relaxed mb-4">
            Self-referent emotions surface when the reader relates to the
            narrative,{' '}
            <span className="text-primary">
              diverse representation in infographics makes these narratives
              more effective.
            </span>
          </p>
          <Img
            src="18-diversity.jpg"
            alt="Diversity in health communication - desktop"
            className="mb-4 hidden md:block"
          />
          <Img
            src="18-mobile-diversity.jpg"
            alt="Diversity in health communication - mobile"
            className="mb-4 md:hidden"
          />

          <Divider />

          <h2 className="font-serif text-2xl mt-8 mb-4 text-center">Conclusion</h2>
          <div className="space-y-8 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-4 items-center">
              <Img src="19-conclusion1.jpg" alt="Conclusion 1: Prioritize higher engagement" />
              <p className="font-serif text-lg">
                <span className="text-primary">Prioritize higher engagement</span>{' '}
                to effectively communicate critical information to
                patients with low health literacy.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-4 items-center">
              <Img src="19-conclusion2.jpg" alt="Conclusion 2: Usage of infographics" />
              <p className="font-serif text-lg">
                Emphasize the{' '}
                <span className="text-primary">usage of infographics</span>{' '}
                to improve the understanding of health messaging and
                instruction.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-4 items-center">
              <Img src="19-conclusion3.jpg" alt="Conclusion 3: Diverse human faces" />
              <p className="font-serif text-lg">
                Showing{' '}
                <span className="text-primary">diverse human faces</span>{' '}
                in healthcare communication can further engage readers,
                influence how the message is understood, and elicit
                self-referent emotions that encourage behavior change.
              </p>
            </div>
          </div>

          <Divider />

          <h2 className="font-serif text-2xl mt-8 mb-4 text-center">
            Appendix.<br />A Lean Experiment Evaluating Healthcare Information
            Graphics
          </h2>
          <p className="font-serif text-lg leading-relaxed mb-4">
            To learn more about how healthcare visuals and the use of faces in
            particular, improve engagement and emotional understanding, the
            GoInvo health design studio devised a lean experiment.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <Img src="20-appendix.jpg" alt="Appendix experiment overview" />
            </div>
            <div>
              <p className="leading-relaxed mb-4">
                Using Amazon&apos;s Mechanical Turk (Mturk) service, we conducted
                a national survey of over 400 people, age 18 and over,
                testing the comprehension of information graphics both with
                and without faces.
              </p>
              <p className="leading-relaxed mb-4">
                Findings from our survey showed that respondents had{' '}
                <strong>
                  a clear preference for information graphics that used
                  faces
                </strong>{' '}
                versus those that did not.
              </p>
              <p className="leading-relaxed mb-4">
                Additionally, the faces in the information graphics played{' '}
                <strong>
                  an important role in how the respondents understood the
                  emotional content
                </strong>{' '}
                of the message.
              </p>
            </div>
          </div>
          <p className="leading-relaxed mb-4">
            For our first test, individuals were surveyed with one of the two
            graphics below.
          </p>
          <Img src="21-research.jpg" alt="Research methodology" className="mb-4" />
          <p className="leading-relaxed mb-4">
            We asked respondents to rank the boy&apos;s emotions on a scale of 1-5,
            from unhappy to happy. Individuals who saw Option 1 (no face)
            thought the boy eating A ranked at a 4, while individuals who saw
            Option 2 (face) thought that the boy ranked at a 5 in happiness.
          </p>
          <Img src="22-scale.jpg" alt="Measurement scale" className="mb-4" />
          <p className="leading-relaxed mb-4">
            When answering the question, &ldquo;Is the boy happy after eating blob
            A?&rdquo; Only 74% of those respondents who saw the option without a
            face selected &ldquo;yes&rdquo;, versus nearly 92% of those respondents who
            saw the option showing a face.
          </p>
          <Img src="23-happy.jpg" alt="Happy emotion test results" className="mb-4" />
          <p className="leading-relaxed mb-4">
            In this first test &mdash; that the boy was happy eating blob A, the
            respondents&apos;{' '}
            <strong>
              emotional understanding of the content increased due to
              including a facial expression in the infographic.
            </strong>
          </p>
          <Img src="24-pie-chart.jpg" alt="Pie chart results" className="mb-4" />
          <p className="leading-relaxed mb-4">
            For our second test, the addition of body language to the
            infographic gave respondents another piece of information to
            interpret.
            <br />
            Regarding the boy eating blob B, 76.2% of respondents given the
            without-a-face option ranked the boy at a 1 (unhappy), while 70.1%
            of the showing-a-face option respondents ranked the boy at a 1
            (unhappy).
          </p>
          <Img src="25-sad-b.jpg" alt="Sad emotion test results" className="mb-4" />
          <p className="leading-relaxed mb-4">
            While the majority of respondents understood that the boy was
            unhappy, those who relied solely on body language interpreted
            greater unhappiness than those who had the additional facial
            information.{' '}
            <strong>
              The addition of facial expression in this case, seemed to
              mitigate the message that the boy was unhappy.
            </strong>
          </p>
          <Img src="26-bar.jpg" alt="Bar chart results" className="mb-4" />

          <Divider />

          <h2 className="font-serif text-2xl mt-8 mb-4">Authors</h2>
          <Author name="Chloe Ma" company="GoInvo" />
          <Author name="Vickie Hua" company="GoInvo" />
          <Author name="Sharon Lee" company="GoInvo" />

          <h3 className="header-md mt-6 mb-3">Contributors</h3>
          <p className="text-gray">
            Jen Patel, Colleen Tang Poy, Jon Follett, Craig McGinley, Eric
            Benoit, Juhan Sonin
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
