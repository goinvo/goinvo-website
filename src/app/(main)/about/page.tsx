import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Reveal } from '@/components/ui/Reveal'
import { SubscribeForm } from '@/components/forms/SubscribeForm'
import { cloudfrontImage } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'About GoInvo, a UX design company in Boston',
  description:
    "Over the past decade, we've created beautiful software for patients, clinicians, researchers, and administrators.",
}

const team = [
  {
    name: 'Juhan Sonin',
    title: 'Director',
    bio: "Juhan Sonin leads GoInvo with expertise in healthcare design and system engineering. He's spent time at Apple, the National Center for Supercomputing Applications (NCSA), and MITRE. His work has been recognized by the New York Times, BBC, and National Public Radio (NPR) and published in The Journal of Participatory Medicine and The Lancet. He currently lectures on design and engineering at MIT.",
    image: '/images/about/headshot-juhan-sonin-2.jpg',
    email: 'juhan@goinvo.com',
    twitter: 'https://twitter.com/jsonin',
    linkedin: 'https://www.linkedin.com/in/juhansonin/',
  },
  {
    name: 'Eric Benoit',
    title: 'Creative Director',
    bio: "Eric Benoit is the Creative Director of GoInvo, leading the studio's UX creation process from concept to production. Eric works as an interaction designer, experience designer, and information architect, designing better products by thoroughly understanding user behaviors, expectations, and goals. Eric's background and love for design in the context of human experience helps him transform complex information systems in healthcare and the enterprise into responsive and adaptive human-centered designs.",
    image: '/images/about/headshot-eric-benoit.jpg',
    email: 'eric@goinvo.com',
    linkedin: 'https://www.linkedin.com/in/ericbenoitdesigner/',
  },
  {
    name: 'Jen Patel',
    title: 'Designer, Engineer',
    bio: 'Jennifer is a designer-developer hybrid specializing in user interface design and front-end development. She creates beautiful designs using big and small data, often for health and enterprise services. Jennifer joined Invo in 2011 and is a graduate of the Rochester Institute of Technology.',
    image: '/images/about/headshot-jen-patel.jpg',
    email: 'jen@goinvo.com',
    linkedin: 'https://www.linkedin.com/in/jennifer-patel-bb118341/',
  },
  {
    name: 'Claire Lin',
    title: 'Designer, Engineer',
    bio: 'Claire is a designer-engineer combining architecture and product design in making healthcare digital services. She works on local, public projects on clothing recycling and neighborhood health through Design for America. Claire joined Invo in 2021 with a BA in Mechanical Engineering from Brown University.',
    image: '/images/about/headshot-claire-lin.jpg',
    email: 'claire@goinvo.com',
    linkedin: 'https://www.linkedin.com/in/byclairelin/',
  },
  {
    name: 'Chloe Ma',
    title: 'Designer',
    bio: 'Chloe is a designer and researcher specializing in medical and scientific storytelling. She drives to improve healthcare equity, education, and accessibility through good design. Chloe joined Invo in 2021 with a BS in BioChemistry and Molecular Biology from Dalhousie University and a MSc in Biomedical Communication from University of Toronto.',
    image: '/images/about/headshot-chloe-ma-2.jpg',
    email: 'chloe@goinvo.com',
    linkedin: 'https://www.linkedin.com/in/chloexyma/',
  },
  {
    name: 'Craig McGinley',
    title: 'Designer, Engineer',
    bio: 'Craig is an engineer devoted to full stack design and development. He brings skillful javascripting, front-end development techniques, and application logic design to software projects. Craig joined Invo in 2014 as a Launch Academy graduate, vegan, and a musician.',
    image: '/images/about/headshot-craig-mcginley.jpg',
    email: 'craig@goinvo.com',
    linkedin: 'https://www.linkedin.com/in/craigmcginley/',
  },
  {
    name: 'Tala Habbab',
    title: 'Designer',
    bio: 'Tala is a designer with a background in medical devices and product design. She creates services that improve healthcare access and understandability. Tala joined GoInvo in 2022 with a BS in Materials Science and Biomedical Engineering and a MS in Product & Service Design from Carnegie Mellon University.',
    image: '/images/about/headshot-tala-habbab.jpg',
    email: 'tala@goinvo.com',
    linkedin: 'https://www.linkedin.com/in/talahabbab/',
  },
  {
    name: 'Shirley Xu',
    title: 'Designer, Engineer',
    bio: 'Shirley is a designer-engineer with a background in art, engineering, and bioinformatics. She makes complex healthcare concepts and information actionable and beautiful. Shirley holds a BS in Computer Science from University of Massachusetts Amherst and an MS in Bioinformatics from Brandeis University.',
    image: '/images/about/headshot-shirley-xu.jpg',
    email: 'shirley@goinvo.com',
    linkedin: 'https://www.linkedin.com/in/mystarryspace/',
  },
  {
    name: 'Maverick Chan',
    title: 'Designer',
    bio: "Maverick is a designer with a background in architecture and public health. He works to make people's lives better by creating digital spaces and systems that support healthier living. Maverick joined GoInvo in 2024 with a BASc from McMaster University and an M.Arch from the University of British Columbia.",
    image: '/images/about/headshot-maverick-chan2.jpg',
    email: 'maverick@goinvo.com',
    linkedin: 'https://www.linkedin.com/in/maverickchan/',
  },
  {
    name: 'Jonathan Follett',
    title: 'Principal',
    bio: "As Principal of GoInvo, Jonathan is responsible for project management and design for select engagements. Jon has fifteen years of experience and has garnered several American Graphic Design Awards. Jon is an internationally published author on user experience and information design with over 25 articles published in UXmatters, Digital Web and A List Apart. His most recent book, Designing for Emerging Technologies, was published by O'Reilly Media.",
    image: '/images/about/headshot-jon-follett3.jpg',
    email: 'jon@goinvo.com',
    twitter: 'https://twitter.com/jonfollett',
    linkedin: 'https://www.linkedin.com/in/jonfollett/',
  },
]

