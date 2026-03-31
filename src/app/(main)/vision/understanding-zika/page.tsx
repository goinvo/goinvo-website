import type { Metadata } from 'next'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'
import './zika.css'

export const metadata: Metadata = {
  title: 'Understanding Zika',
  description:
    'An easy-to-digest, visual guide to understanding the Zika virus.',
  keywords:
    'understanding zika disease design prevention spray symptoms history area transmission technologies health mobile medical',
  openGraph: {
    title: 'Understanding Zika',
    description:
      'An easy-to-digest, visual guide to understanding the Zika virus.',
    images: [
      {
        url: 'https://www.goinvo.com/old/images/features/zika/zika-twitter-card.jpg',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@goinvo',
    title: 'Understanding Zika',
    description:
      'An easy-to-digest, visual guide to understanding the Zika virus.',
    images: [
      'https://www.goinvo.com/old/images/features/zika/zika-twitter-card.jpg',
    ],
  },
}

const IMG = 'https://www.goinvo.com/old/images/features/zika'

export default function UnderstandingZikaPage() {
  return (
    <div id="feature-article">
      <SetCaseStudyHero
        image={`${IMG}/header.png`}
      />

      <div className="header">
        <div className="title">
          <span id="title-understanding">Understanding</span>
          <span id="title-zika">Zika</span>
        </div>
      </div>

      <div className="article">
        <div className="row">
          <div className="column one-half" id="what-is-zika">
            <h2>What is Zika</h2>
            <p>
              Zika is a <strong>virus</strong> spreading quickly throughout
              Latin America that is carried by <strong>mosquitoes</strong> and
              causes mild illness. There has been an unconfirmed link between
              Zika-infected <strong>pregnant women</strong> and a condition
              called <strong>microcephaly</strong>, in which babies are born
              with underdeveloped brains, as well as an autoimmune disease of
              the nervous system called Guillain-Barr&eacute; syndrome (GBS).
              <sup>
                <a href="#ref-1">1</a>
              </sup>
            </p>
          </div>
          <div className="column one-half" id="spread">
            <h2>How it Spreads</h2>
            <div className="row">
              <div className="way_spread column one-half">
                <div className="image">
                  <img
                    alt="person to mosquito to person"
                    className="scale-with-grid"
                    src={`${IMG}/spread-mosquito.png`}
                  />
                </div>
                <p>
                  Person <span className="arrow">&rarr;</span> mosquito{' '}
                  <span className="arrow">&rarr;</span> person
                </p>
              </div>
              <div className="way_spread column one-half">
                <div className="image">
                  <img
                    alt="mother to unborn child"
                    className="scale-with-grid"
                    src={`${IMG}/spread-mother.png`}
                  />
                </div>
                <p>
                  Mother <span className="arrow">&rarr;</span> unborn child
                </p>
              </div>
            </div>
            <div className="row">
              <div className="way_spread column one-half">
                <div className="image">
                  <img
                    alt="man to partner"
                    className="scale-with-grid"
                    src={`${IMG}/spread-partner.png`}
                  />
                </div>
                <p>
                  Man <span className="arrow">&rarr;</span> sexual partner
                </p>
              </div>
              <div className="way_spread column one-half">
                <div className="image">
                  <img
                    alt="person to bloodbank to person"
                    className="scale-with-grid"
                    src={`${IMG}/spread-bloodbank.png`}
                  />
                </div>
                <p>
                  Person <span className="arrow">&rarr;</span> blood bank{' '}
                  <span className="arrow">&rarr;</span> person
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="row">
          <div className="column one-half" id="overview-prevent">
            <h2>How to Prevent it</h2>
            <ul>
              <li id="prevent-travel">
                <div className="image">
                  <img
                    alt="avoid travel"
                    src={`${IMG}/prevent-travel-2.png`}
                  />
                </div>
                <p className="description">
                  Avoid travel to areas with confirmed Zika cases, especially
                  if you are pregnant.
                </p>
              </li>
              <li id="prevent-longsleeves">
                <div className="image">
                  <img
                    alt="longsleeved shirt"
                    src={`${IMG}/emptywater.png`}
                  />
                </div>
                <p className="description">
                  Remove still water in flowerpots, buckets, animal water
                  bowls, and kid pools to prevent potential mosquito breeding
                  grounds.
                </p>
              </li>
              <li id="prevent-bugspray">
                <div className="image">
                  <img alt="bugspray" src={`${IMG}/prevent-bugspray.png`} />
                </div>
                <p className="description">
                  Use insect repellents containing DEET or picaridin, or cover
                  up with long-sleeved shirts and trousers. Apply sunscreen
                  BEFORE applying insect repellent.
                </p>
              </li>
              <li id="prevent-close">
                <div className="image">
                  <img
                    alt="no open windows"
                    src={`${IMG}/prevent-close-2.png`}
                  />
                </div>
                <p className="description">
                  Keep doors and windows covered with screens or closed. Sleep
                  with mosquito netting if exposed to the outdoors.
                </p>
              </li>
            </ul>
          </div>
          <div className="column one-half" id="signs">
            <h2>When to Tell Your Doctor</h2>
            <div className="text">
              <p>
                If you have been exposed to a Zika-infected area, watch for
                these signs of Zika Disease.
              </p>
              <p>
                Incubation period is likely a few days to one week. Symptoms
                are usually mild and last several days to a week.
              </p>
              <p>Only about 1 in 5 infected people develop symptoms</p>
              <img
                alt="1 in 5 infected people"
                className="scale-with-grid"
                src={`${IMG}/1in5.svg`}
              />
            </div>
            <div className="signs-image">
              <img
                alt="headache, fever, painful or red eyes, joint pain, itching/rash, muscle pain"
                className="scale-with-grid"
                src={`${IMG}/zika-symptoms.png`}
              />
            </div>
          </div>
        </div>

        {/* Zika Timeline */}
        <div className="row" id="timeline">
          <h2>Zika Timeline</h2>
          <ul>
            <li>
              <div className="timeline-image">
                <img
                  alt="Zika Forest in Uganda"
                  className="scale-with-grid"
                  src={`${IMG}/1947-zika-forest.jpg`}
                />
              </div>
              <span className="year">1947</span>
              <div className="description">
                <p>
                  The name comes from the Zika Forest in Uganda where the
                  virus was first isolated. It was identified first in rhesus
                  monkeys through a monitoring network of sylvatic yellow
                  fever.
                  <sup>
                    <a href="#ref-4">4</a>, <a href="#ref-9">9</a>
                  </sup>
                </p>
              </div>
            </li>
            <li>
              <div className="timeline-image">
                <img
                  alt="Zika Forest in Uganda"
                  className="scale-with-grid"
                  src={`${IMG}/1952-first-case-zika.png`}
                />
              </div>
              <span className="year">1952</span>
              <div className="description">
                <p>
                  A paper was published confirming the first case of Zika
                  virus in a human - a 10 year old Nigerian female. The
                  research effort was initially studying an outbreak of
                  jaundice suspected to be yellow fever.
                  <sup>
                    <a href="#ref-4">4</a>, <a href="#ref-8">8</a>,{' '}
                    <a href="#ref-13">13</a>
                  </sup>
                </p>
              </div>
            </li>
            <li>
              <div className="timeline-image">
                <img
                  alt="Global map with parts of Africa and Asia highlighted"
                  className="scale-with-grid"
                  src={`${IMG}/1951-map.png`}
                />
              </div>
              <span className="year">1951-1981</span>
              <div className="description">
                <p>
                  The virus spread throughout a narrow equatorial belt from
                  Africa to Asia, but reported cases were rare.
                  <sup>
                    <a href="#ref-4">4</a>
                  </sup>
                </p>
              </div>
            </li>
            <li>
              <div className="timeline-image">
                <img
                  alt="Air Force photo - Mark Duffy interviews family on Yap Island investigating Zika outbreak"
                  className="scale-with-grid"
                  src={`${IMG}/2007-yap-island-outbreak.jpg`}
                />
              </div>
              <span className="year">2007</span>
              <div className="description">
                <p>
                  In April of 2007, Zika made it outside of Africa and Asia
                  for the first time when it spread to Yap Island in
                  Micronesia. There were 49 confirmed cases, 59 unconfirmed
                  cases, no hospitalizations, and no deaths. The virus spread
                  throughout neighboring islands over the next few years.
                  <sup>
                    <a href="#ref-4">4</a>, <a href="#ref-21">21</a>
                  </sup>
                </p>
              </div>
            </li>
            <li>
              <div className="timeline-image">
                <img
                  alt="Miguel Discart - 2014 world cup fans gather in the street"
                  className="scale-with-grid"
                  src={`${IMG}/2014-world-cup.jpg`}
                />
              </div>
              <span className="year">2014</span>
              <div className="description">
                <p>
                  The virus spread across pacific ocean to French Polynesia
                  (where its link with Guillain-Barr&eacute; Syndrome first
                  arose) and other neighboring islands in the largest outbreak
                  to date. It is believed that the 2014 Soccer World Cup,
                  drawing a multitude of international fans, was responsible
                  for the spread of Zika to Brazil.
                  <sup>
                    <a href="#ref-19">19</a>, <a href="#ref-23">23</a>,{' '}
                    <a href="#ref-24">24</a>
                  </sup>
                </p>
              </div>
            </li>
            <li>
              <div className="timeline-image">
                <img
                  alt="IAEA Imagebank - Zika-carrying mosquitoes are studied in Brazil"
                  className="scale-with-grid"
                  src={`${IMG}/2015-zika-mosquitoes.jpg`}
                />
              </div>
              <span className="year">2015</span>
              <div className="description">
                <p>
                  In April of 2015, Zika spread from the ongoing outbreak in
                  Brazil to Mexico, Central America, Caribbean, and South
                  America where it reached pandemic levels.
                  <sup>
                    <a href="#ref-4">4</a>, <a href="#ref-25">25</a>
                  </sup>
                </p>
              </div>
            </li>
            <li>
              <div className="timeline-image">
                <img
                  alt="level 2 alert"
                  className="scale-with-grid"
                  src={`${IMG}/level2alert.png`}
                />
              </div>
              <span className="year">15 Jan 2016</span>
              <div className="description">
                <p>
                  CDC issued a Level 2 travel alert for travelers to affected
                  countries and guidelines for pregnant women to consult their
                  doctors before traveling to a Zika-infected area.
                  <sup>
                    <a href="#ref-3">3</a>, <a href="#ref-4">4</a>,{' '}
                    <a href="#ref-12">12</a>
                  </sup>
                </p>
              </div>
            </li>
            <li>
              <div className="timeline-image">
                <img
                  alt="Health Minister Alejandro Gaviria, one leader from Columbia who suggests a delay in pregnancy"
                  className="scale-with-grid"
                  src={`${IMG}/2016-minister-gaviria.jpg`}
                />
              </div>
              <span className="year">23 Jan 2016</span>
              <div className="description">
                <p>
                  Five South American countries advised women to postpone
                  getting pregnant until more is known about the risks,
                  prompting criticism from women&apos;s health organizations
                  and general public.
                  <sup>
                    <a href="#ref-5">5</a>, <a href="#ref-26">26</a>
                  </sup>
                </p>
              </div>
            </li>
            <li>
              <div className="timeline-image">
                <img
                  alt="representative from the w.h.o."
                  className="scale-with-grid"
                  src={`${IMG}/2016-who-representative.jpg`}
                />
              </div>
              <span className="year">1 Feb 2016</span>
              <div className="description">
                <p>
                  Based on advice from the Emergency Committee about the
                  potential association of Zika virus with microcephaly, GBS,
                  and other neurological disorders, the Director-General of
                  the World Health Organization declared a Public Health
                  Emergency of International Concern (PHEIC) on 1 February
                  2016.
                  <sup>
                    <a href="#ref-1">1</a>, <a href="#ref-41">41</a>
                  </sup>
                </p>
              </div>
            </li>
            <li>
              <div className="timeline-image">
                <img alt="Map showing spread of Zika cases" className="scale-with-grid" src={`${IMG}/map.svg`} />
              </div>
              <span className="year">2 Feb 2016</span>
              <div className="description">
                <p>
                  31 isolated cases in the US, in 11 states and DC. These
                  were all travel associated cases with the exception of one
                  case of sexual transmission in Dallas, TX. Travel-related
                  cases were also reported in Spain, the UK, Ireland, and
                  others.
                  <sup>
                    <a href="#ref-3">3</a>, <a href="#ref-12">12</a>,{' '}
                    <a href="#ref-20">20</a>, <a href="#ref-27">27</a>
                  </sup>
                </p>
              </div>
            </li>
            <li>
              <div className="timeline-image">
                <img
                  alt="white-house"
                  className="scale-with-grid"
                  src={`${IMG}/2016-white-house.jpg`}
                />
              </div>
              <span className="year">8 Feb 2016</span>
              <div className="description">
                <p>
                  The White House announced that it is asking Congress for
                  more than $1.8 billion in emergency funding to enhance
                  ongoing efforts to prepare for and respond to the Zika
                  virus, both domestically and internationally.
                  <sup>
                    <a href="#ref-42">42</a>
                  </sup>
                </p>
              </div>
            </li>
          </ul>
        </div>

        {/* Zika Virus Cases / Map */}
        <div className="row" id="where-is-zika">
          <div id="traveled">
            <h2>
              Zika Virus Cases
              <sup>
                <a href="#ref-17">17</a>, <a href="#ref-18">18</a>,{' '}
                <a href="#ref-22">22</a>
              </sup>
            </h2>
            <img
              className="map scale-with-grid"
              src={`${IMG}/map.svg`}
              alt="Map showing Zika virus cases: Uganda in 1947, Gabon in 1975, Senegal in 1988, Malaysia in 1969, Yap Island in 2007, Cambodia in 2010, French Polynesia in 2014, Mexico in 2015, Brazil in 2015, and Texas in 2016"
            />
          </div>
          <div id="now">
            <div id="where-list">
              <h2>
                <span className="no-caps">There are an estimated</span> 1.6
                Million{' '}
                <span className="no-caps">cases of Zika virus in </span>33
                Countries
                <sup>
                  <a href="#ref-30">30</a>
                </sup>
              </h2>
              <div className="row">
                <div className="columns seven" id="americas">
                  <h3>Americas</h3>
                  <ul className="columns three">
                    <li>Aruba</li>
                    <li>Barbados</li>
                    <li>Bonaire</li>
                    <li>Bolivia</li>
                    <li>Brazil**</li>
                    <li>Colombia**</li>
                    <li>Costa Rica</li>
                    <li>Curacao</li>
                  </ul>
                  <ul className="columns three">
                    <li>Dominican Republic</li>
                    <li>Ecuador</li>
                    <li>El Salvador**</li>
                    <li>French Guiana</li>
                    <li>Guadeloupe</li>
                    <li>Guatemala</li>
                    <li>Guyana</li>
                    <li>Haiti</li>
                  </ul>
                  <ul className="columns three">
                    <li>Honduras</li>
                    <li>Jamaica</li>
                    <li>Martinique</li>
                    <li>Mexico</li>
                    <li>Nicaragua</li>
                    <li>Panama</li>
                    <li>Paraguay</li>
                    <li>Puerto Rico</li>
                  </ul>
                  <ul className="columns three">
                    <li>Saint Martin</li>
                    <li>Saint Vincent &amp; the Grenadines</li>
                    <li>Sint Martin</li>
                    <li>Suriname**</li>
                    <li>Trinidad and Tobago</li>
                    <li>U.S Virgin Islands</li>
                    <li>Venezuela**</li>
                  </ul>
                </div>
                <div className="columns two" id="pacific">
                  <h3>Oceania/Pacific Is.</h3>
                  <ul>
                    <li>American Samoa</li>
                    <li>Marshall Islands</li>
                    <li>New Caledonia</li>
                    <li>Samoa</li>
                    <li>Tonga</li>
                  </ul>
                </div>
                <div className="columns two" id="africa">
                  <h3>Africa</h3>
                  <ul>
                    <li>Cape Verde</li>
                  </ul>
                </div>
              </div>
              <div className="row">
                <p>
                  *35 travel-associated Zika disease cases in the U.S. have
                  been reported
                </p>
                <p>
                  **Also report having significant increase in cases of
                  microcephaly and/or GBS
                </p>
                <p className="updated">
                  Last Updated 8.Feb.2016
                  <sup>
                    <a href="#ref-3">3</a>
                  </sup>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Transmission */}
        <div className="row">
          <div className="column" id="transmission">
            <h2>Transmission</h2>
            <p>
              The Zika virus is not yet fully understood. However, there are 4
              known ways to transmit the Zika virus.
            </p>
            <div className="row">
              <div className="way_spread columns three">
                <div className="image">
                  <img
                    alt="person to mosquito to person"
                    className="scale-with-grid"
                    src={`${IMG}/spread-mosquito.png`}
                  />
                </div>
                <h3>
                  Person <span className="arrow">&rarr;</span> mosquito{' '}
                  <span className="arrow">&rarr;</span> person
                </h3>
                <p>
                  Zika is most commonly transmitted from person to person by
                  the Aedes mosquito, which live in urban areas and are active
                  during the day (usually mornings and late afternoons).
                  <sup>
                    <a href="#ref-1">1</a>, <a href="#ref-3">3</a>
                  </sup>
                </p>
              </div>
              <div className="way_spread columns three">
                <div className="image">
                  <img
                    alt="mother to unborn child"
                    className="scale-with-grid"
                    src={`${IMG}/spread-mother.png`}
                  />
                </div>
                <h3>
                  Mother <span className="arrow">&rarr;</span> unborn child
                </h3>
                <p>
                  Zika virus can spread from an infected mother to the
                  placenta and their unborn baby. The virus will not infect
                  infants conceived after the virus has cleared from the
                  blood.
                  <sup>
                    <a href="#ref-2">2</a>
                  </sup>{' '}
                  There is no evidence suggesting a risk for future birth
                  defects.
                  <sup>
                    <a href="#ref-1">1</a>
                  </sup>
                </p>
              </div>
              <div className="way_spread columns three">
                <div className="image">
                  <img
                    alt="man to partner"
                    className="scale-with-grid"
                    src={`${IMG}/spread-partner.png`}
                  />
                </div>
                <h3>
                  Man <span className="arrow">&rarr;</span> sexual partner
                </h3>
                <p>
                  Transmission of Zika during sex is possible but rare. If an
                  infected male partner has the virus in their blood stream,
                  their semen can be contagious. It is unknown how long Zika
                  can live in semen. Infected individuals should abstain from
                  sex or use a condom for 6 months after the infection.
                  <sup>
                    <a href="#ref-10">10</a>
                  </sup>
                </p>
              </div>
              <div className="way_spread columns three">
                <div className="image">
                  <img
                    alt="person to bloodbank to person"
                    className="scale-with-grid"
                    src={`${IMG}/spread-bloodbank.png`}
                  />
                </div>
                <h3>
                  Person <span className="arrow">&rarr;</span> blood bank{' '}
                  <span className="arrow">&rarr;</span> person
                </h3>
                <p>
                  There may also be a chance of transmission through blood
                  transfusions, but no conclusive evidence has been found.
                  <sup>
                    <a href="#ref-10">10</a>
                  </sup>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Prevention */}
        <div className="row">
          <div className="column nine columns" id="prevention">
            <h2>Prevention</h2>
            <p id="vaccinations">
              Currently no vaccinations exist to prevent Zika. The best way to
              prevent infection is to avoid mosquito bites.
            </p>
            <div className="mosquito" id="mosquito-1"></div>
            <div className="mosquito" id="mosquito-2"></div>
            <div className="mosquito" id="mosquito-3"></div>
            <div className="row">
              <div className="column one-third" id="prevent-travel-2">
                <div className="image">
                  <img
                    alt="avoid travel"
                    src={`${IMG}/prevent-travel-2.png`}
                  />
                </div>
                <p>
                  Avoid travel to areas with confirmed Zika cases, especially
                  if you are pregnant. See above for Zika-infected areas.
                  <sup>
                    <a href="#ref-2">2</a>, <a href="#ref-14">14</a>
                  </sup>
                </p>
              </div>
              <div className="column one-third" id="prevent-bugspray-2">
                <div className="image">
                  <img
                    alt="apply spray every 2-3 hours"
                    src={`${IMG}/prevent-bugspray-2.png`}
                  />
                </div>
                <p>
                  Apply insect repellent every few hours. Do not spray
                  repellent on the skin under clothing. If you are also using
                  sunscreen, apply it first before repellent. Follow
                  instructions on the label. Insect repellent is safe for
                  pregnant women.
                  <sup>
                    <a href="#ref-2">2</a>, <a href="#ref-14">14</a>
                  </sup>
                </p>
              </div>
              <div className="column one-third" id="prevent-spray-clothes">
                <div className="image">
                  <img alt="empty water" src={`${IMG}/emptywater.png`} />
                </div>
                <p>
                  Remove still water in flowerpots, buckets, animal water
                  bowls, and kid pools to prevent potential mosquito breeding
                  grounds.
                  <sup>
                    <a href="#ref-2">2</a>, <a href="#ref-14">14</a>
                  </sup>
                </p>
              </div>
            </div>
            <div className="row">
              <div className="column one-third" id="prevent-longsleeves-2">
                <div className="image">
                  <img
                    alt="longsleeve shirt and pants"
                    src={`${IMG}/prevent-longsleeves-2.png`}
                  />
                </div>
                <p>
                  Wear long-sleeve shirts and pants to avoid mosquito bites.
                  <sup>
                    <a href="#ref-2">2</a>, <a href="#ref-14">14</a>
                  </sup>
                </p>
              </div>
              <div className="column one-third" id="prevent-close-2">
                <div className="image">
                  <img
                    alt="close door and windows"
                    src={`${IMG}/prevent-close-2.png`}
                  />
                </div>
                <p>
                  Choose lodging that is air-conditioned, has screens on the
                  doors and windows, or purchase a mosquito bed net.
                  <sup>
                    <a href="#ref-2">2</a>, <a href="#ref-14">14</a>
                  </sup>
                </p>
              </div>
              <div className="column one-third" id="prevent-baby-net">
                <div className="image">
                  <img alt="condom" src={`${IMG}/wearcondom_360.png`} />
                </div>
                <p>
                  If you have traveled to a Zika-infected area, wear a condom
                  during sex or abstain from sex for 6 months.
                  <sup>
                    <a href="#ref-10">10</a>
                  </sup>
                </p>
              </div>
            </div>
            <div className="row">
              <div className="column one-third" id="prevent-net">
                <div className="image">
                  <img
                    alt="put mosquito netting on beds"
                    src={`${IMG}/prevent-net.png`}
                  />
                </div>
                <p>
                  Choose a WHOPES-approved bed net with 156 holes per square
                  inch that is long enough to tuck under the mattress.
                  Permethrin-treated nets help kill mosquitoes; do not wash
                  them or expose them to sunlight.
                  <sup>
                    <a href="#ref-2">2</a>, <a href="#ref-14">14</a>
                  </sup>
                </p>
              </div>
              <div className="column one-third" id="prevent-directions">
                <div className="image">
                  <img
                    alt="follow directions"
                    src={`${IMG}/prevent-directions.png`}
                  />
                </div>
                <p>
                  Follow directions on the label when applying insect
                  repellent to children. Spray repellent onto hands first to
                  apply to a child&apos;s face. Avoid applying repellent to
                  the child&apos;s hands, mouth, eyes, or open wounds.
                  <sup>
                    <a href="#ref-2">2</a>, <a href="#ref-3">3</a>,{' '}
                    <a href="#ref-14">14</a>
                  </sup>
                </p>
              </div>
              <div className="column one-third">
                <div className="image">
                  <img
                    alt="put mosquito netting on carriers"
                    src={`${IMG}/prevent-baby-net.png`}
                  />
                </div>
                <p>
                  DO NOT apply insect repellent to babies younger than 2
                  months old. Instead, dress them in long sleeves and cover
                  the stroller or carrier with mosquito netting.
                  <sup>
                    <a href="#ref-2">2</a>, <a href="#ref-3">3</a>,{' '}
                    <a href="#ref-14">14</a>
                  </sup>
                </p>
              </div>
            </div>
            <div className="row">
              <div className="column one-third" id="prevent-spray-clothes">
                <div className="image">
                  <img
                    alt="spray clothes with bugspray"
                    src={`${IMG}/prevent-spray-clothes.png`}
                  />
                </div>
                <p>
                  Mosquitoes can bite through thin clothing. Treat clothing
                  and gear (boots, pants, socks, tents) with an insecticide
                  called permethrin. Follow directions on label and DO NOT
                  apply directly to the skin.
                  <sup>
                    <a href="#ref-2">2</a>, <a href="#ref-14">14</a>
                  </sup>
                </p>
              </div>
            </div>
          </div>
          <div className="column three columns" id="right-spray">
            <h2>Choosing the right bug spray</h2>
            <p>
              Use an insect repellent with one of these active ingredients:
            </p>
            <div className="sprays" id="deet">
              <h3>DEET</h3>
              <ul>
                <li className="spray-off">
                  <img
                    alt="off bug spray logo"
                    className="scale-with-grid"
                    src={`${IMG}/off.png`}
                  />
                </li>
                <li className="spray-sawyer">
                  <img
                    alt="sawyer logo"
                    className="scale-with-grid"
                    src={`${IMG}/Sawyer-logo1.jpg`}
                  />
                </li>
              </ul>
              <ul>
                <li className="spray-off">
                  <img
                    alt="cutter logo"
                    className="scale-with-grid"
                    src={`${IMG}/cutter.png`}
                  />
                </li>
                <li className="spray-ultrathon">
                  <img
                    alt="ultrathon logo"
                    className="scale-with-grid"
                    src={`${IMG}/ultrathon_logo.png`}
                  />
                </li>
              </ul>
            </div>
            <div className="sprays" id="picaridin">
              <h3>Picaridin, KBR 3023, Bayrepel, or icaridin</h3>
              <ul>
                <li className="spray-sss">
                  <img
                    alt="sss logo"
                    className="scale-with-grid"
                    src={`${IMG}/sss.png`}
                  />
                </li>
                <li className="spray-autan">
                  <img
                    alt="autan logo"
                    className="scale-with-grid"
                    src={`${IMG}/autan_logo_m.png`}
                  />
                </li>
              </ul>
            </div>
            <div className="sprays" id="eucalyptus">
              <h3>
                Oil of lemon eucalyptus (OLE) or para-menthane-diol (PMD)
              </h3>
              <ul>
                <li className="spray-repel">
                  <img
                    alt="repel logo"
                    className="scale-with-grid"
                    src={`${IMG}/repel-logo.png`}
                  />
                </li>
              </ul>
            </div>
            <div className="sprays" id="ir3535">
              <h3>IR3535</h3>
              <ul>
                <li className="spray-sss">
                  <img
                    alt="sss logo"
                    className="scale-with-grid"
                    src={`${IMG}/sss.png`}
                  />
                </li>
                <li className="spray-skinsmart">
                  <img
                    alt="skinsmart logo"
                    className="scale-with-grid"
                    src={`${IMG}/skinsmart.png`}
                  />
                </li>
              </ul>
            </div>
            <p>
              The EPA has not yet evaluated common natural insect repellents
              for effectiveness. The CDC recommends using repellents
              containing proven safe and effective ingredients. Examples used
              in unregistered insect repellents are: citronella oil, cedar
              oil, geranium oil, peppermint oil, soybean oil, and pure oil of
              lemon eucalyptus.
              <sup>
                <a href="#ref-14">14</a>
              </sup>{' '}
              Visit{' '}
              <a
                href="https://www.cdc.gov/features/StopMosquitoes"
                target="_blank"
                rel="noopener noreferrer"
              >
                www.cdc.gov/features/StopMosquitoes
              </a>{' '}
              for more information.
            </p>
          </div>
        </div>

        {/* Symptoms of Zika Disease */}
        <div className="row" id="zika-symptoms">
          <div className="column one-half">
            <h2>
              Symptoms of Zika Disease
              <sup>
                <a href="#ref-1">1</a>
              </sup>
            </h2>
            <div className="para">
              <img
                alt="1 in 5 infected people"
                className="scale-with-grid"
                src={`${IMG}/1in5.svg`}
              />
              <p>
                About 1 in 5 people infected with Zika virus actually become
                ill.
                <sup>
                  <a href="#ref-3">3</a>
                </sup>
              </p>
            </div>
            <div className="para">
              <img
                alt="1 in 5 infected people"
                className="scale-with-grid"
                id="incubation"
                src={`${IMG}/incubation.svg`}
              />
              <p>
                Incubation period is unknown but is likely a few days to one
                week. Symptoms are usually mild and last several days to a
                week.
                <sup>
                  <a href="#ref-3">3</a>
                </sup>
              </p>
            </div>
            <p>
              Hospitalization is uncommon. Zika is not known to be deadly, but
              those with preexisting health problems can have fatal
              complications.
              <sup>
                <a href="#ref-3">3</a>
              </sup>{' '}
              There have also been cases of Guillain-Barr&eacute; Syndrome
              following suspected Zika infection, but the relationship is not
              known.
              <sup>
                <a href="#ref-4">4</a>
              </sup>
            </p>
          </div>
          <div className="column one-half signs-image">
            <div className="warning">
              If you have been to a Zika-infected area and have at least 2
              symptoms, contact your doctor.
            </div>
            <img
              alt="headache, fever, painful or red eyes, joint pain, itching/rash, muscle pain"
              className="scale-with-grid"
              src={`${IMG}/zika-symptoms.png`}
            />
          </div>
        </div>

        {/* Symptoms of Microcephaly */}
        <div className="row" id="symptoms-microcephaly">
          <div className="column one-half microceph-image">
            <div className="warning">
              If you have been to a Zika-infected area and are pregnant or
              recently gave birth, contact your doctor.
            </div>
            <img
              alt="seizures, small head size, coordination difficulties, dwarfism/short stature, backward-sloping forehead, hyperactivity, facial distortions, delays in speech and movement"
              className="scale-with-grid"
              src={`${IMG}/symptoms-microcephaly.png`}
            />
          </div>
          <div className="column one-half">
            <h2>Symptoms of Microcephaly</h2>
            <p>
              There is an unconfirmed link between birth complications such as
              microcephaly and Zika infection during pregnancy.
              <sup>
                <a href="#ref-3">3</a>
              </sup>
            </p>
            <p>
              There have been over 4,700 reported cases of microcephaly in
              newborns in Brazil since October 2015.
              <sup>
                <a href="#ref-15">15</a>
              </sup>
            </p>
            <p>
              Brazil saw 20 times more cases of microcephaly in 2015 than
              past years.
              <sup>
                <a href="#ref-28">28</a>
              </sup>
            </p>
            <div className="graph">
              <h3>Suspected Cases of Microcephaly in Brazil 2010-2015</h3>
              <img
                alt="153 in 2010, 139 in 2011, 175 in 2012, 167 in 2013, 147 in 2014, and 3174 in 2015"
                className="scale-with-grid"
                src={`${IMG}/microcephaly_cases_brazil.png`}
              />
            </div>
          </div>
        </div>

        {/* Guillain-Barre Syndrome */}
        <div className="row" id="guillain-barre-syndrome">
          <div className="column one-half">
            <h2>
              Symptoms of Zika Disease
              <sup>
                <a href="#ref-1">1</a>
              </sup>
            </h2>
            <div className="para">
              <p>
                Guillain-Barr&eacute; Syndrome (GBS) is an uncommon illness
                of the nervous system in which the person&apos;s own immune
                system damages nerve cells. It usually occurs after an
                infection.
                <sup>
                  <a href="#ref-36">36</a>
                </sup>
              </p>
              <p>
                There is strong evidence of a possible causal link between
                Zika virus infection GBS. During 2013-14 outbreak in French
                Polynesia, 42 out of 8,750 suspected Zika cases presented GBS
                (a 20-fold increase from previous 4 years). 41 of the 42 GBS
                cases also showed antibodies against Zika virus.
                <sup>
                  <a href="#ref-37">37</a>, <a href="#ref-38">38</a>
                </sup>
              </p>
              <p>
                A number of Latin American countries with current Zika
                outbreaks have started reporting higher prevalence of GBS
                cases.
                <sup>
                  <a href="#ref-37">37</a>
                </sup>{' '}
                Between April and July of 2015, Salvador, Brazil saw a
                seven-fold increase in rates of GBS, and Columbia has already
                seen 3 GBS-related deaths.
                <sup>
                  <a href="#ref-40">40</a>
                </sup>{' '}
                More information is needed to determine if this is due to
                higher surveillance.
                <sup>
                  <a href="#ref-37">37</a>
                </sup>
              </p>
              <p>
                Symptoms last a few weeks to several months. Most people fully
                recover from GBS, but some have permanent damage, and 1 out
                of 20 cases have led to death.
                <sup>
                  <a href="#ref-36">36</a>, <a href="#ref-39">39</a>
                </sup>
              </p>
            </div>
          </div>
          <div className="column one-half signs-image">
            <div className="warning">
              If you have been to a Zika-infected area and have at least 2
              symptoms, contact your doctor.
            </div>
            <img
              alt="difficulty moving eyes or swallowing, choking on saliva, symmetrical muscle weakness and lack of coordination, slowness or shortness of breath, abnormal or fast heart rate, paralysis, pins and needles that begin in feet, hands, or face"
              className="scale-with-grid"
              src={`${IMG}/gbs_symptoms.png`}
            />
          </div>
        </div>

        {/* Treatment */}
        <div className="row" id="treatments">
          <div className="column one-half" id="treatment-adults">
            <div className="treatment-header">
              <h2>Treatment for Adults</h2>
              <div className="treatment-image">
                <img alt="adult" src={`${IMG}/treatment-adults.png`} />
              </div>
            </div>
            <div className="treatment-plan">
              <p>
                If you have Zika symptoms within 2 weeks of traveling to a
                Zika-infected area:
                <sup>
                  <a href="#ref-2">2</a>
                </sup>
              </p>
              <ul>
                <li>Contact your doctor</li>
                <li>
                  Take medicine (acetaminophen or paracetamol) to relieve
                  fever and pain.
                </li>
                <li>
                  To reduce the risk of bleeding, do NOT take aspirin, aspirin
                  products, or other non-steroidal anti-inflammatory drugs
                  such as ibuprofen until Dengue can be ruled out.
                </li>
                <li>Get rest and drink plenty of fluids.</li>
                <li>
                  Prevent additional mosquito bites to avoid spreading the
                  disease.
                </li>
              </ul>
            </div>
          </div>
          <div className="column one-half" id="treatment-pregnant">
            <div className="treatment-header">
              <div className="treatment-image">
                <img
                  alt="pregnant woman"
                  src={`${IMG}/treatment-pregnant.png`}
                />
              </div>
              <h2>Treatment for Pregnant Women</h2>
            </div>
            <div className="treatment-plan">
              <p>
                There is no cure for Zika virus.
                <sup>
                  <a href="#ref-1">1</a>
                </sup>{' '}
                If you are pregnant, your doctor will treat you for the virus,
                while also monitoring your baby. The next steps will most
                likely be:
                <sup>
                  <a href="#ref-11">11</a>, <a href="#ref-16">16</a>
                </sup>
              </p>
              <ul>
                <li>
                  An ultrasound to test for microcephaly or calcium deposits
                  in your baby&apos;s brain
                </li>
                <li>
                  You may get an amniocentesis (also called amnio) to check
                  the amniotic fluid that surrounds your baby in the womb for
                  Zika.
                </li>
                <li>
                  The placenta and umbilical cord may also be tested after
                  birth.
                </li>
                <li>
                  Your baby&apos;s growth should be monitored by ultrasound
                  every 3-4 weeks. You may be referred to a maternal-fetal
                  medicine specialist.
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* One of Many Flaviviruses */}
        <div className="row" id="flavivirus">
          <div className="column">
            <h2>One of Many Flaviviruses</h2>
            <p>
              Zika, like dengue, yellow fever, and others, is part of the
              flavivirus family. Flaviviruses are arboviruses, which means
              they are spread via infected arthropod vectors such as ticks and
              mosquitoes. Zika, yellow fever, and dengue grow very well in the
              human body, and easily reinfect mosquitoes. Flaviviruses enter
              the bloodstream, infect cells in the immune system, travel to
              the lymph nodes and target different organs.
              <sup>
                <a href="#ref-31">31</a>
              </sup>
            </p>
            <div className="row">
              <div className="column columns five">
                <div id="flavivirus-zika">
                  <h3>Zika</h3>
                  <p>
                    Zika induces fever, rash, joint and muscle pain, and red
                    eyes. Fatal cases are rare and are usually due to
                    complications from pre-existing health conditions. There
                    is no vaccine for zika.
                    <sup>
                      <a href="#ref-31">31</a>
                    </sup>
                  </p>
                </div>
                <div id="flavivirus-yellow">
                  <h3>Yellow Fever</h3>
                  <p>
                    Yellow Fever infects the liver. It can cause fever,
                    headache, nausea, and vomiting, and in serious cases may
                    cause fatal heart, liver, and kidney conditions. The
                    yellow fever vaccine has been in use for several decades.
                    <sup>
                      <a href="#ref-31">31</a>, <a href="#ref-32">32</a>
                    </sup>
                  </p>
                </div>
                <div id="flavivirus-dengue">
                  <h3>Dengue</h3>
                  <p>
                    Dengue can cause high fever, rash, and muscle and joint
                    pain, and in serious cases may cause fatal shock and
                    hemorrhage within the body. Dengue is one of the fastest
                    spreading vector-born viral diseases and has increased by
                    30 times in the past 50 years.
                    <sup>
                      <a href="#ref-34">34</a>
                    </sup>{' '}
                    A vaccine for all four variations of dengue was recently
                    developed and licensed in Brazil, the Philippines, and
                    Mexico, but not in the U.S.
                    <sup>
                      <a href="#ref-31">31</a>, <a href="#ref-32">32</a>,{' '}
                      <a href="#ref-35">35</a>
                    </sup>
                  </p>
                </div>
              </div>
              <div className="column columns seven graph">
                <img
                  alt="Prevalence of Zika, Yellow Fever, &amp; Dengue Virus Cases. dengue at 1.2 million in 2008, 3+ million in 2013. zika at 5,000 in 2007, 20,000 in 2013, and 1.6 million in 2016. Yellow fever remains around 0.2 million from 2007-2016"
                  className="scale-with-grid"
                  src={`${IMG}/FlavivirusGraph_v3.png`}
                />
                <p>
                  *Yellow fever value of 200,000 cases based on yearly
                  estimate by WHO
                  <sup>
                    <a href="#ref-32">32</a>
                  </sup>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* What We Still Don't Know */}
        <div className="row" id="dont-know">
          <div className="column">
            <h2>What We Still Don&apos;t Know</h2>
            <div className="columns three">
              <img
                alt="?"
                className="scale-with-grid"
                src={`${IMG}/dontknow.png`}
              />
            </div>
            <div className="columns nine">
              <p>
                We don&apos;t know for sure if Zika is the cause of the
                increase microcephaly in Brazil.
                <sup>
                  <a href="#ref-28">28</a>
                </sup>
              </p>
              <p>
                We don&apos;t know for sure how many of the more than 4,700
                cases reported cases of microcephaly in Brazil are related to
                Zika, as it is difficult to diagnose and can have other
                causes.
              </p>
              <p>
                Though we know that Zika was the cause of a
                Guillain-Barr&eacute; Syndrome surgence in French Polynesia
                in 2013-14, we don&apos;t yet know definitively if the
                current Zika outbreak is the cause of the increase of GBS in
                South American countries.
                <sup>
                  <a href="#ref-28">28</a>, <a href="#ref-36">36</a>
                </sup>
              </p>
              <p>
                The possible connection of Zika with microcephaly and GBS
                suggest mutation in the virus to become more pathogenic to
                humans. We don&apos;t know what exactly has changed about Zika
                virus and why.
                <sup>
                  <a href="#ref-28">28</a>
                </sup>
              </p>
            </div>
          </div>
        </div>

        {/* WHO Action Plan */}
        <div className="row" id="action-plan">
          <div className="column">
            <h2>
              The <em>Who</em> Action Plan
              <sup>
                <a href="#ref-8">8</a>
              </sup>
            </h2>
            <div className="row">
              <div className="columns three">
                <div className="action-item">
                  <div className="image">
                    <img
                      alt="spyglass with droplet"
                      className="scale-with-grid"
                      src={`${IMG}/PrioritizeResearch.png`}
                    />
                  </div>
                  <p>
                    Prioritize research into Zika virus disease by convening
                    experts.
                  </p>
                </div>
              </div>
              <div className="columns three">
                <div className="action-item">
                  <div className="image">
                    <img
                      alt="airplanes"
                      className="scale-with-grid"
                      src={`${IMG}/EnhanceSurveillance.png`}
                    />
                  </div>
                  <p>
                    Enhance surveillance of Zika virus and potential
                    complications.
                  </p>
                </div>
              </div>
              <div className="columns three">
                <div className="action-item">
                  <div className="image">
                    <img
                      alt="speech bubble with nodes"
                      className="scale-with-grid"
                      src={`${IMG}/communication.png`}
                    />
                  </div>
                  <p>
                    Strengthen risk communication to help countries meet
                    International Health Regulations.
                  </p>
                </div>
              </div>
              <div className="columns three">
                <div className="action-item">
                  <div className="image">
                    <img
                      alt="doctors"
                      className="scale-with-grid"
                      src={`${IMG}/ClinicalMgmt.png`}
                    />
                  </div>
                  <p>
                    Provide training on clinical management, diagnosis and
                    vector control at WHO Collaborating Centres.
                  </p>
                </div>
              </div>
            </div>
            <div className="row">
              <div className="columns three">
                <div className="action-item">
                  <div className="image">
                    <img
                      alt="microscope"
                      className="scale-with-grid"
                      src={`${IMG}/StrengethenLabs.png`}
                    />
                  </div>
                  <p>
                    Strengthen the capacity of laboratories to detect the
                    virus.
                  </p>
                </div>
              </div>
              <div className="columns three">
                <div className="action-item">
                  <div className="image">
                    <img
                      alt="culture"
                      className="scale-with-grid"
                      src={`${IMG}/CurbSpread.png`}
                    />
                  </div>
                  <p>
                    Support health authorities in curbing spread of infected
                    mosquitoes by providing larvicide to treat standing water
                    sites.
                  </p>
                </div>
              </div>
              <div className="columns three">
                <div className="action-item">
                  <div className="image">
                    <img
                      alt="doctors"
                      className="scale-with-grid"
                      src={`${IMG}/ClinicalCare.png`}
                    />
                  </div>
                  <p>
                    Collaborate with other health agencies to prepare
                    recommendations for clinical care and follow-up of people
                    with Zika virus.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* References */}
        <div className="row" id="references">
          <div className="column">
            <h2>References</h2>
            <ol>
              <li id="ref-1">
                <span className="li-color">
                  Roberts, M. (2016. Feb, 1). &quot;
                  <a
                    href="http://www.bbc.com/news/health-35459797"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Zika-linked condition: WHO declares global emergency
                  </a>
                  .&quot; BBC News Online.
                </span>
              </li>
              <li id="ref-2">
                <span className="li-color">
                  Gallagher, J. (2015, Feb, 5). &quot;
                  <a
                    href="http://www.bbc.com/news/health-35441675"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Zika outbreak: Travel advice
                  </a>
                  &quot; BBC News Online.
                </span>
              </li>
              <li id="ref-3">
                <span className="li-color">
                  Centers for Disease Control and Prevention (2016). &quot;
                  <a
                    href="http://www.cdc.gov/zika/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Zika Virus
                  </a>
                  .&quot;
                </span>
              </li>
              <li id="ref-4">
                <span className="li-color">
                  Wikipedia (2016) &quot;
                  <a
                    href="https://en.wikipedia.org/wiki/Zika_virus"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Zika Virus
                  </a>
                  .&quot;
                </span>
              </li>
              <li id="ref-5">
                <span className="li-color">
                  &quot;
                  <a
                    href="http://www.bbc.com/news/world-latin-america-35388842"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Zika virus triggers pregnancy delay calls
                  </a>
                  .&quot; (2016. Jan, 23).
                </span>
              </li>
              <li id="ref-6">
                <span className="li-color">
                  &quot;
                  <a
                    href="http://www.mayoclinic.org/diseases-conditions/microcephaly/basics/symptoms/con-20034823"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Microcephaly
                  </a>
                  .&quot; (2016). Mayo Clinic.
                </span>
              </li>
              <li id="ref-7">
                <span className="li-color">
                  Centers for Disease Control and Prevention (2016). &quot;
                  <a
                    href="http://www.cdc.gov/zika/hc-providers/clinicalevaluation.html"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Zika virus: clinical evaluation &amp; disease
                  </a>
                  &quot;.
                </span>
              </li>
              <li id="ref-8">
                <span className="li-color">
                  World Health Organization. (2016. Jan). &quot;
                  <a
                    href="http://www.who.int/mediacentre/factsheets/zika/en/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Zika virus
                  </a>
                  .&quot;
                </span>
              </li>
              <li id="ref-9">
                <span className="li-color">
                  Swails, B., McKenzie, D. (2016. Feb, 3). &quot;
                  <a
                    href="http://www.cnn.com/2016/02/02/health/zika-forest-viral-birthplace/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Uganda&apos;s Zika Forest, birthplace of the Zika virus
                  </a>
                  .&quot;
                </span>
              </li>
              <li id="ref-10">
                <span className="li-color">
                  Szabo, Liz. (2016. Feb, 5). &quot;
                  <a
                    href="http://www.usatoday.com/story/news/2016/02/03/zika-q-and-a/79751476/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Zika Q&amp;A: What you need to know about sex, saliva,
                    sperm banks
                  </a>
                  .&quot;
                </span>
              </li>
              <li id="ref-11">
                <span className="li-color">
                  March of Dimes. (2016. Feb). &quot;
                  <a
                    href="http://www.marchofdimes.org/complications/zika-virus-and-pregnancy.aspx"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Zika virus and pregnancy
                  </a>
                  .&quot;
                </span>
              </li>
              <li id="ref-12">
                <span className="li-color">
                  &quot;
                  <a
                    href="http://www.bbc.com/news/uk-35391712"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Zika virus: Three Britons infected, say health officials
                  </a>
                  .&quot; (2016. Jan, 23). BBC News.
                </span>
              </li>
              <li id="ref-13">
                <span className="li-color">
                  Dick, GWA, et. al. (1952). &quot;Zika virus isolations and
                  serological specificity.&quot; Trans R Soc Trop Med Hyg
                  (1952) 46 (5): 509-520. doi:
                  10.1016/0035-9203(52)90042-4
                </span>
              </li>
              <li id="ref-14">
                <span className="li-color">
                  Centers for Disease Control and Prevention (2016). &quot;
                  <a
                    href="http://www.cdc.gov/zika/prevention/index.html"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Zika virus: prevention
                  </a>
                  &quot;.
                </span>
              </li>
              <li id="ref-15">
                <span className="li-color">
                  Carless, W. (2016. Feb, 3). &quot;
                  <a
                    href="http://www.usatoday.com/story/news/world/2016/02/03/brazil-zika-birth-defect-drop-hospital-microcephaly/79791768/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    On Brazil&apos;s Zika front lines, cases of microcephaly
                    are actually dropping
                  </a>
                  .&quot; USA Today.
                </span>
              </li>
              <li id="ref-16">
                <span className="li-color">
                  Centers for Disease Control and Prevention (2016). &quot;
                  <a
                    href="http://www.cdc.gov/mmwr/volumes/65/wr/mm6502e1.htm"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Interim Guidelines for Pregnant Women During a Zika Virus
                    Outbreak — United States, 2016
                  </a>
                  .&quot;
                </span>
              </li>
              <li id="ref-17">
                <span className="li-color">
                  Phillips, S. (2016. Feb, 4). &quot;
                  <a
                    href="http://fox5sandiego.com/2016/02/04/blood-bank-rejecting-donors-who-visited-zika-areas/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Blood bank rejecting donors who visited Zika areas
                  </a>
                  .&quot; Fox5 San Diego News.
                </span>
              </li>
              <li id="ref-18">
                <span className="li-color">
                  Withnall, A. (2016. Jan, 28). &quot;
                  <a
                    href="http://www.independent.co.uk/life-style/health-and-families/health-news/zika-how-virus-spread-around-world-a6839101.html"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    How the Zika virus spread around the world
                  </a>
                  .&quot; Independent.
                </span>
              </li>
              <li id="ref-19">
                <span className="li-color">
                  Musso, D., (2015). &quot;Zika Virus Transmission from
                  French Polynesia to Brazil.&quot; Emerg Infect Dis. 2015
                  Oct; 21(10): 1887. doi: 10.3201/eid2110.151125
                </span>
              </li>
              <li id="ref-20">
                <span className="li-color">
                  Fox, M. (2016. Feb, 2). &quot;
                  <a
                    href="http://www.nbcnews.com/storyline/zika-virus-outbreak/zika-virus-can-spread-sexual-contact-health-officials-dallas-confirm-n510076"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Dallas Reports First Case of Sexual Transmission of Zika
                    Virus
                  </a>
                  .&quot;
                </span>
              </li>
              <li id="ref-21">
                <span className="li-color">
                  Wilcox, E. (2010).{' '}
                  <a
                    href="http://www.wpafb.af.mil/news/story.asp?id=123219950"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    &quot;Lt Col Mark Duffy of USAF School of Aerospace
                    Medicine Receives the 2010 James H. Nakano Citation for
                    the Article &apos;Zika Virus Outbreak on Yap Island,
                    Federated States of Micronesia.&apos;&quot;
                  </a>
                </span>
              </li>
              <li id="ref-22">
                <span className="li-color">
                  Parry, L. (2016. Feb, 2).&quot;&apos;
                  <a
                    href="http://www.dailymail.co.uk/health/article-3428938/Game-changing-Zika-virus-scary-gets-warns-expert.html"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Game-changing&apos; Zika virus is about as scary as it
                    gets, warns expert
                  </a>
                  .&quot; Daily Mail, UK.
                </span>
              </li>
              <li id="ref-23">
                <span className="li-color">
                  Seibel, M. (2016. Feb, 4). &quot;
                  <a
                    href="http://www.star-telegram.com/news/nation-world/world/article58432243.html"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    French researcher says Zika link to Guillain-Barr&eacute;
                    Syndrome is &apos;almost certain&apos;
                  </a>
                  .&quot;
                </span>
              </li>
              <li id="ref-24">
                <span className="li-color">
                  Photo by{' '}
                  <a
                    href="https://www.flickr.com/photos/miguel_discart/14277835198/in/photolist-nKFCYo-nP7mSE-nKFDRA-nKFxqb-o3aYkK-nKGkM6-o5C7hb-o5MLFq-o5U33D-o6iALK-nQkEjG-o1GHhg-odQhcb-ocwyAx-nYyX5w-iM51KQ-nYsCxL-p6MRxa-nYPw55-o8o3UZ-o28ycW-f57byo-nPfKEA-dkULi9-nZiRMw-jJ2yZn-nNUwQj-pH6vQb-p3Gi3e-nJcLbJ-pXkmPj-oRNZJG-dkUNjN-oDPBzR-oaA85i-o5U2uz-o3Rzas-o5U22k-oiGbnm-o21QXk-qf7GTa-odAyNb-okRozr-nXbJw1-o4mMDk-nG1xTF-nrbBtj-o7wXiK-nNpnAf-nNpzZx"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Miguel Discart
                  </a>
                  .
                </span>
              </li>
              <li id="ref-25">
                <span className="li-color">
                  Photo by{' '}
                  <a
                    href="https://www.flickr.com/photos/iaea_imagebank/24407404799/in/photolist-DbNk78-fvEXR4-fvETn6-DBk3Nc-DKAirB-Dc6SmP-DBk1g8-Dc6RbT-CXf3aW-8VnCcF-DHW6bX-CLqAjf-DzEWzc-CLqzU7-DzEW4H-DHW4P8-CLqyBs-CLqy9o-DgPpTb-Dxwh3S-BCimRP-C2e22m-CbP14k-BCihNP-C2dWWs-pAKfpe-C2e3L3-oppw9W-oyv588-dcAVdB-oydVZx-DKhGPp-CMTRsk-DGYfro-DGYeey-DiaXvy-AVqThX-92EMis-92EMdC-92EM3U-92BDEH-92BDuX-92ELmm-92BCE4-92EKF7-92EKtN-D9vKBM-4Y9VRz-AT9SQE-AjM4wi"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    IAEA Imagebank
                  </a>
                  .
                </span>
              </li>
              <li id="ref-26">
                <span className="li-color">
                  Image retrieved from{' '}
                  <a
                    href="https://panampost.com/panam-staff/2015/02/25/colombias-price-controls-a-cure-worse-than-the-disease/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Panam Post
                  </a>
                  .
                </span>
              </li>
              <li id="ref-27">
                <span className="li-color">
                  Image retrieved from{' '}
                  <a
                    href="https://publichealthwatch.wordpress.com/2016/02/03/texas-reports-first-case-of-sexually-transmitted-zika-virus-in-u-s/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Public Health Watch
                  </a>
                  .
                </span>
              </li>
              <li id="ref-28">
                <span className="li-color">
                  Roeder, A., (2016). &quot;
                  <a
                    href="http://www.hsph.harvard.edu/news/features/zika-virus-in-brazil-may-be-mutated-strain/?utm_source=Twitter&utm_medium=Social&utm_campaign=Chan-Twitter-General"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Zika virus in Brazil may be mutated strain
                  </a>
                  .&quot; Harvard T.H. Chan School of Public Health.
                </span>
              </li>
              <li id="ref-29">
                <span className="li-color">
                  Wapps, J. (2016. Feb, 5). &quot;
                  <a
                    href="http://www.cidrap.umn.edu/news-perspective/2016/02/who-local-zika-cases-33-nations-gbs-numbers-climb"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    WHO: Local Zika cases in 33 nations as GBS numbers climb
                  </a>
                  .&quot; University of Minnesota Center for Infectious
                  Disease Research and Policy.
                </span>
              </li>
              <li id="ref-30">
                <span className="li-color">
                  &quot;
                  <a
                    href="https://en.wikipedia.org/wiki/Zika_virus_outbreak_(2015%E2%80%93present)"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Zika virus outbreak (2015–present)
                  </a>
                  .&quot; Wikipedia.
                </span>
              </li>
              <li id="ref-31">
                <span className="li-color">
                  Mackenzie, J. (2016. Feb, 4). &quot;
                  <a
                    href="http://theconversation.com/zika-dengue-yellow-fever-what-are-flaviviruses-53969"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Zika, dengue, yellow fever: what are flaviviruses?
                  </a>
                  &quot; The Conversation.
                </span>
              </li>
              <li id="ref-32">
                <span className="li-color">
                  &quot;
                  <a
                    href="http://www.who.int/mediacentre/factsheets/fs100/en/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Yellow Fever
                  </a>
                  .&quot; (2014. March). World Health Organization.
                </span>
              </li>
              <li id="ref-33">
                <span className="li-color">
                  &quot;
                  <a
                    href="http://www.who.int/mediacentre/factsheets/fs117/en/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Dengue and severe dengue
                  </a>
                  .&quot; (2015. May). World Health Organization.
                </span>
              </li>
              <li id="ref-34">
                <span className="li-color">
                  &quot;
                  <a
                    href="http://www.foxnews.com/health/2013/01/16/dengue-is-fastest-spreading-tropical-disease-who-says.html"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Dengue is fastest-spreading tropical disease, WHO says
                  </a>
                  .&quot; (2013) Fox News Health.
                </span>
              </li>
              <li id="ref-35">
                <span className="li-color">
                  World Economic Forum (2015. Jan, 4). &quot;
                  <a
                    href="http://www.weforum.org/agenda/2016/01/how-close-are-we-to-beating-dengue"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    How close are we to beating dengue?
                  </a>
                  &quot;
                </span>
              </li>
              <li id="ref-36">
                <span className="li-color">
                  Centers for Disease Control and Prevention (2016). &quot;
                  <a
                    href="http://www.cdc.gov/zika/qa/gbs-qa.html"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Zika virus: Guillain-Barr&eacute; syndrome Q &amp; A
                  </a>
                  .&quot;
                </span>
              </li>
              <li id="ref-37">
                <span className="li-color">
                  World Health Organization. (2016. Mar 7). &quot;
                  <a
                    href="http://www.who.int/csr/don/7-march-2016-gbs-french-polynesia/en/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Guillain-Barr&eacute; syndrome – France - French
                    Polynesia.
                  </a>
                  &quot;
                </span>
              </li>
              <li id="ref-38">
                <span className="li-color">
                  European Centre for Disease Prevention and Control. (2015.
                  Dec 10).{' '}
                  <a
                    href="http://ecdc.europa.eu/en/publications/Publications/zika-virus-americas-association-with-microcephaly-rapid-risk-assessment.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    &quot;Zika virus epidemic in the Americas: potential
                    association with microcephaly and Guillain-Barr&eacute;
                    syndrome.&quot;
                  </a>
                </span>
              </li>
              <li id="ref-39">
                <span className="li-color">
                  &quot;
                  <a
                    href="http://www.mayoclinic.org/diseases-conditions/guillain-barre-syndrome/basics/symptoms/con-20025832"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Guillain-Barr&eacute; syndrome
                  </a>
                  .&quot; Mayo Clinic (2016)
                </span>
              </li>
              <li id="ref-40">
                <span className="li-color">
                  Sifferlin, A. (2016. Feb 8). &quot;
                  <a
                    href="http://time.com/4209612/zika-guillain-barre-syndrome-cdc/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Here&apos;s the Other Zika Problem Experts Are Worried
                    About
                  </a>
                  .&quot; Time.
                </span>
              </li>
              <li id="ref-41">
                <span className="li-color">
                  World Health Organization. (2016. Feb 1). &quot;
                  <a
                    href="http://www.who.int/mediacentre/news/statements/2016/1st-emergency-committee-zika/en/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    WHO statement on the first meeting of the International
                    Health Regulations (2005) (IHR 2005) Emergency Committee
                    on Zika virus and observed increase in neurological
                    disorders and neonatal malformations.
                  </a>
                  &quot;
                </span>
              </li>
              <li id="ref-42">
                <span className="li-color">
                  <a
                    href="https://www.whitehouse.gov/the-press-office/2016/02/08/fact-sheet-preparing-and-responding-zika-virus-home-and-abroad"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    https://www.whitehouse.gov/the-press-office/2016/02/08/fact-sheet-preparing-and-responding-zika-virus-home-and-abroad
                  </a>
                </span>
              </li>
            </ol>
          </div>
        </div>
      </div>

      {/* Footer from original */}
      <div className="footer">
        <span>
          Licensed under Creative Commons Attribution v3 | Created by{' '}
          <a href="https://www.goinvo.com" target="_blank" rel="noopener noreferrer">
            Goinvo
          </a>{' '}
          | Send us{' '}
          <a href="mailto:zika@goinvo.com?subject=Feedback for Understanding Zika">
            Feedback
          </a>{' '}
          | Check out the{' '}
          <a
            href="https://github.com/goinvo/InvoUnderstandingZika/"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub Repo
          </a>
        </span>
      </div>

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
