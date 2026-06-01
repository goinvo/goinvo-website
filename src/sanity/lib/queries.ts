import { groq } from 'next-sanity'

// Case Studies
// Filter out stub drafts that were accidentally published as
// "Untitled" with an untitled-xxx slug (pre-"drafts." prefix fix).
// They're safe to delete in Studio; until then, hide from the public list.
export const allCaseStudiesQuery = groq`
  *[_type == "caseStudy"
    && !hidden
    && title != "Untitled"
    && !(slug.current match "untitled-*")
  ] | order(orderRank asc) {
    _id,
    _updatedAt,
    title,
    heading,
    slug,
    client,
    hideClientSubtitle,
    hideAuthors,
    image,
    caption,
    categories[]-> { _id, title, slug },
    metaDescription
  }
`

export const caseStudyBySlugQuery = groq`
  *[_type == "caseStudy" && slug.current == $slug][0] {
    _id,
    title,
    heading,
    slug,
    client,
    hideClientSubtitle,
    hideAuthors,
    image,
    caption,
    categories[]-> { _id, title, slug, isMainCategory, filterOrder },
    displayTags,
    metadataLayout,
    authors[]-> { _id, name, role, bio, image },
    time,
    content,
    "upNext": upNext[]{
      "item": select(
        _type == "externalUpNextItem" => {
          "_id": _key,
          "_type": "externalUpNextItem",
          title,
          url,
          caption,
          image,
        },
        _ref == "drafts.caseStudy-fastercures-health-data-basics" => *[_type == "caseStudy" && slug.current == "fastercures-health-data-basics"][0] {
          _id,
          _type,
          title,
          heading,
          slug,
          client,
          image,
          caption,
          description
        },
        @-> {
          _id,
          _type,
          title,
          heading,
          slug,
          client,
          image,
          caption,
          description
        }
      )
    }[].item,
    metaDescription
  }
`

// Draft-only case studies (used in preview mode)
export const draftCaseStudiesQuery = groq`{
  "drafts": *[_type == "caseStudy" && _id in path("drafts.**")] | order(orderRank asc) {
    _id,
    title,
    heading,
    slug,
    client,
    image,
    caption,
    categories[]-> { _id, title, slug },
    metaDescription
  },
  "publishedIds": *[_type == "caseStudy" && !(_id in path("drafts.**"))]._id
}`

// Draft-only features (used in preview mode)
export const draftFeaturesQuery = groq`{
  "drafts": *[_type == "feature" && _id in path("drafts.**")] | order(orderRank asc) {
    _id,
    _type,
    title,
    cardTitle,
    slug,
    image,
    heroPosition,
    video,
    description,
    categories,
    date,
    showPageMeta,
    client,
    externalLink,
    "featured": coalesce(featured, coalesce(hiddenWorkPage, false) != true),
    hiddenWorkPage
  },
  "publishedIds": *[_type == "feature" && !(_id in path("drafts.**"))]._id
}`

// Categories
export const allCategoriesQuery = groq`
  *[_type == "category"] | order(isMainCategory desc, filterOrder asc, title asc) {
    _id,
    title,
    slug,
    isMainCategory,
    filterOrder,
    description
  }
`

// Main categories drive the /work filter chips. Ordered by filterOrder
// with title as the tie-breaker so the UI is stable even when filterOrder
// is missing.
export const mainCategoriesQuery = groq`
  *[_type == "category" && isMainCategory == true] | order(filterOrder asc, title asc) {
    _id,
    title,
    slug
  }
`

// Team Members
export const teamMembersQuery = groq`
  *[_type == "teamMember" && _id match "team-*" && isAlumni != true] | order(orderRank asc) {
    _id,
    name,
    role,
    bio,
    image,
    social
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
  *[_type == "feature"
    && title != "Untitled"
    && !(slug.current match "untitled-*")
  ] | order(orderRank asc) {
    _id,
    _type,
    _updatedAt,
    title,
    cardTitle,
    slug,
    image,
    heroPosition,
    video,
    description,
    categories,
    date,
    showPageMeta,
    client,
    externalLink,
    "featured": coalesce(featured, coalesce(hiddenWorkPage, false) != true),
    spotlight,
    hiddenWorkPage
  }
`

export const selectedWorkFeaturesQuery = groq`
  *[_type == "feature"
    && title != "Untitled"
    && !(slug.current match "untitled-*")
    && coalesce(featured, coalesce(hiddenWorkPage, false) != true) == true
  ] | order(orderRank asc) {
    _id,
    _type,
    title,
    cardTitle,
    slug,
    image,
    heroPosition,
    video,
    description,
    categories,
    date,
    showPageMeta,
    client,
    externalLink,
    "featured": coalesce(featured, coalesce(hiddenWorkPage, false) != true),
    hiddenWorkPage
  }
`

export const featureBySlugQuery = groq`
  *[_type == "feature" && slug.current == $slug][0] {
    _id,
    title,
    cardTitle,
    slug,
    image,
    heroPosition,
    fullImageCover,
    articleHeroImage,
    articleHeroPosition,
    articleFullImageCover,
    contentWidth,
    video,
    description,
    categories,
    date,
    showPageMeta,
    client,
    externalLink,
    "featured": coalesce(featured, coalesce(hiddenWorkPage, false) != true),
    hiddenWorkPage,
    authorLayout,
    authorBackground,
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
      link,
      "author": author-> { _id, name, role, bio, image, social }
    },
    contributorsLayout,
    contributorsBackground,
    newsletterBackground,
    peopleSectionPosition,
    specialThanks,
    showAboutGoInvo,
    aboutGoInvoPosition,
    aboutGoInvoVariant,
    bulletStyle,
    specialThanksHeading,
    specialThanksHeadingStyle,
    content,
    metaTitle,
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