const ethics = [
  {
    title: 'Speak the Truth',
    content:
      'We will be honest and objective. We will be transparent, and provide insight into our thinking and work.',
  },
  {
    title: 'Make the World Useful, Beautiful, and Delightful',
    content:
      'We exercise the discipline required to produce ideas and things that are useful to and beautiful in the world.',
  },
  {
    title: 'Learn, Build, and Share',
    content:
      'We are curious, open creators who welcome new ideas and the input of others.',
  },
  {
    title: 'Commit to Community',
    content:
      'We protect the public by holding paramount the safety, health, welfare, and the rights of human beings.',
  },
  {
    title: 'Go like Hell',
    content:
      'We are driven and committed to what we do, putting in extra effort in our quest for exceptional results.',
  },
]

const upNext = [
  {
    title: 'Open Source Healthcare Journal',
    caption:
      'The debut issue of our Open Source Healthcare Journal, advocating innovative open source ideas to change healthcare for the better.',
    image: '/images/features/open-source-healthcare/open-source-healthcare-featured.jpg',
    link: 'https://opensourcehealthcare.org',
    external: true,
  },
  {
    title: 'Open Source Health Design',
    caption:
      "Learn about our open source projects and why we're passionate about making healthcare open.",
    image: '/images/services/hgraph-ipad.jpg',
    link: '/open-source-health-design',
  },
  {
    title: 'Print big. Print often.',
    caption:
      'In strategy, the pieces and parts are typically nested in different documents that do not allow everything to be seen at once. The ability to see everything at once, at anytime, is core to our approach.',
    image: '/images/features/print-big-print-often/print-big-print-often-featured.jpg',
    link: 'https://www.goinvo.com/features/print-big',
    external: true,
  },
]

