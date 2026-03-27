import type { Metadata } from 'next'
import Image from 'next/image'
import { cloudfrontImage } from '@/lib/utils'
import { Divider } from '@/components/ui/Divider'
import { Button } from '@/components/ui/Button'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'
import { References } from '@/components/ui/References'

export const metadata: Metadata = {
  title: 'Understanding Zika',
  description:
    'There are an estimated 1.6 million cases of Zika virus in 33 countries. Learn about how Zika spreads, its symptoms, prevention, and treatment.',
}

const references = [
  { title: 'Roberts, M. (2016, Feb 1). "Zika-linked condition: WHO declares global emergency." BBC News Online.', link: 'http://www.bbc.com/news/health-35459797' },
  { title: 'Gallagher, J. (2015, Feb 5). "Zika outbreak: Travel advice." BBC News Online.', link: 'http://www.bbc.com/news/health-35441675' },
  { title: 'Centers for Disease Control and Prevention (2016). "Zika Virus."', link: 'http://www.cdc.gov/zika/' },
  { title: 'Wikipedia (2016). "Zika Virus."', link: 'https://en.wikipedia.org/wiki/Zika_virus' },
  { title: '"Zika virus triggers pregnancy delay calls." (2016, Jan 23). BBC News.' },
  { title: '"Microcephaly." (2016). Mayo Clinic.', link: 'http://www.mayoclinic.org/diseases-conditions/microcephaly/basics/symptoms/con-20034823' },
  { title: 'Centers for Disease Control and Prevention (2016). "Zika virus: clinical evaluation & disease."', link: 'http://www.cdc.gov/zika/hc-providers/clinicalevaluation.html' },
  { title: 'World Health Organization. (2016, Jan). "Zika virus."', link: 'http://www.who.int/mediacentre/factsheets/zika/en/' },
  { title: 'Swails, B., McKenzie, D. (2016, Feb 3). "Uganda\'s Zika Forest, birthplace of the Zika virus." CNN.', link: 'http://www.cnn.com/2016/02/02/health/zika-forest-viral-birthplace/' },
  { title: 'Szabo, Liz. (2016, Feb 5). "Zika Q&A: What you need to know about sex, saliva, sperm banks." USA Today.', link: 'http://www.usatoday.com/story/news/2016/02/03/zika-q-and-a/79751476/' },
  { title: 'March of Dimes. (2016, Feb). "Zika virus and pregnancy."', link: 'http://www.marchofdimes.org/complications/zika-virus-and-pregnancy.aspx' },
  { title: '"Zika virus: Three Britons infected, say health officials." (2016, Jan 23). BBC News.', link: 'http://www.bbc.com/news/uk-35391712' },
  { title: 'Dick, GWA, et al. (1952). "Zika virus isolations and serological specificity." Trans R Soc Trop Med Hyg 46(5): 509-520.' },
  { title: 'Centers for Disease Control and Prevention (2016). "Zika virus: prevention."' },
  { title: 'Carless, W. (2016, Feb 3). "On Brazil\'s Zika front lines, cases of microcephaly are actually dropping." USA Today.', link: 'http://www.usatoday.com/story/news/world/2016/02/03/brazil-zika-birth-defect-drop-hospital-microcephaly/79791768/' },
  { title: 'Centers for Disease Control and Prevention (2016). "Interim Guidelines for Pregnant Women During a Zika Virus Outbreak."', link: 'http://www.cdc.gov/mmwr/volumes/65/wr/mm6502e1.htm' },
  { title: 'Phillips, S. (2016, Feb 4). "Blood bank rejecting donors who visited Zika areas." Fox5 San Diego News.', link: 'http://fox5sandiego.com/2016/02/04/blood-bank-rejecting-donors-who-visited-zika-areas/' },
  { title: 'Withnall, A. (2016, Jan 28). "How the Zika virus spread around the world." The Independent.', link: 'http://www.independent.co.uk/life-style/health-and-families/health-news/zika-how-virus-spread-around-world-a6839101.html' },
  { title: 'Musso, D. (2015). "Zika Virus Transmission from French Polynesia to Brazil." Emerg Infect Dis 21(10): 1887.' },
  { title: 'Fox, M. (2016, Feb 2). "Dallas Reports First Case of Sexual Transmission of Zika Virus." NBC News.', link: 'http://www.nbcnews.com/storyline/zika-virus-outbreak/zika-virus-can-spread-sexual-contact-health-officials-dallas-confirm-n510076' },
  { title: 'Wilcox, E. (2010). "Lt Col Mark Duffy receives the 2010 James H. Nakano Citation."', link: 'http://www.wpafb.af.mil/news/story.asp?id=123219950' },
  { title: 'Parry, L. (2016, Feb 2). "Game-changing Zika virus is about as scary as it gets, warns expert." Daily Mail, UK.', link: 'http://www.dailymail.co.uk/health/article-3428938/Game-changing-Zika-virus-scary-gets-warns-expert.html' },
  { title: 'Seibel, M. (2016, Feb 4). "French researcher says Zika link to Guillain-Barr\u00e9 Syndrome is almost certain." Fort Worth Star-Telegram.', link: 'http://www.star-telegram.com/news/nation-world/world/article58432243.html' },
  { title: 'Photo by Miguel Discart.', link: 'https://www.flickr.com/photos/miguel_discart/' },
  { title: 'Photo by IAEA Imagebank.', link: 'https://www.flickr.com/photos/iaea_imagebank/' },
  { title: 'Image retrieved from Panam Post.', link: 'https://panampost.com/panam-staff/2015/02/25/colombias-price-controls-a-cure-worse-than-the-disease/' },
  { title: 'Image retrieved from Public Health Watch.', link: 'https://publichealthwatch.wordpress.com/2016/02/03/texas-reports-first-case-of-sexually-transmitted-zika-virus-in-u-s/' },
  { title: 'Roeder, A. (2016). "Zika virus in Brazil may be mutated strain." Harvard T.H. Chan School of Public Health.', link: 'http://www.hsph.harvard.edu/news/features/zika-virus-in-brazil-may-be-mutated-strain/' },
  { title: 'Wapps, J. (2016, Feb 5). "WHO: Local Zika cases in 33 nations as GBS numbers climb." University of Minnesota CIDRAP.', link: 'http://www.cidrap.umn.edu/news-perspective/2016/02/who-local-zika-cases-33-nations-gbs-numbers-climb' },
  { title: '"Zika virus outbreak (2015-present)." Wikipedia.', link: 'https://en.wikipedia.org/wiki/Zika_virus_outbreak_(2015%E2%80%93present)' },
  { title: 'Mackenzie, J. (2016, Feb 4). "Zika, dengue, yellow fever: what are flaviviruses?" The Conversation.', link: 'http://theconversation.com/zika-dengue-yellow-fever-what-are-flaviviruses-53969' },
  { title: '"Yellow Fever." (2014, March). World Health Organization.', link: 'http://www.who.int/mediacentre/factsheets/fs100/en/' },
  { title: '"Dengue and severe dengue." (2015, May). World Health Organization.', link: 'http://www.who.int/mediacentre/factsheets/fs117' },
  { title: '"Dengue is fastest-spreading tropical disease, WHO says." (2013). Fox News Health.', link: 'http://www.foxnews.com/health/2013/01/16/dengue-is-fastest-spreading-tropical-disease-who-says.html' },
  { title: 'World Economic Forum. (2016, Jan 4). "How close are we to beating dengue?"', link: 'http://www.weforum.org/agenda/2016/01/how-close-are-we-to-beating-dengue' },
  { title: 'Centers for Disease Control and Prevention (2016). "Zika virus: Guillain-Barr\u00e9 syndrome Q & A."', link: 'http://www.cdc.gov/zika/qa/gbs-qa.html' },
  { title: 'World Health Organization. (2016, Mar 7). "Guillain-Barr\u00e9 syndrome - France - French Polynesia."', link: 'http://www.who.int/csr/don/7-march-2016-gbs-french-polynesia/en/' },
  { title: 'European Centre for Disease Prevention and Control. (2015, Dec 10). "Zika virus epidemic in the Americas."', link: 'http://ecdc.europa.eu/en/publications/Publications/zika-virus-americas-association-with-microcephaly-rapid-risk-assessment.pdf' },
  { title: '"Guillain-Barr\u00e9 syndrome." Mayo Clinic. (2016).', link: 'http://www.mayoclinic.org/diseases-conditions/guillain-barre-syndrome/basics/symptoms/con-20025832' },
  { title: 'Sifferlin, A. (2016, Feb 8). "Here\'s the Other Zika Problem Experts Are Worried About." Time.', link: 'http://time.com/4209612/zika-guillain-barre-syndrome-cdc/' },
  { title: 'World Health Organization. (2016, Feb 1). "WHO statement on the first meeting of the IHR Emergency Committee on Zika virus."', link: 'http://www.who.int/mediacentre/news/statements/2016/1st-emergency-committee-zika/en/' },
  { title: 'White House. "Fact Sheet: Preparing and Responding to Zika Virus at Home and Abroad."', link: 'https://www.whitehouse.gov/the-press-office/2016/02/08/fact-sheet-preparing-and-responding-zika-virus-home-and-abroad' },
]

