import type { Metadata } from 'next'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { Author } from '@/components/ui/Author'
import { Divider } from '@/components/ui/Divider'
import { Video } from '@/components/ui/Video'
import { cloudfrontImage } from '@/lib/utils'
import { ModelViewerSection } from './ModelViewerSection'
import './visual-storytelling.css'

export const metadata: Metadata = {
  title: 'Reimagining Visual Storytelling with GenAI',
  description: '',
}

const arrowDownSvg = (
  <svg width="38" height="56" viewBox="0 0 38 56" fill="none" xmlns="http://www.w3.org/2000/svg" className="arrow-down">
    <path d="M16.4999 3C16.4999 1.61929 17.6192 0.5 18.9999 0.5C20.3806 0.5 21.4999 1.61929 21.4999 3L21.4999 46.9648L33.1425 35.3223C34.1188 34.3462 35.7014 34.346 36.6777 35.3223C37.6539 36.2985 37.6537 37.8811 36.6777 38.8574L20.7675 54.7676C19.7912 55.7439 18.2087 55.7439 17.2323 54.7676L1.32219 38.8574C0.346137 37.8811 0.345968 36.2985 1.32219 35.3223C2.29842 34.346 3.88102 34.3462 4.85735 35.3223L16.4999 46.9648L16.4999 3Z" fill="#D27A64"/>
  </svg>
)

