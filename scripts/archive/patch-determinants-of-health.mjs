/**
 * Patch determinants-of-health content in Sanity.
 *
 * Fixes:
 * 1. Insert a `results` block after the "Tap the categories to explore" sectionTitle
 *    with the 5 determinant categories and percentages (from chart-data.json).
 *    The Gatsby page had an interactive Chart component; the Sanity page renders
 *    this as a stats row.
 *
 * 2. Add missing UL lists in the Methodology section:
 *    - v1: 8-item org list (NCHHSTP, WHO, Healthy People, etc.)
 *    - v1: 6-item source list (DHHS, JAMA, Health Affairs, etc.)
 *    - v2: 5-item source list (DHHS, JAMA, Health Affairs, WHO, U.Wisconsin)
 *    - Additional Change: 4-item literature list (Fujimura, Long, AR, Caprio)
 *
 * 3. Add the missing "The Determinants of Health is available as..." paragraph
 *    and the secondary button group (Buy Print, On Github, Methodology).
 *
 * Usage:
 *   node scripts/patch-determinants-of-health.mjs          # dry run
 *   node scripts/patch-determinants-of-health.mjs --write   # apply changes
 */
import { createClient } from '@sanity/client'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  token: process.env.SANITY_WRITE_TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
})

const WRITE = process.argv.includes('--write')
const SLUG = 'determinants-of-health'

function makeKey() {
  return Math.random().toString(36).slice(2, 14)
}

/** Create a simple text block */
function textBlock(text, style = 'normal', marks = []) {
  return {
    _type: 'block',
    _key: makeKey(),
    style,
    markDefs: [],
    children: [{ _type: 'span', _key: makeKey(), marks, text }],
  }
}

/** Create a bullet list item with optional superscript ref */
function bulletItem(text, refNum = null) {
  const children = [{ _type: 'span', _key: makeKey(), marks: [], text }]
  const markDefs = []

  if (refNum) {
    const refMarkId = makeKey()
    markDefs.push({
      _type: 'refCitation',
      _key: refMarkId,
      refNumber: String(refNum),
    })
    children.push({
      _type: 'span',
      _key: makeKey(),
      marks: [refMarkId, 'sup'],
      text: String(refNum),
    })
  }

  return {
    _type: 'block',
    _key: makeKey(),
    style: 'normal',
    listItem: 'bullet',
    level: 1,
    markDefs,
    children,
  }
}

