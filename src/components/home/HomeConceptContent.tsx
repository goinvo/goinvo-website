import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { HomeConceptCalendlyCta } from '@/components/home/HomeConceptCalendlyCta'
import { HomeConceptCtaLink } from '@/components/home/HomeConceptCtaLink'
import { HomeConceptInteractions } from '@/components/home/HomeConceptInteractions'
import { HomeConceptTrackedArrowLink } from '@/components/home/HomeConceptTrackedArrowLink'
import { ConceptReferenceArrow } from '@/components/home/ConceptReferenceArrow'

const imageBase = '/images/experiments/home-2026'

const logos = [
  '3M',
  'Johnson & Johnson',
  'Mass General Hospital',
  'NIH',
  'BD',
  'Walgreens',
  'MITRE',
  'State of Massachusetts',
  'Mount Sinai',
  'Partners Healthcare',
  'WuXi NextCODE',
  'Personal Genome Project',
]

const stats = [
  {
    value: '20',
    suffix: 'yrs',
    description: 'designing enterprise and healthcare software. One studio, deep specialism.',
    label: 'Founded 2009 · Boston, MA',
  },
  {
    value: '60',
    suffix: '+',
    description: 'shipped products across enterprises, hospitals, payers, federal agencies, and funded startups.',
    label: 'Full client list',
  },
  {
    value: '91',
    suffix: '%',
    description: 'of clients return for a second engagement without a pitch.',
    label: 'Retention since 2020',
  },
  {
    value: '65',
    suffix: '+',
    description: 'sponsored open source projects since 2009, used in universities and on product teams.',
    label: 'CC BY 4.0 or Apache 2.0',
  },
]

const services = [
  {
    number: '01 / Shape',
    title: 'Bring a product to life.',
    description:
      'We join at any stage, from a blank page to a stuck backlog, and design the product into shipped, adopted software.',
    href: '/work/wuxi-nextcode-familycode',
    link: 'See: WuXi NextCODE',
  },
  {
    number: '02 / Regulate',
    title: 'Make a regulated workflow usable.',
    description:
      'Clinical, payer, and patient software that satisfies HIPAA and FDA constraints without becoming unusable.',
    href: '/work/3m-coderyte',
    link: 'See: 3M CodeRyte',
  },
  {
    number: '03 / Translate',
    title: 'Turn research and IP into a product.',
    description: 'From genomic data to AI tooling, we design the thing customers actually adopt.',
    href: '/work/ipsos-facto',
    link: 'See: Ipsos Facto',
  },
]

const caseStudies = [
  {
    href: '/work/ipsos-facto',
    image: 'facto2.jpg',
    alt: 'Ipsos Facto product screens',
    category: 'Global Market Research',
    title: 'Ipsos',
    subtitle: 'Facto AI platform',
    description:
      "A global research firm's analyst workflows took weeks. Insight generation was bottlenecked behind manual coding and report-stitching.",
    outcome: '90+%',
    label: 'enterprise adoption',
  },
  {
    href: '/work/3m-coderyte',
    image: 'coderyte1.jpg',
    alt: '3M CodeRyte medical coding workspace',
    category: 'Hospital systems',
    title: '3M CodeRyte',
    subtitle: 'Medical coding workspace',
    description:
      "Memorial Hermann's coders were buried under a backlog of thousands of charts. Throughput, accuracy, and auditability all needed to move at once.",
    outcome: '200%',
    label: 'coding efficiency increase',
  },
  {
    href: '/work/mass-snap',
    image: 'snapcover.jpg',
    alt: 'State of Massachusetts SNAP application work',
    category: 'Public benefits',
    title: 'State of Massachusetts',
    subtitle: 'SNAP online application',
    description:
      'In 2017, only 7% of SNAP applicants applied online. Fax, mail, and walk-ins carried the rest of a program ~1M people rely on.',
    outcome: '7% → 70%',
    label: 'of applications now online',
  },
]

const reasons = [
  ['Software, not slides', 'Most consultants describe the future in slides. We make it tangible, a vision you can see, tap, and sell.'],
  ['We meet you at any stage', "Whether you're starting with a blank page or a build that's been stuck for months, we embed with your team and ship."],
  ['Built for regulation', 'HIPAA, FDA, payer, and federal constraints are our starting conditions, not a late surprise.'],
  ['The proof is public', 'Our open-source frameworks are used and cited across the field, including by organizations that later hired us.'],
]