export default function VisualStorytellingWithGenAIPage() {
  return (
    <div className="visual-storytelling">
      <SetCaseStudyHero image={cloudfrontImage('/images/features/visual-storytelling-with-genai/genai-hero-3.jpg')} />
      <div className="max-width pad-all">
        <h1 className="header--xl">Reimagining Visual Storytelling with GenAI</h1>

        <p>Visual storytelling is at the heart of how we share ideas at GoInvo, but creating visuals by hand is slow and demanding. This led us to ask: <em>How might GenAI help us move faster and communicate more ambitious ideas?</em></p>
        <p>Our process starts with research and interviews, followed by rounds of brainstorming, sketching, and vector refinement. Whether it&apos;s static posters, animations, or software, visual elements can take days to develop, and small changes can require redrawing scenes from scratch. This slows iteration, limits experimentation, and restricts the scale and complexity of what we can achieve on tight timelines.</p>
        <p>This is where our 3D and GenAI-assisted workflow comes in.</p>

        <Divider />

        <h2 className="header--lg text--center margin-top--trip">A Faster, Smarter Workflow.</h2>
        <p>We&apos;re developing a digital library of 3D environments including hospitals, clinics, and care homes to use as virtual sandboxes. Using <strong>Rhinoceros 3D</strong>, a modeling software, we can freely explore different compositions in these virtual environments and endlessly capture varying perspectives to apply in our work. </p>
      </div>

      <ModelViewerSection />

      <div className="max-width pad-all">
        <p>Model images are then styled using GenAI tools like <strong>Midjourney</strong> and are guided by prompts tailored to each project&apos;s visual direction. What once took days to illustrate can now be completed in a matter of hours. Scene changes and revisions take a quick camera pivot in the model and an entirely new scene is generated.</p>
        <p>The time investment thus shifts from redrawing each scene by hand to a one-time effort of constructing a detailed 3D model. Once built, these virtual environments become reusable and flexible assets that can support new stories and future projects.</p>

        <img
          src={cloudfrontImage('/images/features/visual-storytelling-with-genai/genai-3d-render-scene-2-3.jpg')}
          className="image--max-width"
          alt="Hospital 3D scene"
        />
        <p className="caption">1. Hospital trauma room render captured in <strong>Rhinoceros 3D</strong> model.</p>

        {arrowDownSvg}

        <div className="overlay-text-container">
          <div className="overlay-text">
            <p className="text--serif"><strong>Midjourney Prompt:</strong> <em>&ldquo;A hospital trauma room, outlined in soft blue linework, overlaid with abstract health data visualizations, flat design with orange and cool blue color palette, minimalistic and light-filled background with circular gradient overlays, inspired by healthcare dashboards.&rdquo;</em></p>
          </div>
          <img
            src={cloudfrontImage('/images/features/visual-storytelling-with-genai/genai-trauma-room-midjourney-3.jpg')}
            className="image--max-width"
            alt="Hospital 3D scene"
          />
        </div>
        <p className="caption">2. Hospital trauma room render stylized in <strong>Midjourney</strong> with accompanying prompt.</p>

        {arrowDownSvg}

        <img
          src={cloudfrontImage('/images/features/visual-storytelling-with-genai/genai-trauma-room-characters-3.jpg')}
          className="image--max-width"
          alt="Hospital 3D scene"
        />
        <p className="caption">3. Final image post-processing completed in <strong>Photoshop</strong> with additional characters added in <strong>Procreate.</strong></p>

        {arrowDownSvg}

        <Video
          sources={[
            {
              src: cloudfrontImage('/videos/features/visual-storytelling-with-genai/genai-trauma-room-characters-animation.mp4'),
              format: 'mp4',
            }
          ]}
          poster={cloudfrontImage('/images/case-studies/mass/snap/snap-emergency-benefits.jpg')}
          loop
        />
        <p className="caption">4. Animation created with <strong>Midjourney Video</strong> using the final post-processed image as the starting frame.</p>

        <h4 className="margin-top--trip">GenAI motivates creative experimentation.</h4>
        <p>This workflow doesn&apos;t just save us time, it also unlocks new creative possibilities that might have been previously out of reach. GenAI tools like Midjourney allow us to explore a wide range of visual styles such as surrealist, graphic novel-inspired, or painterly, and rapidly iterate our ideas in real-time. Where ideas were once narrowed by a project&apos;s timeline or the limits of what we could achieve by hand, GenAI allows our ideas to expand in scale and ambition, no longer limited by traditional methods.</p>
        <p>The examples below offer a small taste of the vastly different outputs GenAI can generate with various prompts.</p>
      </div>

      <div className="process-diagram">
        <div className="max-width pad-all">
          <div className="diagram-large">
            <div className="diagram-row title-row">
              <div className="col col-3">Rhino 3d Model Render</div>
              <div className="col col-spacer"></div>
              <div className="col col-3">Midjourney Re-texturizing Prompt</div>
              <div className="col col-spacer"></div>
              <div className="col col-3">Midjourney Output</div>
            </div>

            <div className="diagram-row">
              <div className="col col-3">
                <div className="label sm-only">Rhino 3d Model Render</div>
                <img
                  src={cloudfrontImage('/images/features/visual-storytelling-with-genai/genai-3d-render-scene-1-3.jpg')}
                  className="image--max-width"
                  alt="Hospital 3D scene"
                />
              </div>
              <div className="col col-spacer text--center plus-sign">+</div>
              <div className="col col-3">
                <div className="label sm-only">Midjourney Re-texturizing Prompt</div>
                <p className="prompt"><em>&ldquo;Emergency waiting room, flat minimalistic, geometric shapes, pastel colors, brush pen, inspired by the visual style of Atey Ghailan.&rdquo;</em></p>
              </div>
              <div className="col col-spacer text--center equal-sign">=</div>
              <div className="col col-3 col-full">
                <div className="label sm-only">Midjourney Output</div>
                <img
                  src={cloudfrontImage('/images/features/visual-storytelling-with-genai/genai-midjourney-scene-1-3.jpg')}
                  className="image--max-width"
                  alt="Hospital 3D scene"
                />
              </div>
            </div>

            <div className="diagram-row">
              <div className="col col-3">
                <div className="label sm-only">Rhino 3d Model Render</div>
                <img
                  src={cloudfrontImage('/images/features/visual-storytelling-with-genai/genai-3d-render-scene-2-3.jpg')}
                  className="image--max-width"
                  alt="Hospital 3D scene"
                />
              </div>
              <div className="col col-spacer text--center plus-sign">+</div>
              <div className="col col-3">
                <div className="label sm-only">Midjourney Re-texturizing Prompt</div>
                <p className="prompt"><em>&ldquo;Hospital trauma room, cinematic lighting, hard-edged blocky brush strokes, rich color gradients with purples, oranges, and greens, high contrast, simplified forms with painterly texture, a moody yet vibrant atmosphere, inspired by the visual style of Joseph Iovescu.&rdquo;</em></p>
              </div>
              <div className="col col-spacer text--center equal-sign">=</div>
              <div className="col col-3 col-full">
                <div className="label sm-only">Midjourney Output</div>
                <img
                  src={cloudfrontImage('/images/features/visual-storytelling-with-genai/genai-midjourney-scene-2-3.jpg')}
                  className="image--max-width"
                  alt="Hospital 3D scene"
                />
              </div>
            </div>

            <div className="diagram-row">
              <div className="col col-3">
                <div className="label sm-only">Rhino 3d Model Render</div>
                <img
                  src={cloudfrontImage('/images/features/visual-storytelling-with-genai/genai-3d-render-scene-3-3.jpg')}
                  className="image--max-width"
                  alt="Hospital 3D scene"
                />
              </div>
              <div className="col col-spacer text--center plus-sign">+</div>
              <div className="col col-3">
                <div className="label sm-only">Midjourney Re-texturizing Prompt</div>
                <p className="prompt"><em>&ldquo;A high-contrast ink illustration of a hospital emergency room with multiple characters - healthcare providers and patients, expressive black ink lines, minimalist background, bold negative space, inspired by the visual style of Manuel Bortoletti.&rdquo;</em></p>
              </div>
              <div className="col col-spacer text--center equal-sign">=</div>
              <div className="col col-3 col-full">
                <div className="label sm-only">Midjourney Output</div>
                <img
                  src={cloudfrontImage('/images/features/visual-storytelling-with-genai/genai-midjourney-scene-3-3.jpg')}
                  className="image--max-width"
                  alt="Hospital 3D scene"
                />
              </div>
            </div>

            <div className="diagram-row">
              <div className="col col-3">
                <div className="label sm-only">Rhino 3d Model Render</div>
                <img
                  src={cloudfrontImage('/images/features/visual-storytelling-with-genai/genai-3d-render-scene-4-3.jpg')}
                  className="image--max-width"
                  alt="Hospital 3D scene"
                />
              </div>
              <div className="col col-spacer text--center plus-sign">+</div>
              <div className="col col-3">
                <div className="label sm-only">Midjourney Re-texturizing Prompt</div>
                <p className="prompt"><em>&ldquo;A minimalistic, surreal illustration of a hospital emergency room, clean thin linework, soft pastel color palette, flat texture, fine detail, elegant negative space, inspired by the visual style of Harriet Lee-Merrion.&rdquo;</em></p>
              </div>
              <div className="col col-spacer text--center equal-sign">=</div>
              <div className="col col-3 col-full">
                <div className="label sm-only">Midjourney Output</div>
                <img
                  src={cloudfrontImage('/images/features/visual-storytelling-with-genai/genai-midjourney-scene-4-3.jpg')}
                  className="image--max-width"
                  alt="Hospital 3D scene"
                />
              </div>
            </div>

            <div className="diagram-row">
              <div className="col col-3">
                <div className="label sm-only">Rhino 3d Model Render</div>
                <img
                  src={cloudfrontImage('/images/features/visual-storytelling-with-genai/genai-3d-render-scene-5-3.jpg')}
                  className="image--max-width"
                  alt="Hospital 3D scene"
                />
              </div>
              <div className="col col-spacer text--center">+</div>
              <div className="col col-3">
                <div className="label sm-only">Midjourney Re-texturizing Prompt</div>
                <p className="prompt"><em>&ldquo;A friendly and colour hospital waiting room, watercolor textures, playful and minimal detail, inspired by the visual style of Oliver Jeffers.&rdquo; </em></p>
              </div>
              <div className="col col-spacer text--center">=</div>
              <div className="col col-3 col-full">
                <div className="label sm-only">Midjourney Output</div>
                <img
                  src={cloudfrontImage('/images/features/visual-storytelling-with-genai/genai-midjourney-scene-5-3.jpg')}
                  className="image--max-width"
                  alt="Hospital 3D scene"
                />
              </div>
            </div>

          </div>
        </div>
      </div>

      <div className="max-width pad-all">
        <h2 className="header--lg text--center margin-top--trip">Why does this matter?</h2>
        <p>This workflow is designed for storytelling at scale. For complex systems and stories, we need hundreds of custom visuals. GenAI allows us to move faster and empowers us to lead with ideas rather than limit them. It helps us sketch crazy ideas, try wild graphics, and show real stories without getting stuck in every pixel and every tool. <a href="https://www.researchgate.net/publication/254303366_Assessing_the_Quality_of_Ideas_From_Prolific_Early-Stage_Product_Ideation" target="_blank" rel="noopener noreferrer">As research has shown</a>, the more ideas we generate, the more statistically likely we are to come up with a promising lead.</p>
        <p>By adding GenAi to our creative workflow, the concept takes the lead, not the toolset — allowing us to bring bold ideas to life and more prototypes to the table. The more we can make and the less time it takes to do so, the better the ideas we can bring to the work.</p>
      </div>

      <div className="max-width pad-all">
        <Divider />
        <h2 className="header--lg text--center margin-top--trip">
          Authors
        </h2>
        <Author name="Maverick Chan" />
        <Author name="Claire Lin" />
        <Author name="Shirley Xu" />
      </div>

      <div className="background--gray pad-vertical--double">
        <div className="max-width max-width--md content-padding">
          <NewsletterForm />
        </div>
      </div>

    </div>
  )
}
