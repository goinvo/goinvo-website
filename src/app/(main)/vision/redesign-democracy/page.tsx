import type { Metadata } from 'next'
import Image from 'next/image'
import { cloudfrontImage } from '@/lib/utils'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'

export const metadata: Metadata = {
  title: "Redesign Democracy",
  description: "Redesign Democracy",
}

export default function RedesignDemocracyPage() {
  return (
    <div>
      

      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h1 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light mb-6">
            Redesign Democracy
          </h1>

          {/* TODO: Port full content from https://www.goinvo.com/features/redesign-democracy/ */}
          <p className="text-gray leading-relaxed mb-4">
            This page is being migrated from the legacy site.
            Original content available at{' '}
            <a href="https://www.goinvo.com/features/redesign-democracy/" target="_blank" rel="noopener noreferrer">
              https://www.goinvo.com/features/redesign-democracy/
            </a>
          </p>

          <p className="leading-relaxed mb-4">Work Services About Vision Contact Home Work Services About Vision Careers Open Office Hours Table of Contents Redesign Democracy 1. Intro 2. Origin 3. Better Democracy 4. Woe, Legislature 5. Digital </p>
          <h2 className="font-serif text-2xl mt-8 mb-4">Introduction</h2>
          <p className="leading-relaxed mb-4">Older generations seem to chronically lament that the world of the young is new, unprecedented, and terrible. Nostalgia and familiarity combine to create a &amp;ldquo;They don&amp;rsquo;t make &amp;lsquo;em like </p>
          <p className="leading-relaxed mb-4">However, it is just possible that we are reaching the nadir of the existing democratic process in the United States, an environment of toxicity and partisanship that shows no sign of softening. Coinci</p>
          <p className="leading-relaxed mb-4">Democracy in the United States has over 200 years of history behind it; democracy as a government system has more than 2,000 years of precedent. It may be the best system going but it sure doesn&amp;rsquo</p>
          <p className="leading-relaxed mb-4">This is the moment - our moment, together, yours and mine - to create a better system. So read on, see what I have in mind, and why. And if it sounds good to enough of us, maybe we can really change t</p>
          <p className="leading-relaxed mb-4">Dirk KnemeyerGranville, Ohio, U.S.September 8, 2014</p>
          <p className="leading-relaxed mb-4">This article is also available as PDF, eBook, and spoken by the author free of charge.</p>
          <h2 className="font-serif text-2xl mt-8 mb-4">The Origins of Democracy</h2>
          <p className="leading-relaxed mb-4">Today&apos;s U.S. government is built on principles and practices established more than 2,000 years ago. Can digital technology help us realize a better way?</p>


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
