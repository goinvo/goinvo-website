import type { Metadata } from 'next'
import Image from 'next/image'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'
import { Divider } from '@/components/ui/Divider'
import { Quote } from '@/components/ui/Quote'

const legacyImage = (path: string) =>
  `https://www.goinvo.com/old/images/features/democracy/${path}`

export const metadata: Metadata = {
  title: 'Redesign Democracy',
  description: 'A better solution for the digital era.',
}

export default function RedesignDemocracyPage() {
  return (
    <div>
      <SetCaseStudyHero image={legacyImage('phones.jpg')} />

      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          {/* Title & Nav */}
          <h1 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light mb-1">
            Redesign Democracy
          </h1>
          <h3 className="font-serif text-base font-light text-gray mb-6">
            A better solution for the digital era.
          </h3>

          {/* Table of Contents */}
          <nav className="mb-8 flex flex-wrap gap-2">
            {[
              { id: 'intro', label: '1. Intro' },
              { id: 'origin', label: '2. Origin' },
              { id: 'better-democracy', label: '3. Better Democracy' },
              { id: 'woe-legislature', label: '4. Woe, Legislature' },
              { id: 'digital-solution', label: '5. Digital Solution' },
            ].map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="text-sm px-3 py-1 border border-gray-light text-gray hover:bg-gray-lightest transition-colors"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <Divider />

          {/* ===== SECTION 1: INTRODUCTION ===== */}
          <div id="intro" className="scroll-mt-24 mb-12">
            <h2 className="font-serif text-2xl lg:text-3xl font-light mt-8 mb-6">
              Introduction
            </h2>

            <p className="text-gray leading-relaxed mb-4">
              Older generations seem to chronically lament that the world of the
              young is new, unprecedented, and terrible. Nostalgia and
              familiarity combine to create a &ldquo;They don&apos;t make
              &apos;em like they used to&hellip;&rdquo; mentality, one that
              ignores the fact preceding generations were saying exactly the same
              thing about them. The reality is that things are the way they are,
              each of us typically being more comfortable with and connected to
              that which we know the best and identify most closely with
              ourselves.
            </p>

            <p className="text-gray leading-relaxed mb-4">
              However, it is just possible that we are reaching the nadir of the
              existing democratic process in the United States, an environment of
              toxicity and partisanship that shows no sign of softening.
              Coincidentally we are also at a moment where technology enables the
              tantalizing potential to reconsider the way our government is
              structured.
            </p>

            <p className="text-gray leading-relaxed mb-4">
              Democracy in the United States has over 200 years of history
              behind it; democracy as a government system has more than 2,000
              years of precedent. It may be the best system going but it sure
              doesn&apos;t seem to be doing a very good job. It might even be
              obsolete in this world that looks so very different than the one
              which produced it.
            </p>

            <p className="text-gray leading-relaxed mb-4">
              This is the moment &mdash; our moment, together, yours and mine
              &mdash; to create a better system. So read on, see what I have in
              mind, and why. And if it sounds good to enough of us, maybe we can
              really change the world.
            </p>

            <div className="my-6 pl-6 border-l-2 border-primary">
              <p className="text-gray leading-relaxed">
                Dirk Knemeyer
                <br />
                Granville, Ohio, U.S.
                <br />
                September 8, 2014
              </p>
            </div>

            <p className="text-gray leading-relaxed mb-4 italic">
              This article is also available as PDF, eBook, and spoken by the
              author free of charge.
            </p>
          </div>

          <Divider />

          {/* ===== SECTION 2: THE ORIGINS OF DEMOCRACY ===== */}
          <div id="origin" className="scroll-mt-24 mb-12">
            <h2 className="font-serif text-2xl lg:text-3xl font-light mt-8 mb-6">
              The Origins of Democracy
            </h2>
            <p className="text-gray leading-relaxed mb-2 italic">
              Today&apos;s U.S. government is built on principles and practices
              established more than 2,000 years ago. Can digital technology help
              us realize a better way?
            </p>

            <p className="text-gray leading-relaxed mb-4">
              Democracy first took root around 508 BCE in Athens, Greece, the
              cultural cradle of antiquity. From 508 to 146 BCE Greece,
              particularly Athens, set the foundation upon which western
              civilization was to develop. Much of modern science, art, and
              architecture traces directly back to this place and time, building
              off of or reacting to the achievements of this period over the
              subsequent 2,160 years. This is certainly the case with modern
              democracy.
            </p>

            <p className="text-gray leading-relaxed mb-4">
              Of course, the Athenians had a very different conception than we do
              of who was eligible to rule, to say nothing of who could vote.
              According to A.W. Gomme, of the estimated 315,500 people in Athens
              during the height of their civilization, there were:
            </p>

            <Image
              src={legacyImage('population.jpg')}
              alt="Population chart of Ancient Athens showing 25,000 male citizens, 46,500 menial laborers, 115,000 slaves, and 129,000 women and children"
              width={800}
              height={400}
              className="w-full h-auto my-6"
            />

            <p className="text-gray leading-relaxed mb-4">
              Only the 25,000 male citizens of Athens could vote, meaning that
              fewer than 13% of the population had the privilege to choose their
              leaders.
            </p>

            <Image
              src={legacyImage('greek.jpg')}
              alt="Some ancient Greek technologies: thermometers, coin money, and catapults"
              width={800}
              height={400}
              className="w-full h-auto my-6"
            />
            <p className="text-sm text-gray mb-6 italic">
              Some ancient Greek technologies. Key technologies from ancient
              Greece: thermometers, coin money, and catapults.
            </p>

            <p className="text-gray leading-relaxed mb-4">
              The lack of universal representation was obviously a problem, but a
              more subtle issue with Athenian democracy was the scale. In their
              very different and dispersed representational model &mdash; with
              dozens of roles &mdash; more than half of the 25,000 male citizens
              served in some official governing capacity at all times. The
              consequence was that most of this privileged class participated in
              government or had direct relationships and access to those who did.
            </p>

            <p className="text-gray leading-relaxed mb-4">
              We continue to model our government systems on the same democratic
              approach, established more than 2,000 years ago, which represented
              only a small, privileged minority. Is democracy a mistake?
            </p>

            {/* Alternative Forms of Government */}
            <h3 className="font-serif text-xl font-light mt-8 mb-4">
              Alternative Forms of Government
            </h3>

            {/* Theocracy */}
            <div className="bg-gray-lightest p-6 mb-6">
              <h4 className="font-serif text-lg font-light mb-2">Theocracy</h4>
              <p className="text-gray leading-relaxed mb-3 text-sm">
                A deity was recognized as the official ruler and policy was set
                by officials who claimed divine guidance. These leaders largely
                came from privileged groups and families.
              </p>
              <p className="text-sm mb-1">
                <strong>Key Strength:</strong>{' '}
                <span className="text-gray">
                  Spiritual basis for rules and decisions encouraged compliance
                  and minimized dissatisfaction.
                </span>
              </p>
              <p className="text-sm mb-1">
                <strong>Crippling Weakness:</strong>{' '}
                <span className="text-gray">
                  Abstraction of divinity broke down quickly in the absence of
                  clear religious hegemony.
                </span>
              </p>
              <p className="text-sm mb-1">
                <strong>Historical Example:</strong>{' '}
                <span className="text-gray">
                  Chinese Shang Dynasty, 1600&ndash;1046 BCE. The emperor,
                  descended from a continuous male line, was treated as God-like.
                  Both a political and religious leader, his written declarations
                  were considered as &ldquo;directives from above&rdquo; and the
                  actions of the state as divinely influenced.
                </span>
              </p>
              <p className="text-sm mb-1">
                <strong>Downfall:</strong>{' '}
                <span className="text-gray">
                  The Shang dynasty weakened over time. Debauched emperor Shang
                  Di Xin poorly managed his holdings and lead his army to
                  destruction, ushering in the Zhou dynasty.
                </span>
              </p>
              <p className="text-sm">
                <strong>Lessons Learned:</strong>{' '}
                <span className="text-gray">
                  While a single-religion state seems impossible in the modern
                  world, yoking the rule of state to spirituality in such a case
                  can create stability and&mdash;assuming reasonable civil
                  rights&mdash;relative harmony.
                </span>
              </p>
            </div>

            {/* Oligarchy */}
            <div className="bg-gray-lightest p-6 mb-6">
              <h4 className="font-serif text-lg font-light mb-2">Oligarchy</h4>
              <p className="text-gray leading-relaxed mb-3 text-sm">
                Control was exercised by a small group of people whose authority
                was based on special status related to power, wealth, education,
                or family.
              </p>
              <p className="text-sm mb-1">
                <strong>Key Strength:</strong>{' '}
                <span className="text-gray">
                  Efficient application of power by a theoretically enlightened
                  group.
                </span>
              </p>
              <p className="text-sm mb-1">
                <strong>Crippling Weakness:</strong>{' '}
                <span className="text-gray">
                  Participation in governance was restricted to the anointed few.
                </span>
              </p>
              <p className="text-sm mb-1">
                <strong>Historical Example:</strong>{' '}
                <span className="text-gray">
                  Ancient Sparta, 7th century to 4th century BCE. Twenty-eight
                  men over 60 years of age, along with two kings, made up the
                  &ldquo;council of elders.&rdquo; They formulated proposals for
                  acceptance or rejection by all free males.
                </span>
              </p>
              <p className="text-sm mb-1">
                <strong>Downfall:</strong>{' '}
                <span className="text-gray">
                  Wars killed citizens and weakened the Spartan geopolitical
                  position. Spartan citizenship was inherited along family lines,
                  so Spartans increasingly became a minority.
                </span>
              </p>
              <p className="text-sm">
                <strong>Lessons Learned:</strong>{' '}
                <span className="text-gray">
                  The Spartan oligarchy was generally an effective governing
                  body. The underlying societal structure&mdash;only a privileged
                  and distinctly minority class were considered
                  citizens&mdash;was the primary issue.
                </span>
              </p>
            </div>

            {/* Feudalism */}
            <div className="bg-gray-lightest p-6 mb-6">
              <h4 className="font-serif text-lg font-light mb-2">Feudalism</h4>
              <p className="text-gray leading-relaxed mb-3 text-sm">
                Powerful regional families lorded over their territory and the
                people therein, with sovereignty a product of military might.
              </p>
              <p className="text-sm mb-1">
                <strong>Key Strength:</strong>{' '}
                <span className="text-gray">
                  Civilians had a high degree of social security and stability.
                </span>
              </p>
              <p className="text-sm mb-1">
                <strong>Crippling Weakness:</strong>{' '}
                <span className="text-gray">
                  Rigid caste structure trapped most people into lives over which
                  they had little control and may not have wanted.
                </span>
              </p>
              <p className="text-sm mb-1">
                <strong>Historical Example:</strong>{' '}
                <span className="text-gray">
                  Medieval Japan, 12th century to 16th century. While Japan was
                  nominally ruled by a weak emperor, regional daimyo served as
                  absolute rulers of their territorial holdings, passed down
                  within the same family.
                </span>
              </p>
              <p className="text-sm mb-1">
                <strong>Downfall:</strong>{' '}
                <span className="text-gray">
                  The period of &ldquo;warring states&rdquo; consolidated power
                  to a strong emperor, breaking feudal decentralization for good.
                </span>
              </p>
              <p className="text-sm">
                <strong>Lessons Learned:</strong>{' '}
                <span className="text-gray">
                  The combination of decentralization with perpetual military
                  conflict between regional powers meant the emphasis of citizen
                  effort was on subsistence and security. Quality of life, as
                  well as progress in arts and sciences, was minimal.
                </span>
              </p>
            </div>

            {/* Absolute Monarchy */}
            <div className="bg-gray-lightest p-6 mb-6">
              <h4 className="font-serif text-lg font-light mb-2">
                Absolute Monarchy
              </h4>
              <p className="text-gray leading-relaxed mb-3 text-sm">
                A single individual held most of the power over a nation-state.
              </p>
              <p className="text-sm mb-1">
                <strong>Key Strength:</strong>{' '}
                <span className="text-gray">
                  A single ruler was able to act decisively, set a vision, and
                  execute it without compromise.
                </span>
              </p>
              <p className="text-sm mb-1">
                <strong>Crippling Weakness:</strong>{' '}
                <span className="text-gray">
                  No checks and balances. If the monarch was weak or corrupt the
                  nation and citizens could suffer terribly.
                </span>
              </p>
              <p className="text-sm mb-1">
                <strong>Historical Example:</strong>{' '}
                <span className="text-gray">
                  France, 8th century to 18th century CE. Over 1,000 years just
                  five powerful dynasties provided hereditary monarchs that led
                  France to be the dominant power in continental Europe.
                </span>
              </p>
              <p className="text-sm mb-1">
                <strong>Downfall:</strong>{' '}
                <span className="text-gray">
                  Indulgences by the nobility contrasted with the misery of the
                  common people during a period where theories of civil and
                  political rights transformed popular expectations. The result
                  was the French Revolution which famously ended the
                  millennium-long tradition of hereditary rule.
                </span>
              </p>
              <p className="text-sm">
                <strong>Lessons Learned:</strong>{' '}
                <span className="text-gray">
                  French contributions to humanity and the arts and sciences
                  continue to reverberate, notably those originating in Louis
                  XIV&apos;s reign of so-called enlightened rule. However, the
                  absolute rulers ultimately neglected their people to the point
                  of their own destruction.
                </span>
              </p>
            </div>

            {/* Parliamentary Monarchy */}
            <div className="bg-gray-lightest p-6 mb-6">
              <h4 className="font-serif text-lg font-light mb-2">
                Parliamentary Monarchy
              </h4>
              <p className="text-gray leading-relaxed mb-3 text-sm">
                A ruling monarch worked with a democratically elected parliament,
                all within a code of laws.
              </p>
              <p className="text-sm mb-1">
                <strong>Key Strength:</strong>{' '}
                <span className="text-gray">
                  Democratic nature of parliament represents the common person
                  although the monarch retains many benefits and powers of an
                  absolute ruler.
                </span>
              </p>
              <p className="text-sm mb-1">
                <strong>Crippling Weakness:</strong>{' '}
                <span className="text-gray">
                  Dysfunction between the monarch and parliament can lead to
                  gridlock; ineffectiveness on the part of either the monarch or
                  parliament can unbalance the government.
                </span>
              </p>
              <p className="text-sm mb-1">
                <strong>Historical Example:</strong>{' '}
                <span className="text-gray">
                  England/United Kingdom, 17th century CE to present. In the
                  early days, a king or queen presided in conjunction with a
                  parliament and prime minister. By the 20th century the monarch
                  was reduced to a figurehead and the nation was functionally a
                  democracy.
                </span>
              </p>
              <p className="text-sm">
                <strong>Lessons Learned:</strong>{' '}
                <span className="text-gray">
                  The U.K. now functions as a monarchy in name only. During the
                  reign of Queen Victoria it was the largest empire in history.
                  Thanks to their flexibility the empire declined in a somewhat
                  intentional and controlled way and today the U.K. is still one
                  of the few leading world powers.
                </span>
              </p>
            </div>

            {/* Single-Party State */}
            <div className="bg-gray-lightest p-6 mb-6">
              <h4 className="font-serif text-lg font-light mb-2">
                Single-Party State
              </h4>
              <p className="text-gray leading-relaxed mb-3 text-sm">
                Most western dictatorships of the 20th century were established
                where a single political party took control of the government
                and, to varying degrees, independently made decisions relating to
                rulers and laws.
              </p>
              <p className="text-sm mb-1">
                <strong>Key Strength:</strong>{' '}
                <span className="text-gray">
                  Similar ideology and platform shared by those in control
                  creates efficiency and sidesteps the friction inherent in
                  multi-party systems.
                </span>
              </p>
              <p className="text-sm mb-1">
                <strong>Crippling Weakness:</strong>{' '}
                <span className="text-gray">
                  Civil rights generally take a back seat to maintaining and
                  expanding power, leading to a relatively closed society of a
                  sort that has historically proven unsustainable.
                </span>
              </p>
              <p className="text-sm mb-1">
                <strong>Historical Example:</strong>{' '}
                <span className="text-gray">
                  Communist Russia, 1918&ndash;1991 CE. The bloody overthrow of
                  the last Russian Tsar saw Russia, a middling European power,
                  rise within 40 years to take eastern Europe under their federal
                  control and become one of the first global superpowers.
                </span>
              </p>
              <p className="text-sm">
                <strong>Lessons Learned:</strong>{' '}
                <span className="text-gray">
                  Concentrated power and government control enabled the
                  mechanization of powerful forces; closed, controlling society
                  and over-reach of influence on a global level left communist
                  Russia ripe for ignominious collapse.
                </span>
              </p>
            </div>

            <p className="text-gray leading-relaxed mb-4">
              Systems of government are characterized by a broad and complicated
              range of characteristics. This complexity can make it difficult to
              consider new political systems. Over the last 3,000 years the
              developing world has tried hundreds of different systems of
              government, many of which fall under the archetypes presented here.
              It is valuable to consider them in thinking about how we can
              re-imagine our own governance. However, we live in a moment when
              human rights are of paramount importance, so governments that
              minimize citizen involvement in determining laws and leadership
              present a less attractive choice.
            </p>

            <p className="text-gray leading-relaxed mb-4">
              The reality is, at our current evolutionary stage, people must
              advocate for themselves. Time and time again we&apos;ve learned
              that trusting someone or something else with our own well-being
              generally leads to its degrading. It is, after all, human nature to
              value one&apos;s own needs over those of society at large.
            </p>

            <Image
              src={legacyImage('circle.jpg')}
              alt="Concentric circles showing rings from 'Myself and family' at center through 'All of humanity'"
              width={800}
              height={500}
              className="w-full h-auto my-6"
            />
            <p className="text-sm text-gray mb-6 italic">
              The way we take care of our needs can be described by a series of
              concentric rings, from &ldquo;Myself and family&rdquo; at center
              to &ldquo;All of humanity&rdquo; at the outermost ring.
            </p>
          </div>

          <Quote
            text="It has been said that democracy is the worst form of government except all the others that have been tried."
            author="Sir Winston Churchill"
          />

          <div className="mt-8">
            <p className="text-gray leading-relaxed mb-4">
              Each ring out from the center gets less of my care and interest. I
              am just one person who has an intricate life to manage, one that
              precludes me from impacting the world far beyond my own immediate
              interests. Extrapolate that to the leader of a nation-state
              needing to care for all citizens equally. It is a literal
              impossibility. At its extreme, such natural self-interest may
              manifest as corruption, but for most managing that self-interest is
              simply one of the challenges that leaders must face.
            </p>

            <p className="text-gray leading-relaxed mb-4">
              Given that people are naturally self-focused, and that human rights
              are an essential aspect to a modern government system, I will focus
              on redesigning democracy as opposed to changing to a different form
              of government. By giving citizens direct influence over their laws
              and leaders we give them the greatest degree of control over their
              own well-being. Perhaps our redesign of democracy can extend the
              degree of self-control and agency afforded by the US government of
              today. The question is, how can we move the government decisions
              that influence us closer to the centers of our own circles?
            </p>
          </div>

          <Divider />

          {/* ===== SECTION 3: ELEMENTS OF A BETTER DEMOCRACY ===== */}
          <div id="better-democracy" className="scroll-mt-24 mb-12">
            <h2 className="font-serif text-2xl lg:text-3xl font-light mt-8 mb-6">
              Elements of a Better Democracy
            </h2>

            <p className="text-gray leading-relaxed mb-4">
              One of the inherent flaws in modern democracies is the large size
              of contemporary nation-states. The bigger a group of people, the
              more removed those at the top will be from best serving some
              significant percentage of those at the bottom. There is too diverse
              a set of needs, values, beliefs, and affiliations for everyone to
              be properly taken care of. In the United States, this problem is
              exacerbated by a highly heterogeneous population. While there are
              many benefits to the &ldquo;melting pot&rdquo; &mdash; social,
              genetic, and philosophical, to name a few &mdash; the very
              diversity that provides strength also makes it harder for each
              individual to be properly governed. In a perfect world our society
              would cater to each of us as a unique person with idiosyncratic
              needs, woven nicely into the larger social fabric. The reality of a
              nation with hundreds of millions of people is that the larger and
              more diverse it is, the less customized to individual needs and
              desires the experience of being a citizen will be.
            </p>

            <h3 className="font-serif text-xl font-light mt-8 mb-4">
              These ideas are built on four basic premises:
            </h3>

            {/* Premise 1 */}
            <Image
              src={legacyImage('hands.jpg')}
              alt="A heart being held by two hands"
              width={800}
              height={400}
              className="w-full h-auto my-6"
            />

            <h4 className="font-serif text-lg font-light mb-3">
              1. Citizenship Benefits and Responsibilities
            </h4>
            <p className="text-gray leading-relaxed mb-4">
              Citizenship should provide major benefits and carry significant
              responsibilities. In the United States, the benefits of citizenship
              have never been more uncertain. We have the most extensive national
              security in the world, a clear benefit even if it is an order of
              magnitude larger than it needs to be. The recent adoption of
              &ldquo;Obamacare&rdquo; begins to move us closer to our
              first-world brethren from a health and wellness perspective. Social
              security and other social welfare programs are under threat both
              financially and legislatively, possibly removing a key personal
              security perk from our lives.
            </p>
            <p className="text-gray leading-relaxed mb-4">
              However, our nation asks very little of us in return. Other than
              pay taxes, which are among the lowest in the wealthy first world,
              and follow the laws, which are among the most liberal and
              individual-freedoms-friendly for a large nation-state in human
              history, we have little responsibility to our nation, state,
              community, or fellow citizens.
            </p>
            <p className="text-gray leading-relaxed mb-4">
              Getting a lot for a little might seem like a good deal, but it is
              not good for our country nor for ourselves. From a pragmatic
              perspective, our low taxes contribute to what is now over $17
              trillion in debt. Our general lack of other societal
              responsibilities not only contribute to that debt &mdash; they
              also give us a sense of entitlement. Feeling entitled can lead to
              selfish, lazy, and even anti-social behavior.
            </p>
            <p className="text-gray leading-relaxed mb-4">
              By injecting more citizen responsibility, or at least productive
              participation, into our democracy we can curb unhealthy individual
              and collective behaviors while increasing prosperity for everyone.
            </p>

            {/* Premise 2 */}
            <h4 className="font-serif text-lg font-light mb-3">
              2. Unifying Initiatives
            </h4>
            <Image
              src={legacyImage('stalin.jpg')}
              alt="Josef Stalin"
              width={800}
              height={400}
              className="w-full h-auto my-4"
            />
            <p className="text-sm text-gray mb-4 italic">
              Josef Stalin famously instituted five-year plans, a model that saw
              the Soviet Union centralize and modernize at a prodigious rate.
              While these successes were admittedly reached through brutality and
              civil rights abuses, it is indisputable that by setting a broad
              agenda that strategically brings together many disparate elements
              of a nation for single purpose, profound change can be achieved.
            </p>
            <p className="text-gray leading-relaxed mb-4">
              We need unifying initiatives to guide our government. From a
              philosophical perspective we already have these: the Declaration of
              Independence, the Constitution, and the Bill of Rights. However, on
              an operational level we do not. Every four years there is a new
              presidential election. Every two years we elect our
              representatives, every six, our senators and state governors. By
              the time any of these civil servants gets comfortable in office
              there is little time to think broadly; before long they need to
              worry about earning future votes to win the next election and
              maintain their position.
            </p>
            <p className="text-gray leading-relaxed mb-4">
              Each time there is a change it potentially stops and even reverses
              the initiatives instigated by the previous regime. If there were a
              list of initiatives that gave us mandates over longer periods of
              time, a decade, two decades, or even more, we could borrow some of
              the key executive benefits of monarchical or dictatorial regimes
              while maintaining a true democracy.
            </p>

            {/* Premise 3 */}
            <h4 className="font-serif text-lg font-light mb-3">
              3. Direct Relationship with Leaders and Laws
            </h4>
            <p className="text-gray leading-relaxed mb-4">
              Citizens should have a closer, more direct relationship with their
              leaders and laws. While the majority of residents of ancient Athens
              were likely not citizens, those who were had a direct relationship
              to the workings of their &ldquo;national&rdquo; government. This
              is an ideal that gives people the greatest input into their
              government&apos;s functioning, necessarily putting the
              individual&apos;s rights and perspectives close to the decisions
              being made for and about them. It means participation.
            </p>

            <Image
              src={legacyImage('citizens.jpg')}
              alt="Chart depicting the ratio of citizens participating in government: 1 in 2 in Ancient Athens, 1 in 10,000 in 1790 US, and 1 in 384,000 in 2014 US"
              width={800}
              height={400}
              className="w-full h-auto my-6"
            />

            {/* Premise 4 */}
            <h4 className="font-serif text-lg font-light mb-3">
              4. Balance of Long-term and Short-term Planning
            </h4>
            <Image
              src={legacyImage('moon.jpg')}
              alt="An astronaut on the moon"
              width={800}
              height={400}
              className="w-full h-auto my-4"
            />
            <p className="text-sm text-gray mb-4 italic">
              What if an amendment to the U.S. Constitution required an
              audacious, strategic long-term goal that we would commit to
              achieving regardless of whatever else might happen? President John
              F. Kennedy tried this on an ad hoc basis and &mdash; seemingly
              beyond the bounds of reason &mdash; we found ourselves on the moon
              less than a decade later.
            </p>
            <p className="text-gray leading-relaxed mb-4">
              Laws and leadership should have a proper balance of long-term and
              short-term planning. China&apos;s emphasis on long-term planning
              turned them into a global superpower around the turn of the 20th
              century. By contrast, for decades the US government has pursued
              plans that are painfully overbalanced toward short-term thinking.
              This is reflected in everything from our financial position to our
              energy policy. How can we shift to a model that values long-term
              planning in ways more similar to our Chinese friends?
            </p>
          </div>

          <Divider />

          {/* ===== SECTION 4: ISSUES WITH THE LEGISLATURE ===== */}
          <div id="woe-legislature" className="scroll-mt-24 mb-12">
            <h2 className="font-serif text-2xl lg:text-3xl font-light mt-8 mb-6">
              Issues with the Legislature
            </h2>

            <p className="text-gray leading-relaxed mb-4">
              Our democratic system features a separation of powers on the
              national level, split between executive (the President), legislative
              (Senate and House of Representatives) and judicial (Supreme Court)
              branches.
            </p>

            <p className="text-gray leading-relaxed mb-4">
              A nation ultimately needs one empowered decision maker. While
              theoretically it could be a group of people instead of an
              individual, historically this &ldquo;decision by committee&rdquo;
              model has not worked well. The separation of powers is designed to
              allow the executive branch some appropriate degree of autonomous
              control. Each citizen votes individually on the President. The
              outcome of the vote is intended to represent the majority&apos;s
              choice.
            </p>

            <p className="text-gray leading-relaxed mb-4">
              Appointees to the Supreme Court are nominated by the President,
              confirmed by the Senate, and serve for life. The idea of a Supreme
              Court and life appointment are sensible. The existence and role of
              the Supreme Court&mdash;determining the rule of law at the highest
              judicial level&mdash;is an important foundational one. They can
              stay.
            </p>

            <p className="text-gray leading-relaxed mb-4">
              Which brings us to the problem of this particular solution: the
              legislative branch. Each state is represented by two Senators and a
              variable number of State Representatives, ranging from 53
              (California) to just one (six states). This configuration goes back
              to the original U.S. Constitution, some 227 years ago.
            </p>

            <Image
              src={legacyImage('states-chart.jpg')}
              alt="Chart showing states with wildly divergent representation: 1 representative each for several small states, yet 53 for California"
              width={800}
              height={400}
              className="w-full h-auto my-6"
            />

            <div className="bg-gray-lightest p-4 my-6 border-l-4 border-primary">
              <p className="text-gray italic text-sm">
                With legislators like Eliot Spitzer, John Edwards, and Charles
                Keating, who needs enemies?
              </p>
            </div>

            <h3 className="font-serif text-xl font-light mt-8 mb-4">
              Legislative Problems
            </h3>

            <h4 className="font-serif text-lg font-light mb-3">
              1. Lack of Qualifications
            </h4>
            <p className="text-gray leading-relaxed mb-4">
              Senators and Representatives are not necessarily qualified to
              participate in making laws. Their only qualification is having been
              picked by constituencies made up of people who, for the most part,
              know them only from advertising and marketing and what their local
              paper chooses to write. So, the lawmakers may have questionable
              qualifications and the people who choose them are largely ignorant
              as to their efficacy for the position.
            </p>

            <Image
              src={legacyImage('legislature.jpg')}
              alt="113th Congress composition chart: Lawyers 32.5%, Businesspeople 24.4%, Career Politicians 12%, Educators 9.6%, Medical Professionals 6%, and others"
              width={800}
              height={500}
              className="w-full h-auto my-6"
            />

            <h4 className="font-serif text-lg font-light mb-3">
              2. Re-election Incentives
            </h4>
            <p className="text-gray leading-relaxed mb-4">
              Legislators are incentivized to focus their lawmaking efforts on
              decisions that will feed into their re-election. That means they
              may be rewarded to ignore questions of the whole for pandering to
              their few. While the few may need an advocate in the arena of the
              many, legislators must remain mindful of the bigger picture.
            </p>

            <h4 className="font-serif text-lg font-light mb-3">
              3. Distance from Citizens
            </h4>
            <p className="text-gray leading-relaxed mb-4">
              Legislators can put a great deal of space between the individual
              citizen and themselves. Remember the concentric circles I talked
              about? The random citizen is of very little practical concern to
              the legislator. They may genuinely intend to advocate for all of
              their people but it is only human nature that we privilege those to
              whom we have more connection. In the case of legislators, that can
              often be special interests and big companies as opposed to
              individual citizens.
            </p>

            <Image
              src={legacyImage('capitol.jpg')}
              alt="US Capitol Building"
              width={800}
              height={400}
              className="w-full h-auto my-6"
            />

            <div className="bg-gray-lightest p-4 my-6">
              <p className="text-gray text-sm leading-relaxed">
                National politicians routinely &ldquo;carpetbag&rdquo;: owning a
                residence in a district or state in which they do not reside in
                order to run for Congress or, particularly, the Senate. Prominent
                examples include Robert F. Kennedy (New York Senate, 1964); Rick
                Santorum (Pennsylvania 18th Congressional District, 1990);
                Hillary Rodham Clinton (New York Senate, 2000).
              </p>
            </div>

            <p className="text-gray leading-relaxed mb-4">
              Over $3.3 billion dollars are spent on lobbying to influence policy
              in the United States each year (Source: Center for Responsive
              Politics). And less than 10% of bills introduced in the 112th U.S.
              Congress&mdash;561 of 6,845&mdash;actually passed into law (Source:
              Brookings).
            </p>

            <p className="text-gray leading-relaxed mb-4">
              Since 1964 the House of Representatives has boasted a re-election
              rate of over 90%. While serving as Senators and Representatives,
              our legislators spend substantial time and effort attempting to get
              re-elected in lieu of performing their duties.
            </p>

            <p className="text-gray leading-relaxed mb-4">
              There&apos;s a lot that is broken about this system, and that is
              only an overview that doesn&apos;t get into its more limited but
              far darker underbelly of scandals and graft.
            </p>
          </div>

          <Divider />

          {/* ===== SECTION 5: THE DIGITAL SOLUTION ===== */}
          <div id="digital-solution" className="scroll-mt-24 mb-12">
            <h2 className="font-serif text-2xl lg:text-3xl font-light mt-8 mb-6">
              The Digital Solution
            </h2>

            <Image
              src={legacyImage('phones.jpg')}
              alt="Different smartphones fanned out"
              width={800}
              height={400}
              className="w-full h-auto my-6"
            />
            <p className="text-sm text-gray mb-6 italic">
              As of January 2014, 58% of U.S. adults already own a smartphone.
            </p>

            <p className="text-gray leading-relaxed mb-4">
              It all starts with the smartphone. This miraculous device gives us
              the power of a computer in our hand, pocket or purse at all times.
              It enables any citizen to receive information in and communicate
              out, both in real-time while running software applications far more
              powerful than those being run on desktop computers just a decade
              ago. The easy availability to such powerful, real-time technology
              empowers us to radically re-think each individual&apos;s role in
              our collective governance.
            </p>

            <p className="text-gray leading-relaxed mb-4">
              No longer is there a limitation of space and time to prevent our
              getting high-resolution information on our government and
              legislators. There is no barrier to our placing a secure, verified
              vote on a candidate or law from the comfort of our home. The
              majority of Americans now hold in our hand the power to do
              everything that our legislators do when they vote on a bill: read
              the text. Consider outside information. Engage in debate or
              conversation. Place the vote. It&apos;s no different from a use
              case perspective than how we use Facebook. The difference is,
              rather than our time being spent on pleasant conveniences we are
              able to influence our nation as the self-representational
              government that democracy purports to be.
            </p>

            <p className="text-gray leading-relaxed mb-4">
              We&apos;re not accustomed to thinking about having visibility into
              and knowledge of the inner workings of our nation, state, and
              locality, much less direct impact on decisions. But we can. And we
              should.
            </p>

            <Image
              src={legacyImage('flow-icons.jpg')}
              alt="Flowchart showing how legislation could be voted on by being proposed by governments, then passed to citizens for voting through handheld devices"
              width={800}
              height={400}
              className="w-full h-auto my-6"
            />

            <h3 className="font-serif text-xl font-light mt-8 mb-4">
              Proposal 1: Expert Legislature
            </h3>
            <p className="text-gray leading-relaxed mb-4">
              The current senators and representatives would all be removed and
              replaced with exceptional individuals chosen for their potential to
              contribute to an enlightened government. Economists, physicists,
              biologists. Experts in well-being, personality, healthy
              communities. Labor leaders. Structural engineers. Agriculturists.
              Basically, if you look at every Presidential cabinet role, and all
              of the different aspects of life that bills under current
              consideration touch, experts that pertain to all of those things
              would be represented.
            </p>
            <p className="text-gray leading-relaxed mb-4">
              So instead of the key qualification for participating being to
              influence voters and pacify lobbyists, our legislative branch would
              be filled with the brightest minds, the most insightful souls, and
              our leading experts. While the initial group would need some kind
              of blanket appointment &mdash; nominated by the president,
              confirmed by popular vote? &mdash; eventually they would stay or go
              based on their statistics: are they contributing to successful
              legislation?
            </p>

            <h3 className="font-serif text-xl font-light mt-8 mb-4">
              Proposal 2: Professional Political Analysts
            </h3>
            <p className="text-gray leading-relaxed mb-4">
              Independent of the government itself, a new profession of
              &ldquo;analysts&rdquo; would be required. Many of these would
              likely come from the current ranks of political commentators but
              would surely attract a new breed of personalities as well. Their
              role would be to represent a very specific position&mdash;it could
              be as narrow as &ldquo;Protect the second amendment at all
              costs&rdquo; or as broad as &ldquo;Advocate for individual
              liberties.&rdquo; They would review every bill, comment on it, and
              make a recommendation to vote for or against. Voters would
              &ldquo;subscribe&rdquo; to them.
            </p>

            <h3 className="font-serif text-xl font-light mt-8 mb-4">
              Proposal 3: Direct Citizen Voting
            </h3>
            <p className="text-gray leading-relaxed mb-4">
              Voting currently done by legislators would instead be conducted
              directly by citizens. People could choose to use their existing
              smartphone, or be issued a very basic device for just the purpose
              of democratic participation. Each day, or week, or whatever the
              correct frequency is, citizens would receive a digital packet to
              review. Each bill would include a summary and the recommendation of
              all the analysts they subscribe to. Drilling in would let them see
              the entire bill with annotations from their analysts, or longer
              analysis about the bill. Citizens would have, at their fingertips,
              everything required to vote on their own behalf.
            </p>

            <p className="text-gray leading-relaxed mb-4 font-semibold">
              This is true democracy. The abstractions in the current process
              that leave us with a stable of professional politicians sporting a
              wide variety of qualifications is a relic of the analog world.
              Well, thanks to digital technology, that system is redundant.
            </p>

            <Image
              src={legacyImage('leaders.jpg')}
              alt="Photographs of Stephen Hawking, Carl Sagan, Clara Barton, and Henry Ford"
              width={800}
              height={400}
              className="w-full h-auto my-6"
            />
            <p className="text-sm text-gray mb-6 italic">
              Would our legislature have benefited from Stephen Hawking
              participating? Carl Sagan? Clara Barton? Henry Ford? We should
              empower leaders who actually lead.
            </p>

            {/* Handheld Voting System */}
            <h3 className="font-serif text-xl font-light mt-8 mb-4">
              Handheld Voting System
            </h3>
            <p className="text-gray leading-relaxed mb-4">
              While a direct voting system is easily illustrated via the various
              screens that follow, the totality of the infrastructure would be
              immense. Such a system would likely fall under the auspices of the
              United States Department of Justice.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8">
              <div>
                <Image
                  src={legacyImage('voting/screenshots/p1.1.jpg')}
                  alt="Voting system: Bill introduction screen"
                  width={400}
                  height={700}
                  className="w-full h-auto"
                />
              </div>
              <div>
                <Image
                  src={legacyImage('voting/screenshots/p1.2.jpg')}
                  alt="Voting system: Bill introduction detail"
                  width={400}
                  height={700}
                  className="w-full h-auto"
                />
              </div>
            </div>
            <p className="text-gray leading-relaxed mb-4">
              <strong>1. Bill Introduction:</strong> Citizens would periodically
              receive a bill to consider. Along with an overview of the bill, the
              first screen would display a graph showing the opinions of a
              personalized group of analysts, while &ldquo;automagically&rdquo;
              mapping each voter&apos;s personal preferences to the content.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8">
              <div>
                <Image
                  src={legacyImage('voting/screenshots/p2.1.jpg')}
                  alt="Voting system: Bill overview screen"
                  width={400}
                  height={700}
                  className="w-full h-auto"
                />
              </div>
              <div>
                <Image
                  src={legacyImage('voting/screenshots/p2.2.jpg')}
                  alt="Voting system: Bill overview detail"
                  width={400}
                  height={700}
                  className="w-full h-auto"
                />
              </div>
            </div>
            <p className="text-gray leading-relaxed mb-4">
              <strong>2. Bill Overview:</strong> Protecting the integrity of the
              vote is a first-order priority, requiring the latest in identity
              recognition software. This technology could also help customize the
              delivery and structure of information depending on its
              interpretation of a voter&apos;s mood, attention, or other factors.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8">
              <div>
                <Image
                  src={legacyImage('voting/screenshots/p3.1.jpg')}
                  alt="Voting system: Simplified overview"
                  width={400}
                  height={700}
                  className="w-full h-auto"
                />
              </div>
              <div>
                <Image
                  src={legacyImage('voting/screenshots/p3.2.jpg')}
                  alt="Voting system: Simplified overview detail"
                  width={400}
                  height={700}
                  className="w-full h-auto"
                />
              </div>
            </div>
            <p className="text-gray leading-relaxed mb-4">
              <strong>3. Simplified Overview:</strong> To further encourage
              voters&apos; critical thinking, the system would provide an
              interactive table of contents along with key statistics and graphs
              to aid understanding of essential aspects of the legislation.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8">
              <div>
                <Image
                  src={legacyImage('voting/screenshots/p4.1.jpg')}
                  alt="Voting system: Analyst response"
                  width={400}
                  height={700}
                  className="w-full h-auto"
                />
              </div>
              <div>
                <Image
                  src={legacyImage('voting/screenshots/p4.2.jpg')}
                  alt="Voting system: Analyst response detail"
                  width={400}
                  height={700}
                  className="w-full h-auto"
                />
              </div>
            </div>
            <p className="text-gray leading-relaxed mb-4">
              <strong>4. Analyst&apos;s Response:</strong> While most citizens
              might be unable to read the entirety of bills, support would come
              from a new breed of political analysts. These individuals and
              organizations would read, interpret, and make recommendations on
              legislation based on their specific platforms and interests.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8">
              <div>
                <Image
                  src={legacyImage('voting/p5.ui.jpg')}
                  alt="Voting system: Vote screen"
                  width={400}
                  height={700}
                  className="w-full h-auto"
                />
              </div>
              <div>
                <Image
                  src={legacyImage('voting/p5.phone.jpg')}
                  alt="Voting system: Vote on phone"
                  width={400}
                  height={700}
                  className="w-full h-auto"
                />
              </div>
            </div>
            <p className="text-gray leading-relaxed mb-4">
              <strong>5. Vote on the Bill:</strong> Voting time! The citizens
              would input their votes and let their voices be heard. The
              democratic process, as close to the ideal intention of this system,
              could be possible in a large, modern nation-state.
            </p>

            {/* Conclusion */}
            <h3 className="font-serif text-xl font-light mt-8 mb-4">
              Conclusion
            </h3>
            <p className="text-gray leading-relaxed mb-4">
              Like many radical ideas, it may be seductive to focus on some
              vulnerability in it and try to pull it apart. Go ahead. This
              probably isn&apos;t the exact right idea. But it&apos;s a start
              down the right path. The digital world is nothing like the world
              that came before it, and we deserve it to ourselves and the future
              to rethink everything. Regardless of any issues with this system, I
              challenge you to make the case that, in their respective totalities,
              the current system is better than what&apos;s proposed here. It
              isn&apos;t.
            </p>
          </div>

          <Divider />

          {/* Author & Contributors */}
          <div className="mt-12">
            <h2 className="font-serif text-2xl font-light mb-6">
              Author &amp; Contributors
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start mb-8">
              <div>
                <Image
                  src="https://www.goinvo.com/old/images/people/dirk/dk_nofilter.jpg"
                  alt="Dirk Knemeyer"
                  width={400}
                  height={300}
                  className="w-full h-auto object-cover"
                />
              </div>
              <div>
                <p className="font-semibold text-lg">Dirk Knemeyer</p>
                <p className="text-gray text-sm leading-relaxed mt-2">
                  Dirk Knemeyer is a social futurist and a founder of GoInvo. He
                  has provided consulting, design, and technology to some of the
                  best companies in the world including Apple, Microsoft, Oracle,
                  PayPal, and Shutterfly. Dirk&apos;s writings have been
                  published in places like Business Week and Core77. He has
                  keynoted conferences in Europe and the U.S. and spoken at
                  venues like TEDx, Humanity+, and South by Southwest. Dirk has
                  participated on 15 boards in industries including healthcare,
                  publishing, and education. He holds a Master of Arts in Popular
                  Culture from Bowling Green State University and a Bachelor of
                  Arts in English from The University of Toledo.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-sm">
              <div>
                <Image
                  src={legacyImage('contrib/emily.jpg')}
                  alt="Emily Twaddell"
                  width={200}
                  height={200}
                  className="w-full h-auto mb-2"
                />
                <p className="font-semibold">Emily Twaddell</p>
                <p className="text-gray">Editor</p>
              </div>
              <div>
                <Image
                  src={legacyImage('contrib/basecraft.jpg')}
                  alt="Basecraft"
                  width={200}
                  height={200}
                  className="w-full h-auto mb-2"
                />
                <p className="font-semibold">Basecraft</p>
                <p className="text-gray">Design</p>
              </div>
              <div>
                <Image
                  src={legacyImage('contrib/juhan.jpg')}
                  alt="Juhan Sonin"
                  width={200}
                  height={200}
                  className="w-full h-auto mb-2"
                />
                <p className="font-semibold">Juhan Sonin</p>
                <p className="text-gray">Voting System UIs</p>
              </div>
              <div>
                <Image
                  src={legacyImage('contrib/noel.jpg')}
                  alt="Noel Forte"
                  width={200}
                  height={200}
                  className="w-full h-auto mb-2"
                />
                <p className="font-semibold">Noel Fort&eacute;</p>
                <p className="text-gray">Online Design</p>
              </div>
              <div>
                <Image
                  src={legacyImage('contrib/brian.jpg')}
                  alt="Brian Liston"
                  width={200}
                  height={200}
                  className="w-full h-auto mb-2"
                />
                <p className="font-semibold">Brian Liston</p>
                <p className="text-gray">Print &amp; .epub Design</p>
              </div>
              <div>
                <Image
                  src={legacyImage('contrib/hermes.png')}
                  alt="Michael Hermes"
                  width={200}
                  height={200}
                  className="w-full h-auto mb-2"
                />
                <p className="font-semibold">Michael Hermes</p>
                <p className="text-gray">Audio Engineer</p>
              </div>
            </div>
          </div>
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