async function run() {
  console.log(`\n=== Patching ${SLUG} (${WRITE ? 'WRITE' : 'DRY RUN'}) ===\n`)

  const doc = await client.fetch(
    `*[_type == "feature" && slug.current == $slug][0]{ _id, content }`,
    { slug: SLUG }
  )
  if (!doc) {
    console.error(`Document not found: ${SLUG}`)
    process.exit(1)
  }

  console.log(`Document: ${doc._id}`)
  console.log(`Content blocks: ${doc.content.length}`)

  let content = [...doc.content]
  let changes = 0

  // ---- Fix 1: Insert results block after "Tap the categories to explore" ----
  const tapIdx = content.findIndex(
    b => b._key === 'q1gx5xjpba7' // "Tap the categories to explore" sectionTitle
  )
  if (tapIdx >= 0) {
    console.log(`\n  Found "Tap the categories to explore" at index ${tapIdx}`)

    // Check if a results block already follows
    const nextBlock = content[tapIdx + 1]
    if (nextBlock && nextBlock._type === 'results') {
      console.log(`    → Results block already exists, skipping`)
    } else {
      const resultsBlock = {
        _type: 'results',
        _key: makeKey(),
        variant: 'row',
        background: 'none',
        items: [
          { _key: makeKey(), stat: '36%', description: 'Individual Behavior' },
          { _key: makeKey(), stat: '24%', description: 'Social Circumstances' },
          { _key: makeKey(), stat: '22%', description: 'Genetics & Biology' },
          { _key: makeKey(), stat: '11%', description: 'Medical Care' },
          { _key: makeKey(), stat: '7%', description: 'Environment' },
        ],
      }

      content.splice(tapIdx + 1, 0, resultsBlock)
      console.log(`    → Inserted results block with 5 determinant categories`)
      changes++
    }
  } else {
    console.log(`  ⚠ Could not find "Tap the categories to explore" block`)
  }

  // ---- Fix 2: Add UL lists in Methodology section ----
  // The methodology section has text that refers to organizations and sources
  // but the actual <ul> lists are missing. We need to find the right anchor points.

  // v1 orgs list: goes after "chosen due to their consistency across the following 7 out of 8 organizations:"
  const v1OrgsAnchorIdx = content.findIndex(
    b => b._key === 'nv4jdicf2bf' // "The 5 main determinants..."
  )
  if (v1OrgsAnchorIdx >= 0) {
    const nextBlock = content[v1OrgsAnchorIdx + 1]
    if (nextBlock && nextBlock.listItem === 'bullet') {
      console.log(`\n  v1 orgs list already present, skipping`)
    } else {
      console.log(`\n  Inserting v1 organizations list after index ${v1OrgsAnchorIdx}`)
      const v1OrgsList = [
        bulletItem('NCHHSTP ', '1'),
        bulletItem('WHO ', '2'),
        bulletItem('Healthy People ', '3'),
        bulletItem('Kaiser Family Foundation ', '4'),
        bulletItem('NEJM ', '5'),
        bulletItem('Health Affairs ', '6'),
        bulletItem('Institute of Medicine ', '7'),
        bulletItem('New South Wales Department of Health ', '8'),
      ]
      content.splice(v1OrgsAnchorIdx + 1, 0, ...v1OrgsList)
      console.log(`    → Inserted 8 bullet items`)
      changes++
    }
  } else {
    console.log(`  ⚠ Could not find v1 orgs anchor block`)
  }

  // v1 sources list: goes after "the estimated values referenced by the seven primary sources listed below."
  const v1SourcesAnchorIdx = content.findIndex(
    b => b._key === '2w6ezjzoxo9' // "The relative contribution..."
  )
  if (v1SourcesAnchorIdx >= 0) {
    const nextBlock = content[v1SourcesAnchorIdx + 1]
    if (nextBlock && nextBlock.listItem === 'bullet') {
      console.log(`\n  v1 sources list already present, skipping`)
    } else {
      console.log(`\n  Inserting v1 sources list after index ${v1SourcesAnchorIdx}`)
      const v1SourcesList = [
        bulletItem('DHHS ', '9'),
        bulletItem('JAMA ', '10, 12'),
        bulletItem('Health Affairs ', '11'),
        bulletItem('PLoS ', '13'),
        bulletItem('WHO ', '14'),
        bulletItem('U.Wisconsin ', '15'),
      ]
      content.splice(v1SourcesAnchorIdx + 1, 0, ...v1SourcesList)
      console.log(`    → Inserted 6 bullet items`)
      changes++
    }
  } else {
    console.log(`  ⚠ Could not find v1 sources anchor block`)
  }

  // v2 sources list: goes after "the values referenced from the six sources listed below."
  const v2SourcesAnchorIdx = content.findIndex(
    b => b._key === 'n9fxcsyn82' // "The following are updated calculations..."
  )
  if (v2SourcesAnchorIdx >= 0) {
    const nextBlock = content[v2SourcesAnchorIdx + 1]
    if (nextBlock && nextBlock.listItem === 'bullet') {
      console.log(`\n  v2 sources list already present, skipping`)
    } else {
      console.log(`\n  Inserting v2 sources list after index ${v2SourcesAnchorIdx}`)
      const v2SourcesList = [
        bulletItem('DHHS ', '9'),
        bulletItem('JAMA ', '10, 12'),
        bulletItem('Health Affairs ', '11'),
        bulletItem('WHO ', '14'),
        bulletItem('U.Wisconsin ', '15'),
      ]
      content.splice(v2SourcesAnchorIdx + 1, 0, ...v2SourcesList)
      console.log(`    → Inserted 5 bullet items`)
      changes++
    }
  } else {
    console.log(`  ⚠ Could not find v2 sources anchor block`)
  }

  // Additional Change: 4-item literature list after "View the following literature for additional detail:"
  // Find the block with "Race and ethnicity have been removed from the biology section"
  const raceBlockIdx = content.findIndex(b => {
    if (b._type !== 'block') return false
    const text = b.children?.map(c => c.text).join('') || ''
    return text.includes('Race and ethnicity have been removed from the biology section')
  })
  if (raceBlockIdx >= 0) {
    const nextBlock = content[raceBlockIdx + 1]
    if (nextBlock && nextBlock.listItem === 'bullet') {
      console.log(`\n  Additional Change literature list already present, skipping`)
    } else {
      console.log(`\n  Inserting Additional Change literature list after index ${raceBlockIdx}`)
      const literatureList = [
        bulletItem(
          'Fujimura, J. H., & Rajagopalan, R. (2010). Different differences: The use of \'genetic ancestry\' versus race in biomedical human genetic research. Social Studies of Science, 41(1), 5-30. doi:10.1177/0306312710379170'
        ),
        bulletItem(
          'Long, J. C., & Kittles, R. A. (2003). Human Genetic Diversity and the Nonexistence of Biological Races. Human Biology, 75(4), 449-471. doi:10.1353/hub.2003.0058'
        ),
        bulletItem(
          'AR, T. (2013). Biological races in humans. [Abstract]. Stud Hist Philos Biol Biomed Sci, 262-271. Retrieved February 14, 2018, from https://www.ncbi.nlm.nih.gov/pubmed/23684745.'
        ),
        bulletItem(
          'Caprio, S., Daniels, S. R., Drewnowski, A., Kaufman, F. R., Palinkas, L. A., Rosenbloom, A. L.,... Kirkman, M. S. (2008). Influence of Race, Ethnicity, and Culture on Childhood Obesity: Implications for Prevention and Treatment. Obesity, 16(12), 2566-2577. doi:10.1038/oby.2008.398'
        ),
      ]
      content.splice(raceBlockIdx + 1, 0, ...literatureList)
      console.log(`    → Inserted 4 bullet items`)
      changes++
    }
  } else {
    console.log(`  ⚠ Could not find "Race and ethnicity" anchor block`)
  }

  // ---- Fix 3: Add missing poster description paragraph + button group ----
  // The Gatsby page has after the 3 poster photos:
  //   <p>"The Determinants of Health is available as a poster, an installation, a download, and an interactive visualization."</p>
  //   Button group: Buy Print, On Github, Methodology
  // Look for the columns block that holds the 3 poster images, then insert after it
  const columnsIdx = content.findIndex(b => b._key === 'c276c455-f70')
  if (columnsIdx >= 0) {
    // Check if the paragraph already exists after columns
    const afterColumns = content[columnsIdx + 1]
    const alreadyHas = afterColumns && afterColumns._type === 'block' &&
      afterColumns.children?.[0]?.text?.includes('available as a poster')
    if (alreadyHas) {
      console.log(`\n  Poster description already present, skipping`)
    } else {
      console.log(`\n  Inserting poster description + button group after columns at index ${columnsIdx}`)
      const posterDesc = textBlock(
        'The Determinants of Health is available as a poster, an installation, a download, and an interactive visualization.'
      )
      const posterButtons = {
        _type: 'buttonGroup',
        _key: makeKey(),
        buttons: [
          {
            _key: makeKey(),
            label: 'Buy Print',
            url: 'https://www.amazon.com/Determinants-Health-Poster-24-35-75/dp/B06X1GFDH1/',
            variant: 'secondary',
            external: true,
          },
          {
            _key: makeKey(),
            label: 'On Github',
            url: 'https://github.com/goinvo/HealthDeterminants',
            variant: 'secondary',
            external: true,
          },
          {
            _key: makeKey(),
            label: 'Methodology',
            url: '#methodology',
            variant: 'secondary',
            external: false,
          },
        ],
      }
      content.splice(columnsIdx + 1, 0, posterDesc, posterButtons)
      console.log(`    → Inserted 1 paragraph + 1 button group`)
      changes++
    }
  } else {
    console.log(`  ⚠ Could not find poster columns block`)
  }

  // ---- Summary ----
  console.log(`\n  Total changes: ${changes}`)
  console.log(`  Content blocks: ${doc.content.length} → ${content.length}`)

  if (changes === 0) {
    console.log(`  Nothing to patch.`)
    return
  }

  if (WRITE) {
    await client
      .patch(doc._id)
      .set({ content })
      .commit()
    console.log(`\n  ✓ Patched successfully!`)
  } else {
    console.log(`\n  (dry run — pass --write to apply)`)
  }
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
