'use client'

import Image from 'next/image'
import { Button } from '@/components/ui/Button'
import { ImageCarousel } from '@/components/ui/ImageCarousel'
import { cloudfrontImage } from '@/lib/utils'

const comicSlides = Array.from({ length: 6 }, (_, i) => ({
  url: cloudfrontImage(`/images/features/living-health-lab/comic-${i + 1}.png`),
  alt: `Patty's Story comic panel ${i + 1} of 6`,
}))

const paperSlides = Array.from({ length: 3 }, (_, i) => ({
  url: cloudfrontImage(`/images/features/living-health-lab/lhl_paper_test_${i + 1}.jpg`),
  alt: `Paper prototype ${i + 1} of 3`,
}))

const digitalSlides = Array.from({ length: 3 }, (_, i) => ({
  url: cloudfrontImage(`/images/features/living-health-lab/lhl_design_updates_${i + 1}.jpg`),
  alt: `Digital design update ${i + 1} of 3`,
}))

const appendixSlides = Array.from({ length: 3 }, (_, i) => ({
  url: cloudfrontImage(`/images/features/living-health-lab/lhl_research_${i + 1}.jpg`),
  alt: `Non-medicine pain relief research ${i + 1} of 3`,
}))

export function LivingHealthLabCarousels() {
  return (
    <div className="max-width content-padding mx-auto space-y-12 my-8">
      {/* Comic Carousel */}
      <ImageCarousel images={comicSlides} thumbnailSize="lg" />

      {/* Paper Prototype Carousel */}
      <div>
        <h3 className="header-md mt-6 mb-3">3) Paper Prototype: The Workbook</h3>
        <p className="leading-relaxed mb-4">
          In Stage 2, we realized we needed to test our approach firsthand.
          We took our learnings from Stage 1 and created a printable version
          of Living Health Lab. This workbook guides the user towards the
          exploration that best suits their needs based on our research
          (read more about the Health Journey below). It helps the person
          refine what to track, when, for how long, and who can help keep
          them accountable. The workbook includes space to record data
          manually followed by a short guide for reflecting on what they&apos;ve
          learned after the exploration is over. Four of us on the team used
          the workbook to conduct our own self-tracking experiments. With
          our own experiences and feedback from colleagues, we refined the
          draft into this current iteration.
        </p>
        <ImageCarousel images={paperSlides} thumbnailSize="lg" />
        <div className="mt-6">
          <p className="leading-relaxed mb-4">
            <strong>Early results</strong>
            <br />
            Our experiments with the workbook taught all of us more about our
            health. One member of our team realized their health condition was
            more serious than they had thought and decided to seek
            professional help. Another discovered a healthy habit that
            significantly reduced pain and has been living with less pain
            since. The time-bound nature of the exploration made it more
            doable as expected, and the planned group check-in at its
            conclusion created additional accountability.
          </p>
          <p className="leading-relaxed mb-4">
            However, the experience was also far from perfect. For many of us,
            it was hard to keep track of the physical paper and remember to
            log our data daily. Even with the guide, it can still be
            challenging to find creative ways to test hypotheses in our
            fast-paced lives. In general, it is challenging to take the
            initiative to focus on our health and prioritize this kind of
            exploration.
          </p>
          <p className="leading-relaxed mb-4">
            How might we address these problems in the future?
          </p>
          <ol className="ol mb-4">
            <li>
              Integration of technology: a conveniently-timed text prompt
              might improve consistency of day-to-day tracking.
            </li>
            <li>
              Professional Support: increasing personal motivation to
              prioritize health and utilize the workbook can be difficult.
              Ideally, a professional (e.g., health coach or therapist) could
              use Living Health Lab to guide the patient through the process.
            </li>
            <li>
              Accessibility: we can also make the workbook easier to use by
              lowering the reading level, simplifying the workbook further,
              or translating it into other languages. We will continue to
              brainstorm new ways to make personal science more accessible.
            </li>
          </ol>
          <p className="leading-relaxed mb-4">
            <strong>Try it out</strong>
            <br />
            This is still an early version, and we recognize that it is not
            fully accessible to all as it requires comfort level with science
            and significant self-motivation and bandwidth to use on one&apos;s
            own. However, we&apos;re excited to share the workbook with you
            all. Please take a look and share your feedback with us at{' '}
            <a
              href="mailto:LivingHealthLab@goinvo.com"
              className="text-secondary hover:text-primary"
            >
              LivingHealthLab@goinvo.com
            </a>
          </p>
          <div className="mt-6 mb-8">
            <Button
              href="https://www.dropbox.com/s/rw3u29f73v0wfpk/living-health-lab-workbook.pdf?dl=0"
              variant="secondary"
              external
            >
              View The Workbook
            </Button>
          </div>
        </div>
      </div>

      {/* Digital Design Carousel */}
      <div>
        <h3 className="header-md mt-6 mb-3">4) Next Steps: Digital Design</h3>
        <p className="leading-relaxed mb-4">
          The insights from our paper prototype tests are driving the
          digital design phase. After our experience with the workbook, the
          team feels the Living Health Lab approach has real potential to
          create meaningful changes. The digital version aims to solve the
          key challenges we faced: remembering to track, being creative in
          testing, and turning data into insights.
        </p>
        <ImageCarousel images={digitalSlides} thumbnailSize="lg" />
      </div>
    </div>
  )
}

export function LivingHealthLabAppendixCarousel() {
  return <ImageCarousel images={appendixSlides} thumbnailSize="lg" />
}
