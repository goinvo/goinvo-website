/**
 * Seed Script: Populate Sanity with team member data
 *
 * Downloads headshot images from CloudFront, uploads to Sanity,
 * and creates team member documents with bios, social links, and ordering.
 *
 * Run with:
 *   SANITY_PROJECT_ID=x SANITY_API_TOKEN=x npx tsx scripts/seed-team-members.ts
 */

import { createClient } from '@sanity/client'

const sanityClient = createClient({
  projectId: process.env.SANITY_PROJECT_ID || '',
  dataset: process.env.SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
})

const CLOUDFRONT_BASE = 'https://dd17w042cevyt.cloudfront.net'

interface TeamMemberSeed {
  id: string
  name: string
  role: string
  bio: string
  image: string
  email?: string
  twitter?: string
  linkedin?: string
}

const teamMembers: TeamMemberSeed[] = [
  {
    id: 'team-juhan-sonin',
    name: 'Juhan Sonin',
    role: 'Director',
    bio: "Juhan Sonin leads GoInvo with expertise in healthcare design and system engineering. He's spent time at Apple, the National Center for Supercomputing Applications (NCSA), and MITRE. His work has been recognized by the New York Times, BBC, and National Public Radio (NPR) and published in The Journal of Participatory Medicine and The Lancet. He currently lectures on design and engineering at MIT.",
    image: '/images/about/headshot-juhan-sonin-2.jpg',
    email: 'juhan@goinvo.com',
    twitter: 'https://twitter.com/jsonin',
    linkedin: 'https://www.linkedin.com/in/juhansonin/',
  },
  {
    id: 'team-eric-benoit',
    name: 'Eric Benoit',
    role: 'Creative Director',
    bio: "Eric Benoit is the Creative Director of GoInvo, leading the studio's UX creation process from concept to production. Eric works as an interaction designer, experience designer, and information architect, designing better products by thoroughly understanding user behaviors, expectations, and goals. Eric's background and love for design in the context of human experience helps him transform complex information systems in healthcare and the enterprise into responsive and adaptive human-centered designs.",
    image: '/images/about/headshot-eric-benoit.jpg',
    email: 'eric@goinvo.com',
    linkedin: 'https://www.linkedin.com/in/ericbenoitdesigner/',
  },
  {
    id: 'team-jen-patel',
    name: 'Jen Patel',
    role: 'Designer, Engineer',
    bio: 'Jennifer is a designer-developer hybrid specializing in user interface design and front-end development. She creates beautiful designs using big and small data, often for health and enterprise services. Jennifer joined Invo in 2011 and is a graduate of the Rochester Institute of Technology.',
    image: '/images/about/headshot-jen-patel.jpg',
    email: 'jen@goinvo.com',
    linkedin: 'https://www.linkedin.com/in/jennifer-patel-bb118341/',
  },
  {
    id: 'team-claire-lin',
    name: 'Claire Lin',
    role: 'Designer, Engineer',
    bio: 'Claire is a designer-engineer combining architecture and product design in making healthcare digital services. She works on local, public projects on clothing recycling and neighborhood health through Design for America. Claire joined Invo in 2021 with a BA in Mechanical Engineering from Brown University.',
    image: '/images/about/headshot-claire-lin.jpg',
    email: 'claire@goinvo.com',
    linkedin: 'https://www.linkedin.com/in/byclairelin/',
  },
  {
    id: 'team-chloe-ma',
    name: 'Chloe Ma',
    role: 'Designer',
    bio: 'Chloe is a designer and researcher specializing in medical and scientific storytelling. She drives to improve healthcare equity, education, and accessibility through good design. Chloe joined Invo in 2021 with a BS in BioChemistry and Molecular Biology from Dalhousie University and a MSc in Biomedical Communication from University of Toronto.',
    image: '/images/about/headshot-chloe-ma-2.jpg',
    email: 'chloe@goinvo.com',
    linkedin: 'https://www.linkedin.com/in/chloexyma/',
  },
  {
    id: 'team-craig-mcginley',
    name: 'Craig McGinley',
    role: 'Designer, Engineer',
    bio: 'Craig is an engineer devoted to full stack design and development. He brings skillful javascripting, front-end development techniques, and application logic design to software projects. Craig joined Invo in 2014 as a Launch Academy graduate, vegan, and a musician.',
    image: '/images/about/headshot-craig-mcginley.jpg',
    email: 'craig@goinvo.com',
    linkedin: 'https://www.linkedin.com/in/craigmcginley/',
  },
  {
    id: 'team-tala-habbab',
    name: 'Tala Habbab',
    role: 'Designer',
    bio: 'Tala is a designer with a background in medical devices and product design. She creates services that improve healthcare access and understandability. Tala joined GoInvo in 2022 with a BS in Materials Science and Biomedical Engineering and a MS in Product & Service Design from Carnegie Mellon University.',
    image: '/images/about/headshot-tala-habbab.jpg',
    email: 'tala@goinvo.com',
    linkedin: 'https://www.linkedin.com/in/talahabbab/',
  },
  {
    id: 'team-shirley-xu',
    name: 'Shirley Xu',
    role: 'Designer, Engineer',
    bio: 'Shirley is a designer-engineer with a background in art, engineering, and bioinformatics. She makes complex healthcare concepts and information actionable and beautiful. Shirley holds a BS in Computer Science from University of Massachusetts Amherst and an MS in Bioinformatics from Brandeis University.',
    image: '/images/about/headshot-shirley-xu.jpg',
    email: 'shirley@goinvo.com',
    linkedin: 'https://www.linkedin.com/in/mystarryspace/',
  },
  {
    id: 'team-maverick-chan',
    name: 'Maverick Chan',
    role: 'Designer',
    bio: "Maverick is a designer with a background in architecture and public health. He works to make people's lives better by creating digital spaces and systems that support healthier living. Maverick joined GoInvo in 2024 with a BASc from McMaster University and an M.Arch from the University of British Columbia.",
    image: '/images/about/headshot-maverick-chan2.jpg',
    email: 'maverick@goinvo.com',
    linkedin: 'https://www.linkedin.com/in/maverickchan/',
  },
  {
    id: 'team-jonathan-follett',
    name: 'Jonathan Follett',
    role: 'Principal',
    bio: "As Principal of GoInvo, Jonathan is responsible for project management and design for select engagements. Jon has fifteen years of experience and has garnered several American Graphic Design Awards. Jon is an internationally published author on user experience and information design with over 25 articles published in UXmatters, Digital Web and A List Apart. His most recent book, Designing for Emerging Technologies, was published by O'Reilly Media.",
    image: '/images/about/headshot-jon-follett3.jpg',
    email: 'jon@goinvo.com',
    twitter: 'https://twitter.com/jonfollett',
    linkedin: 'https://www.linkedin.com/in/jonfollett/',
  },
]

