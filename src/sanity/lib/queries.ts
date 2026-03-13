import { groq } from 'next-sanity'

// Case Studies
export const allCaseStudiesQuery = groq`
  *[_type == "caseStudy" && !hidden] | order(order asc) {
    _id,
    title,
    slug,
    client,
    image,
    caption,
    categories[]-> { _id, title, slug },
    metaDescription,
    order
  }
`

export const caseStudyBySlugQuery = groq`
  *[_type == "caseStudy" && slug.current == $slug][0] {
    _id,
    title,
    slug,
    client,
    image,
    caption,
    categories[]-> { _id, title, slug },
    authors[]-> { _id, name, role, bio, image },
    content,
    results,
    references,
    upNext[]-> {
      _id,
      title,
      slug,
      client,
      image,
      caption
    },
    metaDescription
  }
`

// Categories
export const allCategoriesQuery = groq`
  *[_type == "category"] | order(title asc) {
    _id,
    title,
    slug,
    description
  }
`

// Team Members
export const teamMembersQuery = groq`
  *[_type == "teamMember" && !isAlumni] | order(order asc) {
    _id,
    name,
    role,
    bio,
    image,
    social,
    order
  }
`

export const alumniQuery = groq`
  *[_type == "teamMember" && isAlumni] | order(name asc) {
    _id,
    name,
    role,
    bio,
    image,
    social
  }
`

// Features
export const allFeaturesQuery = groq`
  *[_type == "feature"] | order(order asc) {
    _id,
    title,
    slug,
    image,
    video,
    description,
    categories,
    date,
    client,
    externalLink,
    hiddenWorkPage,
    order
  }
`

export const featureBySlugQuery = groq`
  *[_type == "feature" && slug.current == $slug][0] {
    _id,
    title,
    slug,
    image,
    video,
    description,
    categories,
    date,
    client,
    authors[]-> { _id, name, role, bio, image },
    content,
    metaDescription
  }
`

// Jobs
export const activeJobsQuery = groq`
  *[_type == "job" && isActive] {
    _id,
    title,
    description,
    location,
    type
  }
`

// Vision Projects
export const visionProjectsQuery = groq`
  *[_type == "visionProject"] | order(title asc) {
    _id,
    title,
    slug,
    image,
    description,
    category
  }
`

export const visionProjectBySlugQuery = groq`
  *[_type == "visionProject" && slug.current == $slug][0] {
    _id,
    title,
    slug,
    image,
    description,
    content,
    category
  }
`

// Homepage
export const homepageQuery = groq`{
  "headers": *[_type == "homepageHeader"] | order(order asc) {
    _id,
    title,
    subtitle,
    image,
    link,
    order
  },
  "featuredWork": *[_type == "feature"][0..5] | order(date desc) {
    _id,
    title,
    slug,
    image,
    description,
    categories,
    date,
    client,
    externalLink
  },
  "caseStudies": *[_type == "caseStudy" && !hidden][0..8] | order(order asc) {
    _id,
    title,
    slug,
    client,
    image,
    caption,
    categories[]-> { _id, title, slug }
  }
}`

// Health Visualizations
export const allHealthVisualizationsQuery = groq`
  *[_type == "healthVisualization"] | order(order asc) {
    _id,
    title,
    slug,
    image,
    caption,
    date,
    downloadLink,
    learnMoreLink,
    order
  }
`

// Site Settings
export const siteSettingsQuery = groq`
  *[_type == "siteSettings"][0] {
    siteTitle,
    description,
    socialLinks,
    footerText,
    contactInfo
  }
`
