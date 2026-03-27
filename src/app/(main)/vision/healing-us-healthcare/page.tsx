import type { Metadata } from 'next'
import Image from 'next/image'
import { cloudfrontImage } from '@/lib/utils'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'

export const metadata: Metadata = {
  title: "Healing U.S. Healthcare",
  description: "Healing U.S. Healthcare",
}

export default function HealingUsHealthcarePage() {
  return (
    <div>
      

      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h1 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light mb-6">
            Healing U.S. Healthcare
          </h1>

          {/* TODO: Port full content from https://www.goinvo.com/features/us-healthcare/ */}
          <p className="text-gray leading-relaxed mb-4">
            This page is being migrated from the legacy site.
            Original content available at{' '}
            <a href="https://www.goinvo.com/features/us-healthcare/" target="_blank" rel="noopener noreferrer">
              https://www.goinvo.com/features/us-healthcare/
            </a>
          </p>

          <p className="leading-relaxed mb-4">Work Services About Vision Contact Home Work Services About Vision Careers Open Office Hours 1. Symptoms 2. History 3. Diagnosis 4. Prescription 5. Participate 6. Authors 7. References Medical Bill Cl</p>
          <p className="leading-relaxed mb-4">Nonetheless, you are entangled in the $2.9 trillion [4] our country spends on healthcare. 24% [5] of the federal budget—your tax dollars—is part of this $2.9 trillion. You pay a lot. But what do you g</p>
          <p className="leading-relaxed mb-4">Consider David. He just left his job as a high school teacher to launch an education-technology startup. With the change, he lost his health coverage and must decide whether to purchase new insurance.</p>
          <p className="leading-relaxed mb-4">David is just one of the thousands of Americans facing tough choices like this one. He could be any one of us. What happens if David’s gamble of good health fails him? Read on to follow David’s health</p>
          <h2 className="font-serif text-2xl mt-8 mb-4">Symptoms</h2>
          <p className="leading-relaxed mb-4">Two weeks ago, David was going about his daily life. Yesterday he was bedridden in a hospital, battling an infection he contracted in that hospital. Now he&apos;s back at home, trying to figure out how to </p>
          <p className="leading-relaxed mb-4">Medical debt refers to individual debt due to healthcare costs and related expenses. It is different from other debts because it is almost never accumulated by choice, and can add up quickly and unexp</p>
          <p className="leading-relaxed mb-4">In the U.S., medical debt accounts for more than 50% of all overdue debt that appears on credit reports. For 15 million people, medical debt is the only debt they have in collections in their credit r</p>
          <p className="leading-relaxed mb-4">The process was set in motion when David had to decide whether or not to buy health insurance. With the passage of the Patient Protection and Affordable Care Act (ACA) , every American has to either p</p>
          <p className="leading-relaxed mb-4">The purpose of the Patient Protection and Affordable Care Act (also known as ACA or Obamacare) is to “increase the number of Americans covered by health insurance and decrease the cost of healthcare.”</p>


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