function TimelineItem({
  year,
  image,
  children,
}: {
  year: string
  image?: string
  children: React.ReactNode
}) {
  return (
    <div className="relative pl-8 pb-8 border-l-2 border-[#4a90a4] last:border-l-0 last:pb-0">
      <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-[#4a90a4]" />
      <p className="font-serif text-lg font-bold mb-2">{year}</p>
      {image && (
        <Image
          src={cloudfrontImage(image)}
          alt={`Zika timeline ${year}`}
          width={600}
          height={400}
          className="w-full h-auto mb-3 rounded"
        />
      )}
      <div className="text-gray leading-relaxed">{children}</div>
    </div>
  )
}

function SpreadCard({
  image,
  title,
}: {
  image: string
  title: string
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <Image
        src={cloudfrontImage(image)}
        alt={title}
        width={200}
        height={200}
        className="w-32 h-32 object-contain mb-2"
      />
      <p className="text-sm font-semibold">{title}</p>
    </div>
  )
}

function PreventionItem({
  image,
  children,
}: {
  image: string
  children: React.ReactNode
}) {
  return (
    <div className="flex gap-4 mb-6 items-start">
      <Image
        src={cloudfrontImage(image)}
        alt=""
        width={80}
        height={80}
        className="w-16 h-16 object-contain flex-shrink-0"
      />
      <p className="text-gray leading-relaxed flex-1">{children}</p>
    </div>
  )
}

function ActionPlanItem({
  image,
  children,
}: {
  image: string
  children: React.ReactNode
}) {
  return (
    <div className="flex gap-4 mb-4 items-start">
      <Image
        src={cloudfrontImage(image)}
        alt=""
        width={64}
        height={64}
        className="w-12 h-12 object-contain flex-shrink-0"
      />
      <p className="text-gray leading-relaxed flex-1">{children}</p>
    </div>
  )
}

export default function UnderstandingZikaPage() {
  return (
    <div>
      <SetCaseStudyHero image={cloudfrontImage('/images/features/understanding-zika/understanding-zika-featured.jpg')} />

      {/* What is Zika */}
      <section className="py-12" id="what-is-zika">
        <div className="max-width max-width-md content-padding mx-auto">
          <h1 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light">
            Understanding Zika
          </h1>
          <h4 className="font-serif text-base font-light mb-6">
            A virus spreading quickly throughout Latin America
          </h4>
          <p className="text-gray leading-relaxed mb-4">
            Zika is a virus spreading quickly throughout Latin America that is carried by mosquitoes and causes mild illness. Unconfirmed links exist between infected pregnant women and microcephaly (underdeveloped brain), plus Guillain-Barr&eacute; syndrome.
          </p>

          <Divider />

          {/* How it Spreads */}
          <h2 className="font-serif text-2xl mt-8 mb-6" id="transmission">How it Spreads</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            <SpreadCard image="/old/images/features/zika/spread-mosquito.png" title="Person &rarr; mosquito &rarr; person" />
            <SpreadCard image="/old/images/features/zika/spread-mother.png" title="Mother &rarr; unborn child" />
            <SpreadCard image="/old/images/features/zika/spread-partner.png" title="Man &rarr; sexual partner" />
            <SpreadCard image="/old/images/features/zika/spread-bloodbank.png" title="Person &rarr; blood bank &rarr; person" />
          </div>

          <Divider />

          {/* How to Prevent it */}
          <h2 className="font-serif text-2xl mt-8 mb-6" id="prevention">How to Prevent It</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            <div className="flex flex-col items-center text-center">
              <Image src={cloudfrontImage('/old/images/features/zika/prevent-travel-2.png')} alt="Avoid travel" width={200} height={200} className="w-32 h-32 object-contain mb-2" />
              <p className="text-sm text-gray">Avoid travel to affected areas, especially if pregnant</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <Image src={cloudfrontImage('/old/images/features/zika/emptywater.png')} alt="Remove standing water" width={200} height={200} className="w-32 h-32 object-contain mb-2" />
              <p className="text-sm text-gray">Remove standing water in flowerpots, buckets, bowls, pools</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <Image src={cloudfrontImage('/old/images/features/zika/prevent-bugspray.png')} alt="Use insect repellent" width={200} height={200} className="w-32 h-32 object-contain mb-2" />
              <p className="text-sm text-gray">Use insect repellents (DEET/picaridin) or wear protective clothing</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <Image src={cloudfrontImage('/old/images/features/zika/prevent-close-2.png')} alt="Keep doors screened" width={200} height={200} className="w-32 h-32 object-contain mb-2" />
              <p className="text-sm text-gray">Keep doors/windows screened or closed; use mosquito netting</p>
            </div>
          </div>

          <Divider />

          {/* When to Tell Your Doctor */}
          <h2 className="font-serif text-2xl mt-8 mb-6" id="symptoms">When to Tell Your Doctor</h2>
          <p className="text-gray leading-relaxed mb-4">
            If you have been exposed to a Zika-infected area, watch for these signs of Zika Disease.
          </p>
          <div className="flex flex-col md:flex-row gap-8 items-center mb-6">
            <div className="flex-shrink-0">
              <Image
                src={cloudfrontImage('/old/images/features/zika/1in5.svg')}
                alt="Only 1 in 5 infected people develop symptoms"
                width={200}
                height={200}
                className="w-40 h-40 object-contain"
              />
            </div>
            <div>
              <p className="text-gray leading-relaxed mb-2">
                <strong className="text-black">Only about 1 in 5 infected people develop symptoms.</strong>
              </p>
              <p className="text-gray leading-relaxed">
                Incubation period is likely a few days to one week. Symptoms are usually mild and last several days to a week.
              </p>
            </div>
          </div>
          <Image
            src={cloudfrontImage('/old/images/features/zika/zika-symptoms.png')}
            alt="Zika symptoms: headache, fever, red eyes, joint pain, rash, muscle pain"
            width={800}
            height={400}
            className="w-full h-auto mb-8"
          />
        </div>
      </section>

      {/* Timeline */}
      <section className="bg-gray-lightest py-12" id="timeline">
        <div className="max-width max-width-md content-padding mx-auto">
          <h2 className="font-serif text-[2.25rem] leading-[2.625rem] font-light text-center mb-8">Zika Timeline</h2>
          <TimelineItem year="1947" image="/old/images/features/zika/1947-zika-forest.jpg">
            <p>The name comes from the Zika Forest in Uganda where the virus was first isolated. First identified in rhesus monkeys.</p>
          </TimelineItem>
          <TimelineItem year="1952" image="/old/images/features/zika/1952-first-case-zika.png">
            <p>A paper was published confirming the first case of Zika virus in a human &mdash; a 10-year-old Nigerian female.</p>
          </TimelineItem>
          <TimelineItem year="1951-1981" image="/old/images/features/zika/1951-map.png">
            <p>The virus spread through Africa to Asia with only rare reported cases.</p>
          </TimelineItem>
          <TimelineItem year="2007" image="/old/images/features/zika/2007-yap-island-outbreak.jpg">
            <p>In April of 2007, Zika made it outside of Africa and Asia for the first time when it spread to Yap Island in Micronesia. 49 confirmed cases, no deaths.</p>
          </TimelineItem>
          <TimelineItem year="2014" image="/old/images/features/zika/2014-world-cup.jpg">
            <p>The virus spread to French Polynesia. It is believed that the 2014 Soccer World Cup was responsible for the spread of Zika to Brazil.</p>
          </TimelineItem>
          <TimelineItem year="2015" image="/old/images/features/zika/2015-zika-mosquitoes.jpg">
            <p>In April of 2015, Zika spread from the ongoing outbreak in Brazil to Mexico, Central America, Caribbean, and South America where it reached pandemic levels.</p>
          </TimelineItem>
          <TimelineItem year="15 Jan 2016" image="/old/images/features/zika/level2alert.png">
            <p>CDC issued Level 2 travel alert for regions with active Zika transmission.</p>
          </TimelineItem>
          <TimelineItem year="23 Jan 2016" image="/old/images/features/zika/2016-minister-gaviria.jpg">
            <p>Five South American countries advised women to postpone getting pregnant.</p>
          </TimelineItem>
          <TimelineItem year="1 Feb 2016" image="/old/images/features/zika/2016-who-representative.jpg">
            <p>World Health Organization declared a Public Health Emergency of International Concern.</p>
          </TimelineItem>
          <TimelineItem year="2 Feb 2016">
            <p>31 isolated cases in the US across 11 states plus DC; one sexual transmission case confirmed in Dallas.</p>
          </TimelineItem>
          <TimelineItem year="8 Feb 2016" image="/old/images/features/zika/2016-white-house.jpg">
            <p>The White House announced a request to Congress for more than $1.8 billion in emergency funding to combat Zika.</p>
          </TimelineItem>
        </div>
      </section>

      {/* Cases Map */}
      <section className="py-12" id="cases">
        <div className="max-width max-width-md content-padding mx-auto">
          <h2 className="font-serif text-[2.25rem] leading-[2.625rem] font-light text-center mb-4">Zika Virus Cases</h2>
          <p className="text-center text-gray leading-relaxed mb-8">
            There are an estimated <strong className="text-black">1.6 million cases</strong> of Zika virus in <strong className="text-black">33 countries</strong>.
          </p>
          <Image
            src={cloudfrontImage('/old/images/features/zika/map.svg')}
            alt="Map of Zika virus cases worldwide"
            width={1200}
            height={600}
            className="w-full h-auto mb-8"
          />

          <h3 className="font-serif text-xl mb-3">Americas (31 locations)</h3>
          <p className="text-gray leading-relaxed mb-6">
            Aruba, Barbados, Bonaire, Bolivia, Brazil, Colombia, Costa Rica, Curacao, Dominican Republic, Ecuador, El Salvador, French Guiana, Guadeloupe, Guatemala, Guyana, Haiti, Honduras, Jamaica, Martinique, Mexico, Nicaragua, Panama, Paraguay, Puerto Rico, Saint Martin, Saint Vincent &amp; the Grenadines, Sint Martin, Suriname, Trinidad and Tobago, U.S Virgin Islands, Venezuela
          </p>

          <h3 className="font-serif text-xl mb-3">Oceania / Pacific Islands (5 locations)</h3>
          <p className="text-gray leading-relaxed mb-6">
            American Samoa, Marshall Islands, New Caledonia, Samoa, Tonga
          </p>

          <h3 className="font-serif text-xl mb-3">Africa (1 location)</h3>
          <p className="text-gray leading-relaxed mb-6">Cape Verde</p>

          <p className="text-sm text-gray italic">Last Updated: 8 Feb 2016</p>

          <Divider />
        </div>
      </section>

      {/* Detailed Transmission */}
      <section className="py-12" id="transmission-detail">
        <div className="max-width max-width-md content-padding mx-auto">
          <h2 className="header-lg mb-4">Transmission</h2>
          <p className="text-gray leading-relaxed mb-6">
            The Zika virus is not yet fully understood. However, there are 4 known ways to transmit the Zika virus.
          </p>

          <div className="flex gap-4 items-start mb-6">
            <Image src={cloudfrontImage('/old/images/features/zika/spread-mosquito.png')} alt="" width={80} height={80} className="w-16 h-16 object-contain flex-shrink-0" />
            <div>
              <h4 className="font-semibold mb-1">Person &rarr; Mosquito &rarr; Person</h4>
              <p className="text-gray leading-relaxed">Zika is most commonly transmitted from person to person by the Aedes mosquito, which live in urban areas and are active during the day (usually mornings and late afternoons).</p>
            </div>
          </div>

          <div className="flex gap-4 items-start mb-6">
            <Image src={cloudfrontImage('/old/images/features/zika/spread-mother.png')} alt="" width={80} height={80} className="w-16 h-16 object-contain flex-shrink-0" />
            <div>
              <h4 className="font-semibold mb-1">Mother &rarr; Unborn Child</h4>
              <p className="text-gray leading-relaxed">Zika virus can spread from an infected mother to the placenta and their unborn baby. The virus will not infect infants conceived after the virus has cleared from the blood. There is no evidence suggesting a risk for future birth defects.</p>
            </div>
          </div>

          <div className="flex gap-4 items-start mb-6">
            <Image src={cloudfrontImage('/old/images/features/zika/spread-partner.png')} alt="" width={80} height={80} className="w-16 h-16 object-contain flex-shrink-0" />
            <div>
              <h4 className="font-semibold mb-1">Man &rarr; Sexual Partner</h4>
              <p className="text-gray leading-relaxed">Transmission of Zika during sex is possible but rare. If an infected male partner has the virus in their blood stream, their semen can be contagious. It is unknown how long Zika can live in semen. Infected individuals should abstain from sex or use a condom for 6 months after the infection.</p>
            </div>
          </div>

          <div className="flex gap-4 items-start mb-6">
            <Image src={cloudfrontImage('/old/images/features/zika/spread-bloodbank.png')} alt="" width={80} height={80} className="w-16 h-16 object-contain flex-shrink-0" />
            <div>
              <h4 className="font-semibold mb-1">Person &rarr; Blood Bank &rarr; Person</h4>
              <p className="text-gray leading-relaxed">There may also be a chance of transmission through blood transfusions, but no conclusive evidence has been found.</p>
            </div>
          </div>

          <Divider />
        </div>
      </section>

      {/* Comprehensive Prevention */}
      <section className="py-12" id="prevention-detail">
        <div className="max-width max-width-md content-padding mx-auto">
          <h2 className="header-lg mb-4">Prevention</h2>
          <p className="text-gray leading-relaxed mb-6">
            Currently no vaccinations exist to prevent Zika. The best way to prevent infection is to avoid mosquito bites.
          </p>

          <PreventionItem image="/old/images/features/zika/prevent-travel-2.png">
            <strong className="text-black">Avoid travel</strong> to areas with confirmed Zika cases, especially if you are pregnant.
          </PreventionItem>

          <PreventionItem image="/old/images/features/zika/prevent-bugspray-2.png">
            <strong className="text-black">Apply insect repellent</strong> every few hours. Do not spray repellent on the skin under clothing. Insect repellent is safe for pregnant women.
          </PreventionItem>

          <PreventionItem image="/old/images/features/zika/emptywater.png">
            <strong className="text-black">Remove still water</strong> in flowerpots, buckets, animal water bowls, and kid pools to prevent potential mosquito breeding grounds.
          </PreventionItem>

          <PreventionItem image="/old/images/features/zika/prevent-longsleeves-2.png">
            <strong className="text-black">Wear long-sleeve shirts and pants</strong> to avoid mosquito bites.
          </PreventionItem>

          <PreventionItem image="/old/images/features/zika/prevent-close-2.png">
            <strong className="text-black">Choose lodging</strong> that is air-conditioned, has screens on the doors and windows, or purchase a mosquito bed net.
          </PreventionItem>

          <PreventionItem image="/old/images/features/zika/wearcondom_360.png">
            <strong className="text-black">Wear a condom</strong> during sex or abstain from sex for 6 months if you have traveled to a Zika-infected area.
          </PreventionItem>

          <PreventionItem image="/old/images/features/zika/prevent-net.png">
            <strong className="text-black">Choose a WHOPES-approved bed net</strong> with 156 holes per square inch that is long enough to tuck under the mattress. Permethrin-treated nets help kill mosquitoes; do not wash them or expose them to sunlight.
          </PreventionItem>

          <PreventionItem image="/old/images/features/zika/prevent-directions.png">
            <strong className="text-black">Follow directions on the label</strong> when applying insect repellent to children. Spray repellent onto hands first to apply to a child&apos;s face. Avoid applying repellent to the child&apos;s hands, mouth, eyes, or open wounds.
          </PreventionItem>

          <PreventionItem image="/old/images/features/zika/prevent-baby-net.png">
            <strong className="text-black">DO NOT apply insect repellent to babies younger than 2 months old.</strong> Instead, dress them in long sleeves and cover the stroller or carrier with mosquito netting.
          </PreventionItem>

          <PreventionItem image="/old/images/features/zika/prevent-spray-clothes.png">
            <strong className="text-black">Treat clothing and gear</strong> (boots, pants, socks, tents) with an insecticide called permethrin. Mosquitoes can bite through thin clothing. DO NOT apply permethrin directly to the skin.
          </PreventionItem>

          <Divider />

          {/* Bug Spray Guide */}
          <h3 className="font-serif text-xl mt-8 mb-4">Choosing the Right Bug Spray</h3>

          <h4 className="font-semibold text-sm uppercase tracking-wider mb-3">DEET-containing products</h4>
          <div className="flex flex-wrap gap-4 mb-6 items-center">
            <Image src={cloudfrontImage('/old/images/features/zika/off.png')} alt="OFF" width={60} height={60} className="h-10 w-auto object-contain" />
            <Image src={cloudfrontImage('/old/images/features/zika/Sawyer-logo1.jpg')} alt="Sawyer" width={60} height={60} className="h-10 w-auto object-contain" />
            <Image src={cloudfrontImage('/old/images/features/zika/cutter.png')} alt="Cutter" width={60} height={60} className="h-10 w-auto object-contain" />
            <Image src={cloudfrontImage('/old/images/features/zika/ultrathon_logo.png')} alt="Ultrathon" width={60} height={60} className="h-10 w-auto object-contain" />
          </div>

          <h4 className="font-semibold text-sm uppercase tracking-wider mb-3">Picaridin / KBR 3023 / Bayrepel / Icaridin</h4>
          <div className="flex flex-wrap gap-4 mb-6 items-center">
            <Image src={cloudfrontImage('/old/images/features/zika/sss.png')} alt="SSS" width={60} height={60} className="h-10 w-auto object-contain" />
            <Image src={cloudfrontImage('/old/images/features/zika/autan_logo_m.png')} alt="Autan" width={60} height={60} className="h-10 w-auto object-contain" />
          </div>

          <h4 className="font-semibold text-sm uppercase tracking-wider mb-3">Oil of Lemon Eucalyptus (OLE) or PMD</h4>
          <div className="flex flex-wrap gap-4 mb-6 items-center">
            <Image src={cloudfrontImage('/old/images/features/zika/repel-logo.png')} alt="Repel" width={60} height={60} className="h-10 w-auto object-contain" />
          </div>

          <h4 className="font-semibold text-sm uppercase tracking-wider mb-3">IR3535</h4>
          <div className="flex flex-wrap gap-4 mb-6 items-center">
            <Image src={cloudfrontImage('/old/images/features/zika/sss.png')} alt="SSS" width={60} height={60} className="h-10 w-auto object-contain" />
            <Image src={cloudfrontImage('/old/images/features/zika/skinsmart.png')} alt="Skinsmart" width={60} height={60} className="h-10 w-auto object-contain" />
          </div>

          <p className="text-sm text-gray italic mb-8">
            Note: The EPA has not yet evaluated common natural insect repellents for effectiveness. Examples used in unregistered insect repellents include citronella oil, cedar oil, geranium oil, peppermint oil, soybean oil, and pure oil of lemon eucalyptus.
          </p>
        </div>
      </section>

      {/* Symptoms Detail */}
      <section className="bg-gray-lightest py-12" id="symptoms-detail">
        <div className="max-width max-width-md content-padding mx-auto">
          <h2 className="font-serif text-[2.25rem] leading-[2.625rem] font-light text-center mb-8">Symptoms of Zika Disease</h2>

          <div className="flex flex-col md:flex-row gap-8 items-center mb-8">
            <Image
              src={cloudfrontImage('/old/images/features/zika/1in5.svg')}
              alt="1 in 5 people"
              width={160}
              height={160}
              className="w-32 h-32 object-contain flex-shrink-0"
            />
            <p className="text-gray leading-relaxed">
              About <strong className="text-black">1 in 5</strong> people infected with Zika virus actually become ill.
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-8 items-center mb-8">
            <Image
              src={cloudfrontImage('/old/images/features/zika/incubation.svg')}
              alt="Incubation period"
              width={160}
              height={160}
              className="w-32 h-32 object-contain flex-shrink-0"
            />
            <p className="text-gray leading-relaxed">
              Incubation period is unknown but is likely a few days to one week. Symptoms are usually mild and last several days to a week.
            </p>
          </div>

          <p className="text-gray leading-relaxed mb-6">
            Hospitalization is uncommon. Zika is not known to be deadly, but those with preexisting health problems can have fatal complications. There have also been cases of Guillain-Barr&eacute; Syndrome following suspected Zika infection, but the relationship is not fully confirmed.
          </p>

          <Image
            src={cloudfrontImage('/old/images/features/zika/zika-symptoms.png')}
            alt="Zika symptoms: headache, fever, painful or red eyes, joint pain, itching/rash, muscle pain"
            width={800}
            height={400}
            className="w-full h-auto mb-6"
          />

          <p className="text-gray leading-relaxed mb-4">
            <strong className="text-black">If you have been to a Zika-infected area and have at least 2 symptoms, contact your doctor.</strong>
          </p>
          <p className="text-gray leading-relaxed mb-4">
            If you have been to a Zika-infected area and are pregnant or recently gave birth, contact your doctor.
          </p>

          <Divider />

          {/* Microcephaly */}
          <h2 className="header-lg mt-8 mb-4">Symptoms of Microcephaly</h2>
          <p className="text-gray leading-relaxed mb-4">
            There is an unconfirmed link between birth complications such as microcephaly and Zika infection during pregnancy.
          </p>

          <Image
            src={cloudfrontImage('/old/images/features/zika/symptoms-microcephaly.png')}
            alt="Microcephaly symptoms"
            width={800}
            height={400}
            className="w-full h-auto mb-6"
          />

          <p className="text-gray leading-relaxed mb-4">
            There have been over <strong className="text-black">4,700 reported cases</strong> of microcephaly in newborns in Brazil since October 2015. Brazil saw <strong className="text-black">20 times more cases</strong> of microcephaly in 2015 than past years.
          </p>

          <Image
            src={cloudfrontImage('/old/images/features/zika/microcephaly_cases_brazil.png')}
            alt="Brazil microcephaly cases by year: 2010: 153, 2011: 139, 2012: 175, 2013: 167, 2014: 147, 2015: 3,174"
            width={800}
            height={400}
            className="w-full h-auto mb-8"
          />
        </div>
      </section>

      {/* Guillain-Barre */}
      <section className="py-12" id="gbs">
        <div className="max-width max-width-md content-padding mx-auto">
          <h2 className="header-lg mb-4">Guillain-Barr&eacute; Syndrome (GBS)</h2>
          <p className="text-gray leading-relaxed mb-4">
            Guillain-Barr&eacute; Syndrome (GBS) is an uncommon illness of the nervous system in which the person&apos;s own immune system damages nerve cells. It usually occurs after an infection.
          </p>
          <p className="text-gray leading-relaxed mb-4">
            There is strong evidence of a possible causal link between Zika virus infection and GBS. During the 2013-14 outbreak in French Polynesia, 42 out of 8,750 suspected Zika cases presented GBS (a 20-fold increase from the previous 4 years). 41 of the 42 GBS cases also showed antibodies against Zika virus.
          </p>
          <p className="text-gray leading-relaxed mb-4">
            A number of Latin American countries with current Zika outbreaks have started reporting higher prevalence of GBS cases. Between April and July of 2015, Salvador, Brazil saw a seven-fold increase in rates of GBS, and Colombia has already seen 3 GBS-related deaths.
          </p>
          <p className="text-gray leading-relaxed mb-6">
            Symptoms last a few weeks to several months. Most people fully recover from GBS, but some have permanent damage, and <strong className="text-black">1 out of 20 cases have led to death</strong>.
          </p>

          <Image
            src={cloudfrontImage('/old/images/features/zika/gbs_symptoms.png')}
            alt="GBS symptoms"
            width={800}
            height={400}
            className="w-full h-auto mb-6"
          />

          <p className="text-gray leading-relaxed mb-4">
            <strong className="text-black">If you have been to a Zika-infected area and have at least 2 symptoms, contact your doctor.</strong>
          </p>

          <Divider />
        </div>
      </section>

      {/* Treatment */}
      <section className="py-12" id="treatment">
        <div className="max-width max-width-md content-padding mx-auto">
          <h2 className="font-serif text-2xl mb-6">Treatment</h2>

          <div className="flex gap-6 items-start mb-8">
            <Image
              src={cloudfrontImage('/old/images/features/zika/treatment-adults.png')}
              alt="Treatment for adults"
              width={120}
              height={120}
              className="w-20 h-20 object-contain flex-shrink-0"
            />
            <div>
              <h3 className="font-serif text-xl mb-2">For Adults</h3>
              <p className="text-gray leading-relaxed mb-2">If you have Zika symptoms within 2 weeks of traveling to a Zika-infected area:</p>
              <ul className="list-disc list-outside pl-6 space-y-1 text-gray">
                <li>Contact your doctor.</li>
                <li>Take medicine (acetaminophen or paracetamol) to relieve fever and pain.</li>
                <li>To reduce the risk of bleeding, do NOT take aspirin, aspirin products, or other non-steroidal anti-inflammatory drugs such as ibuprofen until Dengue can be ruled out.</li>
                <li>Get rest and drink plenty of fluids.</li>
                <li>Prevent additional mosquito bites to avoid spreading the disease.</li>
              </ul>
            </div>
          </div>

          <div className="flex gap-6 items-start mb-8">
            <Image
              src={cloudfrontImage('/old/images/features/zika/treatment-pregnant.png')}
              alt="Treatment for pregnant women"
              width={120}
              height={120}
              className="w-20 h-20 object-contain flex-shrink-0"
            />
            <div>
              <h3 className="font-serif text-xl mb-2">For Pregnant Women</h3>
              <p className="text-gray leading-relaxed mb-2">There is no cure for Zika virus. If you are pregnant, your doctor will treat you for the virus, while also monitoring your baby. The next steps will most likely be:</p>
              <ul className="list-disc list-outside pl-6 space-y-1 text-gray">
                <li>An ultrasound to test for microcephaly or calcium deposits in your baby&apos;s brain.</li>
                <li>You may get an amniocentesis (also called amnio) to check the amniotic fluid that surrounds your baby in the womb for Zika.</li>
                <li>The placenta and umbilical cord may also be tested after birth.</li>
                <li>Your baby&apos;s growth should be monitored by ultrasound every 3-4 weeks. You may be referred to a maternal-fetal medicine specialist.</li>
              </ul>
            </div>
          </div>

          <Divider />
        </div>
      </section>

      {/* Flaviviruses */}
      <section className="bg-gray-lightest py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h2 className="font-serif text-[2.25rem] leading-[2.625rem] font-light text-center mb-4">One of Many Flaviviruses</h2>
          <p className="text-gray leading-relaxed mb-6">
            Zika, like dengue, yellow fever, and others, is part of the flavivirus family. Flaviviruses are arboviruses, which means they are spread via infected arthropod vectors such as ticks and mosquitoes. Zika, yellow fever, and dengue grow very well in the human body, and easily reinfect mosquitoes. Flaviviruses enter the bloodstream, infect cells in the immune system, travel to the lymph nodes and target different organs.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded">
              <h4 className="font-serif text-lg mb-2">Zika</h4>
              <p className="text-gray text-sm leading-relaxed">Induces fever, rash, joint and muscle pain, and red eyes. Fatal cases are rare and are usually due to complications from pre-existing health conditions. There is no vaccine for Zika.</p>
            </div>
            <div className="bg-white p-6 rounded">
              <h4 className="font-serif text-lg mb-2">Yellow Fever</h4>
              <p className="text-gray text-sm leading-relaxed">Infects the liver. It can cause fever, headache, nausea, and vomiting, and in serious cases may cause fatal heart, liver, and kidney conditions. The yellow fever vaccine has been in use for several decades.</p>
            </div>
            <div className="bg-white p-6 rounded">
              <h4 className="font-serif text-lg mb-2">Dengue</h4>
              <p className="text-gray text-sm leading-relaxed">Can cause high fever, rash, and muscle and joint pain, and in serious cases may cause fatal shock and hemorrhage. Dengue is one of the fastest spreading vector-borne viral diseases and has increased by 30 times in the past 50 years.</p>
            </div>
          </div>

          <Image
            src={cloudfrontImage('/old/images/features/zika/FlavivirusGraph_v3.png')}
            alt="Flavivirus prevalence comparison: Dengue, Zika, and Yellow Fever cases over time"
            width={1000}
            height={500}
            className="w-full h-auto mb-8"
          />
        </div>
      </section>

      {/* What We Don't Know */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h2 className="font-serif text-2xl mb-6">What We Still Don&apos;t Know</h2>
          <div className="flex gap-4 items-start mb-6">
            <Image
              src={cloudfrontImage('/old/images/features/zika/dontknow.png')}
              alt=""
              width={80}
              height={80}
              className="w-16 h-16 object-contain flex-shrink-0"
            />
            <ul className="list-disc list-outside pl-6 space-y-3 text-gray">
              <li>We don&apos;t know for sure if Zika is the cause of the increased microcephaly in Brazil. We don&apos;t know for sure how many of the more than 4,700 reported cases of microcephaly in Brazil are related to Zika, as it is difficult to diagnose and can have other causes.</li>
              <li>Though we know that Zika was the cause of a Guillain-Barr&eacute; Syndrome surge in French Polynesia in 2013-14, we don&apos;t yet know definitively if the current Zika outbreak is the cause of the increase of GBS in South American countries.</li>
              <li>The possible connection of Zika with microcephaly and GBS suggest mutation in the virus to become more pathogenic to humans. We don&apos;t know what exactly has changed about Zika virus and why.</li>
            </ul>
          </div>

          <Divider />

          {/* WHO Action Plan */}
          <h2 className="font-serif text-2xl mt-8 mb-6" id="action-plan">WHO Action Plan</h2>
          <ActionPlanItem image="/old/images/features/zika/PrioritizeResearch.png">
            <strong className="text-black">Prioritize research</strong> into Zika virus disease by convening experts.
          </ActionPlanItem>
          <ActionPlanItem image="/old/images/features/zika/EnhanceSurveillance.png">
            <strong className="text-black">Enhance surveillance</strong> of Zika virus and potential complications.
          </ActionPlanItem>
          <ActionPlanItem image="/old/images/features/zika/communication.png">
            <strong className="text-black">Strengthen risk communication</strong> to help countries meet International Health Regulations.
          </ActionPlanItem>
          <ActionPlanItem image="/old/images/features/zika/ClinicalMgmt.png">
            <strong className="text-black">Provide training</strong> on clinical management, diagnosis and vector control at WHO Collaborating Centres.
          </ActionPlanItem>
          <ActionPlanItem image="/old/images/features/zika/StrengethenLabs.png">
            <strong className="text-black">Strengthen the capacity</strong> of laboratories to detect the virus.
          </ActionPlanItem>
          <ActionPlanItem image="/old/images/features/zika/CurbSpread.png">
            <strong className="text-black">Support health authorities</strong> in curbing spread of infected mosquitoes by providing larvicide to treat standing water sites.
          </ActionPlanItem>
          <ActionPlanItem image="/old/images/features/zika/ClinicalCare.png">
            <strong className="text-black">Collaborate</strong> with other health agencies to prepare recommendations for clinical care and follow-up of people with Zika virus.
          </ActionPlanItem>
        </div>
      </section>

      {/* References */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <References items={references} />
        </div>
      </section>

      {/* Newsletter */}
      <section className="bg-gray-lightest py-8">
        <div className="max-width max-width-md content-padding mx-auto">
          <div className="bg-white shadow-card py-6 px-4 md:px-8">
            <NewsletterForm />
          </div>
        </div>
      </section>
    </div>
  )
}
