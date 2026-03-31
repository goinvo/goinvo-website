import type { Metadata } from 'next'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'
import './ebola-care-guideline.css'

export const metadata: Metadata = {
  title: 'Ebola Care Guideline',
  description:
    'An Illustrated Process on Personal Protective Equipment (PPE) for healthcare workers in Ebola treatment areas.',
}

export default function EbolaCareGuidelinePage() {
  return (
    <div className="bg-[#eee]">
      <SetCaseStudyHero image="https://www.goinvo.com/old/images/features/ebola-care-guideline/haz_zoom_bg.png" />

      <div className="bg-white">
        {/* Title — cover image is the hero above */}
        <div className="max-w-[1238px] mx-auto pt-8 px-4">
          <h1 className="header-xl mb-2">Ebola Care Guideline</h1>
          <p className="font-serif text-lg text-gray">An Illustrated Process on Personal Protective Equipment</p>
        </div>

        {/* Intro */}
        <section className="max-w-[1238px] mx-auto mt-6 px-4 mb-8">
          <p className="leading-[1.4em] text-[#58504a] mb-4">
            The recommended Personal Protective Equipment (PPE) that healthcare workers wear in Ebola treatment areas&mdash;waterproof apron, surgical gown, surgical cap, respirator, face shield, boots, and two layers of gloves&mdash;significantly reduces the body&apos;s normal way of getting rid of heat by sweating. The PPE holds excess heat and moisture inside, making the worker&apos;s body even hotter. In addition, the increased physical effort to perform duties while carrying the extra weight of the PPE can lead to the healthcare worker getting hotter faster. Wearing PPE increases the risk for heat-related illnesses.
          </p>
          <p className="leading-[1.4em] text-[#58504a]">
            Email{' '}
            <a href="mailto:stopebola@goinvo.com" className="text-[#6195cf] hover:underline">
              stopebola@goinvo.com
            </a>{' '}
            to provide feedback and help evolve this document.
          </p>
        </section>

        {/* Download Section */}
        <section className="ebola-care-download my-12">
          <a
            href="https://goinvo.com/features/ebola-care-guideline/files/ebola_care_guideline.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full h-full"
          >
            <div className="photo-container" />
            <div className="download-overlay">
              <span className="download-btn">Download the Ebola Guideline PDF</span>
            </div>
          </a>
        </section>
      </div>

      {/* Credits */}
      <div className="ebola-care-credits">
        <div className="credits-author">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://www.goinvo.com/old/images/team_photos/xinyu_liu.jpg"
            alt="Xinyu Liu"
            className="w-full mb-4"
          />
          <div className="author-content">
            <h3 className="font-serif text-lg font-light text-[#888] mb-1">Author</h3>
            <h2 className="font-serif text-2xl font-light mb-2 text-[#444]">Xinyu Liu</h2>
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
          </div>
        </div>
      </div>

      {/* Related: Care Cards */}
      <a href="http://www.carecards.me" className="ebola-care-bottom-link" target="_blank" rel="noopener noreferrer">
        <div className="photo-container" />
        <div className="content-info">
          <h2 className="font-serif text-3xl text-white">Care Cards</h2>
          <h4 className="font-serif text-lg text-white">The mighty little deck of cards that will change your health habits.</h4>
        </div>
      </a>

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
