import type { Metadata } from 'next'
import Image from 'next/image'
import { cloudfrontImage } from '@/lib/utils'
import { Divider } from '@/components/ui/Divider'
import { Author } from '@/components/ui/Author'
import { Button } from '@/components/ui/Button'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Understanding Ebola: A Visual Guide',
  description:
    'A comprehensive visual guide to understanding the Ebola virus, including its history, transmission, symptoms, diagnosis, treatment, prevention, and potential spread.',
}

export default function UnderstandingEbolaPage() {
  return (
    <div>
      <SetCaseStudyHero image={cloudfrontImage('/images/features/understanding-ebola/understanding-ebola-featured.jpg')} />

      {/* Content */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h1 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light">
            Understanding Ebola
          </h1>
          <h4 className="font-serif text-base font-light mb-6">A Visual Guide</h4>

          <p className="text-gray leading-relaxed mb-6">
            A comprehensive infographic covering what everyone should know about the Ebola virus, from its origins and transmission to symptoms, treatment, and prevention.
          </p>

          {/* Table of Contents */}
          <nav className="mb-8 p-4 bg-gray-lightest rounded">
            <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider">Contents</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li><a href="#intro" className="text-primary hover:underline">Intro to Ebola</a></li>
              <li><a href="#cases" className="text-primary hover:underline">Cases by Year</a></li>
              <li><a href="#transmission" className="text-primary hover:underline">Transmission</a></li>
              <li><a href="#symptoms" className="text-primary hover:underline">Symptoms</a></li>
              <li><a href="#diagnosis" className="text-primary hover:underline">Diagnosis and Treatment</a></li>
              <li><a href="#prevention" className="text-primary hover:underline">Prevention and Control</a></li>
              <li><a href="#spread" className="text-primary hover:underline">Potential Spread</a></li>
              <li><a href="#references" className="text-primary hover:underline">References</a></li>
            </ol>
          </nav>

          <div className="flex gap-4 mb-8">
            <Button
              href="https://www.goinvo.com/features/ebola/understanding_ebola.pdf"
              variant="secondary"
              external
            >
              Download PDF
            </Button>
          </div>

          <Divider />
        </div>
      </section>

      {/* Infographic Panels */}
      <section id="intro">
        <div className="max-width content-padding mx-auto">
          <Image
            src={cloudfrontImage('/old/images/features/ebola/Ebola-01.png')}
            alt="Understanding Ebola - Introduction to Ebola: origins, history, and overview of the virus"
            width={1400}
            height={2000}
            className="w-full h-auto mb-2"
          />
        </div>
      </section>

      <section id="cases">
        <div className="max-width content-padding mx-auto">
          <Image
            src={cloudfrontImage('/old/images/features/ebola/Ebola-02.png')}
            alt="Ebola cases by year - a timeline of outbreaks and their scope"
            width={1400}
            height={2000}
            className="w-full h-auto mb-2"
          />
        </div>
      </section>

      <section id="transmission">
        <div className="max-width content-padding mx-auto">
          <Image
            src={cloudfrontImage('/old/images/features/ebola/Ebola-03.png')}
            alt="Ebola transmission - how the virus spreads from person to person"
            width={1400}
            height={2000}
            className="w-full h-auto mb-2"
          />
        </div>
      </section>

      <section id="symptoms">
        <div className="max-width content-padding mx-auto">
          <Image
            src={cloudfrontImage('/old/images/features/ebola/Ebola-04.png')}
            alt="Ebola symptoms - the progression of symptoms from early to late stages"
            width={1400}
            height={2000}
            className="w-full h-auto mb-2"
          />
        </div>
      </section>

      <section id="diagnosis">
        <div className="max-width content-padding mx-auto">
          <Image
            src={cloudfrontImage('/old/images/features/ebola/Ebola-05.png')}
            alt="Ebola diagnosis and treatment - medical procedures and care protocols"
            width={1400}
            height={2000}
            className="w-full h-auto mb-2"
          />
        </div>
      </section>

      <section id="prevention">
        <div className="max-width content-padding mx-auto">
          <Image
            src={cloudfrontImage('/old/images/features/ebola/Ebola-06.png')}
            alt="Ebola prevention and control - measures to stop the spread of the virus"
            width={1400}
            height={2000}
            className="w-full h-auto mb-2"
          />
        </div>
      </section>

      <section id="spread">
        <div className="max-width content-padding mx-auto">
          <Image
            src={cloudfrontImage('/old/images/features/ebola/Ebola-07.png')}
            alt="Potential spread of Ebola - risk factors and global implications"
            width={1400}
            height={2000}
            className="w-full h-auto mb-2"
          />
        </div>
      </section>

      {/* Feedback / Contact */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <p className="text-gray leading-relaxed mb-6">
            Email{' '}
            <a href="mailto:stopebola@goinvo.com" className="text-primary hover:underline">
              stopebola@goinvo.com
            </a>{' '}
            to provide feedback and help evolve this document.
          </p>

          <Divider />

          {/* Related: Ebola Care Guideline */}
          <div className="my-8">
            <Link href="/vision/ebola-care-guideline" className="block group">
              <Image
                src={cloudfrontImage('/old/images/features/ebola/Ebola-08.png')}
                alt="Ebola Care Guideline - An illustrated process on personal protective equipment"
                width={1400}
                height={600}
                className="w-full h-auto mb-4 group-hover:opacity-90 transition-opacity"
              />
            </Link>
            <h3 className="font-serif text-xl mb-2">
              <Link href="/vision/ebola-care-guideline" className="text-primary hover:underline">
                Ebola Care Guideline
              </Link>
            </h3>
            <p className="text-gray text-sm">An Illustrated Process on Personal Protective Equipment</p>
          </div>

          <Divider />
        </div>
      </section>

      {/* Authors */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h2 className="font-serif text-[2.25rem] leading-[2.625rem] font-light text-center mb-2">Authors</h2>

          <Author
            name="Xinyu Liu"
            company="GoInvo"
            image={cloudfrontImage('/old/images/team_photos/xinyu_liu.jpg')}
          >
            Xinyu is a designer with a background in crafting physical objects, conducting research, and influencing human behavior. She leverages invisible sensing tech, composes emotional feedback loops, and creates powerful experiences to enhance daily life.
          </Author>

          <h3 className="header-md mt-6 mb-3">Editor</h3>
          <Author
            name="Emily Twaddell"
            company="GoInvo"
            image={cloudfrontImage('/old/images/features/democracy/contrib/emily.jpg')}
          />

          <h3 className="header-md mt-6 mb-3">Contributing Author</h3>
          <Author
            name="Juhan Sonin"
            company="GoInvo, MIT"
            image={cloudfrontImage('/old/images/features/democracy/contrib/juhan.jpg')}
          />

          <h3 className="header-md mt-6 mb-3">Illustrator</h3>
          <Author
            name="Sarah Kaiser"
            company="GoInvo"
            image={cloudfrontImage('/old/images/features/ebola/contrib/sarah.jpeg')}
          />

          <h3 className="header-md mt-6 mb-3">Developer</h3>
          <Author
            name="Adam Pere"
            company="GoInvo"
            image={cloudfrontImage('/old/images/features/ebola/contrib/adam.jpeg')}
          />

          <p className="text-gray text-sm mt-6">
            Inspired by{' '}
            <a
              href="https://www.designbysoap.co.uk"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              John Pring / Designbysoap
            </a>
          </p>
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