function TeamMember({ member }: { member: (typeof team)[number] }) {
  return (
    <div className="mb-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="lg:pr-4 mb-4">
          <Image
            src={cloudfrontImage(member.image)}
            alt={member.name}
            width={500}
            height={500}
            className="w-full h-auto"
          />
        </div>
        <div className="lg:pl-4">
          <p className="font-semibold mt-0 mb-1">{member.name}</p>
          <p className="text-gray mb-0">{member.title}</p>
          <div className="flex items-center gap-2 my-2">
            {member.email && (
              <a
                href={`mailto:${member.email}`}
                className="p-2 text-black hover:text-secondary no-underline transition-colors"
                aria-label={`Email ${member.name}`}
              >
                <EmailIcon />
              </a>
            )}
            {'twitter' in member && member.twitter && (
              <a
                href={member.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-black hover:text-secondary no-underline transition-colors"
                aria-label={`${member.name} on Twitter`}
              >
                <TwitterIcon />
              </a>
            )}
            {member.linkedin && (
              <a
                href={member.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-black hover:text-secondary no-underline transition-colors"
                aria-label={`${member.name} on LinkedIn`}
              >
                <LinkedInIcon />
              </a>
            )}
          </div>
          <p className="text-gray mt-0">{member.bio}</p>
        </div>
      </div>
    </div>
  )
}

export default function AboutPage() {
  return (
    <div>
      {/* Intro */}
      <Reveal style="slide-up">
        <div className="max-width content-padding py-8 lg:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <h2 className="font-serif text-[1.5rem] leading-[2.125rem] font-light lg:pr-4">
              GoInvo is a healthcare design studio in Boston, shipping software
              for the hardest problems in care, policy, and research.
            </h2>
            <p className="text-gray lg:pl-4">
              Engineers, illustrators, designers, and developers. We make
              health software that works for the people who use it.
            </p>
          </div>
        </div>
      </Reveal>

      {/* Google Slides Embed */}
      <div className="max-width content-padding mb-8">
        <div className="aspect-video">
          <iframe
            src="https://docs.google.com/presentation/d/e/2PACX-1vQbOnDhq-ObLQhYTayN-sWzlR5MVk_Y9O12_HYPlgPBVs0xop6wF3Bs2Q6smWkSHpCCJ8Xv1SHNBmmb/embed?start=false&loop=true&delayms=3000"
            title="GoInvo Studio Plan"
            width="100%"
            height="100%"
            allowFullScreen
            className="border-0"
          />
        </div>
      </div>

      {/* Open Office Hours + Join the Team */}
      <div className="bg-blue-light py-8 lg:py-16">
        <div className="max-width content-padding">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="lg:pr-4">
              <Image
                src={cloudfrontImage('/images/about/design-markup.jpg')}
                alt="Open office hours"
                width={600}
                height={400}
                className="w-full h-auto mb-4"
              />
              <h3 className="text-[15px] font-semibold uppercase tracking-[2px] text-gray leading-[1.375rem] mb-2">
                Open office hours
              </h3>
              <p className="text-gray text-md mb-0">
                Receive design advice on your product&apos;s strategy, layout, and data
                visualization. Alternatively, meet the tribe, or plot your career direction.
              </p>
              <Link
                href="/about/open-office-hours"
                className="block w-full text-center border border-primary-light text-primary no-underline font-semibold uppercase tracking-wider text-sm py-3 mt-4 hover:bg-primary-lightest transition-colors"
              >
                Schedule a chat
              </Link>
            </div>
            <div className="lg:pl-4">
              <Image
                src={cloudfrontImage('/images/about/megan-and-claire-ultrasound.jpg')}
                alt="Join the team"
                width={600}
                height={400}
                className="w-full h-auto mb-4"
              />
              <h3 className="text-[15px] font-semibold uppercase tracking-[2px] text-gray leading-[1.375rem] mb-2">
                Join the team
              </h3>
              <p className="text-gray text-md mb-0">
                If you&apos;re an independent thinker and passionate maker hunting for meaningful
                work, give us a holler.
              </p>
              <Link
                href="/about/careers"
                className="block w-full text-center border border-primary-light text-primary no-underline font-semibold uppercase tracking-wider text-sm py-3 mt-4 hover:bg-primary-lightest transition-colors"
              >
                Careers
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Team - First 3 */}
      <Reveal style="slide-up">
        <div className="max-width content-padding py-8 lg:py-12">
          <h2 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light text-center mb-8 lg:mb-12">
            Our team
          </h2>
          {team.slice(0, 3).map((member) => (
            <TeamMember key={member.name} member={member} />
          ))}
        </div>
      </Reveal>

      {/* Your Career Awaits */}
      <div className="bg-blue-light mb-8">
        <div className="max-width content-padding">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="lg:pr-4">
              <Image
                src={cloudfrontImage('/images/about/silhouette.jpg')}
                alt="Career opportunities at GoInvo"
                width={600}
                height={400}
                className="w-full h-auto"
              />
            </div>
            <div className="lg:pl-4 py-8">
              <p className="font-semibold mt-0 mb-1">Your Career Awaits</p>
              <p className="text-gray mb-0">Designer and/or Engineer</p>
              <p className="text-gray">
                If you&apos;re looking to engage in meaningful work, learn from a
                diverse team and thrive with autonomy on complex projects, we&apos;d
                be a good fit.
              </p>
              <Link
                href="/about/careers"
                className="inline-block text-center border border-primary-light text-primary no-underline font-semibold uppercase tracking-wider text-sm py-3 px-8 hover:bg-primary-lightest transition-colors"
              >
                Learn about careers
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Team - Remaining */}
      <div className="max-width content-padding pb-8">
        {team.slice(3).map((member) => (
          <TeamMember key={member.name} member={member} />
        ))}
      </div>

      {/* Code of Ethics */}
      <Reveal style="slide-up">
        <div className="bg-gray-light py-8 lg:py-12">
          <div className="max-width content-padding">
            <h3 className="text-[15px] font-semibold uppercase tracking-[2px] text-gray leading-[1.375rem] text-center mb-4">
              Code of Ethics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              {ethics.map((ethic) => (
                <div key={ethic.title} className="mb-4">
                  <p className="font-semibold mb-1">{ethic.title}</p>
                  <p className="text-gray text-md">{ethic.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Reveal>

      {/* Matterport Office Tour */}
      <div className="max-width content-padding py-8 lg:py-16">
        <div className="aspect-video">
          <iframe
            title="GoInvo Tour"
            width="100%"
            height="100%"
            src="https://my.matterport.com/show/?m=KDRR1E7jZwf&brand=0"
            allowFullScreen
            allow="xr-spatial-tracking"
            className="border-0"
          />
        </div>
      </div>

      {/* Our Story */}
      <div className="bg-gray-light py-8 lg:py-12">
        <div className="max-width content-padding">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="lg:pr-4">
              <h3 className="text-[15px] font-semibold uppercase tracking-[2px] text-gray leading-[1.375rem] text-center mb-4">
                Our Story
              </h3>
              <p className="text-gray">
                With early roots designing for Apple, Microsoft, Oracle, and Obama&apos;s
                2008 campaign, GoInvo is now focused exclusively on healthcare. We&apos;ve
                delivered over 110 products with partners ranging from 3M, U.S. Department
                of Health and Human Services, Partners Healthcare, and a variety of
                startups.
              </p>
              <div className="flex gap-8 mt-4">
                <Link href="/about/studio-timeline">
                  Studio timeline
                </Link>
                <a href="https://www.goinvo.com/features/an-oral-history">
                  Oral history
                </a>
              </div>
            </div>
            <div className="lg:pl-4">
              <Image
                src={cloudfrontImage('/images/about/bowling.jpg')}
                alt="GoInvo team bowling"
                width={600}
                height={400}
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Newsletter */}
      <div className="py-8 lg:py-12">
        <div className="max-width-md content-padding mx-auto">
          <SubscribeForm />
        </div>
      </div>

      {/* Up Next */}
      <div className="bg-blue-light py-4 lg:py-16">
        <div className="max-width content-padding">
          <h4 className="text-sm lg:text-[15px] font-semibold uppercase tracking-[2px] text-gray leading-[1.375rem] mb-4">
            Up next
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {upNext.map((item) => {
              const inner = (
                <>
                  <div className="relative h-[260px] overflow-hidden">
                    <Image
                      src={cloudfrontImage(item.image)}
                      alt={item.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="p-4">
                    <p className="font-semibold mb-1">{item.title}</p>
                    <p className="text-gray text-md mb-0">{item.caption}</p>
                  </div>
                </>
              )
              if (item.external) {
                return (
                  <a
                    key={item.title}
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block bg-white text-black overflow-hidden shadow-card hover:shadow-card-hover transition-shadow no-underline"
                  >
                    {inner}
                  </a>
                )
              }
              return (
                <Link
                  key={item.title}
                  href={item.link}
                  className="group block bg-white text-black overflow-hidden shadow-card hover:shadow-card-hover transition-shadow no-underline"
                >
                  {inner}
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function EmailIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  )
}

function TwitterIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
    </svg>
  )
}

function LinkedInIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}
