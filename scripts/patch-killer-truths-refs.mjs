/**
 * Add references block to Killer Truths in Sanity
 *
 * Adds the 27 sources from the Gatsby page as a references block
 * appended to the content array.
 *
 * Usage:
 *   node scripts/patch-killer-truths-refs.mjs          # dry run
 *   node scripts/patch-killer-truths-refs.mjs --write   # apply changes
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
const SLUG = 'killer-truths'

const REFERENCES = [
  { title: 'Accidents or Unintentional Injuries. (2016, September 15). Retrieved January 23, 2017, from CDC website.', link: 'https://www.cdc.gov/nchs/fastats/accidental-injury.htm' },
  { title: "Alzheimer's Disease. (2015, March 05). Retrieved January 23, 2017, from CDC website.", link: 'https://www.cdc.gov/aging/aginginfo/alzheimers.htm' },
  { title: 'Bacterial Pneumonia. (n.d.). Retrieved January 23, 2017, from Healthline.', link: 'http://www.healthline.com/health/bacterial-pneumonia#RiskFactors3' },
  { title: 'Behaviors That Increase Risk for Stroke. (2014, March 17). Retrieved January 23, 2017, from CDC website.', link: 'https://www.cdc.gov/stroke/behavior.htm' },
  { title: 'Cancer. (2015, February). Retrieved January 23, 2017, from WHO.', link: 'http://www.who.int/mediacentre/factsheets/fs297/en/' },
  { title: "Chan, A. (2010, September 10). The 10 Deadliest Cancers and Why There's No Cure. Retrieved January 23, 2017, from Live Science.", link: 'http://www.livescience.com/11041-10-deadliest-cancers-cure.html' },
  { title: 'Chronic Obstructive Pulmonary Disease (COPD) Includes: Chronic Bronchitis and Emphysema. (2016, October 07). Retrieved January 23, 2017, from CDC website.', link: 'https://www.cdc.gov/nchs/fastats/copd.htm' },
  { title: 'Drug Poisoning Mortality: United States, 1999–2014. (2016, March 30). Retrieved January 12, 2017, from CDC website.', link: 'https://blogs.cdc.gov/nchs-data-visualization/drug-poisoning-mortality/' },
  { title: 'Drunk driving statistics (2007). (n.d.). Retrieved January 12, 2017, from Alcohol Alert.', link: 'http://www.alcoholalert.com/drunk-driving-statistics-2007.html' },
  { title: 'Drunk driving statistics (2008). (n.d.). Retrieved January 12, 2017, from Alcohol Alert.', link: 'http://www.alcoholalert.com/drunk-driving-statistics-2008.html' },
  { title: 'Drunk driving statistics (2010). (n.d.). Retrieved January 12, 2017, from Alcohol Alert.', link: 'http://www.alcoholalert.com/drunk-driving-statistics-2010.html' },
  { title: 'Heart disease Causes. (2014, July 29). Retrieved January 23, 2017, from Mayo Clinic.', link: 'http://www.mayoclinic.org/diseases-conditions/heart-disease/basics/causes/con-20034056' },
  { title: 'Intoxalock Ignition Interlock Device. (n.d.). Retrieved January 12, 2017.', link: 'https://www.intoxalock.com/ignition-interlock-devices/statistics' },
  { title: 'Kochanek, K. D., Murphy, S. L., & Xu, J. (2015, July 27). National Vital Statistics Report, Deaths: Final Data for 2011.', link: 'https://www.cdc.gov/nchs/data/nvsr/nvsr63/nvsr63_03.pdf' },
  { title: 'Kochanek, K. D., Murphy, S. L., Xu, J., & Tejada-Vera, B. (2016, June 30). National Vital Statistics Report, Deaths: Final Data for 2014.', link: 'https://www.cdc.gov/nchs/data/nvsr/nvsr65/nvsr65_04.pdf' },
  { title: 'Kochanek, K. D., Xu, J., Murphy, S. L., Miniño, A. M., & Kung, H. (2011, December 29). National Vital Statistics Report, Deaths: Final Data for 2009.', link: 'https://www.cdc.gov/nchs/data/nvsr/nvsr60/nvsr60_03.pdf' },
  { title: 'M. (n.d.). MADD - 2012 Drunk Driving Fatalities by State. Retrieved January 12, 2017.', link: 'http://www.madd.org/blog/2013/november/2012-drunk-driving-fatalities.html' },
  { title: 'Makary, M. A., & Daniel, M. (2016, May 3). Medical error—the third leading cause of death in the US. BMJ.', link: 'http://www.bmj.com/content/353/bmj.i2139' },
  { title: 'Miniño, A. M., Murphy, S. L., Xu, J., & Kochanek, K. D. (2011, December 07). National Vital Statistics Report, Deaths: Final Data for 2008.', link: 'https://www.cdc.gov/nchs/data/nvsr/nvsr59/nvsr59_10.pdf' },
  { title: 'Murphy, S. L., Kochanek, K. D., Xu, J., & Heron, M. (2015, August 31). National Vital Statistics Report, Deaths: Final Data for 2012.', link: 'https://www.cdc.gov/nchs/data/nvsr/nvsr63/nvsr63_09.pdf' },
  { title: 'Murphy, S. L., Xu, J., & Kochanek, K. D. (2013, May 8). National Vital Statistics Report, Deaths: Final Data for 2010.', link: 'https://www.cdc.gov/nchs/data/nvsr/nvsr61/nvsr61_04.pdf' },
  { title: 'National Consortium for the Study of Terrorism and Responses to Terrorism Fact Sheet: American Deaths in Terrorist Attacks (2015, October).' },
  { title: 'Rudd, R. A., Aleshire, N., Zibbell, J. E., & Gladden, M. R. (2016, January 01). Increases in Drug and Opioid Overdose Deaths — United States, 2000–2014.', link: 'https://www.cdc.gov/mmwr/preview/mmwrhtml/mm6450a3.htm' },
  { title: 'Statistics About Diabetes. (2016, December 12). Retrieved January 23, 2017, from American Diabetes Association.', link: 'http://www.diabetes.org/diabetes-basics/statistics/' },
  { title: 'Tobacco-Related Mortality. (2016, December 01). Retrieved January 12, 2017, from CDC website.', link: 'https://www.cdc.gov/tobacco/data_statistics/fact_sheets/health_effects/tobacco_related_mortality/' },
  { title: 'Xu, J., Kochanek, K. D., Murphy, S. L., & Tejada-Vera, B. (2010, May 20). National Vital Statistics Report, Deaths: Final Data for 2007.', link: 'https://www.cdc.gov/nchs/data/nvsr/nvsr58/nvsr58_19.pdf' },
  { title: 'Xu, J., Murphy, S. L., Kochanek, K. D., & Bastian, B. A. (2016, February 16). National Vital Statistics Report, Deaths: Final Data for 2013.', link: 'https://www.cdc.gov/nchs/data/nvsr/nvsr64/nvsr64_02.pdf' },
]

async function main() {
  console.log(`\n${WRITE ? '🔴 WRITE MODE' : '🔵 DRY RUN'} — Adding references to ${SLUG}\n`)

  const feature = await client.fetch(
    `*[_type == "feature" && slug.current == $slug][0]{ _id, title, content }`,
    { slug: SLUG }
  )

  if (!feature) {
    console.error(`Feature "${SLUG}" not found`)
    process.exit(1)
  }

  console.log(`Found: "${feature.title}" (${feature._id})`)
  console.log(`Content blocks: ${feature.content?.length || 0}`)

  // Check if references block already exists
  const hasRefs = (feature.content || []).some(b => b._type === 'references')
  if (hasRefs) {
    console.log('References block already exists — skipping.')
    return
  }

  // Build references block
  const refsBlock = {
    _type: 'references',
    _key: 'killer-truths-refs',
    items: REFERENCES.map((ref, i) => ({
      _type: 'referenceItem',
      _key: `ref-${i + 1}`,
      title: ref.title,
      link: ref.link || '',
    })),
  }

  console.log(`\nWould add references block with ${REFERENCES.length} items`)

  if (WRITE) {
    const patchedContent = [...(feature.content || []), refsBlock]
    await client
      .patch(feature._id)
      .set({ content: patchedContent })
      .commit()
    console.log('✅ Done!')
  } else {
    // Preview first 5
    for (let i = 0; i < Math.min(5, REFERENCES.length); i++) {
      const r = REFERENCES[i]
      console.log(`  ${i + 1}. ${r.title.substring(0, 80)}...`)
    }
    console.log(`  ... and ${REFERENCES.length - 5} more`)
    console.log('\nRun with --write to apply.')
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
