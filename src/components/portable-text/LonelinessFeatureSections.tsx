import type { CSSProperties, ReactNode } from 'react'
import Image from 'next/image'

const ICON_BASE = '/images/features/loneliness-in-our-human-code'
const CARE_CARD_URL = 'https://cdn.sanity.io/images/a1wsimxr/production/2276515b0fe9163cda31be8488bfac1947ca7156-2000x2857.jpg'
const ORANGE_LIGHT = '#ffb992'

type RiskCard = {
  alt: string
  icon: string
  label: string
  iconClassName?: string
}

type FeelingCard = {
  title: string
  body: ReactNode
}

type TimelineItem = {
  alt: string
  icon: string
  title: string
  body: ReactNode
  iconClassName?: string
  titleClassName?: string
  titleStyle?: CSSProperties
}

type TimelineStage = {
  label: string
  items: TimelineItem[]
}

const riskRows: RiskCard[][][] = [
  [
    [
      { alt: 'heart', icon: 'organ-heart', label: 'heart disease', iconClassName: 'mt-[15px] w-[55px]' },
      { alt: 'dementia', icon: 'dementia', label: 'dementia', iconClassName: 'mt-[25px] w-[55px]' },
    ],
    [
      { alt: 'arthritis', icon: 'arthritis', label: 'arthritis', iconClassName: 'mt-[18px] w-[55px]' },
      { alt: 'diabetes', icon: 'diabetes', label: 'type-2 diabetes', iconClassName: 'mt-[30px] w-[70px]' },
    ],
  ],
  [
    [
      { alt: 'depression', icon: 'depression', label: 'depression', iconClassName: 'mt-[5px] w-[55px]' },
      { alt: 'blood pressure', icon: 'blood-pressure', label: 'high blood pressure', iconClassName: 'mt-[20px] w-[55px]' },
    ],
    [
      { alt: 'cancer', icon: 'cancer', label: 'metastatic cancer', iconClassName: 'mt-[20px] w-[55px]' },
      { alt: 'stroke', icon: 'stroke', label: 'stroke', iconClassName: 'mt-[25px] w-[55px]' },
    ],
  ],
]

const bodyFunctionRows: RiskCard[][][] = [
  [
    [
      { alt: 'blood vessel', icon: 'blood-vessel', label: 'narrowing blood vessels to preserve body heat', iconClassName: 'mt-[10px] w-[55px]' },
      { alt: 'stress', icon: 'stress', label: 'elevating levels of the stress hormone cortisol', iconClassName: 'mt-[22px] w-[70px]' },
    ],
    [
      { alt: 'antibody', icon: 'antibody', label: 'reducing antibody protection', iconClassName: 'mt-[20px] w-[55px]' },
      { alt: 'decreased cognition', icon: 'decreased-cognition', label: 'decreasing cognitive function', iconClassName: 'mt-[20px] w-[55px]' },
    ],
  ],
]

const feelingCards: FeelingCard[] = [
  {
    title: 'Is a co-morbidity',
    body: (
      <>
        We feel lonely when our current number of social relations (and the quality of those) do not match what we desire.
        This feeling can lead to a loss of our sense of belongingness, satisfaction with life, and is associated with the
        onset of co-occuring physical and mental illnesses.
        <RefSup target="references">8,18</RefSup>
      </>
    ),
  },
  {
    title: 'Manifests as physical pain',
    body: (
      <>
        A broken heart exhibits similar physical pain levels as a broken limb because our nervous system processes social
        rejection in the same area of the brain as physical pain. Evolution has wired socialization into the brain&rsquo;s
        automatic reflexes on account of human contact dramatically increasing our chances of survival.
        <RefSup target="references">14,15</RefSup>
      </>
    ),
  },
  {
    title: 'Is a dysfunction of the brain',
    body: (
      <>
        The default for the human brain is to assess and respond to our social context and stimuli, otherwise known as our
        &ldquo;default network&quot;. When we feel socially fulfilled, there is a boost in our brain&rsquo;s reward center (activating
        dopamine and oxytocin) along with healthy function in the parts of our brain that process social exclusion.
        <RefSup target="references">11,12,13</RefSup>
      </>
    ),
  },
  {
    title: 'Can affect gene expression',
    body: (
      <>
        Studies have found that there may be genomic and hereditary indicators for loneliness, including a study of older
        people that found 209 abnormally expressed genes in their lonely group. In the lonely people, genes in charge of
        activating inflammation were over-expressed while those regulating antiviral and antibody mechanisms were
        under-expressed.
        <RefSup target="references">6,9,10</RefSup>
      </>
    ),
  },
]

