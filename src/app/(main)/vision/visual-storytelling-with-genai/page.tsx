import type { Metadata } from 'next'
import Image from 'next/image'
import { cloudfrontImage } from '@/lib/utils'
import { Divider } from '@/components/ui/Divider'
import { Author } from '@/components/ui/Author'
import { Video } from '@/components/ui/Video'
import { ModelViewerSection } from './ModelViewerSection'

export const metadata: Metadata = {
  title: 'Reimagining Visual Storytelling with GenAI',
  description:
    'How GoInvo uses 3D modeling and generative AI tools like Midjourney to accelerate visual storytelling in healthcare design.',
}

export default function VisualStorytellingPage() {
  return (
    <div className="pt-[var(--spacing-header-height)]">
      {/* Hero */}
      <section className="relative min-h-[50vh] flex items-end">
        <Image
          src={cloudfrontImage(
            '/images/features/visual-storytelling-with-genai/genai-hero-3.jpg'
          )}
          alt="Reimagining Visual Storytelling with GenAI"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="relative z-10 max-width content-padding py-12 w-full">
          <span className="text-primary-light text-sm uppercase tracking-wider font-semibold">
            Design / Open Source
          </span>
          <h1 className="font-serif text-3xl md:text-4xl text-white mt-2">
            Reimagining Visual Storytelling with GenAI
          </h1>
        </div>
      </section>

      {/* Content */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <p className="leading-relaxed mb-4">
            Visual storytelling is at the heart of how we share ideas at GoInvo,
            but creating visuals by hand is slow and demanding. This led us to
            ask: <em>How might GenAI help us move faster and communicate more
            ambitious ideas?</em>
          </p>
          <p className="leading-relaxed mb-4">
            Our process starts with research and interviews, followed by rounds
            of brainstorming, sketching, and vector refinement. Whether
            it&apos;s static posters, animations, or software, visual elements
            can take days to develop, and small changes can require redrawing
            scenes from scratch. This slows iteration, limits experimentation,
            and restricts the scale and complexity of what we can achieve on
            tight timelines.
          </p>
          <p className="leading-relaxed mb-8">
            This is where our 3D and GenAI-assisted workflow comes in.
          </p>

          <Divider />

          <h2 className="font-serif text-2xl mt-8 mb-4">
            A Faster, Smarter Workflow
          </h2>
          <p className="leading-relaxed mb-4">
            We&apos;re developing a digital library of 3D environments including
            hospitals, clinics, and care homes to use as virtual sandboxes.
            Using <strong>Rhinoceros 3D</strong>, a modeling software, we can
            freely explore different compositions in these virtual environments
            and endlessly capture varying perspectives to apply in our work.
          </p>
          <p className="leading-relaxed mb-4">
            Model images are then styled using GenAI tools like{' '}
            <strong>Midjourney</strong> and are guided by prompts tailored to
            each project&apos;s visual direction. What once took days to
            illustrate can now be completed in a matter of hours. Scene changes
            and revisions take a quick camera pivot in the model and an entirely
            new scene is generated.
          </p>
          <p className="leading-relaxed mb-8">
            The time investment thus shifts from redrawing each scene by hand to
            a one-time effort of constructing a detailed 3D model. Once built,
            these virtual environments become reusable and flexible assets that
            can support new stories and future projects.
          </p>
        </div>

        {/* 3D Model Viewer */}
        <ModelViewerSection />

        <div className="max-width max-width-md content-padding mx-auto">
          <Divider />

          <h2 className="font-serif text-2xl mt-8 mb-4">
            The Process: From 3D to Final Image
          </h2>

          {/* Scene pairs: 3D render → Midjourney output */}
          {[
            {
              num: 1,
              title: 'Entering emergency room',
              render: 'genai-3d-render-scene-1-3.jpg',
              midjourney: 'genai-midjourney-scene-1-3.jpg',
              prompt:
                'Emergency waiting room, flat minimalistic, geometric shapes, pastel colors, brush pen, inspired by the visual style of Atey Ghailan.',
            },
            {
              num: 2,
              title: 'Emergency trauma room',
              render: 'genai-3d-render-scene-2-3.jpg',
              midjourney: 'genai-midjourney-scene-2-3.jpg',
              prompt:
                'Hospital trauma room, cinematic lighting, hard-edged blocky brush strokes, rich color gradients with purples, oranges, and greens, high contrast, simplified forms with painterly texture, a moody yet vibrant atmosphere, inspired by the visual style of Joseph Iovescu.',
            },
            {
              num: 3,
              title: 'Emergency room',
              render: 'genai-3d-render-scene-3-3.jpg',
              midjourney: 'genai-midjourney-scene-3-3.jpg',
              prompt:
                'A high-contrast ink illustration of a hospital emergency room with multiple characters - healthcare providers and patients, expressive black ink lines, minimalist background, bold negative space, inspired by the visual style of Manuel Bortoletti.',
            },
            {
              num: 4,
              title: 'Emergency room treatment area',
              render: 'genai-3d-render-scene-4-3.jpg',
              midjourney: 'genai-midjourney-scene-4-3.jpg',
              prompt:
                'A minimalistic, surreal illustration of a hospital emergency room, clean thin linework, soft pastel color palette, flat texture, fine detail, elegant negative space, inspired by the visual style of Harriet Lee-Merrion.',
            },
            {
              num: 5,
              title: 'Hospital waiting room',
              render: 'genai-3d-render-scene-5-3.jpg',
              midjourney: 'genai-midjourney-scene-5-3.jpg',
              prompt:
                'A friendly and colour hospital waiting room, watercolor textures, playful and minimal detail, inspired by the visual style of Oliver Jeffers.',
            },
          ].map((scene) => (
            <div key={scene.num} className="mb-12">
              <h3 className="font-serif text-xl mb-4">
                Scene {scene.num}: {scene.title}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                <div>
                  <Image
                    src={cloudfrontImage(
                      `/images/features/visual-storytelling-with-genai/${scene.render}`
                    )}
                    alt={`3D render of ${scene.title}`}
                    width={600}
                    height={400}
                    className="w-full h-auto"
                  />
                  <p className="text-xs text-gray mt-1">
                    Rhinoceros 3D render
                  </p>
                </div>
                <div>
                  <Image
                    src={cloudfrontImage(
                      `/images/features/visual-storytelling-with-genai/${scene.midjourney}`
                    )}
                    alt={`Midjourney output of ${scene.title}`}
                    width={600}
                    height={400}
                    className="w-full h-auto"
                  />
                  <p className="text-xs text-gray mt-1">Midjourney output</p>
                </div>
              </div>
              <p className="text-sm text-gray italic">
                Prompt: &quot;{scene.prompt}&quot;
              </p>
            </div>
          ))}

          <Divider />

          <h2 className="font-serif text-2xl mt-8 mb-4">
            Trauma Room Deep Dive
          </h2>
          <p className="leading-relaxed mb-4">
            Here&apos;s a closer look at how a single 3D model render can be
            transformed through different stages of post-processing.
          </p>
          <div className="space-y-4 mb-4">
            <div>
              <Image
                src={cloudfrontImage(
                  '/images/features/visual-storytelling-with-genai/genai-3d-render-scene-2-3.jpg'
                )}
                alt="Hospital trauma room 3D render"
                width={1200}
                height={800}
                className="w-full h-auto"
              />
              <p className="text-xs text-gray mt-1">
                1. Hospital trauma room render captured in{' '}
                <strong>Rhinoceros 3D</strong> model.
              </p>
            </div>
            <div>
              <Image
                src={cloudfrontImage(
                  '/images/features/visual-storytelling-with-genai/genai-trauma-room-midjourney-3.jpg'
                )}
                alt="Trauma room stylized in Midjourney"
                width={1200}
                height={800}
                className="w-full h-auto"
              />
              <p className="text-xs text-gray mt-1">
                2. Hospital trauma room render stylized in{' '}
                <strong>Midjourney</strong> with accompanying prompt.
              </p>
            </div>
            <div>
              <Image
                src={cloudfrontImage(
                  '/images/features/visual-storytelling-with-genai/genai-trauma-room-characters-3.jpg'
                )}
                alt="Final image with characters"
                width={1200}
                height={800}
                className="w-full h-auto"
              />
              <p className="text-xs text-gray mt-1">
                3. Final image post-processing completed in{' '}
                <strong>Photoshop</strong> with additional characters added in{' '}
                <strong>Procreate</strong>.
              </p>
            </div>
            <div>
              <Video
                sources={[
                  {
                    src: cloudfrontImage('/videos/features/visual-storytelling-with-genai/genai-trauma-room-characters-animation.mp4'),
                    format: 'mp4',
                  },
                ]}
                loop
                controls
                autoPlay={false}
              />
              <p className="text-xs text-gray mt-1">
                4. Animation created with{' '}
                <strong>Midjourney Video</strong> using the final post-processed
                image as the starting frame.
              </p>
            </div>
          </div>

          <Divider />

          <h2 className="font-serif text-2xl mt-8 mb-4">
            GenAI Motivates Creative Experimentation
          </h2>
          <p className="leading-relaxed mb-4">
            This workflow doesn&apos;t just save us time, it also unlocks new
            creative possibilities that might have been previously out of reach.
            GenAI tools like Midjourney allow us to explore a wide range of
            visual styles such as surrealist, graphic novel-inspired, or
            painterly, and rapidly iterate our ideas in real-time. Where ideas
            were once narrowed by a project&apos;s timeline or the limits of
            what we could achieve by hand, GenAI allows our ideas to expand in
            scale and ambition, no longer limited by traditional methods.
          </p>
          <p className="leading-relaxed mb-4">
            The examples above offer a small taste of the vastly different
            outputs GenAI can generate with various prompts.
          </p>

          <Divider />

          <h2 className="font-serif text-2xl mt-8 mb-4">
            Why Does This Matter?
          </h2>
          <p className="leading-relaxed mb-4">
            This workflow is designed for storytelling at scale. For complex
            systems and stories, we need hundreds of custom visuals. GenAI
            allows us to move faster and empowers us to lead with ideas rather
            than limit them. It helps us sketch crazy ideas, try wild graphics,
            and show real stories without getting stuck in every pixel and every
            tool.
          </p>
          <p className="leading-relaxed mb-4">
            As{' '}
            <a
              href="https://www.researchgate.net/publication/254303366_Assessing_the_Quality_of_Ideas_From_Prolific_Early-Stage_Product_Ideation"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              research has shown
            </a>
            , the more ideas we generate, the more statistically likely we are
            to come up with a promising lead.
          </p>
          <p className="leading-relaxed mb-8">
            By adding GenAI to our creative workflow, the concept takes the lead,
            not the toolset — allowing us to bring bold ideas to life and more
            prototypes to the table. The more we can make and the less time it
            takes to do so, the better the ideas we can bring to the work.
          </p>

          <Divider />

          <h2 className="font-serif text-2xl mt-8 mb-4">Authors</h2>
          <Author name="Maverick Chan" company="GoInvo" />
          <Author name="Claire Lin" company="GoInvo" />
          <Author name="Shirley Xu" company="GoInvo" />
        </div>
      </section>
    </div>
  )
}
