'use client'

import Image from 'next/image'
import { Carousel } from '@/components/ui/Carousel'
import { Button } from '@/components/ui/Button'
import { cloudfrontImage } from '@/lib/utils'

const comicSlides = Array.from({ length: 6 }, (_, i) => ({
  src: `/images/features/living-health-lab/comic-${i + 1}.png`,
  alt: `Patty's Story comic panel ${i + 1} of 6`,
}))

const paperSlides = Array.from({ length: 3 }, (_, i) => ({
  src: `/images/features/living-health-lab/lhl_paper_test_${i + 1}.jpg`,
  alt: `Paper prototype ${i + 1} of 3`,
}))

const digitalSlides = Array.from({ length: 3 }, (_, i) => ({
  src: `/images/features/living-health-lab/lhl_design_updates_${i + 1}.jpg`,
  alt: `Digital design update ${i + 1} of 3`,
}))

const appendixSlides = Array.from({ length: 3 }, (_, i) => ({
  src: `/images/features/living-health-lab/lhl_research_${i + 1}.jpg`,
  alt: `Non-medicine pain relief research ${i + 1} of 3`,
}))

function SlideImage({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="flex items-center justify-center">
      <Image
        src={cloudfrontImage(src)}
        alt={alt}
        width={1200}
        height={800}
        className="w-full h-auto"
      />
    </div>
  )
}