const timelineStages: TimelineStage[] = [
  {
    label: 'Infants',
    items: [
      {
        alt: 'baby in stroller',
        icon: 'stroller-baby',
        title: 'Early nurture',
        iconClassName: 'mt-5 h-[150px] lg:mt-[30px]',
        body: (
          <>
            Social connectedness begins when life begins, and is most impacted by the quality of early relationships with
            parents and caregivers. Close family ties including grandparents, siblings, aunts, and uncles can start building
            an infant&apos;s social support system by spending time with them in these formative years.
            <RefSup target="references">16</RefSup>
          </>
        ),
      },
      {
        alt: 'mom cuddling baby',
        icon: 'mom-cuddle-baby',
        title: 'Physical closeness',
        iconClassName: 'mt-5 h-[120px] lg:mt-[40px]',
        body: (
          <>
            Physical attachment is crucial for infants, and separation can cause high levels of anxiety. One study showed
            that tending to and cuddling hospitalized infants can increase survival rate by 20%, despite the risks of
            infection.
            <RefSup target="references">16,17</RefSup>
          </>
        ),
      },
      {
        alt: 'trees',
        icon: 'trees',
        title: 'Neighborhood conditions',
        iconClassName: 'mt-5 h-[120px]',
        body: (
          <>
            Infants who grow up in a stable neighborhood environment have an increased ability to develop strong social
            networks.
            <RefSup target="references">18,19,20</RefSup>
          </>
        ),
      },
    ],
  },
  {
    label: 'Children',
    items: [
      {
        alt: 'piggy bank',
        icon: 'money',
        title: 'Effects of poverty',
        iconClassName: 'mt-5 h-[110px] lg:mt-[50px]',
        body: (
          <>
            Living in a diverse environment allows children to make social connections that open them up for stronger
            support systems that will grow over time. Poverty serves as a barrier to social, physical, emotional,
            educational, and economic resources since the poorest communities have historically been and continue to be
            highly segregated.
            <RefSup target="references">16,21</RefSup>
          </>
        ),
      },
      {
        alt: 'parents with child',
        icon: 'family',
        title: 'Parents',
        iconClassName: 'mt-5 h-[150px] lg:mt-[60px]',
        body: (
          <>
            Parents and guardians play a huge role in children&apos;s overall wellbeing. Growing up with both parents present and
            engaged in their child&apos;s life doubles the likelihood and increases the adequacy of access to emotional,
            physical, and educational support.
            <RefSup target="references">16,21</RefSup>
          </>
        ),
      },
      {
        alt: 'speech bubbles',
        icon: 'conversation',
        title: 'Speech and language',
        iconClassName: 'mt-5 h-[120px] lg:mt-[60px]',
        body: (
          <>
            Speech and language are the two most important aspects of early childhood development, and the foundations of
            social and emotional well-being. Parents and guardians can help with this by spending time with children,
            including making and having meals, reading, and playing sports.
            <RefSup target="references">16</RefSup>
          </>
        ),
      },
    ],
  },
  {
    label: 'Adolescents',
    items: [
      {
        alt: 'bed',
        icon: 'sleep',
        title: 'Sleep',
        iconClassName: 'mt-5 h-[120px] lg:mt-[60px]',
        body: (
          <>
            People who report getting enough sleep are 70-80% less likely to feel a lack of companionship. While this is
            true for all ages, adolescents are particularly at risk with a decreased production of melatonin (sleep hormone)
            compared to that of young children. Additionally, use of electronic devices late into the night have been found
            to impair sleep.
            <RefSup target="references">23,24</RefSup>
          </>
        ),
      },
      {
        alt: 'child with two parents',
        icon: 'family',
        title: 'Parent-child relationship',
        iconClassName: 'mt-5 h-[150px] lg:mt-[60px]',
        body: (
          <>
            The relationship between a parent and child is crucial to lifelong health and well-being. In fact, having a
            strong connection with a father figure decreases the likelihood by 68% of consuming alcohol, tobacco products,
            and drugs in their teenage years, and are less likely to participate in juvenile delinquency. Religious,
            community, big brother, and big sister programs, as well as supportive educators are key at this stage to fill
            any gaps that exist in a child&apos;s support system.
            <RefSup target="references">22</RefSup>
          </>
        ),
      },
      {
        alt: 'three friends',
        icon: 'peers',
        title: 'Peer influence',
        iconClassName: 'mt-5 h-[100px] lg:mt-[60px]',
        body: (
          <>
            A major component of adolescent growth is gaining independence and a sense of identity. Often, this leads to
            conflict with parents and a tendency to turn to peers for guidance and support. However, at this time,
            adolescents can be susceptible to peers who exert negative influence. Finding a peer group that exerts positive
            influences leads to building a strong support system.
            <RefSup target="references">16,25</RefSup>
          </>
        ),
      },
    ],
  },
  {
    label: 'Emerging Adults',
    items: [
      {
        alt: 'winding path with varying jobs and relationships',
        icon: 'path',
        title: 'A time of change',
        iconClassName: 'mt-5 h-[160px] lg:mt-[100px]',
        body: (
          <>
            Emerging adulthood is a time of exploration and change, including testing different careers, values,
            relationships, and geographic residences that may mean leaving family for the first time. This change is often
            characterized by the constant forming, breaking, and reforming of social bonds. This is why having a constant
            source of social support can have major impacts on health and life satisfaction. In fact, if a person has a
            friend they see on most days, it has a similar impact on life satisfaction as would earning an extra $100,00 of
            income.
            <RefSup target="references">14,16</RefSup>
          </>
        ),
      },
      {
        alt: 'activity, healthy food, and safe sex',
        icon: 'health-behavior',
        title: 'Healthy behaviors',
        iconClassName: 'mt-5 h-[160px] lg:mt-[30px]',
        body: (
          <>
            A feeling of connectedness and belonging is correlated with a host of healthy behaviors including exercise, a
            wholesome diet, and safe sex. Supporting your body strengthens your mind and increases your ability to emotionally
            connect with others.
            <RefSup target="references">26</RefSup>
          </>
        ),
      },
      {
        alt: 'pills, bottle, shotglass',
        icon: 'substance-use',
        title: 'Substance use',
        iconClassName: 'mt-5 h-[150px] lg:mt-[60px]',
        body: (
          <>
            Many emerging adults value peer opinions and actions as guidance for their own. During this time, individuals may
            experiment with alcohol and drugs as part of socializing. Males disproportionately consider drinking-related
            activities as a way to foster intimacy and closeness with peers, while females rely more on self-disclosure or
            sharing multiple activities.
            <RefSup target="references">26,27</RefSup>
          </>
        ),
      },
    ],
  },
  {
    label: 'Adults',
    items: [
      {
        alt: 'heart',
        icon: 'organ-heart',
        title: 'Heart health',
        iconClassName: 'mt-5 h-[120px] lg:mt-[90px]',
        titleStyle: { fontWeight: 700 },
        body: (
          <>
            Maintaining cardiovascular health is extremely important for people of all ages, but poor health outcomes are
            particularly risky for both adults and seniors. Loneliness is associated with all types of heart disease,
            including ischemic heart disease, arrhythmia, heart failure, and heart valve disease. Among those with coronary
            artery disease, the lonely are two times more at risk of cardiac death.
            <RefSup target="references">28,29</RefSup>
          </>
        ),
      },
      {
        alt: 'umbrella',
        icon: 'self-preservation',
        title: 'Self-preservation',
        iconClassName: 'mt-5 h-[120px] lg:mt-[60px]',
        body: (
          <>
            Lonely people focus more on self-preservation and become more defensive in the face of their environments. As a
            survival mechanism, the brain is wired to focus on the self instead of caring for those around. Unfortunately for
            the person, this can backfire and make themselves even more unpleasant to be around, leading to more and more
            negative social encounters and fewer people willing to be around them.
            <RefSup target="references">30</RefSup>
          </>
        ),
      },
      {
        alt: 'broken heart',
        icon: 'heart-break-loss',
        title: 'Social loss',
        iconClassName: 'mt-5 h-[120px] lg:mt-[120px]',
        body: (
          <>
            Because many people identify themselves in terms of their relationships, losing a spouse or friend to distance or
            death can be a very painful experience, both emotional and physical. While the likelihood of losing someone is
            equal across age groups, many adults see some of their friendships weaken as a product of building a family or
            experience the passing of a parent or spouse. In terms of life satisfaction, when we break a social tie, it is
            similar to suffering $90,000 loss in annual income.
            <RefSup target="references">14,31</RefSup>
          </>
        ),
      },
    ],
  },
  {
    label: 'Aging adults',
    items: [
      {
        alt: 'old man',
        icon: 'elderly',
        title: 'Companionship',
        iconClassName: 'mt-5 h-[150px] lg:mt-[60px]',
        body: (
          <>
            Aging adults are most lonely when they are not involved in activities that build social connections such as
            volunteering, religious services, family time, or other community participation. In fact, 40% of seniors report
            television as their main companion. While technology such as the internet and television can be a helpful tool to
            alleviate isolation, contact with other humans brings the most fulfillment.
            <RefSup target="references">16,32</RefSup>
          </>
        ),
      },
      {
        alt: 'house',
        icon: 'home',
        title: 'The home',
        iconClassName: 'mt-5 h-[120px]',
        body: (
          <>
            Being able to maintain one’s own home promotes confidence and well-being in older people. Not only does it offer
            a sense of control and contribution, but a level of independence strengthened by opportunities to stay active and
            gather with friends in their community.
            <RefSup target="references">32</RefSup>
          </>
        ),
      },
      {
        alt: 'elderly couple',
        icon: 'long-term-couple',
        title: 'Long term partner',
        iconClassName: 'mt-5 h-[190px] lg:mt-[90px]',
        body: (
          <>
            Many people live with a long-term partner into old age, and a large majority of people rely on their partners as
            a primary source of social support. However, aging can bring unexpected medical events and even death, leaving the
            healthy or surviving partner to suffer harmful effects to mental and physical health. Additionally, the percent of
            widows living with a child has decreased significantly in the last 100 years: from 70% to 20%. This means that
            aging adults who have lost their spouse are much more likely to live alone than with family.
            <RefSup target="references">16,33</RefSup>
          </>
        ),
      },
    ],
  },
]

