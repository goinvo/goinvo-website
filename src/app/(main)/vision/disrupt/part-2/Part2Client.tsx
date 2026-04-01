'use client'

import {
  ColorScrollWrapper,
  DisruptHeroVideo,
  DisruptNavBar,
  BottomNav,
} from '../DisruptClient'
import { legacyImage } from '../disrupt-shared'
import '../disrupt.css'

/**
 * Disrupt Part 2: From Horse to Horsepower
 *
 * Directly translated from:
 * - /c/tmp/legacy-features/disrupt/part-2.html (structure)
 * - /c/tmp/legacy-features/disrupt/styles → disrupt.css (styles)
 *
 * Layout: nav → top hero with title → article → sci-fi image → article → bottom hero → next-part link
 */
export function Part2Client() {
  return (
    <ColorScrollWrapper partIndex={1}>
      {/* ===== Fixed Article Navigation ===== */}
      <DisruptNavBar currentPart={2} />

      {/* ===== Top Hero with Section Title ===== */}
      <header className="sec-header top-vid" id="top">
        <div className="video-container" data-page="2">
          <DisruptHeroVideo partNumber={2} position="top" />
        </div>
        <div className="title-container">
          <h3>From Horse</h3>
          <h3>to Horsepower</h3>
        </div>
      </header>

      {/* ===== Opening Article Content ===== */}
      <article className="disrupt" id="feature-article">
        <section className="article-section" id="section-2">
          <div className="section-content">
            <div className="content">
              <div className="sub-sec">
                <p>
                  To envision our future and the possible effects of technological
                  disruption, both positive and negative, it is helpful to consider
                  some of the recent historical context for humanity&apos;s ongoing
                  relationship with technology.
                </p>
                <p>
                  Imagine the world at the turn of the 20th century in the United
                  States, just before the massive changes of the Second Industrial
                  Revolution took place. Personal transportation over land is largely
                  provided by a person&apos;s own two feet, horse and buggy, or, for
                  extended trips, the railroad. Interpersonal communication is
                  accomplished via word of mouth, handwritten letters, and &mdash;
                  should you have an important message to send over long distance
                  &mdash; perhaps the telegraph. During the evening, your home is lit
                  by candles, lanterns, or maybe highly volatile gas lamps. Of course,
                  all of this is about to change. But, as a person living in these
                  early days of the 20th century, it&apos;s likely you don&apos;t have
                  the slightest inkling how life is going to be altered as the
                  technologies of the Second Industrial Revolution take hold.
                </p>
              </div>
            </div>
          </div>
        </section>
      </article>

      {/* ===== Full-width Sci-Fi Caption Image ===== */}
      <div className="sci-fi">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          sizes="100vw"
          srcSet={`${legacyImage('remarkable-800.jpg')} 800w, ${legacyImage('remarkable-1280.jpg')} 1280w, ${legacyImage('remarkable-2880.jpg')} 2880w`}
          alt="Remarkable technologies interwoven with daily life"
        />
        <article className="disrupt">
          <div className="caption">
            As new technologies become closely interwoven with our daily lives it
            becomes difficult to envision how people functioned without them.
          </div>
        </article>
      </div>

      {/* ===== Main Article Content ===== */}
      <article className="disrupt" id="feature-article">
        <section className="article-section" id="section-2">
          <div className="section-content">
            <div className="content">
              <div className="sub-sec">
                <p>
                  We can see an example of this disruption in the advent of the
                  automobile. In 1910 there are fewer than 500,000 autos in the
                  United States. Just seven years later, the number increases by a
                  factor of 10 to 5 million registered vehicles. And by 1929, there
                  are well over 50 times as many cars, with approximately 27 million
                  automobiles across America. During the Second Industrial Revolution,
                  this pattern of widespread adoption of radical new technology is
                  repeated over and over again &mdash; from electricity to the
                  telephone to the radio. A graph by Nick Felton from the{' '}
                  <span className="italics">New York Times</span> shows the adoption
                  rate of disruptive new technologies: In 1900, few if any American
                  families have the technologies that define modern life. However, by
                  the 1930s nearly 70% of U.S. households have electricity, 50% have
                  automobiles, and 40% have telephones.
                </p>

                {/* NYT Graph — centered */}
                <div className="images center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={legacyImage('nytgraph.gif')}
                    alt="Technology adoption rates chart from Nick Felton, New York Times"
                  />
                </div>

                {/* Sidebar images — float right on desktop */}
                <div className="images sidebar right">
                  <div className="image">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={legacyImage('section-2-highway-system.png')}
                      alt="U.S. Highway System Plan, November 11, 1926"
                    />
                    <div className="caption">
                      U.S. Highway System Plan, November 11, 1926
                    </div>
                  </div>
                  <div className="image">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={legacyImage('section-2-pijl.png')}
                      alt="Karl Jilg represents a pedestrian's view of city streets"
                    />
                    <div className="caption">
                      Karl Jilg represents a pedestrian&apos;s view of city streets
                    </div>
                  </div>
                  <div className="image">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={legacyImage('section-2-standard-oil.png')}
                      alt="John Rockefeller's Standard Oil had an octopus-like economic influence"
                    />
                    <div className="caption">
                      John Rockefeller&apos;s Standard Oil had an octupus-like
                      economic influence
                    </div>
                  </div>
                </div>

                <p>
                  Faster, better, more reliable transportation, nearly instantaneous
                  communication across great distance, and a wondrous energy source to
                  power inventions from electric lights to the radio, are just a few of
                  the positive results of this era of technological disruption. But
                  what did we give up in exchange? The automobile in particular, forced
                  the remaking of the American landscape. To create the roads and
                  highways on which autos could easily travel, we tore up the landscape
                  and replaced it with asphalt and concrete, from sea to shining sea.
                  The natural beauty of America was subjugated to the desire to move
                  forward &mdash; with individual mobility for commerce and pleasure
                  seen as the greatest good, everything else was required to give way.
                </p>

                {/* Mobile-only duplicate: highway system */}
                <div className="images sidebar middle">
                  <div className="image">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={legacyImage('section-2-highway-system.png')}
                      alt="U.S. Highway System Plan, November 11, 1926"
                    />
                    <div className="caption">
                      U.S. Highway System Plan, November 11, 1926
                    </div>
                  </div>
                </div>

                <p>
                  Within our cities, we experienced a great loss of public space or,
                  at least, the ceding of that space in permanent fashion to one form
                  of transportation only. An illustration by Karl Jilg commissioned by
                  the Swedish Road Administration makes the point elegantly, depicting
                  city roadways as yawning chasms that can only be crossed by rickety
                  plywood bridges, with pedestrians limited in their motion to the near
                  vicinity of buildings.
                </p>

                {/* Mobile-only duplicate: pijl */}
                <div className="images sidebar middle">
                  <div className="image">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={legacyImage('section-2-pijl.png')}
                      alt="Karl Jilg represents a pedestrian's view of city streets"
                    />
                    <div className="caption">
                      Karl Jilg represents a pedestrian&apos;s view of city streets
                    </div>
                  </div>
                </div>

                <p>
                  Similarly, our natural resource and even our national policy were
                  subjected to the whims of big oil companies in order to feed our
                  insatiable thirst for fuel. A political cartoon from 1905 shows the
                  outsized influence of Standard Oil, which wraps its tentacles around
                  the government, industry, and labor.
                </p>

                {/* Mobile-only duplicate: standard oil */}
                <div className="images sidebar middle">
                  <div className="image">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={legacyImage('section-2-standard-oil.png')}
                      alt="John Rockefeller's Standard Oil had an octopus-like economic influence"
                    />
                    <div className="caption">
                      John Rockefeller&apos;s Standard Oil had an octupus-like
                      economic influence
                    </div>
                  </div>
                </div>

                <p>
                  In hindsight it&apos;s easy to question if these were the best
                  outcomes. We received great benefits, no doubt, from the auto, and
                  great detriments as well. Going forward, it&apos;s worth considering
                  the trade-offs of emerging, disruptive technologies, for our
                  environment, natural resources, and way of living.
                </p>
              </div>
            </div>
          </div>
        </section>
      </article>

      {/* ===== Bottom Hero ===== */}
      <header className="sec-header bottom-vid" id="bottom">
        <div className="video-container" data-page="2">
          <DisruptHeroVideo partNumber={2} position="bottom" />
        </div>
      </header>

      {/* ===== Next Part Navigation ===== */}
      <BottomNav
        nextHref="/vision/disrupt/part-3"
        nextTitle="the coming disruption"
        color="#DD2E64"
      />
    </ColorScrollWrapper>
  )
}
