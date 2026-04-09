import type { Metadata } from 'next'
import Image from 'next/image'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import './print-big.css'

export const metadata: Metadata = {
  title: 'Print Big. Print Often.',
  description:
    'After almost a decade, we finally replaced our printer. Here are five ways printing big supports our commitment to think big.',
  twitter: {
    card: 'summary_large_image',
    site: '@goinvo',
    title: 'Print Big. Print Often.',
    description: 'Print big. Print often.',
    images: ['https://www.goinvo.com/old/images/features/print-big/hero.jpg'],
  },
}

export default function PrintBigPage() {
  return (
    <div className="print-big pt-[var(--spacing-header-height)]">
      {/* Hero */}
      <section className="print-big__hero">
        <div className="print-big__hero-text-wrapper">
          <h1>
            <span className="cyan">P</span>
            <span className="magenta">r</span>
            <span className="yellow">i</span>
            <span className="cyan">n</span>
            <span className="magenta">t</span>
            {' '}
            <span className="yellow">B</span>
            <span className="cyan">i</span>
            <span className="magenta">g</span>
            <span className="yellow">.</span>
            <br />
            <span className="cyan">P</span>
            <span className="magenta">r</span>
            <span className="yellow">i</span>
            <span className="cyan">n</span>
            <span className="magenta">t</span>
            {' '}
            <span className="yellow">O</span>
            <span className="cyan">f</span>
            <span className="magenta">t</span>
            <span className="yellow">e</span>
            <span className="cyan">n</span>
            <span className="magenta">.</span>
          </h1>
        </div>
      </section>

      {/* Intro */}
      <section className="print-big__section">
        <p>After almost a decade, we finally replaced our printer.</p>
        <p>OK, so that doesn&apos;t sound particularly momentous. Most printers cost tens or hundreds of dollars and are one step away from being merely disposable. Not our printer! Here is a picture of it being installed earlier this month:</p>
      </section>

      {/* Crane delivery images */}
      <section className="print-big__section">
        <div className="print-big__inline-pix">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt="Epson P20000 printer sitting on truck ready to be hoisted by a crane for delivery into the studio"
            className="tall-boy"
            src="https://www.goinvo.com/old/images/features/print-big/crane-delivery.jpg"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt="Epson P20000 printer hoisted in the sky by a crane"
            className="tall-boy"
            src="https://www.goinvo.com/old/images/features/print-big/crane-delivery-2.jpg"
          />
        </div>
        <p>Yes, that is a crane bringing our printer into our studio. It is a Big Printer. An Epson P20000. We are generally pretty frugal as a business, but our printer is most definitely a splurge. It even has a name: HAL.</p>
        <p>Splurging on a printer might seem like a predictable thing for a design studio to do. But our commitment to printing big isn&apos;t about nerding out on lovely design. It is about putting vision ahead of execution. About considering the bigger picture. About focusing on the more important things. I know: these things don&apos;t sound relevant to the use of a printer. Let me share five ways in which it supports our commitment to think big:</p>
      </section>

      {/* 1. See the whole system together */}
      <section className="print-big__section">
        <h3 className="print-big__h3">1. See the whole system together</h3>
        <p>The world is split into seemingly infinite pieces, making the most difficult problems to solve often appear impossible. We can&apos;t see everything that needs to be considered, much less parse what is important to consider or not. It is no wonder that our current political environment is increasingly partisan and seemingly intractable!</p>
        <p>At the scale of business, system problems are also complex. Not only are there a variety of domains, such as considerations relating to the market, customers, and competitors to name just three, each domain has extensive things to be considered. Truly integrating all of them into planning and decision making requires all of awareness, understanding, relevance, and prioritization of each of them. At best, it&apos;s complicated. At worst, it&apos;s an unnavigable quagmire.</p>
        <p>We use our big printer to create system maps that contain everything. Whereas, in strategy, the pieces and parts are typically nested in different documents that do not allow everything to be seen at once, the ability to see everything at once, at anytime, is core to our approach. In order to work through challenges you need to see the whole thing. And you shouldn&apos;t need to struggle to read the details. We know this commitment to visualizing the big picture lets us create better systems.</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt="Large scale design of the Standard Health Record ecosystem" src="https://www.goinvo.com/old/images/features/print-big/point-1.jpg" />
      </section>

      {/* 2. Make the details important */}
      <section className="print-big__section">
        <h3 className="print-big__h3">2. Make the details important</h3>
        <p>Details are easy to miss. Have you ever done an offset printing project for something like a brochure? The most critical step in the entire creationary process is pouring over the proofs and looking for any little error. After all, once they get the giant printing presses started, there is no going back. Any errors you missed are permanently in your brochure - unless you want to pay double to run the whole damn thing over again.</p>
        <p>It is easy to miss the little details. Modern work is splintered into myriad responsibilities and activities. Keeping track of our various domains are hard enough; properly addressing all of the small details to do our thing consistently optimal can feel impossible. It is too simple for tiny bits to get lost in a sea of everything.</p>
        <p>Big things are hard to lose. By printing our work big, we can show it big. Things that would be miniscule or even excluded in a more traditional representation are instead easy to see and, consequently, easy to think about. Their large presence makes them something that can&apos;t be ignored. It allows all of the details to be considered and addressed - before the bits and bytes start getting pushed and changes, like in the example of printing the brochure, become far more expensive.</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt="A smiling woman kneels infront of a wall filled with large scale design print-outs" src="https://www.goinvo.com/old/images/features/print-big/point-2.jpg" />
      </section>

      {/* 3. Invite everyone to participate */}
      <section className="print-big__section">
        <h3 className="print-big__h3">3. Invite everyone to participate</h3>
        <p>I don&apos;t know about you, but I generally feel powerless to impact the world. Why? The influence and decision making process is entirely removed from my view, let alone my engagement. Sure, I know how democracy works and that my involvement is through the proxy of my elected officials. But that is hardly any better. I don&apos;t even know if things are happening that I should care about, because I am not aware of them. Once I&apos;m aware of them, all I can do is write or call my representative. I&apos;m neutered from influencing the policies that impact my life.</p>
        <p>When working in large companies, I often felt similarly disempowered. Policies and strategies changed without warning or explanation. Ill-conceived new initiatives started that seemed ignorant of on-the-ground knowledge that could have made the initiative more successful from the very beginning. My being structurally disconnected squandered my ability to contribute while demoralizing me and making me feel outside of the team and culture. This is the modus operandi in most companies, especially large ones.</p>
        <p>This learned complacency has to be broken. It&apos;s not good enough only to write your state representative or plead design efforts to executives. We need to organize, make, and feed our local futures, and not lose heart at each set back. (For one example, see <a href="http://arlingtonvisualbudget.org/" target="_blank" rel="noopener noreferrer">Arlington Visual Budget</a>.)</p>
        <p>Large prints invite everyone to participate. This is true in a small meeting where, instead of people huddling and squinting to seeing what is going on they can take their own space and time and comfort to explore what we have to share. It is also true in the everyday rhythm of the company. One of the most powerful cultural impacts we have is when our big print deliverables are hung up on a wall at our clients. It invites everyone to walk up and talk a look. To discuss. To think. To share ideas. Suddenly, for example, a financial administrator is involved in the innovation process. They feel bought in. They ask questions and share ideas. They raise concerns. The extended tribe of participants now includes many people. The work we are doing is better for it; the company culture is better for it. The dynamic is, in a word, wonderful.</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt="A designer and client's huddle around a table with a large scale design print-out, pointing to areas of the design" src="https://www.goinvo.com/old/images/features/print-big/point-3.jpg" />
      </section>

      {/* 4. Support a perpetual process */}
      <section className="print-big__section">
        <h3 className="print-big__h3">4. Support a perpetual process</h3>
        <p>Change is a process, not an event. Yet, so much of the world implements change as if it were an event, something to be done with and move past. Much of this is the product of physical limitations. For example, the sheer volume of legislation a government needs to process, requiring a focus change once an issue has been &ldquo;resolved&rdquo;. Or, the physical constraints of the brochure we mentioned earlier which, once it has been printed, has to be done. The cost of paper, ink, and machineworks dictates it.</p>
        <p>The digital world has changed this, somewhat. Websites shifted the creative process for business away from the &ldquo;big button&rdquo; publishing model over to one of incremental and perpetual change. The lack of limitations in digital publishing compared to analog enabled this, subsequently refined over more than two decades. This carried over to areas like product development, making once-niche approaches like lean engineering what is increasingly a ubiquitous standard.</p>
        <p>Remember the point about putting big prints on the wall for all to see? Inclusivity and participation are part of that, but so is a commitment to iteration and perpetual improvement. The presence of the work in a format and environment that encourages engagement from all results in a form of intellectual testing and retesting that goes on for the weeks, months, or years that the invention or innovation requires. It moves the work from one of deliverable drops and coarse opportunities for interactivity to a perpetual process of refinement. The results are spectacular.</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt="Invo's Care Cards printed as large posters, hung up in various areas of the doctor's office." className="tall-boy" src="https://www.goinvo.com/old/images/features/print-big/point-4.jpg" />
      </section>

      {/* 5. Encourage play to stimulate success */}
      <section className="print-big__section">
        <h3 className="print-big__h3">5. Encourage play to stimulate success</h3>
        <p>Over the last 20 years we&apos;ve seen the boundaries between our work lives and personal lives blur. This is a product of technology, as things like email, laptops, and smartphones equipped us with magical devices that erased the constraints of time.</p>
        <p>Yet, while our work and personal lives are blurring, our work is scarcely becoming any more fun. We are losing part of our personal lives, where we can let our hair down and express ourselves, which is merely being appropriated by our work. And for most people, work remains work. One of my favorite quotes is from playwright Noel Coward. Looking back on his life he remarked &ldquo;Work was more fun than fun.&rdquo; Is that the case for you? For most of us? Hardly.</p>
        <p>As a design studio, it is taken for granted that we offer a work environment that is more expressive and, yes, fun than what a typical corporation is able to offer. But HAL allows us to take that to a different level, in a way that any company can as well. Both in the client work we are proud of and amazed by, and in our own advocacy and internal projects, our big printer enables us to amplify those efforts. Beautiful art is lovely and feels good but is not necessarily fun. Beautiful art printed out at a massive scale that would impress even the Banksy and Shepard Fairey&apos;s of the world? FUN! Decidedly, unambiguously fun.</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt="Overhead shot of Invo artwork printed very large, spread out on the floor with the studio team scattered around smiling" src="https://www.goinvo.com/old/images/features/print-big/point-5.jpg" />
      </section>

      {/* Closing */}
      <section className="print-big__section">
        <p>So, sure. HAL is likely not going to completely change the world. It certainly helps us to make better things, and to have and help build cultures that encourage creativity, inclusion, and perpetual improvement. It makes us happier. And the things we make change lives, in some cases millions of them.</p>
        <p>You know, HAL just might be changing the world after all.</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt="Invo team members having fun displaying their 'Healthcare is a Human Right' large-scale print-out on the floor" className="tall-boy" src="https://www.goinvo.com/old/images/features/print-big/end.jpg" />
      </section>

      {/* Author */}
      <section className="print-big__section">
        <p>
          By Juhan Sonin
          <br />
          <a href="mailto:juhan@goinvo.com">juhan@goinvo.com</a>
        </p>
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
