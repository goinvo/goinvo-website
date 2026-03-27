import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { cloudfrontImage } from '@/lib/utils'
import { Divider } from '@/components/ui/Divider'
import { Author } from '@/components/ui/Author'
import { Button } from '@/components/ui/Button'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'
import { References } from '@/components/ui/References'
import refs from '@/data/vision/loneliness-in-our-human-code/references.json'

export const metadata: Metadata = {
  title: 'Loneliness in our Human Code - GoInvo',
  description:
    'How loneliness and other social determinants affect our health.',
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
        `/images/features/loneliness-in-our-human-code/${src}`
      )}
      alt={alt}
      width={1200}
      height={800}
      className={`w-full h-auto ${className}`}
    />
  )
}

const healthRisks = [
  { name: 'Heart disease', key: 'heart-disease' },
  { name: 'Dementia', key: 'dementia' },
  { name: 'Arthritis', key: 'arthritis' },
  { name: 'Type-2 diabetes', key: 'diabetes' },
  { name: 'Depression', key: 'depression' },
  { name: 'High blood pressure', key: 'blood-pressure' },
  { name: 'Metastatic cancer', key: 'cancer' },
  { name: 'Stroke', key: 'stroke' },
  { name: 'Suicide', key: 'suicide' },
]

const bodyImpacts = [
  {
    name: 'Narrowing blood vessels to preserve body heat',
    key: 'blood-vessel',
  },
  {
    name: 'Elevating levels of the stress hormone cortisol',
    key: 'stress',
  },
  { name: 'Reducing antibody protection', key: 'antibody' },
  { name: 'Decreasing cognitive function', key: 'cognition' },
]

interface TimelineFactor {
  title: string
  text: string
  refs: string
}

interface TimelineSection {
  ageGroup: string
  color: string
  factors: TimelineFactor[]
}

