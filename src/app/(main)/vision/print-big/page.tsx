import type { Metadata } from 'next'
import Image from 'next/image'
import { cloudfrontImage } from '@/lib/utils'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'

export const metadata: Metadata = {
  title: "Print Big. Print Often.",
  description: "Print Big. Print Often.",
}

export default function PrintBigPage() {
  return (
    <div>
      

      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h1 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light mb-6">
            Print Big. Print Often.
          </h1>

          {/* TODO: Port full content from https://www.goinvo.com/features/print-big/ */}
          <p className="text-gray leading-relaxed mb-4">
            This page is being migrated from the legacy site.
            Original content available at{' '}
            <a href="https://www.goinvo.com/features/print-big/" target="_blank" rel="noopener noreferrer">
              https://www.goinvo.com/features/print-big/
            </a>
          </p>

          <p className="leading-relaxed mb-4">Work Services About Vision Contact Home Work Services About Vision Careers Open Office Hours Print Big. Print Often. After almost a decade, we finally replaced our printer.</p>
          <p className="leading-relaxed mb-4">OK, so that doesn’t sound particularly momentous. Most printers cost tens or hundreds of dollars and are one step away from being merely disposable. Not our printer! Here is a picture of it being inst</p>
          <p className="leading-relaxed mb-4">Yes, that is a crane bringing our printer into our studio. It is a Big Printer. An Epson P20000. We are generally pretty frugal as a business, but our printer is most definitely a splurge. It even has</p>
          <p className="leading-relaxed mb-4">Splurging on a printer might seem like a predictable thing for a design studio to do. But our commitment to printing big isn’t about nerding out on lovely design. It is about putting vision ahead of e</p>
          <h2 className="font-serif text-2xl mt-8 mb-4">1. See the whole system together</h2>
          <p className="leading-relaxed mb-4">The world is split into seemingly infinite pieces, making the most difficult problems to solve often appear impossible. We can’t see everything that needs to be considered, much less parse what is imp</p>
          <p className="leading-relaxed mb-4">At the scale of business, system problems are also complex. Not only are there a variety of domains, such as considerations relating to the market, customers, and competitors to name just three, each </p>
          <p className="leading-relaxed mb-4">We use our big printer to create system maps that contain everything. Whereas, in strategy, the pieces and parts are typically nested in different documents that do not allow everything to be seen at </p>
          <h2 className="font-serif text-2xl mt-8 mb-4">2. Make the details important</h2>
          <p className="leading-relaxed mb-4">Details are easy to miss. Have you ever done an offset printing project for something like a brochure? The most critical step in the entire creationary process is pouring over the proofs and looking f</p>


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