export function LivingHealthLabCarousels() {
  return (
    <div className="max-width content-padding mx-auto space-y-12 my-8">
      {/* Comic Carousel */}
      <div>
        <Carousel thumbnails={comicSlides.map(s => cloudfrontImage(s.src))}>
          {comicSlides.map((slide) => (
            <SlideImage key={slide.src} src={slide.src} alt={slide.alt} />
          ))}
        </Carousel>
      </div>

      {/* Paper Prototype Carousel */}
      <div>
        <h3 className="font-serif text-xl mb-4 max-width-md mx-auto">
          3) Paper Prototype: The Workbook
        </h3>
        <div className="max-width-md mx-auto">
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
        </div>
        <Carousel thumbnails={paperSlides.map(s => cloudfrontImage(s.src))}>
          {paperSlides.map((slide) => (
            <SlideImage key={slide.src} src={slide.src} alt={slide.alt} />
          ))}
        </Carousel>
        <div className="max-width-md mx-auto mt-6">
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

          <p className="leading-relaxed mb-4">How might we address these problems in the future?</p>

          <ol className="list-decimal list-outside pl-6 space-y-2 mb-6 leading-relaxed">
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
              lowering the reading level, simplifying the workbook further, or
              translating it into other languages. We will continue to
              brainstorm new ways to make personal science more accessible.
            </li>
          </ol>

          <p className="leading-relaxed mb-4">
            <strong>Try it out</strong>
            <br />
            This is still an early version, and we recognize that it is not
            fully accessible to all as it requires comfort level with science
            and significant self-motivation and bandwidth to use on one&apos;s own.
            However, we&apos;re excited to share the workbook with you all. Please
            take a look and share your feedback with us at{' '}
            <a href="mailto:LivingHealthLab@goinvo.com" className="text-primary hover:underline">
              LivingHealthLab@goinvo.com
            </a>
          </p>

          <div className="mb-6">
            <Button
              href="https://www.dropbox.com/s/rw3u29f73v0wfpk/living-health-lab-workbook.pdf?dl=0"
              variant="primary"
              external
            >
              View The Workbook
            </Button>
          </div>
        </div>
      </div>

      {/* Digital Design Carousel */}
      <div>
        <h3 className="font-serif text-xl mb-4 max-width-md mx-auto">
          4) Next Steps: Digital Design
        </h3>
        <div className="max-width-md mx-auto">
          <p className="leading-relaxed mb-4">
            In Stage 2, we mapped out logic flows and the information
            architecture of Living Health Lab as a native or web app, and we
            began mocking up the screens.
          </p>
        </div>
        <Carousel thumbnails={digitalSlides.map(s => cloudfrontImage(s.src))}>
          {digitalSlides.map((slide) => (
            <SlideImage key={slide.src} src={slide.src} alt={slide.alt} />
          ))}
        </Carousel>
        <div className="max-width-md mx-auto mt-6">
          <p className="leading-relaxed mb-4">
            Making personal science accessible is no small task. Here are the
            top four challenges with this type of digital service based on our
            research and review of similar tools:
          </p>

          <ul className="ul space-y-1 mb-6 leading-relaxed">
            <li>a) Helping the patient set up the right exploration</li>
            <li>b) Reducing the Tracking Burden</li>
            <li>c) Making Personal Science Accessible and Understandable</li>
            <li>d) Providing Actionable Insights and Appropriate Analysis</li>
          </ul>

          <h4 className="font-serif text-lg mt-6 mb-3">a) Helping the patient set up the right exploration</h4>
          <p className="leading-relaxed mb-4">
            Tracking a wide range of factors without clear goals runs the risk
            of overburdening; this is why it is critical to ensure that each
            exploration is designed to closely align with patient goals.
            Setting up the right exploration is no simple task. With so many
            different health concerns and questions, there is no
            one-size-fits-all exploration. Researchers Munson et al. explore
            how crafting the exploration around the patient&apos;s goals leads to
            the best results. These goals can be
            distinct from those of their doctor or the intentions of the
            tool&apos;s designers, and they can change over time as the patient
            learns more. Additionally, patients may need support to clarify
            and define their goals, as their goals may initially be undefined
            or unachievable. Through simple questions, Living Health Lab will
            direct individuals toward the self-tracking strategy that best
            aligns with where they are in their own &quot;Health Journey.&quot;
          </p>
          <Image
            src={cloudfrontImage('/images/features/living-health-lab/health-journey.png')}
            alt="Health Journey framework"
            width={1200}
            height={800}
            className="w-full h-auto mb-4"
          />
          <p className="leading-relaxed mb-4">
            We propose the Health Journey as a general framework for how an
            individual can shift from a lack of awareness of a health problem
            to finding healthy habits to manage that problem daily. Our
            research is only just beginning, and we want to recognize that
            this framework would not have been possible without the research
            that&apos;s already been done—we are particularly grateful to those in
            the Quantified Self as well as all the researchers in the patient
            self-tracking space for their foundational work.
          </p>

          <h4 className="font-serif text-lg mt-6 mb-3">b) Reducing the Tracking Burden</h4>
          <p className="leading-relaxed mb-4">
            Any given individual is more likely to reach their tracking goal
            if it fits easily into their life. A purposeful, well-defined
            exploration reduces the burden by keeping tracking focused. While
            factors like mood or symptom reporting may need to be manually
            reported, other data can be automatically gathered. With the
            patient&apos;s consent, Living Health Lab can gather data from their
            phone, wearables, smart devices, health apps, and more. Living
            Health Lab will likely suggest automated options wherever possible
            and limit manually reported factors to minimize the tracking
            burden.
          </p>
          <p className="leading-relaxed mb-4">
            Living Health Lab can also reduce the tracking burden by providing
            timely insight and options as the user sets up their exploration.
            As they choose what to track, they will be given an estimate of
            how many minutes tracking will take daily to prevent
            overcommitment. The individual can also designate the duration of
            the exploration, with options ranging from one to three weeks. We
            hope to reduce the tracking burden and make health explorations
            feasible for many people. However, we also will need to validate
            this hypothesis and develop additional measures through user
            testing.
          </p>

          <h4 className="font-serif text-lg mt-6 mb-3">c) Making Personal Science Accessible and Understandable</h4>
          <p className="leading-relaxed mb-4">
            Living Health Lab will use multiple approaches to make the
            experience accessible to a wide range of patients. Assuming that
            the individual has no prior knowledge of science or statistics,
            Living Health Lab will infuse clear science tips and ways to learn
            more, provide clarity into the process, and integrate animation
            and other visual aids to support understanding. Additionally,
            content should be written at a fifth-grade reading level.
            Balancing thorough patient education
            with simplicity is a primary challenge that we acknowledge.
          </p>

          <h4 className="font-serif text-lg mt-6 mb-3">d) Providing Actionable Insights and Appropriate Analysis</h4>
          <p className="leading-relaxed mb-4">
            Living Health Lab can become a space for patients to engage in
            activities that strengthen their knowledge, skills, attitudes, and
            confidence in managing their health. The Health Journey framework
            supports a progression from noticing to testing new habits, which
            leads to valuable insight and meaningful behavior change. Much of
            the value of the personal science process comes from the patient&apos;s
            own reflection, drawn out by good questions and bolstered by the
            support of others. However, Living Health Lab will also need to
            provide insight into the data to help patients avoid incorrect
            conclusions and make sense of what they have tracked. Any analysis
            that Living Health Lab provides must be clear without
            over-reaching. We recognize that this balance will be a key
            challenge to overcome.
          </p>
          <p className="leading-relaxed mb-4">
            Even when an exploration doesn&apos;t produce clear findings or show a
            correlation between factors, an individual can still come to new
            realizations about their Health Journey. Wolf et al. found that
            &quot;ancillary benefits include deeper learning about a health topic;
            generation of new ideas for improving their own care; productive
            engagement with clinicians; and providing a sense of agency while
            dealing with the stress of disease and treatment.&quot;
            Regardless of the results for any given
            exploration, a person can still learn in the process. Ultimately,
            the goal is for Living Health Lab to help patients see their
            health and take action to improve their day-to-day health.
          </p>
        </div>
      </div>
    </div>
  )
}

export function LivingHealthLabAppendixCarousel() {
  return (
    <Carousel thumbnails={appendixSlides.map(s => cloudfrontImage(s.src))}>
      {appendixSlides.map((slide) => (
        <SlideImage key={slide.src} src={slide.src} alt={slide.alt} />
      ))}
    </Carousel>
  )
}
