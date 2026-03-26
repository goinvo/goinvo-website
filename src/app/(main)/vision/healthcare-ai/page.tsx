import type { Metadata } from 'next'
import Image from 'next/image'
import { cloudfrontImage } from '@/lib/utils'
import { Divider } from '@/components/ui/Divider'
import { Author } from '@/components/ui/Author'
import { Video } from '@/components/ui/Video'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'

export const metadata: Metadata = {
  title: 'The AI Healthcare Future We Need',
  description:
    'Exploring the AI Healthcare future – opportunities and unexpected outcomes.',
}

export default function HealthcareAIPage() {
  return (
    <div>
      <SetCaseStudyHero image={cloudfrontImage('/images/features/healthcare-ai/healthcare-ai-hero-4.jpg')} />

      {/* Content */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h1 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light">The AI Healthcare Future We Need</h1>
          <p className="leading-relaxed mb-4">
            <strong>Melanoma AI Healthcare Assistant</strong>
          </p>
        </div>

        {/* Video Features */}
        <div className="w-full lg:w-3/4 mx-auto my-8">
          <Video
            sources={[
              { src: cloudfrontImage('/videos/features/healthcare-ai/melanoma_mobile_assistant_goinvo_aug2024.mp4'), format: 'mp4' },
              { src: cloudfrontImage('/videos/features/healthcare-ai/melanoma_mobile_assistant_goinvo_aug2024.webm'), format: 'webm' },
            ]}
            poster={cloudfrontImage('/images/features/healthcare-ai/melanoma_mobile_assistant_goinvo_aug2024.jpg')}
            autoPlay={false}
            controls
          />
        </div>

        <div className="max-width max-width-md content-padding mx-auto">
          <p className="leading-relaxed mb-4">
            <strong>Ankle Pain AI Healthcare Assistant</strong>
          </p>
        </div>

        <div className="w-full lg:w-3/4 mx-auto my-8">
          <Video
            sources={[
              { src: cloudfrontImage('/videos/features/healthcare-ai/pearl-health-ankle-pain-2023-08-29.mp4'), format: 'mp4' },
              { src: cloudfrontImage('/videos/features/healthcare-ai/pearl-health-ankle-pain-2023-08-29.webm'), format: 'webm' },
            ]}
            poster={cloudfrontImage('/images/features/healthcare-ai/pearl-health-ankle-pain-2023-08-29.jpg')}
            autoPlay={false}
            controls
          />
        </div>

        <div className="max-width max-width-md content-padding mx-auto">
          {/* AI History Introduction */}
          <p className="leading-relaxed mb-4">
            Artificial intelligence (AI) has undergone tremendous advancements
            since its conception in the 1950s:
          </p>
          <p className="leading-relaxed mb-4">
            <strong>AI Image Generation</strong>: One of the most notable
            developments in recent years is the accessibility and widespread
            engagement of AI trained on images. This includes tools like
            pix2pix from 2014 and more recent advancements like DALL&middot;E,
            released in January 2021, as well as MidJourney and Stable
            Diffusion, both released in the summer of 2022. These tools have
            since fueled the mainstream adoption of app features like
            Lensa&apos;s &quot;Magic Avatar&quot; that generate fine-art-like portraits,
            avatars, and more.
          </p>
          <p className="leading-relaxed mb-4">
            <strong>AI Text Generation</strong>: In addition to image
            generation, conversational AI has also gained mainstream
            attention. Originally developed decades ago, recurrent neural
            networks (RNNs) have been used for text generation. While RNNs
            can be trained on data sets like{' '}
            <a
              href="https://www.tensorflow.org/text/tutorials/text_generation"
              className="text-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              Shakespeare&apos;s writing
            </a>{' '}
            and generate text to match, ChatGPT can answer nearly any
            question imaginable in nearly any style. Released for free in
            November 2022, ChatGPT gained more than{' '}
            <a
              href="https://www.demandsage.com/chatgpt-statistics/"
              className="text-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              one million users
            </a>{' '}
            within its first week. It has reached a mainstream audience in a
            way that feels distinct, as people of all ages and backgrounds
            continue to find different applications for the tool. Students
            are using it to write school papers, and doctors are checking
            ChatGPT&apos;s answers as they respond to patient questions; others
            are exploring ChatGPT&apos;s ability to generate workout plans,
            rewrite emails to be more persuasive, craft poems, and more. In
            fact, ChatGPT was given a set of bullet points and produced the
            first draft of this article introduction!
          </p>
          <p className="leading-relaxed mb-4">
            With all of these new advancements, AI capabilities straight out
            of sci-fi movies like Fantastic Planet, Moon, and Her seem
            closer than ever.
          </p>
          <p className="leading-relaxed mb-4">
            How will this impact health?
            <br />
            How <em>should</em> it impact health?
          </p>
          <p className="leading-relaxed mb-4">
            Here are our studio&apos;s thoughts on the matter.
          </p>

          <Divider />

          {/* Expectations for the Future */}
          <h2 className="font-serif text-2xl mt-8 mb-4">
            Expectations for the Future
          </h2>
          <p className="leading-relaxed mb-4">
            The following are gaps we&apos;ve identified in existing technology
            that we would expect from an ideal patient tool:
          </p>
          <ul className="list-disc list-outside pl-6 space-y-3 mb-8 leading-relaxed">
            <li>
              <strong>Context awareness</strong>
              <ul className="list-disc list-outside pl-6 mt-2 space-y-1">
                <li>
                  It should provide insight grounded in the historical context
                  of my health and behavior.
                </li>
                <li>
                  With my consent, it could gather this data from my health
                  record, native health apps (Apple Health, Google Fit), and
                  phone data (GPS, screen time) as well as plug into
                  wearables, mood tracking, fitness, pain tracking, and other
                  health apps.
                </li>
              </ul>
            </li>
            <li>
              <strong>Personalized engagement</strong>
              <ul className="list-disc list-outside pl-6 mt-2 space-y-1">
                <li>
                  The mode of communication could be personalized by switching
                  to my preferred language, using speech instead of text,
                  playing animated videos, etc. If using speech, some prefer
                  faster answers that aren&apos;t in full sentences vs.
                  conversational phrasing.
                </li>
                <li>
                  Some people will want more nudges and interaction than
                  others.
                </li>
              </ul>
            </li>
            <li>
              <strong>Proactive approach</strong>
              <ul className="list-disc list-outside pl-6 mt-2 space-y-1">
                <li>
                  I won&apos;t always remember to ask health questions or think
                  about my health. Most people don&apos;t take the time to focus on
                  their health. I need an assistant that checks in at the
                  right times to help me engage with my health and better
                  understand my body.
                </li>
              </ul>
            </li>
            <li>
              <strong>Queries for better answers</strong>
              <ul className="list-disc list-outside pl-6 mt-2 space-y-1">
                <li>
                  If it needs more information to give a personalized answer,
                  it should prompt me with appropriate follow-up questions.
                </li>
              </ul>
            </li>
            <li>
              <strong>Multimodal communication</strong>
              <ul className="list-disc list-outside pl-6 mt-2 space-y-1">
                <li>
                  It should enrich communication through visualization and
                  sonification and accommodate different learning styles.
                </li>
                <li>
                  For example: &quot;Show me a cartoon representation of how
                  lactose intolerance works.&quot;
                </li>
              </ul>
            </li>
            <li>
              <strong>Emphasis on evidence</strong>
              <ul className="list-disc list-outside pl-6 mt-2 space-y-1">
                <li>
                  It should provide ways for me to fact-check or dig deeper.
                </li>
                <li>
                  It should link reputable sources that support its answers.
                </li>
              </ul>
            </li>
            <li>
              <strong>Transparency and user data ownership</strong>
              <ul className="list-disc list-outside pl-6 mt-2 space-y-1">
                <li>Data ownership and privacy policies should be clear.</li>
                <li>
                  People should own or co-own their data; they should also
                  have control over how their data is used and who can access
                  it.
                </li>
              </ul>
            </li>
            <li>
              <strong>Accessible Design</strong>
              <ul className="list-disc list-outside pl-6 mt-2 space-y-1">
                <li>
                  Initial communication should be concise and easy to read at
                  a fifth grade reading level, following up with more thorough
                  explanations when asked.
                </li>
                <li>
                  We&apos;d love to see how this could be designed specifically for
                  individuals with low vision, mobility and dexterity
                  impairments, and other conditions that might make
                  interaction with this kind of tool challenging.
                </li>
              </ul>
            </li>
          </ul>

          <Divider />

          {/* Patient Tool Concepts */}
          <h2 className="font-serif text-2xl mt-8 mb-4">
            Patient Tool Concepts
          </h2>

          {/* AdHoc Health Guide */}
          <p className="leading-relaxed mb-4">
            <strong>AdHoc Health Guide</strong>
          </p>
          <Image
            src={cloudfrontImage(
              '/images/features/healthcare-ai/storyboard-patient-mole.jpg'
            )}
            alt="Patient mole assessment storyboard"
            width={1200}
            height={800}
            className="w-full h-auto mb-8"
          />

          {/* Mental Health Support */}
          <p className="leading-relaxed mb-2 mt-8">
            <strong>Mental Health Support</strong>
            <br />
            <em>Storyboard with images generated by MidJourney</em>
          </p>

          {/* Storyboard Panels 1 & 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div>
              <Image
                src={cloudfrontImage(
                  '/images/features/healthcare-ai/storyboard-1a.jpg'
                )}
                alt="Storyboard scene 1 - Jay gets home from school"
                width={600}
                height={400}
                className="w-full h-auto"
              />
              <p className="leading-relaxed mt-2">
                Jay gets home from school. AiHealth believes they may be
                feeling depressed based on their health data:
              </p>
              <ul className="list-disc list-outside pl-6 space-y-1 leading-relaxed">
                <li>Their heart rate variability is low</li>
                <li>They&apos;ve been on their phone more than often</li>
                <li>Step count is low</li>
              </ul>
            </div>
            <div>
              <Image
                src={cloudfrontImage(
                  '/images/features/healthcare-ai/storyboard-2.jpg'
                )}
                alt="Storyboard scene 2 - AiHealth sends a photo"
                width={600}
                height={400}
                className="w-full h-auto"
              />
              <p className="leading-relaxed mt-2">
                AiHealth sends Jay a photo they took with their family on a
                hike 3 months ago. Reminding Jay of happy memories often
                cheers them up.
              </p>
              <p className="leading-relaxed">
                However, Jay doesn&apos;t respond to the images. They end up
                skipping dinner and staying in bed until the next morning.
              </p>
            </div>
          </div>

          {/* Storyboard Panels 3 & 4 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div>
              <Image
                src={cloudfrontImage(
                  '/images/features/healthcare-ai/storyboard-3a.jpg'
                )}
                alt="Storyboard scene 3 - AiHealth sends a text"
                width={600}
                height={400}
                className="w-full h-auto"
              />
              <p className="leading-relaxed mt-2">
                AiHealth sends a text message: &quot;Hey are you ok? I&apos;m here for
                you if you want to chat.&quot;
              </p>
              <p className="leading-relaxed">
                Jay is hungry, tired, and stressed. They reply, &quot;no... idk.&quot;
              </p>
              <p className="leading-relaxed">
                AiHealth: &quot;I can see the stress coming through in your
                health data. That must be difficult.&quot;
              </p>
            </div>
            <div>
              <Image
                src={cloudfrontImage(
                  '/images/features/healthcare-ai/storyboard-4a.jpg'
                )}
                alt="Storyboard scene 4 - AiHealth suggests an activity"
                width={600}
                height={400}
                className="w-full h-auto"
              />
              <p className="leading-relaxed mt-2">
                AiHealth: &quot;Why don&apos;t we do something to make your body feel
                a little better?&quot;
              </p>
              <p className="leading-relaxed">Jay: &quot;ok&quot;</p>
              <p className="leading-relaxed">
                AiHealth knows Jay likes images and animations, so it
                creates a little sparkling glass of water with a written
                reminder: &quot;Drink some water and have a snack! Your body will
                feel a little better right away.&quot;
              </p>
            </div>
          </div>

          {/* Storyboard Panels 5 & 6 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div>
              <Image
                src={cloudfrontImage(
                  '/images/features/healthcare-ai/storyboard-5a.jpg'
                )}
                alt="Storyboard scene 5 - Jay feels a little better"
                width={600}
                height={400}
                className="w-full h-auto"
              />
              <p className="leading-relaxed mt-2">
                AiHealth: &quot;How do you feel now?&quot;
              </p>
              <p className="leading-relaxed">
                Jay: &quot;A little better maybe... it&apos;s good to get up&quot;
              </p>
              <p className="leading-relaxed">
                AiHealth: &quot;Well if that helped, here are some other things
                we can do to help your body feel better...&quot;
              </p>
              <p className="leading-relaxed">
                AiHealth walks Jay through washing their face, brushing
                their teeth, putting on a fresh change of clothes, and
                finally going outside to get some fresh air.
              </p>
            </div>
            <div>
              <Image
                src={cloudfrontImage(
                  '/images/features/healthcare-ai/storyboard-6c.jpg'
                )}
                alt="Storyboard scene 6 - Jay opens up to AiHealth"
                width={600}
                height={400}
                className="w-full h-auto"
              />
              <p className="leading-relaxed mt-2">
                Jay starts texting AiHealth about what&apos;s been bothering
                them: tension between friends groups at school, a big
                misunderstanding, and just feeling really down for a while.
              </p>
              <p className="leading-relaxed">
                AiHealth listens, asks good questions, and makes space for
                this.
              </p>
            </div>
          </div>

          {/* ChatGPT Screenshot */}
          <Image
            src={cloudfrontImage(
              '/images/features/healthcare-ai/chatgpt-output.jpg'
            )}
            alt="ChatGPT health output example"
            width={1200}
            height={800}
            className="w-full h-auto"
          />
          <p className="leading-relaxed mt-2 mb-4">
            <em>This image is a screenshot from ChatGPT</em>
          </p>
          <p className="leading-relaxed mb-8">
            At the end AiHealth asks if they&apos;d like any help or suggestions
            to feel better.
          </p>

          <Divider />

          {/* What purposes could an AI patient tool serve? */}
          <h2 className="font-serif text-2xl mt-8 mb-4">
            What purposes could an AI patient tool serve?
          </h2>
          <p className="leading-relaxed mb-4">Here&apos;s how we imagine it:</p>
          <ul className="list-disc list-outside pl-6 space-y-3 mb-8 leading-relaxed">
            <li>
              <strong>Interoperability</strong>
              <ul className="list-disc list-outside pl-6 mt-2 space-y-1">
                <li>Gathers and merges all longitudinal patient data</li>
                <li>Helps identify gaps and missing data</li>
              </ul>
            </li>
            <li>
              <strong>Context and location-based support and resources</strong>
              <ul className="list-disc list-outside pl-6 mt-2 space-y-1">
                <li>
                  Refers to information regarding health conditions, housing
                  security, employment status, etc.
                </li>
                <li>Provides basic resources, local support in your town</li>
              </ul>
            </li>
            <li>
              <strong>Symptom check / diagnostic help</strong>
              <ul className="list-disc list-outside pl-6 mt-2 space-y-1">
                <li>
                  Patient takes a photo and/or provides information about
                  symptoms and AI provides top-N answers
                </li>
                <li>Should be trained on medical diagnostic databases</li>
                <li>
                  Can feature a more conversational tone than current options
                  like Ada Health and Babylon chat bots
                </li>
              </ul>
            </li>
            <li>
              <strong>
                Live support at appointments, both in-person and virtual
              </strong>
              <ul className="list-disc list-outside pl-6 mt-2 space-y-1">
                <li>
                  Guides the patient in reflecting on how they&apos;ve been and
                  visualizing their health since their last visit
                </li>
                <li>
                  Provides the patient with a list of possible questions to
                  ask their doctor
                </li>
                <li>
                  Helps identify missing information needed for optimal care
                </li>
                <li>
                  Helps the patient keep track of to-do lists and care plans
                </li>
              </ul>
            </li>
            <li>
              <strong>Just-in-time support</strong>
              <ul className="list-disc list-outside pl-6 mt-2 space-y-1">
                <li>
                  Provides real-time feedback on exercising more effectively
                </li>
                <li>
                  Notices health condition risks in real time, like sleep
                  apnea, anxiety, etc.
                </li>
                <li>Reaches out if it identifies that I&apos;m in crisis</li>
                <li>Helps during emergencies, like suggesting who to call</li>
              </ul>
            </li>
            <li>
              <strong>
                Health check-ins that increase patient engagement in their
                own health
              </strong>
              <ul className="list-disc list-outside pl-6 mt-2 space-y-1">
                <li>
                  Asks how the person is doing, prompts them to describe
                  concerns, provides best practice suggestions, helps them
                  decide what habits or actions to try, follows up for
                  accountability and reflection
                </li>
                <li>
                  Generates article summaries and visual patient information
                  for different conditions, increasing accessibility of
                  anything from basic human biology to recent neuroscience
                  research
                </li>
              </ul>
            </li>
            <li>
              <strong>Personal health scans</strong>
              <ul className="list-disc list-outside pl-6 mt-2 space-y-1">
                <li>
                  Continually or periodically reviews the patient&apos;s data and
                  care they&apos;ve received, notes positive health trends and
                  improvements, spotlights areas that need attention, helps
                  the patient identify what to prioritize
                </li>
                <li>
                  Examples: When do I need to schedule my next physical, eye
                  exam, dentist appointment, flu shot, cancer screening, etc?
                </li>
              </ul>
            </li>
          </ul>

          <div className="space-y-8 mt-8 mb-8">
            <Image
              src={cloudfrontImage(
                '/images/features/healthcare-ai/sketch-ai-bench.jpg'
              )}
              alt="AI sketch - bench"
              width={1200}
              height={800}
              className="w-full h-auto"
            />
            <Image
              src={cloudfrontImage(
                '/images/features/healthcare-ai/sketch-ai-bedroom.jpg'
              )}
              alt="AI sketch - bedroom"
              width={1200}
              height={800}
              className="w-full h-auto"
            />
            <Image
              src={cloudfrontImage(
                '/images/features/healthcare-ai/sketch-ai-encounter.jpg'
              )}
              alt="AI sketch - encounter"
              width={1200}
              height={800}
              className="w-full h-auto"
            />
            <Image
              src={cloudfrontImage(
                '/images/features/healthcare-ai/sketch-ai-train.jpg'
              )}
              alt="AI sketch - train"
              width={1200}
              height={800}
              className="w-full h-auto"
            />
          </div>

          <Divider />

          {/* Ripple Effects and Unintended Outcomes */}
          <h2 className="font-serif text-2xl mt-8 mb-4">
            Ripple Effects and Unintended Outcomes
          </h2>
          <p className="leading-relaxed mb-4">
            Here are the big conversations we think need to happen:
          </p>
          <ul className="list-disc list-outside pl-6 space-y-3 mb-8 leading-relaxed">
            <li>
              <strong>Misinformation at scale</strong>: Stack Overflow
              banned ChatGPT answers as it got swamped with quality control
              at scale. ChatGPT makes it incredibly easy to post an answer,
              but the non-zero error rate is a real problem for quality
              control. There&apos;s no easy way to check ChatGPT&apos;s answers
              without doing the research manually. This could become a
              serious problem if everyone uses a similar tool for health
              answers.
            </li>
            <li>
              <strong>Harmful information</strong>: &quot;Molotov Cocktail
              questions&quot; can still be achieved by phrasing as a{' '}
              <a
                href="https://twitter.com/zswitten/status/1598197802676682752"
                className="text-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                print function question
              </a>
              . Presumably similar information about how to effectively
              commit suicide, for example, could be easily obtained.
            </li>
            <li>
              <strong>Perpetuating harmful biases, conventions, etc</strong>
              : The AI will provide answers based on the material it is
              trained on. If the material is biased or non-inclusive, the
              AI&apos;s answers will reflect that. For example, when asked to
              portray a telehealth call, MidJourney generated four all-white
              doctors, three of whom were male.
            </li>
            <li>
              <strong>Impact on human workers</strong>: In the long run, AI
              could replace writers, artists, musicians, and many
              white-collar jobs. Ideally, AI could augment these people&apos;s
              work by generating a starting point that humans can perfect or
              brainstorming initial concepts. However, this new technology
              may ultimately fill jobs and put humans out of work.
            </li>
            <li>
              <strong>Property and ownership issues</strong>: Many have
              raised the issue that image generation AI is trained on art
              that it does not own. Some artists have seen their personal
              style and even their signature show up in Stable Diffusion (
              <a
                href="https://www.cbc.ca/radio/asithappens/artificial-intelligence-ai-art-ethics-greg-rutkowski-1.6679466"
                className="text-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                article
              </a>
              ).
            </li>
            <li>
              <strong>
                Our relationship with technology and each other
              </strong>
              : Human immersion into technology has not always had a
              positive impact on health (e.g., social media&apos;s impact on
              mental health). How can we make sure we&apos;re not running blindly
              into more negative effects in the name of &quot;progress?&quot; How will
              an increase of artificial intelligence impact human
              intelligence? It may allow humans to learn and accomplish new
              things, but it may also reduce our skills in other areas, like
              synthesis of information. It&apos;s important to closely examine
              what we might be losing.
            </li>
          </ul>

          <Divider />

          <h2 className="font-serif text-2xl mt-8 mb-4">Authors</h2>
          <Author name="Sharon Lee" company="GoInvo" />
          <Author name="Juhan Sonin" company="GoInvo" />

          <h3 className="header-md mt-6 mb-3">Contributors</h3>
          <p className="text-gray">
            Eric Benoit
            <br />
            Xiaokun Qian
            <br />
            Carina Zhang
          </p>
        </div>
      </section>

      {/* Newsletter */}
      <section className="bg-gray-lightest py-8">
        <div className="max-width max-width-md content-padding mx-auto">
          <div className="bg-white shadow-card px-10 py-4">
            <NewsletterForm />
          </div>
        </div>
      </section>
    </div>
  )
}
