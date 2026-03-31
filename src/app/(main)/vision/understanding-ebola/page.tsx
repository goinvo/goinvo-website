import type { Metadata } from 'next'
import Image from 'next/image'
import { cloudfrontImage } from '@/lib/utils'
import { Divider } from '@/components/ui/Divider'
import { Author } from '@/components/ui/Author'
import { Button } from '@/components/ui/Button'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'
import Link from 'next/link'
import './understanding-ebola.css'

export const metadata: Metadata = {
  title: 'Understanding Ebola: A Visual Guide',
  description:
    'A comprehensive visual guide to understanding the Ebola virus, including its history, transmission, symptoms, diagnosis, treatment, prevention, and potential spread.',
}

export default function UnderstandingEbolaPage() {
  return (
    <div>
      <SetCaseStudyHero image={cloudfrontImage('/old/images/features/ebola/Ebola-01.png')} />

      {/* Sticky Navigation */}
      <nav className="ebola-nav">
        <div className="max-width content-padding mx-auto flex">
          <a href="#section1">1. Intro to Ebola</a>
          <a href="#section2">2. Cases by Year</a>
          <a href="#section3">3. Transmission</a>
          <a href="#section4">4. Symptoms</a>
          <a href="#section5">5. Diagnosis and Treatment</a>
          <a href="#section6">6. Prevention and Control</a>
          <a href="#section7">7. Potential Spread</a>
          <a href="#section8">8. References</a>
        </div>
      </nav>

      {/* Infographic Panels */}
      <article className="bg-white">
        <section id="section1">
          <Image
            src="https://www.goinvo.com/old/images/features/ebola/Ebola-01.png"
            alt="Understanding Ebola - Introduction to Ebola: origins, history, and overview of the virus"
            width={1400}
            height={2000}
            className="w-full h-auto block mx-auto"
            unoptimized
          />
        </section>

        <section id="section2">
          <Image
            src="https://www.goinvo.com/old/images/features/ebola/Ebola-02.png"
            alt="Ebola cases by year - a timeline of outbreaks and their scope"
            width={1400}
            height={2000}
            className="w-full h-auto block mx-auto"
            unoptimized
          />
        </section>

        <section id="section3">
          <Image
            src="https://www.goinvo.com/old/images/features/ebola/Ebola-03.png"
            alt="Ebola transmission - how the virus spreads from person to person"
            width={1400}
            height={2000}
            className="w-full h-auto block mx-auto"
            unoptimized
          />
        </section>

        <section id="section4">
          <Image
            src="https://www.goinvo.com/old/images/features/ebola/Ebola-04.png"
            alt="Ebola symptoms - the progression of symptoms from early to late stages"
            width={1400}
            height={2000}
            className="w-full h-auto block mx-auto"
            unoptimized
          />
        </section>

        <section id="section5">
          <Image
            src="https://www.goinvo.com/old/images/features/ebola/Ebola-05.png"
            alt="Ebola diagnosis and treatment - medical procedures and care protocols"
            width={1400}
            height={2000}
            className="w-full h-auto block mx-auto"
            unoptimized
          />
        </section>

        <section id="section6">
          <Image
            src="https://www.goinvo.com/old/images/features/ebola/Ebola-06.png"
            alt="Ebola prevention and control - measures to stop the spread of the virus"
            width={1400}
            height={2000}
            className="w-full h-auto block mx-auto"
            unoptimized
          />
        </section>

        <section id="section7">
          <Image
            src="https://www.goinvo.com/old/images/features/ebola/Ebola-07.png"
            alt="Potential spread of Ebola - risk factors and global implications"
            width={1400}
            height={2000}
            className="w-full h-auto block mx-auto"
            unoptimized
          />
        </section>

        <p className="text-center py-4 px-4 text-[#58504a]">
          Email{' '}
          <a href="mailto:stopebola@goinvo.com" className="text-[#6195cf] hover:underline">
            stopebola@goinvo.com
          </a>{' '}
          to provide feedback and help evolve this document.
        </p>
      </article>

      {/* Credits */}
      <div className="ebola-credits">
        <div className="credits-author">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://www.goinvo.com/old/images/team_photos/xinyu_liu.jpg"
            alt="Xinyu Liu"
            className="w-full max-w-[200px] mb-4"
          />
          <div className="author-content">
            <h3 className="font-serif text-lg font-light text-[#888] mb-1">Author</h3>
            <h2 className="font-serif text-2xl font-light mb-2">Xinyu Liu</h2>
            <p className="text-[#444] text-lg leading-relaxed">
              Xinyu is a designer with a background in crafting physical objects, conducting research, and influencing human behavior. She leverages invisible sensing tech, composes emotional feedback loops, and creates just-in-time graphic communication. Xinyu is a graduate of the Beijing Institute of Technology and the Rhode Island School of Design.
            </p>
          </div>
        </div>

        <div className="credits-contributors">
          <div className="contributors-box">
            <div className="contributor">
              <div className="contributor-image">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://www.goinvo.com/old/images/features/democracy/contrib/emily.jpg"
                  alt="Emily Twaddell"
                  className="w-full"
                />
              </div>
              <div className="contributor-info">
                <h3>Editor</h3>
                <p>Emily Twaddell<br /><small><a href="https://twitter.com/mimitwaddell" className="text-[#aaa] hover:text-[#e0e0e0]">@mimitwaddell</a></small></p>
              </div>
            </div>

            <hr className="w-8 border-[3px] border-[#51697b] my-4" />

            <div className="contributor">
              <div className="contributor-image">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://www.goinvo.com/old/images/features/democracy/contrib/juhan.jpg"
                  alt="Juhan Sonin"
                  className="w-full"
                />
              </div>
              <div className="contributor-info">
                <h3>Contributing Author</h3>
                <p>Juhan Sonin<br /><small><a href="https://twitter.com/jsonin" className="text-[#aaa] hover:text-[#e0e0e0]">@jsonin</a></small></p>
              </div>
            </div>

            <hr className="w-8 border-[3px] border-[#51697b] my-4" />

            <div className="contributor">
              <div className="contributor-image">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://www.goinvo.com/old/images/features/ebola/contrib/sarah.jpeg"
                  alt="Sarah Kaiser"
                  className="w-full"
                />
              </div>
              <div className="contributor-info">
                <h3>Contributing Illustrator</h3>
                <p>Sarah Kaiser<br /><small><a href="https://twitter.com/DamnTorren" className="text-[#aaa] hover:text-[#e0e0e0]">@DamnTorren</a></small></p>
              </div>
            </div>

            <hr className="w-8 border-[3px] border-[#51697b] my-4" />

            <div className="contributor">
              <div className="contributor-image">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://www.goinvo.com/old/images/features/ebola/contrib/adam.jpeg"
                  alt="Adam Pere"
                  className="w-full"
                />
              </div>
              <div className="contributor-info">
                <h3>Web Developer</h3>
                <p>Adam Pere</p>
              </div>
            </div>

            <hr className="w-8 border-[3px] border-[#51697b] my-4" />

            <div className="contributor">
              <div className="contributor-image">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://www.goinvo.com/old/images/designsoap.png"
                  alt="Designsoap"
                  className="w-full border-2 border-[#51697b]"
                />
              </div>
              <div className="contributor-info">
                <h3>Inspired by</h3>
                <p>John Pring<br /><small><a href="http://www.designbysoap.co.uk/client-infographic-an-in-depth-look-at-ebola/" className="text-[#aaa] hover:text-[#e0e0e0]">Designbysoap</a></small></p>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <a
              href="https://www.goinvo.com/features/ebola/files/understanding_ebola.pdf"
              className="text-[#aaa] hover:text-[#e0e0e0] text-lg"
              target="_blank"
              rel="noopener noreferrer"
            >
              Download PDF
            </a>
          </div>
        </div>
      </div>

      {/* References Image */}
      <article className="bg-white">
        <section id="section8">
          <Image
            src="https://www.goinvo.com/old/images/features/ebola/Ebola-08.png"
            alt="References and sources for the Understanding Ebola infographic"
            width={1400}
            height={2000}
            className="w-full h-auto block mx-auto"
            unoptimized
          />
        </section>
      </article>

      {/* Related: Ebola Care Guideline */}
      <Link href="/vision/ebola-care-guideline" className="ebola-bottom-link">
        <div className="photo-container" />
        <div className="content-info">
          <h2 className="font-serif text-3xl">Ebola Care Guideline</h2>
          <h4 className="font-serif text-lg">An Illustrated Process on Personal Protective Equipment</h4>
        </div>
      </Link>

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