const timelineData: TimelineSection[] = [
  {
    ageGroup: 'Infants',
    color: 'border-primary',
    factors: [
      {
        title: 'Early nurture',
        text: 'Social connectedness begins when life begins, and is most impacted by the quality of early relationships with parents and caregivers. Close family ties including grandparents, siblings, aunts, and uncles can start building an infant\u2019s social support system by spending time with them in these formative years.',
        refs: '16',
      },
      {
        title: 'Physical closeness',
        text: 'Physical attachment is crucial for infants, and separation can cause high levels of anxiety. One study showed that tending to and cuddling hospitalized infants can increase survival rate by 20%, despite the risks of infection.',
        refs: '16,17',
      },
      {
        title: 'Neighborhood conditions',
        text: 'Infants who grow up in a stable neighborhood environment have an increased ability to develop strong social networks.',
        refs: '18,19,20',
      },
    ],
  },
  {
    ageGroup: 'Children',
    color: 'border-secondary',
    factors: [
      {
        title: 'Effects of poverty',
        text: 'Living in a diverse environment allows children to make social connections that open them up for stronger support systems that will grow over time. Poverty serves as a barrier to social, physical, emotional, educational, and economic resources since the poorest communities have historically been and continue to be highly segregated.',
        refs: '16,21',
      },
      {
        title: 'Parents',
        text: 'Parents and guardians play a huge role in children\u2019s overall wellbeing. Growing up with both parents present and engaged in their child\u2019s life doubles the likelihood and increases the adequacy of access to emotional, physical, and educational support.',
        refs: '16,21',
      },
      {
        title: 'Speech and language',
        text: 'Speech and language are the two most important aspects of early childhood development, and the foundations of social and emotional well-being. Parents and guardians can help with this by spending time with children, including making and having meals, reading, and playing sports.',
        refs: '16',
      },
    ],
  },
  {
    ageGroup: 'Adolescents',
    color: 'border-tertiary',
    factors: [
      {
        title: 'Sleep',
        text: 'People who report getting enough sleep are 70-80% less likely to feel a lack of companionship. While this is true for all ages, adolescents are particularly at risk with a decreased production of melatonin (sleep hormone) compared to that of young children. Additionally, use of electronic devices late into the night have been found to impair sleep.',
        refs: '23,24',
      },
      {
        title: 'Parent-child relationship',
        text: 'The relationship between a parent and child is crucial to lifelong health and well-being. In fact, having a strong connection with a father figure decreases the likelihood by 68% of consuming alcohol, tobacco products, and drugs in their teenage years, and are less likely to participate in juvenile delinquency. Religious, community, big brother, and big sister programs, as well as supportive educators are key at this stage to fill any gaps that exist in a child\u2019s support system.',
        refs: '22',
      },
      {
        title: 'Peer influence',
        text: 'A major component of adolescent growth is gaining independence and a sense of identity. Often, this leads to conflict with parents and a tendency to turn to peers for guidance and support. However, at this time, adolescents can be susceptible to peers who exert negative influence. Finding a peer group that exerts positive influences leads to building a strong support system.',
        refs: '16,25',
      },
    ],
  },
  {
    ageGroup: 'Emerging Adults',
    color: 'border-primary',
    factors: [
      {
        title: 'A time of change',
        text: 'Emerging adulthood is a time of exploration and change, including testing different careers, values, relationships, and geographic residences that may mean leaving family for the first time. This change is often characterized by the constant forming, breaking, and reforming of social bonds. This is why having a constant source of social support can have major impacts on health and life satisfaction. In fact, if a person has a friend they see on most days, it has a similar impact on life satisfaction as would earning an extra $100,000 of income.',
        refs: '14,16',
      },
      {
        title: 'Healthy behaviors',
        text: 'A feeling of connectedness and belonging is correlated with a host of healthy behaviors including exercise, a wholesome diet, and safe sex. Supporting your body strengthens your mind and increases your ability to emotionally connect with others.',
        refs: '26',
      },
      {
        title: 'Substance use',
        text: 'Many emerging adults value peer opinions and actions as guidance for their own. During this time, individuals may experiment with alcohol and drugs as part of socializing. Males disproportionately consider drinking-related activities as a way to foster intimacy and closeness with peers, while females rely more on self-disclosure or sharing multiple activities.',
        refs: '26,27',
      },
    ],
  },
  {
    ageGroup: 'Adults',
    color: 'border-secondary',
    factors: [
      {
        title: 'Heart health',
        text: 'Maintaining cardiovascular health is extremely important for people of all ages, but poor health outcomes are particularly risky for both adults and seniors. Loneliness is associated with all types of heart disease, including ischemic heart disease, arrhythmia, heart failure, and heart valve disease. Among those with coronary artery disease, the lonely are two times more at risk of cardiac death.',
        refs: '28,29',
      },
      {
        title: 'Self-preservation',
        text: 'Lonely people focus more on self-preservation and become more defensive in the face of their environments. As a survival mechanism, the brain is wired to focus on the self instead of caring for those around. Unfortunately for the person, this can backfire and make themselves even more unpleasant to be around, leading to more and more negative social encounters and fewer people willing to be around them.',
        refs: '30',
      },
      {
        title: 'Social loss',
        text: 'Because many people identify themselves in terms of their relationships, losing a spouse or friend to distance or death can be a very painful experience, both emotional and physical. While the likelihood of losing someone is equal across age groups, many adults see some of their friendships weaken as a product of building a family or experience the passing of a parent or spouse. In terms of life satisfaction, when we break a social tie, it is similar to suffering $90,000 loss in annual income.',
        refs: '14,31',
      },
    ],
  },
  {
    ageGroup: 'Aging Adults',
    color: 'border-tertiary',
    factors: [
      {
        title: 'Companionship',
        text: 'Aging adults are most lonely when they are not involved in activities that build social connections such as volunteering, religious services, family time, or other community participation. In fact, 40% of seniors report television as their main companion. While technology such as the internet and television can be a helpful tool to alleviate isolation, contact with other humans brings the most fulfillment.',
        refs: '16,32',
      },
      {
        title: 'The home',
        text: 'Being able to maintain one\u2019s own home promotes confidence and well-being in older people. Not only does it offer a sense of control and contribution, but a level of independence strengthened by opportunities to stay active and gather with friends in their community.',
        refs: '32',
      },
      {
        title: 'Long term partner',
        text: 'Many people live with a long-term partner into old age, and a large majority of people rely on their partners as a primary source of social support. However, aging can bring unexpected medical events and even death, leaving the healthy or surviving partner to suffer harmful effects to mental and physical health. Additionally, the percent of widows living with a child has decreased significantly in the last 100 years: from 70% to 20%. This means that aging adults who have lost their spouse are much more likely to live alone than with family.',
        refs: '16,33',
      },
    ],
  },
]