function textToPortableText(text: string) {
  return [
    {
      _type: 'block',
      _key: Math.random().toString(36).slice(2, 10),
      style: 'normal',
      markDefs: [],
      children: [
        {
          _type: 'span',
          _key: Math.random().toString(36).slice(2, 10),
          text,
          marks: [],
        },
      ],
    },
  ]
}

async function uploadImageFromUrl(imageUrl: string, filename: string) {
  const response = await fetch(imageUrl)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${imageUrl}: ${response.statusText}`)
  }
  const buffer = Buffer.from(await response.arrayBuffer())
  const asset = await sanityClient.assets.upload('image', buffer, { filename })
  return {
    _type: 'image' as const,
    asset: {
      _type: 'reference' as const,
      _ref: asset._id,
    },
  }
}

async function seed() {
  console.log('Seeding team members to Sanity...\n')

  for (let i = 0; i < teamMembers.length; i++) {
    const member = teamMembers[i]
    console.log(`[${i + 1}/${teamMembers.length}] ${member.name}`)

    // Upload headshot image
    const imageUrl = `${CLOUDFRONT_BASE}${member.image}`
    const filename = member.image.split('/').pop() || 'headshot.jpg'
    console.log(`  Uploading image: ${filename}`)
    let image
    try {
      image = await uploadImageFromUrl(imageUrl, filename)
    } catch (err) {
      console.error(`  Failed to upload image for ${member.name}:`, err)
      image = undefined
    }

    // Build document
    const doc = {
      _id: member.id,
      _type: 'teamMember',
      name: member.name,
      role: member.role,
      bio: textToPortableText(member.bio),
      ...(image ? { image } : {}),
      social: {
        ...(member.email ? { email: member.email } : {}),
        ...(member.twitter ? { twitter: member.twitter } : {}),
        ...(member.linkedin ? { linkedin: member.linkedin } : {}),
      },
      isAlumni: false,
      order: i,
    }

    await sanityClient.createOrReplace(doc)
    console.log(`  Created: ${member.id}`)
  }

  console.log('\nDone! All team members seeded.')
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
