import type { Metadata } from 'next'
import Image from 'next/image'
import { cloudfrontImage } from '@/lib/utils'
import { Author } from '@/components/ui/Author'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'

export const metadata: Metadata = {
  title: 'Print Big. Print Often.',
  description:
    'After almost a decade, we finally replaced our printer. Here are five ways printing big supports our commitment to think big.',
}

export default function PrintBigPage() {
  return (
    <div>
      <SetCaseStudyHero image={cloudfrontImage('/old/images/features/print-big/crane-delivery.jpg')} />

      {/* Intro */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h1 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light">
            Print Big. Print Often.
          </h1>

          <p className="leading-relaxed mb-4">
            After almost a decade, we finally replaced our printer.
          </p>
          <p className="leading-relaxed mb-4">
            OK, so that doesn&apos;t sound particularly momentous. Most printers cost tens or hundreds of dollars and are one step away from being merely disposable. Not our printer! Here is a picture of it being installed earlier this month:
          </p>
        </div>

        {/* Crane delivery images */}
        <div className="max-width content-padding mx-auto mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Image
              src={cloudfrontImage('/old/images/features/print-big/crane-delivery.jpg')}
              alt="Epson P20000 printer sitting on truck ready to be hoisted by a crane"
              width={800}
              height={600}
              className="w-full h-auto"
            />
            <Image
              src={cloudfrontImage('/old/images/features/print-big/crane-delivery-2.jpg')}
              alt="Epson P20000 printer hoisted in the sky by a crane"
              width={800}
              height={600}
              className="w-full h-auto"
            />
          </div>
        </div>

        <div className="max-width max-width-md content-padding mx-auto">
          <p className="leading-relaxed mb-4">
            Yes, that is a crane bringing our printer into our studio. It is a Big Printer. An Epson P20000. We are generally pretty frugal as a business, but our printer is most definitely a splurge. It even has a name: HAL.
          </p>
          <p className="leading-relaxed mb-8">
            Splurging on a printer might seem like a predictable thing for a design studio to do. But our commitment to printing big isn&apos;t about nerding out on lovely design. It is about putting vision ahead of execution. About considering the bigger picture. About focusing on the more important things. I know: these things don&apos;t sound relevant to the use of a printer. Let me share five ways in which it supports our commitment to think big:
          </p>
        </div>
      </section>

      {/* 1. See the whole system together */}
      <section className="py-12">
        <div className="max-width content-padding mx-auto mb-8">
          <Image
            src={cloudfrontImage('/old/images/features/print-big/point-1.jpg')}
            alt="Large scale design of the Standard Health Record ecosystem"
            width={1600}
            height={900}
            className="w-full h-auto"
          />
        </div>
        <div className="max-width max-width-md content-padding mx-auto">
          <h2 className="font-serif text-2xl mt-0 mb-4">
            1. See the whole system together
          </h2>
          <p className="leading-relaxed mb-4">
            The world is split into seemingly infinite pieces, making the most difficult problems to solve often appear impossible. We can&apos;t see everything that needs to be considered, much less parse what is important to consider or not. It is no wonder that our current political environment is increasingly partisan and seemingly intractable!
          </p>
          <p className="leading-relaxed mb-4">
            At the scale of business, system problems are also complex. Not only are there a variety of domains, such as considerations relating to the market, customers, and competitors to name just three, each domain has extensive things to be considered. Truly integrating all of them into planning and decision making requires all of awareness, understanding, relevance, and prioritization of each of them. At best, it&apos;s complicated. At worst, it&apos;s an unnavigable quagmire.
          </p>
          <p className="leading-relaxed mb-4">
            We use our big printer to create system maps that contain everything. Whereas, in strategy, the pieces and parts are typically nested in different documents that do not allow everything to be seen at once, the ability to see everything at once, at anytime, is core to our approach. In order to work through challenges you need to see the whole thing. And you shouldn&apos;t need to struggle to read the details. We know this commitment to visualizing the big picture lets us create better systems.
          </p>
        </div>
      </section>

      {/* 2. Make the details important */}
      <section className="py-12 bg-gray-lightest">
        <div className="max-width content-padding mx-auto mb-8">
          <Image
            src={cloudfrontImage('/old/images/features/print-big/point-2.jpg')}
            alt="A smiling woman kneels in front of a wall filled with large scale design print-outs"
            width={1600}
            height={900}
            className="w-full h-auto"
          />
        </div>
        <div className="max-width max-width-md content-padding mx-auto">
          <h2 className="font-serif text-2xl mt-0 mb-4">
            2. Make the details important
          </h2>
          <p className="leading-relaxed mb-4">
            Details are easy to miss. Have you ever done an offset printing project for something like a brochure? The most critical step in the entire creationary process is pouring over the proofs and looking for any little error. After all, once they get the giant printing presses started, there is no going back. Any errors you missed are permanently in your brochure &mdash; unless you want to pay double to run the whole damn thing over again.
          </p>
          <p className="leading-relaxed mb-4">
            It is easy to miss the little details. Modern work is splintered into myriad responsibilities and activities. Keeping track of our various domains are hard enough; properly addressing all of the small details to do our thing consistently optimal can feel impossible. It is too simple for tiny bits to get lost in a sea of everything.
          </p>
          <p className="leading-relaxed mb-4">
            Big things are hard to lose. By printing our work big, we can show it big. Things that would be miniscule or even excluded in a more traditional representation are instead easy to see and, consequently, easy to think about. Their large presence makes them something that can&apos;t be ignored. It allows all of the details to be considered and addressed &mdash; before the bits and bytes start getting pushed and changes, like in the example of printing the brochure, become far more expensive.
          </p>
        </div>
      </section>

      {/* 3. Invite everyone to participate */}
      <section className="py-12">
        <div className="max-width content-padding mx-auto mb-8">
          <Image
            src={cloudfrontImage('/old/images/features/print-big/point-3.jpg')}
            alt="A designer and client huddle around a table with a large scale design print-out, pointing to areas"
            width={1600}
            height={900}
            className="w-full h-auto"
          />
        </div>
        <div className="max-width max-width-md content-padding mx-auto">
          <h2 className="font-serif text-2xl mt-0 mb-4">
            3. Invite everyone to participate
          </h2>
          <p className="leading-relaxed mb-4">
            I don&apos;t know about you, but I generally feel powerless to impact the world. Why? The influence and decision making process is entirely removed from my view, let alone my engagement. Sure, I know how democracy works and that my involvement is through the proxy of my elected officials. But that is hardly any better. I don&apos;t even know if things are happening that I should care about, because I am not aware of them. Once I&apos;m aware of them, all I can do is write or call my representative. I&apos;m neutered from influencing the policies that impact my life.
          </p>
          <p className="leading-relaxed mb-4">
            When working in large companies, I often felt similarly disempowered. Policies and strategies changed without warning or explanation. Ill-conceived new initiatives started that seemed ignorant of on-the-ground knowledge that could have made the initiative more successful from the very beginning. My being structurally disconnected squandered my ability to contribute while demoralizing me and making me feel outside of the team and culture. This is the modus operandi in most companies, especially large ones.
          </p>
          <p className="leading-relaxed mb-4">
            This learned complacency has to be broken. It&apos;s not good enough only to write your state representative or plead design efforts to executives. We need to organize, make, and feed our local futures, and not lose heart at each set back. (For one example, see{' '}
            <a
              href="http://arlingtonvisualbudget.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Arlington Visual Budget
            </a>
            .)
          </p>
          <p className="leading-relaxed mb-4">
            Large prints invite everyone to participate. This is true in a small meeting where, instead of people huddling and squinting to see what is going on they can take their own space and time and comfort to explore what we have to share. It is also true in the everyday rhythm of the company. One of the most powerful cultural impacts we have is when our big print deliverables are hung up on a wall at our clients. It invites everyone to walk up and take a look. To discuss. To think. To share ideas. Suddenly, for example, a financial administrator is involved in the innovation process. They feel bought in. They ask questions and share ideas. They raise concerns. The extended tribe of participants now includes many people. The work we are doing is better for it; the company culture is better for it. The dynamic is, in a word, wonderful.
          </p>
        </div>
      </section>

      {/* 4. Support a perpetual process */}
      <section className="py-12 bg-gray-lightest">
        <div className="max-width content-padding mx-auto mb-8">
          <Image
            src={cloudfrontImage('/old/images/features/print-big/point-4.jpg')}
            alt="Invo's Care Cards printed as large posters, hung up in various areas of the doctor's office"
            width={1600}
            height={900}
            className="w-full h-auto"
          />
        </div>
        <div className="max-width max-width-md content-padding mx-auto">
          <h2 className="font-serif text-2xl mt-0 mb-4">
            4. Support a perpetual process
          </h2>
          <p className="leading-relaxed mb-4">
            Change is a process, not an event. Yet, so much of the world implements change as if it were an event, something to be done with and move past. Much of this is the product of physical limitations. For example, the sheer volume of legislation a government needs to process, requiring a focus change once an issue has been &ldquo;resolved&rdquo;. Or, the physical constraints of the brochure we mentioned earlier which, once it has been printed, has to be done. The cost of paper, ink, and machineworks dictates it.
          </p>
          <p className="leading-relaxed mb-4">
            The digital world has changed this, somewhat. Websites shifted the creative process for business away from the &ldquo;big button&rdquo; publishing model over to one of incremental and perpetual change. The lack of limitations in digital publishing compared to analog enabled this, subsequently refined over more than two decades. This carried over to areas like product development, making once-niche approaches like lean engineering what is increasingly a ubiquitous standard.
          </p>
          <p className="leading-relaxed mb-4">
            Remember the point about putting big prints on the wall for all to see? Inclusivity and participation are part of that, but so is a commitment to iteration and perpetual improvement. The presence of the work in a format and environment that encourages engagement from all results in a form of intellectual testing and retesting that goes on for the weeks, months, or years that the invention or innovation requires. It moves the work from one of deliverable drops and coarse opportunities for interactivity to a perpetual process of refinement. The results are spectacular.
          </p>
        </div>
      </section>

      {/* 5. Encourage play to stimulate success */}
      <section className="py-12">
        <div className="max-width content-padding mx-auto mb-8">
          <Image
            src={cloudfrontImage('/old/images/features/print-big/point-5.jpg')}
            alt="Overhead shot of Invo artwork printed very large, spread out on the floor with team scattered around"
            width={1600}
            height={900}
            className="w-full h-auto"
          />
        </div>
        <div className="max-width max-width-md content-padding mx-auto">
          <h2 className="font-serif text-2xl mt-0 mb-4">
            5. Encourage play to stimulate success
          </h2>
          <p className="leading-relaxed mb-4">
            Over the last 20 years we&apos;ve seen the boundaries between our work lives and personal lives blur. This is a product of technology, as things like email, laptops, and smartphones equipped us with magical devices that erased the constraints of time.
          </p>
          <p className="leading-relaxed mb-4">
            Yet, while our work and personal lives are blurring, our work is scarcely becoming any more fun. We are losing part of our personal lives, where we can let our hair down and express ourselves, which is merely being appropriated by our work. And for most people, work remains work. One of my favorite quotes is from playwright Noel Coward. Looking back on his life he remarked &ldquo;Work was more fun than fun.&rdquo; Is that the case for you? For most of us? Hardly.
          </p>
          <p className="leading-relaxed mb-4">
            As a design studio, it is taken for granted that we offer a work environment that is more expressive and, yes, fun than what a typical corporation is able to offer. But HAL allows us to take that to a different level, in a way that any company can as well. Both in the client work we are proud of and amazed by, and in our own advocacy and internal projects, our big printer enables us to amplify those efforts. Beautiful art is lovely and feels good but is not necessarily fun. Beautiful art printed out at a massive scale that would impress even the Banksy and Shepard Fairey&apos;s of the world? FUN! Decidedly, unambiguously fun.
          </p>
        </div>
      </section>

      {/* Closing */}
      <section className="py-12 bg-gray-lightest">
        <div className="max-width content-padding mx-auto mb-8">
          <Image
            src={cloudfrontImage('/old/images/features/print-big/end.jpg')}
            alt="Invo team members having fun displaying their 'Healthcare is a Human Right' large-scale print-out"
            width={1600}
            height={900}
            className="w-full h-auto"
          />
        </div>
        <div className="max-width max-width-md content-padding mx-auto">
          <p className="leading-relaxed mb-4">
            So, sure. HAL is likely not going to completely change the world. It certainly helps us to make better things, and to have and help build cultures that encourage creativity, inclusion, and perpetual improvement. It makes us happier. And the things we make change lives, in some cases millions of them.
          </p>
          <p className="leading-relaxed mb-4 font-semibold">
            You know, HAL just might be changing the world after all.
          </p>
        </div>
      </section>

      {/* Author */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h2 className="font-serif text-[2.25rem] leading-[2.625rem] font-light text-center">
            Author
          </h2>
          <Author name="Juhan Sonin" company="GoInvo, MIT" />
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