export default function LonelinessInOurHumanCodePage() {
  return (
    <div>
      <SetCaseStudyHero
        image={cloudfrontImage(
          '/images/features/loneliness-in-our-human-code/loneliness-hero.jpg'
        )}
      />

      {/* Content */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h1 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light">
            Loneliness in our Human Code
          </h1>

          <p className="leading-relaxed mb-4">
            Among social determinants of health, loneliness can hugely impact a
            person&apos;s mental state, physical health, and overall wellbeing.
            In this brief, we explore how social determinants of health, with a
            focus on loneliness, affect health over the course of a lifespan,
            taking into consideration the unique circumstances and needs at each
            stage of life.
          </p>

          <div className="mb-8 text-center">
            <Button
              href="https://www.goinvo.com/pdf/vision/loneliness-in-our-human-code/loneliness-in-our-human-code.pdf"
              variant="secondary"
              external
            >
              Download PDF
            </Button>
          </div>

          {/* Stat Grid */}
          <h2 className="font-serif text-2xl mt-8 mb-4">
            Social isolation costs us...
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <div className="mb-2">
                <span className="font-serif text-[2.5rem] lg:text-[3.5rem] leading-none font-light">
                  8
                </span>
                <span className="font-serif text-2xl lg:text-3xl font-light">
                  {' '}
                  years
                </span>
              </div>
              <p className="text-gray">
                of life lost, or the equivalent of smoking 15 cigarettes a day
                <sup>
                  <a href="#references" className="text-secondary">
                    1
                  </a>
                </sup>
              </p>
            </div>
            <div>
              <div className="mb-2">
                <span className="font-serif text-[2.5rem] lg:text-[3.5rem] leading-none font-light">
                  $6.7
                </span>
                <span className="font-serif text-2xl lg:text-3xl font-light">
                  B
                </span>
              </div>
              <p className="text-gray">
                dollars in additional federal spending, every year
                <sup>
                  <a href="#references" className="text-secondary">
                    2
                  </a>
                </sup>
              </p>
            </div>
          </div>

          <Divider />

          {/* Health Risks Section */}
          <h2 className="font-serif text-2xl mt-8 mb-2">
            When we feel excluded, we lose our fight against disease.
          </h2>

          <h4 className="header-md mb-6">
            It increases our risk for
            <sup>
              <a href="#references" className="text-secondary">
                3,4
              </a>
            </sup>
          </h4>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            {healthRisks.map((risk) => (
              <div
                key={risk.key}
                className="flex flex-col items-center justify-center p-4 bg-gray-lightest rounded-lg text-center"
              >
                <div className="w-16 h-16 rounded-full bg-white border-2 border-secondary flex items-center justify-center mb-3">
                  <span className="text-secondary text-xs font-bold uppercase">
                    {risk.name.charAt(0)}
                  </span>
                </div>
                <p className="text-gray text-sm">{risk.name}</p>
              </div>
            ))}
          </div>

          <h4 className="header-md mb-6">
            It increases impacts for our body&apos;s functions
            <sup>
              <a href="#references" className="text-secondary">
                4,5,6,7
              </a>
            </sup>
          </h4>

          <div className="grid grid-cols-2 md:grid-cols-2 gap-4 mb-8">
            {bodyImpacts.map((impact) => (
              <div
                key={impact.key}
                className="flex flex-col items-center justify-center p-4 bg-gray-lightest rounded-lg text-center"
              >
                <div className="w-16 h-16 rounded-full bg-white border-2 border-primary flex items-center justify-center mb-3">
                  <span className="text-primary text-xs font-bold uppercase">
                    {impact.name.charAt(0)}
                  </span>
                </div>
                <p className="text-gray text-sm">{impact.name}</p>
              </div>
            ))}
          </div>

          <Divider />

          {/* It's not just a feeling */}
          <h2 className="font-serif text-2xl mt-8 mb-2">
            It&apos;s not just a feeling.
          </h2>
          <h4 className="header-md mb-6">Loneliness...</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <h4 className="header-md mb-2">Is a co-morbidity</h4>
              <p className="text-gray">
                We feel lonely when our current number of social relations (and
                the quality of those) do not match what we desire. This feeling
                can lead to a loss of our sense of belongingness, satisfaction
                with life, and is associated with the onset of co-occurring
                physical and mental illnesses.
                <sup>
                  <a href="#references" className="text-secondary">
                    8,18
                  </a>
                </sup>
              </p>
            </div>
            <div>
              <h4 className="header-md mb-2">Manifests as physical pain</h4>
              <p className="text-gray">
                A broken heart exhibits similar physical pain levels as a broken
                limb because our nervous system processes social rejection in the
                same area of the brain as physical pain. Evolution has wired
                socialization into the brain&apos;s automatic reflexes on account
                of human contact dramatically increasing our chances of survival.
                <sup>
                  <a href="#references" className="text-secondary">
                    14,15
                  </a>
                </sup>
              </p>
            </div>
            <div>
              <h4 className="header-md mb-2">
                Is a dysfunction of the brain
              </h4>
              <p className="text-gray">
                The default for the human brain is to assess and respond to our
                social context and stimuli, otherwise known as our &ldquo;default
                network&rdquo;. When we feel socially fulfilled, there is a boost
                in our brain&apos;s reward center (activating dopamine and
                oxytocin) along with healthy function in the parts of our brain
                that process social exclusion.
                <sup>
                  <a href="#references" className="text-secondary">
                    11,12,13
                  </a>
                </sup>
              </p>
            </div>
            <div>
              <h4 className="header-md mb-2">Can affect gene expression</h4>
              <p className="text-gray">
                Studies have found that there may be genomic and hereditary
                indicators for loneliness, including a study of older people that
                found 209 abnormally expressed genes in their lonely group. In
                the lonely people, genes in charge of activating inflammation
                were over-expressed while those regulating antiviral and antibody
                mechanisms were under-expressed.
                <sup>
                  <a href="#references" className="text-secondary">
                    6,9,10
                  </a>
                </sup>
              </p>
            </div>
          </div>

          <Divider />

          {/* Causes and Consequences / Timeline */}
          <h2 className="font-serif text-2xl mt-8 mb-2">
            The causes and consequences are unique to every person.
          </h2>
          <p className="text-gray mb-8">
            Take a look at how social connection varies across our lifespan
          </p>

          {/* Social Timeline */}
          <div className="space-y-10">
            {timelineData.map((section) => (
              <div
                key={section.ageGroup}
                className={`border-l-4 ${section.color} pl-6`}
              >
                <h3 className="header-md text-lg mb-6">{section.ageGroup}</h3>
                <div className="space-y-6">
                  {section.factors.map((factor) => (
                    <div key={factor.title}>
                      <h4 className="header-md text-base mb-1">
                        {factor.title}
                      </h4>
                      <p className="text-gray">
                        {factor.text}
                        <sup>
                          <a href="#references" className="text-secondary">
                            {factor.refs}
                          </a>
                        </sup>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <Divider />

          {/* Resilience / Closing */}
          <h2 className="font-serif text-2xl mt-8 mb-4 text-center">
            Resilience in Our Human Code
          </h2>
          <p className="text-gray mb-6">
            While these are statistically relevant, humans have the ability to
            survive and surpass their circumstances to live full and healthy
            lives. Loneliness, and other social, circumstantial, and behavioral{' '}
            <Link
              href="/vision/determinants-of-health"
              className="text-secondary underline"
            >
              determinants
            </Link>{' '}
            have as much impact on your health as your biology or genetics. If
            you or someone you know is feeling lonely, check out resources in
            your neighborhood or reach out to talk to someone. Sometimes a
            little bit of human contact can go a long way towards living a
            healthier life.
          </p>

          <h4 className="header-md mb-4">
            Take Steps Now
            <sup>
              <a href="#references" className="text-secondary">
                34
              </a>
            </sup>
          </h4>
          <ul className="list-disc list-inside text-gray space-y-3 mb-8">
            <li>
              <a
                href="https://www.nami.org/Find-Support/NAMI-Programs"
                target="_blank"
                rel="noopener noreferrer"
                className="text-secondary underline"
              >
                The National Alliance on Mental Health
              </a>{' '}
              provides education, outreach, and advocacy and support services.
              Call the NAMI helpline{' '}
              <a href="tel:800-950-6264" className="text-secondary underline">
                800-950-NAMI
              </a>{' '}
              for immediate support.
            </li>
            <li>
              Services like{' '}
              <a
                href="https://www.betterhelp.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-secondary underline"
              >
                BetterHelp
              </a>{' '}
              and{' '}
              <a
                href="https://www.talkspace.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-secondary underline"
              >
                TalkSpace
              </a>{' '}
              provide virtual counseling with a licensed therapist, making it
              easier than ever to find support.
            </li>
            <li>
              <a
                href="https://www.meetup.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-secondary underline"
              >
                MeetUp.com
              </a>{' '}
              can help you find people or groups near you who share common
              interests.
            </li>
            <li>
              The{' '}
              <a
                href="https://www.aspca.org/adopt-pet"
                target="_blank"
                rel="noopener noreferrer"
                className="text-secondary underline"
              >
                ASPCA
              </a>{' '}
              or your local animal shelter can help you find a furry best friend.
            </li>
            <li>
              Learn more about the{' '}
              <Link
                href="/vision/determinants-of-health"
                className="text-secondary underline"
              >
                social determinants of health
              </Link>{' '}
              and how it can impact your overall health.
            </li>
          </ul>

          {/* Care Card Image */}
          <div className="mb-8">
            <Image
              src={cloudfrontImage(
                '/images/features/loneliness-in-our-human-code/care-card-tell-someone.jpg'
              )}
              alt="Care card - tell someone"
              width={1200}
              height={800}
              className="w-full h-auto"
            />
          </div>
        </div>
      </section>

      {/* Authors */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h2 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light text-center">
            Authors
          </h2>
          <Author
            name="Vanessa Li"
            company="University of Washington"
            image={cloudfrontImage(
              '/images/features/loneliness-in-our-human-code/headshot-vanessa-li.jpg'
            )}
          >
            Vanessa specializes in health systems and public health modeling,
            with an emphasis in socio-structural factors of disease. At the time
            of this paper (2018), she received a Bachelor of Science in Public
            Policy with double minors in Business Economics and Global Health
            from the University of Southern California, and later a Master of
            Public Health from the University of Washington. As of 2020, Vanessa
            works as an epidemiologist at the MITRE Corporation.
          </Author>
          <Author name="Jen Patel" />

          <h3 className="header-md mt-6 mb-3">Contributors</h3>
          <Author name="Juhan Sonin" company="GoInvo, MIT" />
          <Author name="Parsuree Vatanasirisuk" />
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
