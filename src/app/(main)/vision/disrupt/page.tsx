import type { Metadata } from 'next'
import Image from 'next/image'
import { cloudfrontImage } from '@/lib/utils'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'

export const metadata: Metadata = {
  title: "Disrupt!",
  description: "Disrupt!",
}

export default function DisruptPage() {
  return (
    <div>
      

      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h1 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light mb-6">
            Disrupt!
          </h1>

          {/* TODO: Port full content from https://www.goinvo.com/features/disrupt/ */}
          <p className="text-gray leading-relaxed mb-4">
            This page is being migrated from the legacy site.
            Original content available at{' '}
            <a href="https://www.goinvo.com/features/disrupt/" target="_blank" rel="noopener noreferrer">
              https://www.goinvo.com/features/disrupt/
            </a>
          </p>

          <p className="leading-relaxed mb-4">Work Services About Vision Contact Home Work Services About Vision Careers Open Office Hours The article page is loading... This article requires the use of JavaScript. If you have JavaScript disabled</p>
          <p className="leading-relaxed mb-4">Today, emerging technologies from robotics to synthetic biology to the Internet of Things are already opening up new possibilities for extending our reach, enabling us to become seemingly superhuman. </p>
          <p className="leading-relaxed mb-4">What does it mean to create products and services that have the potential to disrupt our society and our economy? We will need to rethink and remake our interactions, our infrastructure, and maybe eve</p>
          <p className="leading-relaxed mb-4">The coming wave of technological change will make the tumult and disruption of the past decade’s digital and mobile revolutions look like a minor blip by comparison. As we look beyond the screen to th</p>


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
