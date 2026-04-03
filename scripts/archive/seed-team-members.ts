/**
 * Seed Script: Populate Sanity with team member data
 *
 * Downloads headshot images from CloudFront, uploads to Sanity,
 * and creates team member documents with bios, social links, and ordering.
 *
 * Run with:
 *   npx tsx scripts/seed-team-members.ts
 *
 * Uses env vars from .env.local automatically via dotenv.
 * Or override with: SANITY_PROJECT_ID=x SANITY_API_TOKEN=x npx tsx scripts/seed-team-members.ts
 */

import { createClient } from '@sanity/client'
import { config } from 'dotenv'

config({ path: '.env.local' })

const sanityClient = createClient({
  projectId: process.env.SANITY_PROJECT_ID || process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '',
  dataset: process.env.SANITY_DATASET || process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_TOKEN || process.env.SANITY_WRITE_TOKEN,
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
  isAlumni: boolean
  order?: number
}

// ── Current Team ──────────────────────────────────────────────────────────────

const currentTeam: TeamMemberSeed[] = [
  {
    id: 'team-juhan-sonin',
    name: 'Juhan Sonin',
    role: 'Director',
    bio: "Juhan Sonin leads GoInvo with expertise in healthcare design and system engineering. He's spent time at Apple, the National Center for Supercomputing Applications (NCSA), and MITRE. His work has been recognized by the New York Times, BBC, and National Public Radio (NPR) and published in The Journal of Participatory Medicine and The Lancet. He currently lectures on design and engineering at MIT.",
    image: '/images/about/headshot-juhan-sonin-2.jpg',
    email: 'juhan@goinvo.com',
    twitter: 'https://twitter.com/jsonin',
    linkedin: 'https://www.linkedin.com/in/juhansonin/',
    isAlumni: false,
    order: 0,
  },
  {
    id: 'team-eric-benoit',
    name: 'Eric Benoit',
    role: 'Creative Director',
    bio: "Eric Benoit is the Creative Director of GoInvo, leading the studio's UX creation process from concept to production. Eric works as an interaction designer, experience designer, and information architect, designing better products by thoroughly understanding user behaviors, expectations, and goals. Eric's background and love for design in the context of human experience helps him transform complex information systems in healthcare and the enterprise into responsive and adaptive human-centered designs.",
    image: '/images/about/headshot-eric-benoit.jpg',
    email: 'eric@goinvo.com',
    linkedin: 'https://www.linkedin.com/in/ericbenoitdesigner/',
    isAlumni: false,
    order: 1,
  },
  {
    id: 'team-jen-patel',
    name: 'Jen Patel',
    role: 'Designer, Engineer',
    bio: 'Jennifer is a designer-developer hybrid specializing in user interface design and front-end development. She creates beautiful designs using big and small data, often for health and enterprise services. Jennifer joined Invo in 2011 and is a graduate of the Rochester Institute of Technology.',
    image: '/images/about/headshot-jen-patel.jpg',
    email: 'jen@goinvo.com',
    linkedin: 'https://www.linkedin.com/in/jennifer-patel-bb118341/',
    isAlumni: false,
    order: 2,
  },
  {
    id: 'team-claire-lin',
    name: 'Claire Lin',
    role: 'Designer, Engineer',
    bio: 'Claire is a designer-engineer combining architecture and product design in making healthcare digital services. She works on local, public projects on clothing recycling and neighborhood health through Design for America. Claire joined Invo in 2021 with a BA in Mechanical Engineering from Brown University.',
    image: '/images/about/headshot-claire-lin.jpg',
    email: 'claire@goinvo.com',
    linkedin: 'https://www.linkedin.com/in/byclairelin/',
    isAlumni: false,
    order: 3,
  },
  {
    id: 'team-chloe-ma',
    name: 'Chloe Ma',
    role: 'Designer',
    bio: 'Chloe is a designer and researcher specializing in medical and scientific storytelling. She drives to improve healthcare equity, education, and accessibility through good design. Chloe joined Invo in 2021 with a BS in BioChemistry and Molecular Biology from Dalhousie University and a MSc in Biomedical Communication from University of Toronto.',
    image: '/images/about/headshot-chloe-ma-2.jpg',
    email: 'chloe@goinvo.com',
    linkedin: 'https://www.linkedin.com/in/chloexyma/',
    isAlumni: false,
    order: 4,
  },
  {
    id: 'team-craig-mcginley',
    name: 'Craig McGinley',
    role: 'Designer, Engineer',
    bio: 'Craig is an engineer devoted to full stack design and development. He brings skillful javascripting, front-end development techniques, and application logic design to software projects. Craig joined Invo in 2014 as a Launch Academy graduate, vegan, and a musician.',
    image: '/images/about/headshot-craig-mcginley.jpg',
    email: 'craig@goinvo.com',
    linkedin: 'https://www.linkedin.com/in/craigmcginley/',
    isAlumni: false,
    order: 5,
  },
  {
    id: 'team-tala-habbab',
    name: 'Tala Habbab',
    role: 'Designer',
    bio: 'Tala is a designer with a background in medical devices and product design. She creates services that improve healthcare access and understandability. Tala joined GoInvo in 2022 with a BS in Materials Science and Biomedical Engineering and a MS in Product & Service Design from Carnegie Mellon University.',
    image: '/images/about/headshot-tala-habbab.jpg',
    email: 'tala@goinvo.com',
    linkedin: 'https://www.linkedin.com/in/talahabbab/',
    isAlumni: false,
    order: 6,
  },
  {
    id: 'team-shirley-xu',
    name: 'Shirley Xu',
    role: 'Designer, Engineer',
    bio: 'Shirley is a designer-engineer with a background in art, engineering, and bioinformatics. She makes complex healthcare concepts and information actionable and beautiful. Shirley holds a BS in Computer Science from University of Massachusetts Amherst and an MS in Bioinformatics from Brandeis University.',
    image: '/images/about/headshot-shirley-xu.jpg',
    email: 'shirley@goinvo.com',
    linkedin: 'https://www.linkedin.com/in/mystarryspace/',
    isAlumni: false,
    order: 7,
  },
  {
    id: 'team-maverick-chan',
    name: 'Maverick Chan',
    role: 'Designer',
    bio: "Maverick is a designer with a background in architecture and public health. He works to make people's lives better by creating digital spaces and systems that support healthier living. Maverick joined GoInvo in 2024 with a BASc from McMaster University and an M.Arch from the University of British Columbia.",
    image: '/images/about/headshot-maverick-chan2.jpg',
    email: 'maverick@goinvo.com',
    linkedin: 'https://www.linkedin.com/in/maverickchan/',
    isAlumni: false,
    order: 8,
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
    isAlumni: false,
    order: 9,
  },
]

// ── Alumni ────────────────────────────────────────────────────────────────────

const alumni: TeamMemberSeed[] = [
  {
    id: 'alumni-daniel-reeves',
    name: 'Daniel Reeves',
    role: 'Designer, Engineer',
    bio: 'Daniel is a designer and developer with a diverse background in building interactive and science-based exhibits to academic research in interdisciplinary physics. He has a PhD in physics and quantitative biology from Brandeis University and held subsequent positions at Harvard and MIT. Daniel joined the GoInvo team in 2018 to build engaging biologic and healthcare services.',
    image: '/images/about/headshot-daniel-reeves.jpg',
    email: 'daniel@goinvo.com',
    linkedin: 'https://www.linkedin.com/in/danielfreeves/',
    isAlumni: true,
  },
  {
    id: 'alumni-samantha-wuu',
    name: 'Samantha Wuu',
    role: 'People Person',
    bio: 'Sam is a writer, editor, and resident People Person at GoInvo. She previously worked at NYC Health + Hospitals on the migration of the provider credentialing process to a digital platform. A middle school English teacher in a past life, Sam is also a lifelong detail enthusiast and fan of diversity (of both people and punctuation). She joined Invo in 2022 with a BA in English from Barnard College and an MEd from Harvard University.',
    image: '/images/about/headshot-samantha-wuu.jpeg',
    email: 'sam@goinvo.com',
    linkedin: 'https://www.linkedin.com/in/samantha-wuu-44559113/',
    isAlumni: true,
  },
  {
    id: 'alumni-shayla-nettey',
    name: 'Shayla Nettey',
    role: 'Clinical Strategist (on-call)',
    bio: 'Shayla Nettey is a physician with a taste for design. Her focus on community medicine and patient education pushes her public health goals where all patients better control their health with help from happier, skilled clinicians. Shayla joined Invo in 2021, is a graduate of Morehouse School of Medicine, and practices as a hospitalist in North Carolina.',
    image: '/images/about/headshot-shayla-nettey.jpg',
    email: 'shayla@goinvo.com',
    linkedin: 'https://www.linkedin.com/in/shaylanetteymd/',
    isAlumni: true,
  },
  {
    id: 'alumni-amelia-luo',
    name: 'Amelia Luo',
    role: 'Designer',
    bio: "Amelia joined GoInvo as a user experience design intern in 2024. Passionate about health, education, and entertainment, Amelia is currently completing a Master's at Carnegie Mellon University's Entertainment Technology Center and holds a BFA in Illustration from School of Visual Arts.",
    image: '/images/about/headshot-amelia.jpg',
    email: 'amelia@goinvo.com',
    linkedin: 'https://www.linkedin.com/in/qing-luo1/',
    isAlumni: true,
  },
  {
    id: 'alumni-oliver-bello',
    name: 'Oliver Bello',
    role: 'Designer',
    bio: 'Oliver is a designer and engineer learning digital storytelling and product design. They joined GoInvo in 2024 and are finishing a BS in Engineering Psychology at Tufts University.',
    image: '/images/about/headshot-oliver-bello.jpg',
    email: 'oliver@goinvo.com',
    linkedin: 'https://www.linkedin.com/in/obbello/',
    isAlumni: true,
  },
  {
    id: 'alumni-sue-park',
    name: 'Sue Park',
    role: 'Designer',
    bio: 'Sue Park joined GoInvo in 2024 with a background in industrial design and human-computer interaction. Her previous work includes designing intuitive interfaces for the healthcare and fintech industries. She holds a BS in Industrial Design from Korea Advanced Institute of Science & Technology and an MS in Information from the University of Michigan.',
    image: '/images/about/headshot-sue-park.jpg',
    email: 'sue@goinvo.com',
    linkedin: 'https://www.linkedin.com/in/sooyeonp/',
    isAlumni: true,
  },
  {
    id: 'alumni-katerina-labrou',
    name: 'Katerina Labrou',
    role: 'Engineer',
    bio: 'Katerina is an engineer and designer with a background in computational architecture and augmented reality design. She merges technical expertise and creative vision to change the way we experience and interact with our surroundings and health. Kat joined GoInvo in 2024 with a BS in Architecture and a combined MS in Electrical Engineering and Computer Science from MIT.',
    image: '/images/about/headshot-katerina-labrou.jpg',
    email: 'kat@goinvo.com',
    linkedin: 'https://www.linkedin.com/in/katelabrou/',
    isAlumni: true,
  },
  {
    id: 'alumni-malia-hong',
    name: 'Malia Hong',
    role: 'Designer',
    bio: "Malia is a designer with a background in industrial design and human-centered technology design. Her primary focus is healthcare and socially responsible design, effectively advocating for individuals confronting adversity. Additionally, she concentrates on incorporating gamification to enhance interaction engagement. She has a bachelor's degree in ID from the Rhode Island School of Design and is pursuing a master's degree in Design for Interactions at Carnegie Mellon University.",
    image: '/images/about/headshot-malia-hong.jpg',
    email: 'malia@goinvo.com',
    linkedin: 'https://www.linkedin.com/in/chengqihong/',
    isAlumni: true,
  },
  {
    id: 'alumni-michelle-bourdon',
    name: 'Michelle Bourdon',
    role: 'Designer, Engineer',
    bio: 'Michelle is a designer and developer with a background in computer science, business, and healthcare. She is currently working towards a BS in Computer Science at the University of Western Ontario (UWO). Michelle joined GoInvo as an intern in 2024.',
    image: '/images/about/headshot-michelle-bourdon.jpg',
    email: 'michelle@goinvo.com',
    linkedin: 'https://www.linkedin.com/in/mebourdon/',
    isAlumni: true,
  },
  {
    id: 'alumni-mandy-liu',
    name: 'Mandy Liu',
    role: 'Designer',
    bio: "Mandy is studying Graphic Design and Computation at Rhode Island School of Design. Mandy is designing the next generation of mobile clinics to be an augmented clinical decision support system. Mandy's combination of spatial design, software design, and illustration, is setting the stage for the future of healthcare.",
    image: '/images/about/headshot-mandy-liu.jpg',
    email: 'mandy@goinvo.com',
    linkedin: 'https://www.linkedin.com/in/mandyliu0924/',
    isAlumni: true,
  },
  {
    id: 'alumni-jenny-yi',
    name: 'Jenny Yi',
    role: 'Designer',
    bio: "Jenny is a designer of urban infrastructures that impact public health. She designs spaces that incorporate new healthcare technologies to create seamless experiences for people's access to healthcare services. She joined Invo in 2022 with a B.Arch from Cornell University and a M.Des from Harvard Graduate School of Design.",
    image: '/images/about/headshot-jenny-yi.jpg',
    email: 'jenny@goinvo.com',
    linkedin: 'https://www.linkedin.com/in/jenny-yi-202020/',
    isAlumni: true,
  },
  {
    id: 'alumni-parsuree-vatanasirisuk',
    name: 'Parsuree Vatanasirisuk',
    role: 'Designer, Illustrator',
    bio: 'Parsuree is a user experience designer and illustrator with background in industrial design. She makes the complex beautiful and approachable through illustration and information design. Parsuree joined Invo in 2018, and has a BA in Industrial Design from Chulalongkorn University and a MFA from Rochester Institute of Technology (RIT).',
    image: '/images/about/headshot-parsuree-vatanasirisuk.jpg',
    email: 'parsuree@goinvo.com',
    linkedin: 'https://www.linkedin.com/in/parsuree-vatanasirisuk/',
    isAlumni: true,
  },
  {
    id: 'alumni-sharon-lee',
    name: 'Sharon Lee',
    role: 'Designer',
    bio: 'Sharon is a designer with an eclectic background in engineering, medicine, and art. Passionate about healthcare, she has focused her efforts on human-centered software design. She joined Invo in 2016 with a BS in Biomedical Engineering from the University of Virginia.',
    image: '/images/about/headshot-sharon-lee-2.jpg',
    email: 'sharon@goinvo.com',
    linkedin: 'https://www.linkedin.com/in/sharon-lee-a1371999/',
    isAlumni: true,
  },
  {
    id: 'alumni-matthew-reyes',
    name: 'Matthew Reyes',
    role: 'Designer',
    bio: 'Matthew is a designer and developer with a background in health diagnostics and patient care. Dedicated to improving public health systems and dismantling health inequities, he joined Invo in 2022 while completing his MPH at the University of California, Berkeley.',
    image: '/images/about/headshot-matthew-reyes-2.jpg',
    email: 'matthew@goinvo.com',
    linkedin: 'https://www.linkedin.com/in/reyesmatthew/',
    isAlumni: true,
  },
  {
    id: 'alumni-arpna-ghanshani',
    name: 'Arpna Ghanshani',
    role: 'Designer',
    bio: 'Arpna is a designer with a background in data science and public health. She strives to create beautiful, data-driven primary self care services and improve access to healthcare. She joined Invo in 2022 while completing her BA in Data Science and BA in Public Health at the University of California, Berkeley.',
    image: '/images/about/headshot-arpna-ghanshani.jpg',
    email: 'arpna@goinvo.com',
    linkedin: 'https://www.linkedin.com/in/arpna-g/',
    isAlumni: true,
  },
  {
    id: 'alumni-ines-amri',
    name: 'Ines Amri',
    role: 'Designer',
    bio: "Ines is a designer and data analyst. She translates complex, often chaotic medical problems into elegant digital experiences. As an advocate for international women's health and human rights, Ines joined GoInvo in 2021 with a BA in Economics from Paris Dauphine University and an MSc in Digital Health and Data Analytics from the University of Reading.",
    image: '/images/about/headshot-ines-amri.jpg',
    email: 'ines@goinvo.com',
    linkedin: 'https://www.linkedin.com/in/amri-ines/',
    isAlumni: true,
  },
  {
    id: 'alumni-huahua-zhu',
    name: 'Huahua Zhu',
    role: 'Designer',
    bio: 'Huahua is a designer who tells stories through illustration, animation and comics. She creates beautiful narratives to show how our healthcare should be treating all of us. She joined Invo in 2022 with a BFA from Rhode Island School of Design.',
    image: '/images/about/headshot-huahua-zhu.jpg',
    email: 'huahua@goinvo.com',
    linkedin: 'https://www.linkedin.com/in/huahua-zhu-3523b21a2/',
    isAlumni: true,
  },
  {
    id: 'alumni-megan-hirsch',
    name: 'Megan Hirsch',
    role: 'Designer',
    bio: "Megan is a designer-strategist that makes healthcare experiences enjoyable for patients and clinicians. She's dialing in her design and biology-trained eye to amplify her medical school experience in 2022. She joined Invo in 2021 with a BS in Human Biology from Stanford University.",
    image: '/images/about/headshot-megan-hirsch.jpg',
    email: 'megan@goinvo.com',
    linkedin: 'https://www.linkedin.com/in/megan-hirsch/',
    isAlumni: true,
  },
  {
    id: 'alumni-vickie-hua',
    name: 'Vickie Hua',
    role: 'Designer',
    bio: 'Vickie is studying health & economics at The Wharton School of the University of Pennsylvania. She is jamming on the open source health picture and studying how illustrated faces help or hinder understanding health.',
    image: '/images/about/headshot-vickie-hua.jpg',
    email: 'vickie@goinvo.com',
    linkedin: 'https://www.linkedin.com/in/vickiehua/',
    isAlumni: true,
  },
  {
    id: 'alumni-colleen-tang-poy',
    name: 'Colleen Tang Poy',
    role: 'Designer',
    bio: 'Colleen is a designer at the intersection of art and science. Her mission is to make healthcare and health information more accessible through beautiful storytelling. Colleen joined Invo in 2019 and has a BS in Psychology and Neuroscience from McMaster University and a MS in Biomedical Communication at the University of Toronto.',
    image: '/images/about/headshot-colleen-tang-poy.jpg',
    email: 'colleen@goinvo.com',
    linkedin: 'https://www.linkedin.com/in/colleen-tang-poy-12410893/',
    isAlumni: true,
  },
  {
    id: 'alumni-elle-marcus',
    name: 'Elle Marcus',
    role: 'Designer, Engineer',
    bio: 'Elle is an engineer with a design eye. With mechanical engineering genes in machine design and bio-procurement, she now focuses on human performance, system engineering, and healthcare design. Elle received a MechE degree from Case Western Reserve University in 2016 and is working on a Masters of Design Innovation from MassArt due in 2022. She works on global open source projects and designs while cooking.',
    image: '/images/about/headshot-elle-marcus.jpg',
    email: 'elle@goinvo.com',
    linkedin: 'https://www.linkedin.com/in/ellemarcus/',
    isAlumni: true,
  },
  {
    id: 'alumni-meghana-karande',
    name: 'Meghana Karande',
    role: 'Clinical Consultant',
    bio: 'Meghana is a classically trained clinician via Yale and Mount Sinai who fights for truth and against tricknology. With 15 years in pharma, insurance, and gov sectors, she takes a system approach to solving healthcare problems. She provides deep clinical insights and medical experience for studio projects. Before her clinical education, Meghana received a BS in Psychology from Cornell University.',
    image: '/images/about/headshot-meghana-karande.jpg',
    email: 'meghana@goinvo.com',
    twitter: 'https://twitter.com/meghanakarande',
    linkedin: 'https://www.linkedin.com/in/meghana-karande-md/',
    isAlumni: true,
  },
  {
    id: 'alumni-hannah-sennik',
    name: 'Hannah Sennik',
    role: 'Designer, Engineer',
    bio: "Hannah Sennik drives a rare trio of skills: bioengineering, systems design, and art. With a BASc of Systems Design Engineering from Waterloo, she joined Apple Computer to calibrate, instrument, and test hardware services. A MSE in BioEngineering Design from Johns Hopkins University pushes Hannah's goal of melting design, healthcare, and system engineering into her wetware.",
    image: '/images/about/headshot-hannah-sennik.jpg',
    email: 'hannah@goinvo.com',
    linkedin: 'https://www.linkedin.com/in/hannah-sennik/',
    isAlumni: true,
  },
  {
    id: 'alumni-patricia-nguyen',
    name: 'Patricia Nguyen',
    role: 'Designer',
    bio: 'Patricia Nguyen is a designer who works at the intersection of art and science to create beautiful and impactful healthcare software experiences. Born near Paris, she has lived in France and Canada. Patricia is a graduate of McMaster University with a BS in Kinesiology, and has a Masters in Biomedical Communications from the University of Toronto.',
    image: '/images/about/headshot-patricia-nguyen.jpg',
    email: 'patricia@goinvo.com',
    linkedin: 'https://www.linkedin.com/in/patricia-nguyen-281351a2',
    isAlumni: true,
  },
  {
    id: 'alumni-farah-hamade',
    name: 'Farah Hamade',
    role: 'Designer',
    bio: "Farah Hamade is a biomedical designer. She has a neurobio BS from from UC Davis, and is working on a MSc in BioMed from University of Toronto. Farah's skill combination of physiology, behavior, and illustration drives her healthcare design eye.",
    image: '/images/about/headshot-farah-hamade.jpg',
    email: 'farah@goinvo.com',
    linkedin: 'https://www.linkedin.com/in/farah-hamade-107abaa7/',
    isAlumni: true,
  },
  {
    id: 'alumni-edwin-choi',
    name: 'Edwin Choi',
    role: 'Designer',
    bio: 'Edwin is a biologist turned designer. Combining the sciences and art, he orchestrates healthcare software experiences to be beautiful and clinically refined. Edwin joined Invo in 2015, is a graduate of Washington University, and has a masters in biomedical design from Johns Hopkins University.',
    image: '/images/about/headshot-edwin-choi.jpg',
    email: 'edwin@goinvo.com',
    linkedin: 'https://www.linkedin.com/in/edwinchoi1/',
    isAlumni: true,
  },
  {
    id: 'alumni-bryson-wong',
    name: 'Bryson Wong',
    role: 'Designer',
    bio: 'Bryson is a designer who spans the gamut of software strategy skills from user research to product design to usability. Bryson joined Invo in 2017 with a degree in Human Factors from Tufts University.',
    image: '/images/about/headshot-bryson-wong.jpg',
    email: 'bryson@goinvo.com',
    linkedin: 'https://www.linkedin.com/in/bryson-wong-0670b984/',
    isAlumni: true,
  },
]

// ── All members ───────────────────────────────────────────────────────────────

const allMembers = [...currentTeam, ...alumni]

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── Main ──────────────────────────────────────────────────────────────────────

async function seed() {
  console.log(`Seeding ${allMembers.length} team members to Sanity...\n`)

  for (let i = 0; i < allMembers.length; i++) {
    const member = allMembers[i]
    console.log(`[${i + 1}/${allMembers.length}] ${member.name}${member.isAlumni ? ' (alumni)' : ''}`)

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
      isAlumni: member.isAlumni,
      ...(member.order != null ? { order: member.order } : {}),
    }

    await sanityClient.createOrReplace(doc)
    console.log(`  Created: ${member.id}`)
  }

  console.log(`\nDone! ${allMembers.length} team members seeded.`)
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
