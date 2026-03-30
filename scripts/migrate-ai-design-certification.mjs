/**
 * Migrate ai-design-certification content to Sanity.
 *
 * Uploads 1 image (certified-example-hand), builds Portable Text blocks for
 * the full article, sets subtitle, links authors, and patches the existing
 * feature document (feature-ai-design-certification).
 *
 * Usage:
 *   node scripts/migrate-ai-design-certification.mjs
 *   node scripts/migrate-ai-design-certification.mjs --dry-run
 */

import { createClient } from 'next-sanity'
import { randomUUID } from 'crypto'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'a1wsimxr',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
})

const CDN = 'https://dd17w042cevyt.cloudfront.net'
const dryRun = process.argv.includes('--dry-run')
const key = () => randomUUID().slice(0, 12)

// ---------------------------------------------------------------------------
// Block helpers
// ---------------------------------------------------------------------------

async function uploadImage(url, filename) {
  const response = await fetch(url)
  if (!response.ok) {
    console.log(`    WARN: Failed to fetch ${url} (${response.status})`)
    return null
  }
  const buffer = Buffer.from(await response.arrayBuffer())
  const contentType = response.headers.get('content-type') || 'image/jpeg'

  const asset = await client.assets.upload('image', buffer, {
    filename,
    contentType,
  })

  return {
    _type: 'image',
    asset: { _type: 'reference', _ref: asset._id },
  }
}

function imageBlock(assetRef, alt = '', size = 'full') {
  return {
    _type: 'image',
    _key: key(),
    asset: assetRef.asset,
    alt,
    size,
  }
}

function textBlock(text, style = 'normal') {
  return {
    _type: 'block',
    _key: key(),
    style,
    children: [{ _type: 'span', _key: key(), text, marks: [] }],
    markDefs: [],
  }
}

function richBlock(children, style = 'normal', markDefs = []) {
  return {
    _type: 'block',
    _key: key(),
    style,
    children: children.map((c) => ({ _type: 'span', _key: key(), ...c })),
    markDefs,
  }
}

function linkMark(href, blank = false) {
  const markKey = key()
  return {
    markKey,
    markDef: { _type: 'link', _key: markKey, href, blank },
  }
}

function bulletList(items) {
  return items.map((item) => ({
    _type: 'block',
    _key: key(),
    style: 'normal',
    listItem: 'bullet',
    level: 1,
    children: typeof item === 'string'
      ? [{ _type: 'span', _key: key(), text: item, marks: [] }]
      : item,
    markDefs: [],
  }))
}

function ctaButton(label, url, variant = 'secondary', external = false, fullWidth = false) {
  return {
    _type: 'ctaButton',
    _key: key(),
    label,
    url,
    variant,
    external,
    fullWidth,
  }
}

function buttonGroup(buttons) {
  return {
    _type: 'buttonGroup',
    _key: key(),
    buttons: buttons.map((btn) => ({
      _key: key(),
      label: btn.label,
      url: btn.url,
      variant: btn.variant || 'secondary',
      external: btn.external || false,
    })),
  }
}

function quoteBlock(text, author = '', role = '') {
  return {
    _type: 'quote',
    _key: key(),
    text,
    author,
    role,
  }
}

function referencesBlock(items) {
  return {
    _type: 'references',
    _key: key(),
    items: items.map((item) => ({
      _key: key(),
      title: item.title,
      link: item.link || '',
    })),
  }
}

function dividerBlock() {
  return {
    _type: 'divider',
    _key: key(),
    style: 'default',
  }
}

function columnsBlock(layout, contentItems, background = 'none') {
  return {
    _type: 'columns',
    _key: key(),
    layout: String(layout),
    background,
    content: contentItems.map((item) => ({ ...item, _key: item._key || key() })),
  }
}

// ---------------------------------------------------------------------------
// Build content blocks
// ---------------------------------------------------------------------------