function RefSup({ children, target = 'references' }: { children: ReactNode; target?: string }) {
  return (
    <>
      <sup>
        <a
          href={`#${target}`}
          className="!text-primary !no-underline hover:!underline hover:!text-black text-xs"
        >
          {children}
        </a>
      </sup>{' '}
    </>
  )
}

function BubbleIcon({ card }: { card: RiskCard }) {
  return (
    <div className="w-1/2 align-top md:my-0">
      <div className="mx-auto h-[100px] w-[100px] rounded-full border-[3px]" style={{ borderColor: ORANGE_LIGHT }}>
        <Image
          src={`${ICON_BASE}/${card.icon}.svg`}
          alt={card.alt}
          width={120}
          height={120}
          className={`mx-auto h-auto ${card.iconClassName || 'mt-5 w-[55px]'}`}
        />
      </div>
      <div className="px-[15px] pt-3 text-center text-gray">{card.label}</div>
    </div>
  )
}

function RiskRows({ rows }: { rows: RiskCard[][][] }) {
  return (
    <>
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="my-10 flex flex-col gap-6 md:my-0 md:flex-row md:gap-0">
          {row.map((duo, duoIndex) => (
            <div key={duoIndex} className="flex w-full md:min-w-[320px] md:flex-1">
              {duo.map((card) => (
                <BubbleIcon key={card.label} card={card} />
              ))}
            </div>
          ))}
        </div>
      ))}
    </>
  )
}