const openSourceItems = [
  {
    href: '/vision/determinants-of-health',
    image: 'determinantsofhealth.jpg',
    alt: 'Determinants of Health visualization',
    eyebrow: 'Open-source framework',
    title: 'Determinants of Health',
    description:
      "A model of what actually shapes a person's health (genetics, behavior, environment, medical care, social circumstances) used in universities and on product teams.",
    cite: '2,174 citations, including Wikipedia',
  },
  {
    href: '/work/hgraph',
    image: 'hgraphipad.jpg',
    alt: 'hGraph displayed on an iPad',
    eyebrow: 'Open health visualization',
    title: 'hGraph',
    description:
      "A one-glance visualization of a patient's health metrics. Open source. Adopted by clinicians, researchers, and EHR vendors.",
    cite: 'Used by Walgreens and many other organizations',
  },
  {
    href: '/vision/precision-autism',
    image: 'precisionautismhero.jpg',
    alt: 'Precision Medicine for Autism vision artwork',
    eyebrow: 'Vision',
    title: 'Precision Medicine for Autism',
    description:
      'Mapping where autism diagnosis and care could be in 2030, from samples through wearables to a longitudinal record.',
    cite: 'Read by industry, NIH, and academia. Featured in a documentary',
  },
]

const secondaryTestimonials = [
  {
    quote: 'With Invo, design wasn\'t just design. It impacted our IP portfolio. It changed our business.',
    name: 'Serban Georgescu, MD',
    role: 'Chief Medical Officer, InfoBionic',
  },
  {
    quote: 'Invo beautifully helped shape our next-generation clinician and patient experience.',
    name: 'Igor Gershfang',
    role: 'Director, Walgreens Emerging Tech',
  },
]

const conceptButtonBase =
  'group !normal-case !tracking-normal !text-[15px] !px-[22px] !py-[14px] !gap-[10px] !rounded-[2px] hover:-translate-y-px active:translate-y-0'
const conceptButtonPrimary =
  `${conceptButtonBase} !bg-[#d94d2f] !text-white !border-[#d94d2f] hover:!bg-[#c44228] hover:!border-[#c44228] hover:shadow-[0_10px_28px_-10px_rgba(217,77,47,.55)]`
const conceptButtonDark =
  `${conceptButtonBase} !bg-[#1d1b1a] !text-[#fbfaf7] !border-[#1d1b1a] hover:!bg-black hover:!border-black hover:shadow-[0_10px_28px_-10px_rgba(29,27,26,.55)]`
const conceptButtonGhost =
  `${conceptButtonBase} !bg-transparent !text-[#1d1b1a] !border-[#1d1b1a] hover:!bg-[#1d1b1a] hover:!text-[#fbfaf7] hover:!border-[#1d1b1a]`
function revealStyle(index = 0) {
  return { '--home-concept-reveal-index': index } as React.CSSProperties
}

function ArrowLink({
  href,
  children,
  className = '',
}: {
  href: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <Link
      href={href}
      className={`home-concept-link-text group/arrowlink relative inline-flex items-center gap-2 pb-[3px] font-semibold leading-[18px] no-underline transition-opacity after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:bg-current ${className}`}
      style={{ color: 'inherit' }}
    >
      {children}
      <ConceptReferenceArrow className="shrink-0 group-hover/arrowlink:translate-x-[5px]" />
    </Link>
  )
}

interface HomeConceptContentProps {
  teamMembers?: { name: string; image: string }[]
}

