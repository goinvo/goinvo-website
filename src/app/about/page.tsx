import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/Button'
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

function TeamMemberCard({ member }: { member: typeof team[number] }) {
  return (
    <div className="mb-12">
      <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-6">
        <div>
          <Image
            src={cloudfrontImage(member.image)}
            alt={member.name}
            width={200}
            height={200}
            className="w-[200px] h-[200px] object-cover grayscale"
          />
        </div>
        <div>
          <h3 className="font-semibold mb-1">{member.name}</h3>
          <p className="text-gray text-sm mb-2">{member.title}</p>
          <p className="text-gray text-md mb-3">{member.bio}</p>
          <div className="flex gap-4">
            <a href={`mailto:${member.email}`} className="text-primary text-sm">
              {member.email}
            </a>
            <a href={member.linkedin} target="_blank" rel="noopener noreferrer" className="text-primary text-sm">
              LinkedIn
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AboutPage() {
  return (
    <div className="pt-[var(--spacing-header-height)]">
      {/* Hero */}
      <section
        className="relative min-h-[60vh] flex items-center bg-cover bg-center"
        style={{
          backgroundImage: `url(${cloudfrontImage('/images/about/care-cards-hand.jpg')})`,
          viewTransitionName: 'hero-image',
        }}
      >
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 max-width content-padding py-16">
          <h1 className="font-serif text-3xl md:text-4xl text-white" style={{ viewTransitionName: 'page-title' }}>
            Our shared purpose:<br />
            better systems +<br />
            better lives thru design<span className="text-primary font-serif">.</span>
          </h1>
        </div>
      </section>

      {/* Intro */}
      <Reveal style="slide-up">
        <section className="py-16 md:py-24">
          <div className="max-width content-padding">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <h2 className="font-serif text-2xl">
                GoInvo is a digital design studio in Boston, crafting the future of
                software through strategy, creativity, and vision.
              </h2>
              <p className="text-gray">
                With backgrounds in engineering, illustration, design, and software
                development, we share a foundational technical and creative expertise in
                the shared pursuit of impact for good.
              </p>
            </div>
          </div>
        </section>
      </Reveal>

      {/* Google Slides Embed */}
      <section className="py-8">
        <div className="max-width content-padding">
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
      </section>

      {/* CTAs */}
      <section className="bg-blue-light py-16">
        <div className="max-width content-padding">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <Image
                src={cloudfrontImage('/images/about/design-markup.jpg')}
                alt="Open office hours"
                width={600}
                height={400}
                className="w-full h-auto mb-6"
              />
              <h3 className="font-semibold mb-2">Open office hours</h3>
              <p className="text-gray text-md mb-4">
                Receive design advice on your product&apos;s strategy, layout, and data
                visualization. Alternatively, meet the tribe, or plot your career direction.
              </p>
              <Button href="/about/open-office-hours" variant="secondary">
                Schedule a chat
              </Button>
            </div>
            <div>
              <Image
                src={cloudfrontImage('/images/about/megan-and-claire-ultrasound.jpg')}
                alt="Join the team"
                width={600}
                height={400}
                className="w-full h-auto mb-6"
              />
              <h3 className="font-semibold mb-2">Join the team</h3>
              <p className="text-gray text-md mb-4">
                If you&apos;re an independent thinker and passionate maker hunting for meaningful
                work, give us a holler.
              </p>
              <Button href="/about/careers" variant="secondary">
                Careers
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Team - First 3 */}
      <Reveal style="slide-up">
        <section className="py-16 md:py-24">
          <div className="max-width content-padding">
            <h2 className="font-serif text-3xl text-center mb-12">Our team</h2>
            {team.slice(0, 3).map((member) => (
              <TeamMemberCard key={member.name} member={member} />
            ))}
          </div>
        </section>
      </Reveal>

      {/* Your Career Awaits */}
      <section className="bg-blue-light py-16">
        <div className="max-width content-padding">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <Image
                src={cloudfrontImage('/images/about/silhouette.jpg')}
                alt="Career opportunities at GoInvo"
                width={600}
                height={400}
                className="w-full h-auto"
              />
            </div>
            <div>
              <p className="font-semibold mb-1">Your Career Awaits</p>
              <p className="text-gray mb-0">Designer and/or Engineer</p>
              <p className="text-gray mb-4">
                If you&apos;re looking to engage in meaningful work, learn from a
                diverse team and thrive with autonomy on complex projects, we&apos;d
                be a good fit.
              </p>
              <Button href="/about/careers" variant="secondary" size="lg">
                Learn about careers
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Team - Remaining */}
      <section className="py-16">
        <div className="max-width content-padding">
          {team.slice(3).map((member) => (
            <TeamMemberCard key={member.name} member={member} />
          ))}
        </div>
      </section>

      {/* Code of Ethics */}
      <Reveal style="slide-up">
        <section className="bg-gray-light py-16">
          <div className="max-width content-padding">
            <h3 className="font-semibold text-center mb-8">Code of Ethics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {ethics.map((ethic) => (
                <div key={ethic.title}>
                  <p className="font-semibold mb-1">{ethic.title}</p>
                  <p className="text-gray text-md">{ethic.content}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </Reveal>

      {/* Our Story */}
      <section className="bg-gray-light py-16">
        <div className="max-width content-padding">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <h3 className="font-semibold text-center mb-4">Our Story</h3>
              <p className="text-gray">
                With early roots designing for Apple, Microsoft, Oracle, and Obama&apos;s
                2008 campaign, GoInvo is now focused exclusively on healthcare. We&apos;ve
                delivered over 110 products with partners ranging from 3M, U.S. Department
                of Health and Human Services, Partners Healthcare, and a variety of
                startups.
              </p>
              <div className="flex gap-6 mt-4">
                <Link href="/about/studio-timeline" className="text-primary text-sm">
                  Studio timeline
                </Link>
                <a href="https://www.goinvo.com/features/an-oral-history" className="text-primary text-sm">
                  Oral history
                </a>
              </div>
            </div>
            <div>
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
      </section>

      {/* 3D Tour */}
      <section className="py-16">
        <div className="max-width content-padding">
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
      </section>

      {/* Newsletter */}
      <section className="py-16">
        <div className="max-width-md content-padding mx-auto">
          <SubscribeForm />
        </div>
      </section>

      {/* Up Next */}
      <section className="bg-gray-light py-16">
        <div className="max-width content-padding">
          <h2 className="font-serif text-2xl mb-8 text-center">Up next</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <a
              href="https://opensourcehealthcare.org"
              target="_blank"
              rel="noopener noreferrer"
              className="group block bg-white overflow-hidden shadow-card hover:shadow-card-hover transition-shadow"
            >
              <div className="aspect-[16/10] overflow-hidden">
                <Image
                  src={cloudfrontImage('/images/features/open-source-healthcare/open-source-healthcare-featured.jpg')}
                  alt="Open Source Healthcare Journal"
                  width={500}
                  height={312}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">
                  Open Source Healthcare Journal
                </h3>
                <p className="text-gray text-md">The debut issue of our Open Source Healthcare Journal, advocating innovative open source ideas to change healthcare for the better.</p>
              </div>
            </a>
            <Link
              href="/open-source-health-design"
              className="group block bg-white overflow-hidden shadow-card hover:shadow-card-hover transition-shadow"
            >
              <div className="aspect-[16/10] overflow-hidden">
                <Image
                  src={cloudfrontImage('/images/services/hgraph-ipad.jpg')}
                  alt="Open Source Health Design"
                  width={500}
                  height={312}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">
                  Open Source Health Design
                </h3>
                <p className="text-gray text-md">Learn about our open source projects and why we&apos;re passionate about making healthcare open.</p>
              </div>
            </Link>
            <a
              href="https://www.goinvo.com/features/print-big"
              target="_blank"
              rel="noopener noreferrer"
              className="group block bg-white overflow-hidden shadow-card hover:shadow-card-hover transition-shadow"
            >
              <div className="aspect-[16/10] overflow-hidden">
                <Image
                  src={cloudfrontImage('/images/features/print-big-print-often/print-big-print-often-featured.jpg')}
                  alt="Print big. Print often."
                  width={500}
                  height={312}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">
                  Print big. Print often.
                </h3>
                <p className="text-gray text-md">In strategy, the pieces and parts are typically nested in different documents that do not allow everything to be seen at once. The ability to see everything at once, at anytime, is core to our approach.</p>
              </div>
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