function TimelineIcon({ item }: { item: TimelineItem }) {
  return (
    <Image
      src={`${ICON_BASE}/${item.icon}.svg`}
      alt={item.alt}
      width={240}
      height={240}
      className={`mx-auto w-auto ${item.iconClassName || 'mt-5 h-[120px]'}`}
    />
  )
}

export function LonelinessIsolationCostsSection() {
  return (
    <section className="my-0">
      <div className="my-8 px-5 py-5">
        <a
          href="https://dd17w042cevyt.cloudfront.net/pdf/vision/loneliness-in-our-human-code/loneliness-in-our-human-code.pdf"
          className="mx-auto my-8 block w-full max-w-[336px] border border-primary-light px-4 py-[0.375rem] text-center text-[15px] font-semibold uppercase leading-[1.625rem] tracking-[2px] no-underline text-primary transition-all sm:w-1/2 hover:bg-primary-lightest"
        >
          Download PDF
        </a>
      </div>

      <h2 className="header-lg mb-4">Social isolation costs us...</h2>

      <div className="grid grid-cols-1 gap-y-8 lg:grid-cols-2 lg:gap-x-5">
        <div className="lg:pr-[20px]">
          <div className="flex items-baseline gap-[10px] lg:block">
            <span className="header-xl text-primary">8</span>
            <span className="header-lg text-primary">years</span>
          </div>
          <div className="max-w-[260px]">
            <p className="mt-0 text-base leading-[1.625rem] text-gray">
              of life lost, or the equivalent of smoking 15 cigarettes a day
              <RefSup target="references">1</RefSup>
            </p>
          </div>
        </div>

        <div className="lg:pr-[20px]">
          <div className="flex items-baseline gap-[10px] lg:block">
            <span className="header-xl text-primary">$6.7</span>
            <span className="header-lg text-primary">B</span>
          </div>
          <div className="max-w-[260px]">
            <p className="mt-0 text-base leading-[1.625rem] text-gray">
              dollars in additional federal spending, every year
              <RefSup target="references">2</RefSup>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

export function LonelinessRiskOverviewSection() {
  return (
    <section>
      <h2 className="header-lg mb-2">When we feel excluded, we lose our fight against disease.</h2>

      <h4 className="font-sans text-base font-semibold">
        It increases our risk for
        <RefSup target="references">3,4</RefSup>
      </h4>
      <RiskRows rows={riskRows} />

      <div className="my-10 flex justify-center md:my-0 md:justify-start">
        <div className="w-full md:w-1/2 md:min-w-[320px]">
          <div className="mx-auto h-[100px] w-[100px] rounded-full border-[3px]" style={{ borderColor: ORANGE_LIGHT }}>
            <Image
              src={`${ICON_BASE}/suicide.svg`}
              alt="suicide"
              width={120}
              height={120}
              className="mx-auto mt-5 h-auto w-[55px]"
            />
          </div>
          <div className="px-[15px] pt-3 text-center text-gray">suicide</div>
        </div>
      </div>

      <h4 className="mt-8 font-sans text-base font-semibold">
        It increases impacts for our body&apos;s functions
        <RefSup target="references">4,5,6,7</RefSup>
      </h4>
      <RiskRows rows={bodyFunctionRows} />
    </section>
  )
}

export function LonelinessFeelingSection() {
  return (
    <section>
      <h2 className="header-lg">It&apos;s not just a feeling.</h2>
      <h4 className="mb-0 font-sans text-base font-semibold">Loneliness...</h4>

      <div className="mt-4 grid grid-cols-1 gap-x-8 gap-y-6 lg:grid-cols-2">
        {feelingCards.map((card) => (
          <div key={card.title} className="lg:pr-[20px]">
            <h4 className="font-sans text-base font-semibold">{card.title}</h4>
            <p className="my-4 text-gray">{card.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

export function LonelinessTimelineSection() {
  return (
    <section>
      <h2 className="header-lg">The causes and consequences are unique to every person.</h2>
      <p className="my-4 text-gray">Take a look at how social connection varies across our lifespan</p>

      <div className="mt-8 border-l-[4px]" style={{ borderColor: ORANGE_LIGHT }}>
        {timelineStages.map((stage) => (
          <section key={stage.label} className="pl-0">
            <h3 className="header-md mb-0 flex items-center gap-5">
              <span
                aria-hidden="true"
                className="ml-[-11px] inline-block h-5 w-5 rounded-full border-[2px] bg-white"
                style={{ borderColor: ORANGE_LIGHT }}
              />
              {stage.label}
            </h3>

            {stage.items.map((item) => (
              <div
                key={`${stage.label}-${item.title}`}
                className="min-h-[200px] border-t-[2px] lg:flex"
                style={{ borderColor: ORANGE_LIGHT }}
              >
                <div className="flex justify-center lg:w-1/2">
                  <TimelineIcon item={item} />
                </div>
                <div className="pb-[30px] pl-5 lg:w-1/2 lg:pl-0">
                  <h4
                    className={`mt-6 mb-2 font-sans text-base font-semibold ${item.titleClassName || ''}`.trim()}
                    style={item.titleStyle}
                  >
                    {item.title}
                  </h4>
                  <p className="my-4 text-gray">{item.body}</p>
                </div>
              </div>
            ))}
          </section>
        ))}
      </div>
    </section>
  )
}

export function LonelinessResilienceSection() {
  return (
    <section>
      <h2 className="header-lg text-center">Resilience in Our Human Code</h2>
      <p className="my-4 text-gray">
        While these are statistically relevant, humans have the ability to survive and surpass their circumstances to live
        full and healthy lives. Loneliness, and other social, circumstantial, and behavioral{' '}
        <a href="/vision/determinants-of-health/">determinants</a>{' '}
        have as much impact on your health as your biology or genetics. If you or someone you know is feeling lonely, check
        out resources in your neighborhood or reach out to talk to someone. Sometimes a little bit of human contact can go a
        long way towards living a healthier life.
      </p>

      <div className="my-[50px]">
        <h4 className="font-sans text-base font-semibold">
          Take Steps Now
          <RefSup target="fn-34">34</RefSup>
        </h4>
        <ul className="ul text-gray">
          <li>
            <a href="https://www.nami.org/Find-Support/NAMI-Programs" target="_blank" rel="noopener noreferrer">
              The National Alliance on Mental Health
            </a>{' '}
            provides education, outreach, and advocacy and support services. Call the NAMI helpline{' '}
            <a href="tel:800-950-6264">800-950-NAMI</a>{' '}
            for immediate support.
          </li>
          <li>
            Services like{' '}
            <a href="https://www.betterhelp.com/" target="_blank" rel="noopener noreferrer">
              BetterHelp
            </a>{' '}
            and{' '}
            <a href="https://www.talkspace.com/" target="_blank" rel="noopener noreferrer">
              TalkSpace
            </a>{' '}
            provide virtual counseling with a licensed therapist, making it easier than ever to find support.
          </li>
          <li>
            <a href="https://www.meetup.com/" target="_blank" rel="noopener noreferrer">
              MeetUp.com
            </a>{' '}
            can help you find people or groups near you who share common interests.
          </li>
          <li>
            The{' '}
            <a href="https://www.aspca.org/adopt-pet" target="_blank" rel="noopener noreferrer">
              ASPCA
            </a>{' '}
            or your local animal shelter can help you find a furry best friend.
          </li>
          <li>
            Learn more about the{' '}
            <a href="/vision/determinants-of-health/">social determinants of health</a>{' '}
            and how it can impact your overall health.
          </li>
        </ul>
      </div>

      <div className="mx-auto mt-5 w-full sm:w-1/2">
        <Image
          src={CARE_CARD_URL}
          alt="Care card encouraging someone to talk to someone they trust"
          width={2000}
          height={2857}
          className="h-auto w-full rounded-[15px] shadow-[0px_1px_4px_0px_rgba(0,0,0,0.3)]"
        />
      </div>
    </section>
  )
}