export function HomeConceptContent({ teamMembers = [] }: HomeConceptContentProps = {}) {
  // A headshot grid stands in for the outdated group photo until a new one is
  // taken: ten photographed members (Jonathan Follett shown in place of Tala
  // Habbab, plus Alexandra Coston) followed by a 2-wide studio placeholder tile.
  // Falls back to the group photo if there aren't enough headshots.
  const photographed = teamMembers.filter((member) => member.image)
  const jon = photographed.find((member) => member.name === 'Jonathan Follett')
  const alexandra = photographed.find((member) => member.name === 'Alexandra Coston')
  const studioPhotos = photographed
    .slice(0, 9)
    .map((member) => (member.name === 'Tala Habbab' && jon ? jon : member))
  if (alexandra && !studioPhotos.some((member) => member.name === 'Alexandra Coston')) {
    studioPhotos.push(alexandra)
  }
  return (
    <div className="bg-[#fbfaf7] text-[#1d1b1a]">
      <HomeConceptInteractions />
      <section className="relative overflow-hidden bg-[#1d1b1a] text-white">
        <Image
          src={`${imageBase}/ipsosherodark.jpg`}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-[linear-gradient(105deg,rgba(20,18,17,.95)_0%,rgba(20,18,17,.68)_52%,rgba(20,18,17,.18)_100%)]" />
        <div className="relative max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-14 pt-[clamp(72px,10vw,120px)] pb-[clamp(72px,10vw,96px)] min-h-[clamp(480px,60vw,720px)] flex flex-col justify-center">
          <h1
            className="text-[2.25rem] leading-[1.02] sm:text-[4.5rem] font-medium tracking-[-0.025em] max-w-[16ch] mb-6"
            style={{
              viewTransitionName: 'page-title',
              fontFamily: 'adobe-jenson-pro-display, Georgia, serif',
            }}
          >
            Complex software that ships, and moves the numbers.
          </h1>
          <p className="text-lg lg:text-xl leading-8 text-white/80 max-w-[720px]">
            A design studio that turns nascent ideas into shipped software, for enterprise and healthcare leaders who need results this fiscal year.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-5">
            <HomeConceptCtaLink
              href="#book"
              label="Book a discovery call"
              location="concept hero"
              variant="primary"
              qualifiedDiscoveryCall
              className={conceptButtonPrimary}
            >
              <span>Book a discovery call</span>
              <ConceptReferenceArrow className="shrink-0 group-hover:translate-x-[5px]" />
            </HomeConceptCtaLink>
            <HomeConceptTrackedArrowLink
              href="/work"
              label="Or see the work"
              location="concept hero"
              className="text-[15px] opacity-85 hover:opacity-100"
            >
              Or see the work
            </HomeConceptTrackedArrowLink>
          </div>
          <div className="mt-14 inline-flex max-w-[480px] flex-col border border-white/15 bg-white/[.07] p-6 backdrop-blur" data-home-concept-reveal>
            <div className="font-serif text-primary font-semibold leading-none">
              <span className="text-[5.5rem] lg:text-[8rem]">90</span>
              <span className="text-3xl align-top">+%</span>
            </div>
            <div className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-white/90">Enterprise adoption</div>
            <p className="mt-3 text-sm leading-6 text-white/90">
              Ipsos Facto. The share of analysts using the AI research platform we shipped across the firm, with 10M+ API calls and 700K prompts per month.
            </p>
          </div>
        </div>
        <div className="pointer-events-none absolute bottom-5 right-5 font-mono text-[10px] uppercase tracking-[0.08em] text-white/50 sm:right-8 lg:right-14">
          Ipsos · Facto AI platform
        </div>
      </section>

      <section className="py-14 lg:py-20">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-14">
          <p className="text-center text-sm text-[#6a6560] mb-8">
            Twenty years designing enterprise and healthcare software for Fortune 500s, federal agencies, and funded startups.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 border-y border-[#d9d3c6]">
            {logos.map((logo, index) => (
              <div
                key={logo}
                className="min-h-[72px] flex items-center justify-center border-r border-b border-[#e8e3d6] px-3 py-5 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-[#6a6560] last:border-r-0"
                data-home-concept-reveal
                style={revealStyle(index % 6)}
              >
                {logo}
              </div>
            ))}
          </div>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, index) => (
              <div key={stat.label} className="border-t border-[#1d1b1a] pt-5" data-home-concept-reveal style={revealStyle(index)}>
                <div className="font-serif text-primary font-semibold leading-none">
                  <span className="text-[4rem]">{stat.value}</span>
                  <span className="text-xl align-top">{stat.suffix}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-[#3a3633]">{stat.description}</p>
                <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.16em] text-[#6a6560]">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="services" className="py-16 lg:py-24">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-14 grid gap-10 lg:grid-cols-[1fr_2.2fr]">
          <div>
            <p className="text-[11px] tracking-[0.16em] uppercase font-bold text-primary">What we do</p>
            <h2 className="font-serif text-3xl lg:text-5xl leading-tight mt-4">We design and ship enterprise software.</h2>
          </div>
          <div>
            {services.map((service, index) => (
              <div key={service.number} className="grid gap-4 border-t border-[#d9d3c6] py-7 last:border-b md:grid-cols-[110px_1fr_auto] md:items-start" data-home-concept-reveal style={revealStyle(index)}>
                <p className="text-[11px] tracking-[0.16em] uppercase font-bold text-[#6a6560]">{service.number}</p>
                <div>
                  <h3 className="font-serif text-2xl leading-tight mb-2">{service.title}</h3>
                  <p className="text-base leading-7 text-[#3a3633] max-w-[55ch]">{service.description}</p>
                </div>
                <ArrowLink href={service.href} className="whitespace-nowrap text-[13px]">
                  {service.link}
                </ArrowLink>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="work" className="py-16 lg:py-24 bg-[#f4f1ea]">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-14">
          <div className="flex flex-wrap items-end justify-between gap-6 mb-10">
            <div>
              <p className="text-[11px] tracking-[0.16em] uppercase font-bold text-primary">Selected work</p>
              <h2 className="font-serif text-3xl lg:text-5xl leading-tight mt-4 max-w-[620px]">Outcomes you can put in front of a CFO.</h2>
            </div>
            <HomeConceptTrackedArrowLink href="/work" label="See all case studies" location="concept selected work" className="text-[15px]">
              See all case studies
            </HomeConceptTrackedArrowLink>
          </div>
          <div className="grid gap-7 lg:grid-cols-3">
            {caseStudies.map((study, index) => (
              <Link key={study.href} href={study.href} className="group flex flex-col overflow-hidden border border-[#e8e3d6] bg-white no-underline text-inherit transition hover:-translate-y-1 hover:shadow-xl" data-home-concept-reveal style={revealStyle(index)}>
                <div className="relative aspect-[4/3] overflow-hidden bg-[#ece7dc]">
                  <Image
                    src={`${imageBase}/${study.image}`}
                    alt={study.alt}
                    fill
                    sizes="(min-width: 1024px) 33vw, 100vw"
                    className="object-cover transition duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-[#6a6560] mb-3">{study.category}</p>
                  <h3 className="font-serif text-2xl leading-tight">{study.title}</h3>
                  <p className="mt-1 text-xs font-semibold text-[#6a6560]">{study.subtitle}</p>
                  <p className="mt-4 text-sm leading-6 text-[#3a3633]">{study.description}</p>
                  <div className="mt-auto pt-6">
                    <div className="border-t border-[#d9d3c6] pt-5">
                      <p className="text-[11px] tracking-[0.16em] uppercase font-bold text-[#6a6560] mb-2">Outcome</p>
                      <div className="font-serif text-primary text-[3rem] leading-none font-semibold">{study.outcome}</div>
                      <p className="mt-2 text-sm text-[#3a3633]">{study.label}</p>
                    </div>
                    <span className="home-concept-link-text relative mt-5 inline-flex items-center gap-2 pb-[3px] text-sm font-semibold text-primary after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:bg-current">
                      Read the case study
                      <ConceptReferenceArrow className="shrink-0 group-hover:translate-x-[5px]" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-12 text-center">
            <HomeConceptCtaLink
              href="#book"
              label="Book a discovery call"
              location="concept selected work"
              variant="transparent"
              className={conceptButtonDark}
            >
              <span>Book a discovery call</span>
              <ConceptReferenceArrow className="shrink-0 group-hover:translate-x-[5px]" />
            </HomeConceptCtaLink>
          </div>
        </div>
      </section>

      <section id="about" className="py-16 lg:py-24">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-14 grid gap-10 lg:grid-cols-[5fr_4fr]">
          <div>
            <p className="text-[11px] tracking-[0.16em] uppercase font-bold text-primary">Why GoInvo</p>
            <h2 className="font-serif text-3xl lg:text-5xl leading-tight mt-4 mb-6">Focus and Range.</h2>
            <p className="text-lg leading-8 text-[#3a3633] max-w-[640px]">
              The generalist agencies (McKinsey Digital, Accenture Song, IDEO) staff your project from whatever practice has capacity. We staff it from a studio that has only ever designed software, with a particular depth in regulated and healthcare work.
            </p>
            <p className="mt-5 text-base leading-7 text-[#3a3633] max-w-[640px]">
              That depth is the moat: a Fortune-500-and-federal roster, a regulated-shipping track record, and a citable public body of work no boutique can match.
            </p>
          </div>
          <div>
            {reasons.map(([title, description], index) => (
              <div key={title} className="grid grid-cols-[72px_1fr] gap-5 border-t border-[#d9d3c6] py-6 last:border-b" data-home-concept-reveal style={revealStyle(index)}>
                <p className="pt-1 text-[11px] tracking-[0.16em] uppercase font-bold text-[#6a6560]">{String(index + 1).padStart(2, '0')}</p>
                <div>
                  <h3 className="font-serif text-xl leading-tight mb-2">{title}</h3>
                  <p className="text-sm leading-6 text-[#3a3633]">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="open" className="py-16 lg:py-24 bg-[#1d1b1a] text-white">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-14">
          <h2 className="font-serif text-3xl lg:text-5xl leading-tight mb-10">Open Source Design</h2>
          <div className="grid gap-6 lg:grid-cols-3">
            {openSourceItems.map((item, index) => (
              <Link key={item.href} href={item.href} className="group grid gap-5 border-t border-white/15 pt-5 text-white no-underline" data-home-concept-reveal style={revealStyle(index)}>
                <div className="relative aspect-[4/3] overflow-hidden bg-white/10">
                  <Image
                    src={`${imageBase}/${item.image}`}
                    alt={item.alt}
                    fill
                    sizes="(min-width: 1024px) 33vw, 100vw"
                    className="object-cover transition duration-700 group-hover:scale-105"
                  />
                </div>
                <div>
                  <p className="text-[11px] tracking-[0.16em] uppercase font-bold text-white/50">{item.eyebrow}</p>
                  <h3 className="font-serif text-2xl leading-tight mt-3">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-white/70">{item.description}</p>
                  <p className="mt-4 text-xs font-semibold text-primary">{item.cite}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="vision" className="py-16 lg:py-24">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-14 grid gap-10 lg:grid-cols-[1fr_1.05fr] items-center">
          <div>
            <p className="text-[11px] tracking-[0.16em] uppercase font-bold text-primary">The studio</p>
            <h2 className="font-serif text-3xl lg:text-5xl leading-tight mt-4 mb-5">
              Small by Design.
              <br />
              Heavy on Experience.
            </h2>
            <p className="text-lg leading-8 text-[#3a3633] max-w-[600px]">
              The people who scope your project are the people who do it. Boston-based and deliberately small.
            </p>
            <div className="mt-8">
              <Button href="/about" variant="outline" className={conceptButtonGhost}>
                <span>Meet the team</span>
                <ConceptReferenceArrow className="shrink-0 group-hover:translate-x-[5px]" />
              </Button>
            </div>
          </div>
          {studioPhotos.length >= 9 ? (
            <div className="grid grid-cols-3 gap-2">
              {studioPhotos.map((member) => (
                <div key={member.name} className="relative aspect-square overflow-hidden bg-[#ece7dc]">
                  <Image
                    src={member.image}
                    alt={member.name}
                    fill
                    sizes="(min-width: 1024px) 17vw, 33vw"
                    className="object-cover"
                  />
                </div>
              ))}
              {/* 2-wide studio placeholder — swap in an interior studio photo when available */}
              <div className="relative col-span-2 flex aspect-[2/1] items-center justify-center overflow-hidden bg-[#ece7dc]">
                <Image
                  src={`${imageBase}/goinvologodark.png`}
                  alt="Inside the GoInvo studio"
                  width={160}
                  height={48}
                  className="h-auto w-[42%] max-w-[180px] object-contain opacity-80"
                />
              </div>
            </div>
          ) : (
            <div className="relative block aspect-[5/4] overflow-hidden bg-[#ece7dc]">
              <Image
                src={`${imageBase}/teamphoto.jpg`}
                alt="GoInvo team"
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
          )}
        </div>
      </section>

      <section className="py-16 lg:py-24 bg-[#f4f1ea]">
        <div className="max-w-[920px] mx-auto px-5 sm:px-8 text-center">
          <p className="text-[11px] tracking-[0.16em] uppercase font-bold text-primary">Testimonials</p>
          <blockquote className="mt-8 font-serif text-3xl lg:text-5xl leading-tight">
            &quot;I haven&apos;t yet figured out how they know so much about medicine and its future.&quot;
          </blockquote>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Image
              src={`${imageBase}/eric-topol.jpg`}
              alt="Eric Topol"
              width={72}
              height={72}
              className="h-[72px] w-[72px] shrink-0 rounded-full object-cover"
            />
            <p className="text-left text-sm text-[#6a6560]">
              <span className="block font-bold text-[#1d1b1a]">Eric Topol, MD</span>
              Founder, Scripps Research Translational Institute
            </p>
          </div>
          <div className="mt-14 grid gap-8 border-t border-[#d9d3c6] pt-10 text-left md:grid-cols-2">
            {secondaryTestimonials.map((testimonial) => (
              <div key={testimonial.name}>
                <p className="font-serif text-xl lg:text-2xl leading-snug">&quot;{testimonial.quote}&quot;</p>
                <p className="mt-4 text-sm text-[#6a6560]">
                  <span className="block font-bold text-[#1d1b1a]">{testimonial.name}</span>
                  {testimonial.role}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <HomeConceptCalendlyCta />
    </div>
  )
}