async function buildContent() {
  // Upload the one inline image
  console.log('  Uploading image...')
  const certifiedImg = await uploadImage(
    `${CDN}/images/features/ai-design-certification/certified-example-hand.jpg`,
    'certified-example-hand.jpg'
  )
  if (certifiedImg) {
    console.log('    Uploaded: certified-example-hand.jpg')
  } else {
    console.log('    FAILED: certified-example-hand.jpg')
  }

  const content = []

  // === Title ===
  // Title is rendered from the document title field, not in content blocks

  // === What is AI design certification? ===
  content.push(textBlock('What is AI design certification?', 'h2'))
  content.push(
    textBlock(
      'We certify outputs: discrete, versioned, viewable artifacts \u2014 screens, flows, diagrams, data visualizations. We are not certifying that "this AI is good," but that "this specific artifact is fit for purpose under these conditions."'
    )
  )
  content.push(
    textBlock(
      'What passes and what fails is defined by a shared standard: safety, data integrity, regulatory fit, usability, language, bias, and how the flow works together. This is the certifiable surface layer.'
    )
  )
  content.push(
    textBlock(
      'The key distinction: Certification attaches to a specific artifact version and its intended use \u2014 not to the AI system that produced it. A screen, a flow, a piece of copy. Not a model.',
      'callout'
    )
  )

  // CTA button
  content.push(
    ctaButton(
      'Certify Your Health AI Today',
      'mailto:hello@goinvo.com?subject=Certify%20Health%20AI',
      'secondary',
      true,
      false
    )
  )

  // === Product vision ===
  content.push(textBlock('Product vision', 'h2'))
  content.push(
    textBlock(
      'We certify AI-generated design outputs \u2014 screens, flows, copy, and visuals \u2014 through non-negotiable human review for safety, accessibility, bias, provenance, and regulatory fit. The result is a trusted design health layer that turns fast AI output into production-ready work teams can ship, defend, and buy.'
    )
  )
  content.push(
    textBlock(
      'That requires four things: a shared standard, human judgment at the right moment, verifiable proof, and tight integration into existing workflows.'
    )
  )

  // === Design Health Schema (card grid → h4 + paragraphs) ===
  content.push(textBlock('Design Health Schema', 'h4'))
  content.push(
    textBlock(
      'A machine-readable rule set (YAML/JSON) defining the non-negotiables:'
    )
  )

  const schemaItems = [
    { title: 'SAFETY', desc: 'No diagnosis, clear uncertainty, calm tone, false-positive control' },
    { title: 'BIAS', desc: 'Works across age, sex, medications, and baseline variation' },
    { title: 'ACCESSIBILITY', desc: 'Plain language, readable, screen-reader safe for clinician and patient' },
    { title: 'PROVENANCE', desc: 'Users can see what data drove the insight' },
    { title: 'REGULATORY FIT', desc: 'Wellness guidance vs. medical advice \u2014 clearly scoped' },
    { title: 'SCOPE OF PRACTICE', desc: 'What the software may and may not assert' },
    { title: 'USABILITY', desc: 'Actionable, not alarming. Clinician and patient readable rationale' },
    { title: 'HUMAN ESCALATION', desc: 'When and how a clinician must intervene' },
  ]

  for (const item of schemaItems) {
    content.push(
      richBlock([
        { text: `${item.title}: `, marks: ['strong'] },
        { text: item.desc, marks: [] },
      ])
    )
  }

  // === Certification Principles (h4 + paragraph each) ===
  content.push(textBlock('Certify outputs, not models', 'h4'))
  content.push(
    textBlock(
      'Certification attaches to a specific artifact version (screen, flow, copy, visual), its intended use, and its risk profile \u2014 not to the AI system that produced it.'
    )
  )

  content.push(textBlock('Human-in-the-loop tuning', 'h4'))
  content.push(
    textBlock(
      'Domain experts \u2014 hello Juhan and Goinvo Design \u2014 adjust and validate AI outputs; their changes and rationale are captured as structured signals that improve future generations and reviews.'
    )
  )

  content.push(textBlock('Verifiable certification', 'h4'))
  content.push(
    textBlock(
      'Issue a versioned, auditable certificate bound to an artifact hash, rubric version, reviewer, scope, and expiration. Clear for procurement, legal, and regulators.'
    )
  )

  content.push(textBlock('Workflow-native integration', 'h4'))
  content.push(
    textBlock(
      '"Request certification" lives where work happens: GitHub PRs, Figma, design systems, CMSs. Certification as a button, not a process.'
    )
  )

  content.push(textBlock('Risk-based gates', 'h4'))
  content.push(
    textBlock(
      'Hard pass/fail thresholds scale with risk (e.g., marketing site vs clinical intake). Higher risk = stricter gates, named reviewers, shorter cert lifetimes.'
    )
  )

  content.push(textBlock('Drift and change detection', 'h4'))
  content.push(
    textBlock(
      'Any meaningful artifact change invalidates the cert and triggers re-review, which can prevent silent regression after approval.'
    )
  )

  content.push(textBlock('Public signal, private audit trail', 'h4'))
  content.push(
    richBlock([
      { text: 'A simple badge teams can show externally, backed by a detailed internal record that stands up to scrutiny. ', marks: [] },
      { text: 'Example:', marks: ['strong'] },
      { text: ' Project Crucible that measured EHR vendor compliance with FHIR.', marks: [] },
    ])
  )

  // === Why it matters now ===
  content.push(textBlock('Why it matters now', 'h2'))
  content.push(
    textBlock(
      'AI tools are generating healthcare UX at unprecedented speed. Cursor, Claude, and similar systems can produce working screens in minutes. But speed without accountability is dangerous in healthcare \u2014 where a single poorly-worded insight could prompt a patient to ignore symptoms that need clinical attention.'
    )
  )
  content.push(
    textBlock(
      'Existing review processes weren\u2019t designed for artifact-level AI output. They assume a human designer made intentional choices about language, logic, and display. When AI produces the artifact, those assumptions break down. Certification closes that gap.'
    )
  )

  // === Real-world example: Apple Health ===
  content.push(textBlock('Real-world example: Apple Health', 'h2'))
  content.push(textBlock('Using Apple Health as a concrete summary.'))

  // === 1. What the AI does ===
  content.push(textBlock('1. What the AI does', 'h3'))
  content.push(
    textBlock(
      'The app generates short health insight cards from your data (sleep, heart rate, activity). It\u2019s making clinical guidance from patient data.'
    )
  )
  content.push(
    textBlock(
      'Example: "Your resting heart rate is higher this week and your sleep is down. Consider resting today."'
    )
  )
  content.push(
    textBlock(
      'This is copy + logic + UI, not "the model." And, this is medical advice delivered by software.'
    )
  )

  // === 2. What gets certified ===
  content.push(textBlock('2. What gets certified', 'h3'))
  content.push(textBlock('Before shipping, the team submits the actual outputs:'))
  content.push(
    ...bulletList([
      'The text users will read',
      'The rules that trigger it',
      'The data sources used',
      'How it\u2019s shown (color, urgency, notifications)',
    ])
  )
  content.push(
    textBlock('In this case, it\u2019s the medical artifact being approved.')
  )

  // === 3. Non-negotiable checks ===
  content.push(textBlock('3. Non-negotiable checks', 'h3'))
  content.push(textBlock('Each output is reviewed against a standard schema:'))
  content.push(
    ...bulletList([
      'Safety',
      'Scope of Practice',
      'Bias',
      'Accessibility',
      'Data provenance',
      'Regulatory fit',
      'Usability',
      'Human escalation',
    ])
  )

  // === 4. Human review catches problems ===
  content.push(textBlock('4. Human review catches problems', 'h3'))

  // REJECTED review card → represented as bold paragraph + italic text + explanation
  content.push(
    richBlock([
      { text: 'Review result \u2014 cardiac insight v1.2: ', marks: ['strong'] },
      { text: 'REJECTED', marks: ['strong'] },
    ])
  )
  content.push(
    textBlock(
      '"This suggests early atrial fibrillation."'
    )
  )
  content.push(
    richBlock([
      { text: 'Why it fails: ', marks: ['strong'] },
      { text: 'Diagnostic language. High regulatory and patient-anxiety risk.', marks: [] },
    ])
  )

  content.push(
    textBlock(
      'If we\u2019re in the wellness world, this must be rewritten to a safe, non-diagnostic version before approval. If we\u2019re in the medical world, we\u2019ll need to:'
    )
  )
  content.push(
    ...bulletList([
      'Narrow scope',
      'Add uncertainty',
      'Trigger clinical follow-up \u2014 not just self-action',
    ])
  )

  // === 5. What "Certified" means ===
  content.push(textBlock('5. What "Certified" means', 'h3'))
  content.push(
    textBlock('Approval issues a verifiable medical certificate tied to:')
  )
  content.push(
    ...bulletList([
      'The exact wording',
      'The logic used',
      'The UI shown',
      'The regulatory claim made',
    ])
  )
  content.push(
    textBlock(
      'Once approved, the insight gets a verifiable certificate tied to that exact copy, logic, and UI.'
    )
  )
  content.push(
    ...bulletList([
      'It ships with the app',
      'It\u2019s auditable later',
      'If something goes wrong, you know what was approved and why',
    ])
  )

  // === 6. What approval looks like ===
  content.push(textBlock('6. What approval looks like', 'h3'))

  // CERTIFIED review card → represented as bold paragraph + text + explanation
  content.push(
    richBlock([
      { text: 'Review result \u2014 cardiac insight v1.5: ', marks: ['strong'] },
      { text: 'CERTIFIED', marks: ['strong'] },
    ])
  )
  content.push(
    textBlock(
      '"Your resting heart rate is higher this week and your sleep is down. Consider resting today."'
    )
  )
  content.push(
    textBlock(
      'Non-diagnostic. Actionable. Calm. Wellness scope confirmed. Data provenance tagged to Apple Watch HR sensor + sleep algorithm v3.1. Accessible at Grade 7 reading level.'
    )
  )

  // === Audit trail: image + text columns ===
  if (certifiedImg) {
    // Use columns block for side-by-side layout
    content.push(
      columnsBlock('2', [
        {
          _type: 'image',
          _key: key(),
          asset: certifiedImg.asset,
          alt: 'Certified example showing a hand holding a phone with health data',
          size: 'full',
        },
        {
          _type: 'block',
          _key: key(),
          style: 'normal',
          children: [
            { _type: 'span', _key: key(), text: 'Any meaningful artifact change invalidates the certificate and triggers re-review, preventing silent regression after approval. This is not a one-time stamp \u2014 ', marks: [] },
            { _type: 'span', _key: key(), text: 'it is a living audit trail.', marks: ['strong'] },
          ],
          markDefs: [],
        },
      ])
    )
  } else {
    // Fallback: just text if image upload failed
    content.push(
      richBlock([
        { text: 'Any meaningful artifact change invalidates the certificate and triggers re-review, preventing silent regression after approval. This is not a one-time stamp \u2014 ', marks: [] },
        { text: 'it is a living audit trail.', marks: ['strong'] },
      ])
    )
  }

  // === 7. The point ===
  content.push(textBlock('7. The point', 'h3'))
  content.push(
    textBlock(
      'Treat AI outputs as the medical devices at the UI layer. You\u2019re not trusting an AI model. You\u2019re certifying the health insight itself, the thing a human actually sees, so teams can move fast and stay safe.'
    )
  )

  // === How it works in your workflow ===
  content.push(textBlock('How it works in your workflow', 'h2'))
  content.push(
    textBlock(
      'Certification lives where work happens. A "Request Certification" button embedded in GitHub pull requests, Figma, design systems, and CMSs. Certification as a button, not a process.'
    )
  )
  content.push(
    textBlock(
      'Risk-based gates scale thresholds with context: a marketing site and a clinical intake form are not the same artifact. Higher risk means stricter gates, named reviewers, and shorter certificate lifetimes.'
    )
  )

  // Callout with link
  const githubLink = linkMark('https://github.com/goinvo/AIDesignCertification', true)
  content.push(
    richBlock(
      [
        { text: 'Landing zone: ', marks: [] },
        { text: 'github.com/goinvo/AIDesignCertification', marks: [githubLink.markKey] },
        { text: ' \u2014 Open source license: Apache 2.0', marks: [] },
      ],
      'callout',
      [githubLink.markDef]
    )
  )

  // === CTA section ===
  content.push(textBlock('We\u2019re building this in the open:', 'h2'))
  content.push(
    textBlock(
      'If you\u2019ve got a real or prototype healthcare product, let\u2019s together run it through the cert so we can pressure-test it on reality.'
    )
  )

  // Button group with two CTAs
  content.push(
    buttonGroup([
      {
        label: 'Certify Your Health AI Today',
        url: 'mailto:hello@goinvo.com?subject=Certify%20Health%20AI',
        variant: 'secondary',
        external: true,
      },
      {
        label: 'Call Juhan @ 617-504-3390',
        url: 'tel:617-504-3390',
        variant: 'secondary',
        external: false,
      },
    ])
  )

  // === Special thanks paragraph ===
  // This goes after authors, but we include it in content since it's prose
  const markBegaleLink = linkMark('https://www.linkedin.com/in/mark-begale-7ab25814/', true)
  const venusWongLink = linkMark('https://www.linkedin.com/in/venus-wong-phd-bcba-199b8994/', true)
  content.push(textBlock('Special thanks to...', 'h2Center'))
  content.push(
    richBlock(
      [
        { text: '...', marks: [] },
        { text: 'Mark Begale', marks: [markBegaleLink.markKey] },
        { text: ' and ', marks: [] },
        { text: 'Venus Wong', marks: [venusWongLink.markKey] },
        { text: ' for gently tapping the AI Certification idea into our skulls, and to Venus Wong for volunteering as the brave first test subject. They\u2019re both continuing to poke holes in it... to make it better.', marks: [] },
      ],
      'normal',
      [markBegaleLink.markDef, venusWongLink.markDef]
    )
  )

  return content
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const slug = 'ai-design-certification'
  console.log(`\n=== Migrating ${slug} ===\n`)

  // Fetch the existing document
  const doc = await client.fetch(
    `*[_type == "feature" && slug.current == $slug][0] { _id, title }`,
    { slug }
  )

  if (!doc) {
    console.error(`  ERROR: Feature document not found for slug "${slug}"`)
    process.exit(1)
  }

  console.log(`  Found document: ${doc.title} (${doc._id})`)

  if (dryRun) {
    console.log('  DRY RUN - would build content and patch document')
    console.log('  Would set subtitle, link 3 authors (Chloe Ma, Juhan Sonin, Eric Benoit), upload 1 image')
    return
  }

  // Build all content blocks (includes image uploads)
  const content = await buildContent()
  console.log(`  Generated ${content.length} blocks`)

  // Author references: Chloe Ma & Juhan Sonin as primary, Eric Benoit as contributor
  const authors = [
    { _type: 'reference', _ref: 'team-chloe-ma', _key: key() },
    { _type: 'reference', _ref: 'team-juhan-sonin', _key: key() },
    { _type: 'reference', _ref: 'team-eric-benoit', _key: key() },
  ]

  // Patch the document
  await client
    .patch(doc._id)
    .set({
      title: 'Human-Assisted AI Design Certification for Healthcare',
      subtitle:
        'What passes and what fails is defined by a shared standard: safety, data integrity, regulatory fit, usability, language, bias, and how the flow works together. This is the certifiable surface layer.',
      content,
      authors,
    })
    .commit()

  console.log(`  Patched "${doc.title}" with:`)
  console.log(`    - title: Human-Assisted AI Design Certification for Healthcare`)
  console.log(`    - subtitle`)
  console.log(`    - ${content.length} content blocks (1 image + headings + paragraphs + lists + quotes + buttons)`)
  console.log(`    - ${authors.length} authors (Chloe Ma, Juhan Sonin, Eric Benoit)`)
  console.log('\nDone!\n')
}

main().catch((err) => {
  console.error('Failed:', err)
  process.exit(1)
})
