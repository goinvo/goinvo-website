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
    heading,
    slug,
    client,
    image,
    caption,
    categories[]-> { _id, title, slug },
    authors[]-> { _id, name, role, bio, image },
    time,
    content,
    upNext[]-> {
      _id,
      _type,
      title,
      slug,
      client,
      image,
      caption,
      description
    },
    metaDescription
  }
`

// Draft-only case studies (used in preview mode)
export const draftCaseStudiesQuery = groq`{
  "drafts": *[_type == "caseStudy" && _id in path("drafts.**")] {
    _id,
    title,
    slug,
    client,
    image,
    caption,
    categories[]-> { _id, title, slug },
    metaDescription,
    order
  },
  "publishedIds": *[_type == "caseStudy" && !(_id in path("drafts.**"))]._id
}`

// Draft-only features (used in preview mode)
export const draftFeaturesQuery = groq`{
  "drafts": *[_type == "feature" && _id in path("drafts.**")] {
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
  },
  "publishedIds": *[_type == "feature" && !(_id in path("drafts.**"))]._id
}`

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
    heroPosition,
    fullImageCover,
    contentWidth,
    video,
    description,
    categories,
    date,
    client,
    authorLayout,
    "authors": authors[] {
      roleOverride,
      "author": coalesce(
        author-> { _id, name, role, bio, image },
        // Backward compat: plain references (no roleOverride wrapper)
        @ -> { _id, name, role, bio, image }
      )
    },
    "contributors": contributors[] {
      roleOverride,
      "author": author-> { _id, name, role, bio, image }
    },
    specialThanks,
    showAboutGoInvo,
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
