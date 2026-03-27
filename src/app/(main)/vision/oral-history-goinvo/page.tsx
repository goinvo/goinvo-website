import type { Metadata } from 'next'
import Image from 'next/image'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'
import { Divider } from '@/components/ui/Divider'

const legacyImage = (path: string) => `https://www.goinvo.com/old/images/features/an-oral-history/${path}`

export const metadata: Metadata = {
  title: 'An Oral History of GoInvo',
  description:
    'An interview with past and present Invoites about the past and present of GoInvo.',
}

function SpeakerQuote({
  initials,
  fullName,
  children,
}: {
  initials?: string
  fullName?: string
  children: React.ReactNode
}) {
  return (
    <div className="mb-6">
      <p className="leading-relaxed text-gray">
        {fullName && <strong className="text-black">{fullName} </strong>}
        {initials && !fullName && (
          <strong className="text-black">{initials} </strong>
        )}
        {children}
      </p>
    </div>
  )
}

function Sidebar({
  imageSrc,
  children,
}: {
  imageSrc?: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-gray-lightest p-4 my-6">
      {imageSrc && (
        <div className="mb-3">
          <Image
            src={imageSrc}
            alt=""
            width={400}
            height={300}
            className="w-full h-auto"
          />
        </div>
      )}
      <p className="text-sm text-gray leading-relaxed">{children}</p>
    </div>
  )
}

function SectionHeader({
  id,
  number,
  title,
  subtitle,
  images,
}: {
  id: string
  number: number
  title: string
  subtitle?: string
  images?: string[]
}) {
  return (
    <div id={id} className="mb-8 scroll-mt-24">
      <div className="bg-tertiary text-white p-6 md:p-10">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex-1">
            <p className="text-sm uppercase tracking-widest opacity-70 mb-2">
              Part {number}
            </p>
            <h2 className="font-serif text-2xl lg:text-3xl font-light">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-3 opacity-80 leading-relaxed">{subtitle}</p>
            )}
          </div>
          {images && images.length > 0 && (
            <div className="flex gap-3">
              {images.map((img, i) => (
                <Image
                  key={i}
                  src={img}
                  alt=""
                  width={120}
                  height={120}
                  className="w-20 h-20 md:w-28 md:h-28 object-cover"
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function OralHistoryGoinvoPage() {
  return (
    <div>
      <SetCaseStudyHero
        image="https://www.goinvo.com/old/images/features/an-oral-history/hero-part_2.jpg"
      />

      {/* Title and Navigation */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h1 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light mb-2">
            An Oral History of GoInvo
          </h1>
          <p className="text-gray leading-relaxed mb-8 text-lg font-serif italic">
            To celebrate our 10 year anniversary some of Invo&apos;s leaders past
            and present came together to remember the ups and downs of our
            studio.
          </p>

          {/* Table of Contents */}
          <nav className="mb-8 flex flex-wrap gap-2">
            {[
              { id: 'origins', label: '1. Origins' },
              { id: 'silicon-valley', label: '2. Rise, Silicon Valley' },
              { id: 'interesting-times', label: '3. Interesting Times' },
              { id: 'boston', label: '4. Rise, Boston' },
              { id: 'today-tomorrow', label: '5. Today, and Tomorrow' },
            ].map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="text-sm px-3 py-1 border border-gray-light text-gray hover:bg-gray-lightest transition-colors"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <Divider />

          {/* ===== SECTION 1: ORIGINS ===== */}
          <SectionHeader
            id="origins"
            number={1}
            title="Origins"
            subtitle="Andrei Herasimchuk and Dirk Knemeyer incorporated GoInvo in Palo Alto, California, on June 29, 2004."
            images={[
              legacyImage('andrei-sqr.jpg'),
              legacyImage('dirk-sqr.jpg'),
            ]}
          />

          <SpeakerQuote fullName="Dirk Knemeyer:">
            So it all started with a{' '}
            <a
              href="http://boxesandarrows.com/information-design-the-understanding-discipline/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Boxes and Arrows article.
            </a>
          </SpeakerQuote>

          <SpeakerQuote fullName="Andrei Herasimchuk:">
            I haven&apos;t read that article in a while, and re-reading my
            comments on it, I&apos;m surprised at how much I still agree with my
            younger self! In fact, many of my concerns about titles, job
            descriptions, and confusion over design and the tech sector have come
            to fruition. Having said that, I know I come off as overly direct in
            the way I speak and write, but I really was attempting to be as
            diplomatic as I knew how in my comments to that article.
          </SpeakerQuote>

          <SpeakerQuote initials="DK:">
            Yeah, there is still a lot of truth there. It&apos;s funny, because
            I don&apos;t generally like rough feedback and critiques, but I knew
            that I had the opportunity to learn a lot from engaging you, so I
            did. At one point you told me that usually people didn&apos;t engage
            because of your style, but the learning was worth it for me.
          </SpeakerQuote>

          <SpeakerQuote initials="AMH:">
            And the fact that you responded in a diplomatic manner earned you a
            lot of points with me. I was back working at Adobe in 2003 on
            Project Shadowland (which would later become{' '}
            <a
              href="http://www.adobe.com/products/photoshop-lightroom.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Adobe Photoshop Lightroom
            </a>
            ) and I was in an environment with Adobe&apos;s engineers where
            everyone was always direct and blunt with each other. It was a manner
            of working that I tend to prefer, as the work you get done is of a
            high caliber, but I often forget it&apos;s not for everyone.
          </SpeakerQuote>

          <SpeakerQuote initials="DK:">
            True, but it is certainly common in the engineering community. Not so
            much among designers though! :-) It is a little-known fact that when
            you first came up with the{' '}
            <a
              href="http://www.designbyfire.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              &ldquo;Design by Fire&rdquo;
            </a>{' '}
            concept for a brand it was loosely you, me, Ben Listwon, and Bob
            Baxley doing something undefined around it. I remember a call where
            the three of you were at your house in Sunnyvale and I was at my
            house in Toledo, Ohio and we were talking about that. Nothing really
            happened with it while we were together, but you took off with
            Design by Fire and it was really important in the global design
            conversation for a while.
          </SpeakerQuote>

          <SpeakerQuote initials="AMH:">
            I was in the midst of doing a lot of product research at Adobe, not
            the least of which was trying to understand better how blogging
            tools, databases, and web technologies worked to see what could work
            in Shadowland. I had been noodling with a Design by Fire logo and
            concepts for content focused on digital design trends. Initially, I
            was thinking we could write and publish a design book and have a
            digital component with it. Ultimately, I just went ahead and built a
            blog with{' '}
            <a
              href="http://www.movabletype.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              MovableType
            </a>{' '}
            tools. Near the end of 2003, I hit Publish without much thought
            other than, &ldquo;I have to learn how these web tools work.&rdquo;
            That, and I had a bunch of things I wanted to say to the world. In
            the first few months of 2004, I went on a tear writing and
            publishing all sorts of material, getting as much attention as I
            could from the early design bloggers who had already paved the road
            on the Internet. I used my Adobe background as a quick means to gain
            credibility within the online design community, along with a few
            contests, giving away signed Photoshop and Illustrator boxes. A few
            key articles came out of that period,{' '}
            <a
              href="http://www.designbyfire.com/?p=5"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Gurus v. Bloggers
            </a>
            ,{' '}
            <a
              href="http://www.designbyfire.com/?p=6"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              I would RTFM if there was a FM to FR
            </a>
            , and the biggie,{' '}
            <a
              href="http://www.designbyfire.com/?p=4"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Design Eye for Usability Guy
            </a>
            .
          </SpeakerQuote>

          <SpeakerQuote initials="DK:">
            Design Eye for the Usability Guy was definitely the high-water mark.
            Unlike you, I didn&apos;t have a center of gravity for my writing. A
            bunch of stuff was hitting through my employer&apos;s website, but I
            was also making the rounds on the popular online publications like
            Boxes and Arrows,{' '}
            <a
              href="http://www.uxmatters.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              UXmatters
            </a>
            , and{' '}
            <a
              href="http://www.digital-web.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Digital Web
            </a>
            . I was starting to speak at conferences quite a bit, too, and
            participate on different boards. I was learning and exploring all at
            once, and my ability to communicate well in the process really
            brought up my profile.
          </SpeakerQuote>

          <SpeakerQuote initials="AMH:">
            I was doing something similar, in that I was learning publicly what
            worked and what didn&apos;t. How to write, how to be snarky, how to
            build MT templates, how PHP, Apache, and other web tech worked. I
            was learning completely out in the open, which is partly the ethos of
            Design by Fire. The brand was a play on Trial by Fire, and evokes a
            passionate fire within sensibility, both things I was deeply
            immersed in at that time.
          </SpeakerQuote>

          <Sidebar imageSrc={legacyImage('3_boxes_arrows_logo.gif')}>
            The venerable Boxes &amp; Arrows was one of the first online UX
            publications, a favourite of the early intelligentsia.
          </Sidebar>

          <SpeakerQuote initials="DK:">
            While the blog finally quieted the influence certainly continued. A
            few years later they{' '}
            <a
              href="http://www.designbyfire.nl/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              even started a conference around you/the idea
            </a>{' '}
            which I think is about the greatest compliment for one&apos;s ideas.
            At some point when we were just talking about design theory I told
            you about my desire to create a design studio. I actually don&apos;t
            even remember doing it, but I was sharing that idea with a lot of
            people at the time. Anyway, sometime later my employer was reneging
            on a variety of agreements around my compensation and an equity
            position in the firm. So I was ready to do something else. Then, out
            of the blue you asked me if I wanted to do the design studio I
            talked about, and do it together with you. So we did.
          </SpeakerQuote>

          <SpeakerQuote initials="AMH:">
            Yes. Something that was going on for me at the time was that I was
            having trouble being back at Adobe but not being a part of the
            design team I had helped to create. I felt too much like an outsider
            and was somewhat unhappy with my role there. After two years doing my
            best to help the Shadowland project, I was still unable to find a
            satisfying role within the company. So, I asked you about starting a
            design company, since you had brought it up multiple times in email
            exchanges and phone conversations.
          </SpeakerQuote>

          <Sidebar imageSrc={legacyImage('4-adobe_logo.gif')}>
            Andrei dropped out of Amherst College in 1990 to join Specular
            International, an early digital graphics company, as a founding
            member. In 1995 he left to join Adobe as their first interface
            designer. Andrei envisioned the creative strategy that resulted in
            the Adobe Creative Suite and built the Adobe design team from the
            ground up. After leaving Adobe for a few years to work on startups,
            Andrei returned in 2002 to serve as the project lead for Lightroom.
          </Sidebar>

          <SpeakerQuote initials="DK:">
            And don&apos;t forget that Bob Baxley was involved with us on it for
            about five minutes! I remember the first time I flew out to meet
            with you and Bob. I think it was May of 2004. We had already decided
            to move forward&mdash;never having met!&mdash;and it was time to
            figure out the identity and start really planning. We had talked
            about the name Syntex Design, which I think you liked more than I
            did. But along with Bob and your wife, Donna Driscoll, we came up
            with GoInvo. That&apos;s one of the three things I will never forget
            from that trip, sitting in the studio in your backyard and hammering
            through a naming exercise. The other two things are y&apos;all
            driving me up and down the peninsula introducing me to Silicon
            Valley, and when my plane was flying into SFO. I had never been to
            California, and I remember looking out the window as the plane was
            coming in and thinking, &ldquo;Hey, it&apos;s the Pacific
            Ocean!&rdquo; (I learned later that it was actually San Francisco
            Bay.) It was thrilling to be flying in, knowing we were going to
            start something that I was so excited and optimistic about.
          </SpeakerQuote>

          <SpeakerQuote initials="AMH:">
            Yeah, Bob decided he wasn&apos;t ready for a startup gig, and lucky
            for him, he joined Apple right before the stock took off. So he did
            well enough for himself.
          </SpeakerQuote>

          <Sidebar imageSrc={legacyImage('5-jakob_neilson.jpg')}>
            &ldquo;Usability Guy&rdquo; Jakob Nielsen was the premier thought
            leader in UX-related disciplines prior to the emergence of Jeffrey
            Zeldman. Dirk predicted the decline of Nielsen and his left-brained
            approach to the Internet with the controversial{' '}
            <a
              href="http://www.digital-web.com/articles/end_of_usability_culture/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              The End of Usability Culture
            </a>
            .
          </Sidebar>

          <SpeakerQuote initials="DK:">
            Of course, I spent the first year in Boston instead of Silicon
            Valley. It didn&apos;t make a whole lot of sense from a business
            perspective, but my girlfriend was there and life is all about
            priorities, right? Actually, at the time I saw it as an asset,
            because we could put both Silicon Valley and Boston on our website.
            This was before working remotely was common, so there was a certain
            cachet in having multiple locations, although in a perfect world I
            would have just been in Silicon Valley from the beginning.
          </SpeakerQuote>

          <SpeakerQuote initials="AMH:">
            That first year was difficult for me. I had never worked solo in my
            career up to that point. Being on my own and trying to figure it all
            out while you were remote was something I had a rough time doing.
          </SpeakerQuote>

          <SpeakerQuote initials="DK:">
            Yeah, the first six months were especially tough sledding. We had a
            couple of really small projects&mdash;under $10,000&mdash;and then
            the{' '}
            <a
              href="http://www.gsb.stanford.edu/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Stanford
            </a>{' '}
            project that was from one of Bob&apos;s connections. But even that
            was only a $15K&apos;er. Thinking back, it is remarkable we were
            able to attract work and get momentum. We both drew a lot of
            attention in the digital design community, and you had a number of
            relationships in Silicon Valley. But neither of us were really
            selling.
          </SpeakerQuote>

          <SpeakerQuote initials="AMH:">
            Selling was something I still hadn&apos;t gotten the hang of at all.
            I knew how to sell software, and I had done that with Specular, but
            I had never dealt with selling services or myself in a services
            capacity. It was all brand new to me, and the more I learned about
            it, the more I was glad that you had a real background in this area.
            I learned the hard way, in those early months of GoInvo, that
            I&apos;m a horrible salesman.
          </SpeakerQuote>

          <Sidebar imageSrc={legacyImage('6-bob_baxley.jpg')}>
            Bob Baxley authored one of the first books on interaction design,{' '}
            &ldquo;
            <a
              href="http://www.amazon.com/Making-Web-Work-Designing-Applications/dp/0735711968"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Making the Web Work
            </a>
            &rdquo;. After noodling around at Invo for a few months he moved on
            to Director-level design roles at Yahoo! and then Apple, where he
            oversaw design for Apple.com. Today Bob is Head of Product Design
            &amp; Research at Pinterest.
          </Sidebar>

          <SpeakerQuote initials="DK:">
            Nah, just a creator at heart! So, the big breakthrough for us was the
            Memory Matrix project. That came in through your friend{' '}
            <a
              href="http://en.wikipedia.org/wiki/Lou_Montulli"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Lou Montulli
            </a>
            , one of the original{' '}
            <a
              href="http://en.wikipedia.org/wiki/Netscape"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Netscape
            </a>{' '}
            engineers. Lou&apos;s company was being funded by{' '}
            <a
              href="http://en.wikipedia.org/wiki/James_H._Clark"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Jim Clark
            </a>
            , so Lou had real money backing him.
          </SpeakerQuote>

          <SpeakerQuote initials="AMH:">
            I remember meeting with Lou, Alex, Jeff, Jason, and Garrett at
            Alex&apos;s house in Palo Alto. Alex was also one of the first
            Netscape engineers. Initially, Lou and Alex wanted me to join them,
            but I was committed to GoInvo. As much as I liked all of those guys,
            I really wanted to build a company I had a stake in as a founder.
          </SpeakerQuote>

          <Sidebar imageSrc={legacyImage('7-w3c_logo.png')}>
            Andrei&apos;s logo design for Syntex was later donated to the W3C.
          </Sidebar>

          <SpeakerQuote initials="DK:">
            Yeah we were both ready to run our own thing at that point. Memory
            Matrix really did so much for us. Along with being a big chunk of
            cash it connected us to new people who would become future clients,
            and it gave us the opportunity to start bringing really good people
            into the fold. That was the first time we worked with{' '}
            <a
              href="https://twitter.com/dbedingfield"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Dave Bedingfield
            </a>
            , and he went on to be, in my mind, our most important resource in
            the history of the Silicon Valley studio.
          </SpeakerQuote>

          <SpeakerQuote initials="AMH:">
            Bedingfield was one of our secret weapons. I had reached out to{' '}
            <a
              href="http://www.shauninman.com/pendium/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Shaun Inman
            </a>{' '}
            to see if he could help us with building a Flash prototype of the
            Memory Matrix client so we could do some early testing and research.
            Shaun was busy, but he gave me the contact info for Bedingfield, who
            was living in Portland at the time. Turns out that Bedingfield taught
            new media at SCAD (
            <a
              href="https://www.scad.edu/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Savannah College of Art and Design
            </a>
            ) and was the guy responsible for teaching Flash to Shaun.
          </SpeakerQuote>

          <Sidebar imageSrc={legacyImage('8-business_card_small.png')}>
            Like any good design firm, our first business cards were designed to
            impress.
          </Sidebar>

          <SpeakerQuote initials="DK:">
            We also brought{' '}
            <a
              href="https://www.linkedin.com/in/firewheel"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Josh Williams
            </a>{' '}
            in on that project. He was really talented back then but, wow, has he
            taken off since! And I think{' '}
            <a
              href="http://jeffcroft.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Jeff Croft
            </a>
            , as a little-known designer in Kansas City, was working on{' '}
            <a
              href="http://www.shutterfly.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Shutterfly
            </a>{' '}
            for us too. Or, maybe he was just creating the Invo website, I
            don&apos;t remember. But we had quite the little team of alpha
            talent designing their software.
          </SpeakerQuote>

          <SpeakerQuote initials="AMH:">
            We sub-contracted Josh&apos;s design studio, Firewheel Design, to do
            all the icons we needed for the Memory Matrix product, which by that
            time had been acquired by Shutterfly. Jeff helped us as well, on a
            few smaller projects, but not the Memory Matrix project. This was
            right around the time Josh was noodling with a few mobile games that
            would eventually lead him towards making{' '}
            <a
              href="http://en.wikipedia.org/wiki/Gowalla"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Gowalla
            </a>
            . Jeff would later join{' '}
            <a
              href="http://blueflavor.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Blue Flavor
            </a>{' '}
            and head to Seattle, to work with the likes of Tom Watson and Keith
            Robinson.
          </SpeakerQuote>

          <SpeakerQuote initials="DK:">
            I think a lot of us had interesting adventures in our careers during
            this acceleration of the web. The other big project around that time
            was PROTRADE. That came in via a friend of mine, connecting me to
            their smart product manager, Josh Crandall. It was right in my
            wheelhouse: a fantasy sports game conceived of as a stock market. I
            was still in Boston at the time but they were in San Mateo, so I
            started doing the bi-coastal thing. While my plan was to move out to
            the Valley after Fran finished graduate school, PROTRADE started
            that process a little bit early.
          </SpeakerQuote>

          <SpeakerQuote initials="AMH:">
            I still think you were crazy to fly back and forth as much as you
            did. But then again, I&apos;m deathly afraid of flying.
          </SpeakerQuote>

          <Sidebar>
            PROTRADE was re-branded to Citizen Sports, then purchased by Yahoo!
            Sports for more than $40M.
          </Sidebar>

          <SpeakerQuote initials="DK:">
            You&apos;ve gotten a lot better with it, going to Europe seemingly
            every year now! I had a great time working on PROTRADE. I got along
            famously with the two guys running it, Mike Kerns and{' '}
            <a
              href="http://en.wikipedia.org/wiki/Jeff_Ma"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Jeff Ma
            </a>
            . My best day there was when I raised some issues with the core game
            philosophy that had nothing to do with the software and UI. Kerns
            and I spent half the day in the conference room working through
            stuff. Ma was in there for part of it as well but what I remember
            best is that, at the end, Kerns said &ldquo;This is the best day
            we&apos;ve had at PROTRADE in a really long time.&rdquo; And it was
            wonderful to hear because it&apos;s why I was a service provider in
            the first place: to dig into really hard and knotty problems and
            kick their ass and make a difference.
          </SpeakerQuote>

          <SpeakerQuote initials="AMH:">
            I wish I had known who Jeff Ma was at that time. We could have
            parlayed our earnings by a few multiples in a few trips to Vegas
            with him.
          </SpeakerQuote>

          <Sidebar imageSrc={legacyImage('9-dave_bedingfield.jpg')}>
            Notoriously avoiding photographs, Dave Bedingfield is one of the
            best digital designers alive. He was part of Invo Silicon Valley
            from its earliest days.
          </Sidebar>

          <Sidebar>
            Before being ready to hire full-time staff, GoInvo worked with top
            guns like Josh Williams and Jeff Croft. Williams was the founder of
            Gowalla; Croft wrote Pro CSS Techniques.
          </Sidebar>

          <Sidebar>
            Jeff Ma was one of the leaders of the infamous MIT blackjack team
            and the real person behind protagonist &ldquo;Kevin Lewis&rdquo; in
            the best-selling book, Bringing Down the House.
          </Sidebar>

          <SpeakerQuote initials="DK:">
            Ha ha, no doubt! Toward the end of our time at PROTRADE they hired{' '}
            <a
              href="http://svpg.com/team/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Marty Cagan
            </a>{' '}
            to be the new product tsar. Chief Product Officer or something
            similar. So, after that, my work fell under Marty. Now as you know
            my strengths were more down the creative director path than as a
            practicing designer. Before Marty joined there was a UI engineer I
            worked with who would basically translate all of my hand-waving and
            whiteboard drawings into a product. Well, Marty wanted to bring his
            own people in to do the work anyway, so he just tried to get me to
            kerchunk as much stuff as possible while our contract ran out. I
            still remember sitting in my office there trying to wrangle pixels,
            on the phone with you to get help. At one point I thought, &ldquo;I
            run around saying GoInvo is the best software design studio in the
            world yet here I am struggling to do remedial pixel pushing.&rdquo;
            In retrospect it is funny but at the time it was a little
            horrifying. It did help me better find my place in the world.
          </SpeakerQuote>

          <SpeakerQuote initials="AMH:">
            I remember trying to help a little on that project, but I was so
            deeply immersed with Shutterfly that I had a hard time spreading my
            focus. Something I&apos;m sure you&apos;ll agree with is that
            I&apos;m horrible at multitasking. I can only focus or work on one
            thing at a time. I felt bad that I was ineffective at helping out
            more with PROTRADE.
          </SpeakerQuote>

          <SpeakerQuote initials="DK:">
            It was my responsibility and it did all right, so no need to feel
            bad. One of our other early clients was{' '}
            <a
              href="http://www.mitre.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              MITRE
            </a>
            . Little did we know that particular client would end up keeping Invo
            going even after we bade a fond farewell to Silicon Valley.
          </SpeakerQuote>

          <SpeakerQuote initials="AMH:">
            Juhan! First time I met Juhan Sonin, I thought he was crazy, as in
            literally crazy. Then the more I talked to him about design and
            process, the more I realized he actually was crazy, but in one of
            the best ways possible. His energy and passion are infectious. And
            he has no filter, so whatever comes to his mind will eventually make
            its way to his mouth. When it does, watch out! You&apos;ll learn
            something new every single time you chat with him.
          </SpeakerQuote>

          <SpeakerQuote fullName="Juhan Sonin:">
            When the padded cell fits...
          </SpeakerQuote>

          <SpeakerQuote initials="DK:">
            MITRE was a great example of how our being different helped us. Invo
            has always been iconoclastic. That&apos;s a big part of your
            personality, Andrei, as well as mine. Well, Juhan read your posts on{' '}
            <a
              href="https://web.archive.org/web/20051029021414/http://www.ixda.org/en/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              the old interaction design discussion list
            </a>{' '}
            and, as a kindred spirit, thought you were the only one on there who
            &ldquo;got it.&rdquo; So thanks to being ourselves we got the MITRE
            work, and eventually Juhan to boot!
          </SpeakerQuote>

          <SpeakerQuote fullName="Juhan Sonin:">
            I had an immediate intellectual and design connection with Andrei
            based on his torrid posts on the{' '}
            <a
              href="http://www.ixda.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              IxDA list
            </a>
            . He vigorously advocated for a no-nonsense and{' '}
            <a
              href="http://en.wikipedia.org/wiki/Systems_engineering"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              systems engineering
            </a>{' '}
            approach to product design (at least that was my interpretation)
            which dovetailed into my growing up in hard-science-based
            organizations and learn-and-design-by-making-real-things mantra.
            Over time, I also desired a physical connection, but my assless
            chaps never turned Andrei&apos;s eyes off of Donna.
          </SpeakerQuote>

          <SpeakerQuote fullName="Donna Driscoll:">
            And that last comment is why we initially thought you were literally
            crazy, Captain Sonin. But when you flew out and we met for the first
            time I knew you and Andrei would become kindred spirits. You shared
            the same design philosophy.
          </SpeakerQuote>

          <SpeakerQuote initials="AMH:">
            Indeed, we did and we still do to this day.
          </SpeakerQuote>

          <SpeakerQuote initials="DK:">
            Even though my intention was always to come out to Silicon Valley it
            was never a <em>fait accompli</em>. My girlfriend was very
            career-minded and, while she did focus on jobs in the valley, she was
            applying in other geos as well. I might have ultimately moved
            without her if it came to that, but she got a job at Yahoo, and out
            to California we headed. For me, at least, it immediately started to
            feel more like a real company instead of a couple of freelancers at
            that point.
          </SpeakerQuote>

          <SpeakerQuote initials="AMH:">
            Having Dirk move out to Silicon Valley was the point at which the
            company started to take off. Working remotely, while great for some
            teams, is really a barrier when you&apos;re building a company. With
            that barrier gone, we were able to finally focus full time on
            building the studio.
          </SpeakerQuote>

          <SpeakerQuote initials="DK:">
            Of course the bigger thing for us was bringing Ben Listwon on board.
            You were keen on that from the very beginning and we were finally
            starting to get enough work, and the kind of work, that allowed for
            that to happen. I just couldn&apos;t wait to meet him in the flesh,
            because you always said he was perhaps the smartest guy in the
            valley, which is really saying something.
          </SpeakerQuote>

          <SpeakerQuote fullName="Ben Listwon:">
            Ugh, jeepers, I don&apos;t think that&apos;s right. Honestly,
            I&apos;ve been blessed to work with people that make me look smart,
            and I&apos;ve tried, even after Invo, to hire or work with only the
            folks that will outshine my abilities.
          </SpeakerQuote>

          <SpeakerQuote initials="BL:">
            I do remember our first meeting though, at Coffee &amp; More (was it
            always called that?) in Sunnyvale. I couldn&apos;t tell if I was
            interviewing, being interviewed, or what, but I knew you were both
            serious about the business, and that was all that mattered. The
            passion and drive was clear as day, and that&apos;s what makes an
            organization as durable as Invo has been.
          </SpeakerQuote>

          <SpeakerQuote fullName="Donna Driscoll:">
            Ben&apos;s being too modest. He&apos;s often the smartest guy in the
            room, and the kindest, treating everyone he meets, no matter who
            they are, with equal respect. Ben had been my best friend since our
            days at PayPal and when I learned that he was joining Invo, I knew
            that among the three of you this was going to become something
            amazing.
          </SpeakerQuote>

          <SpeakerQuote initials="DK:">
            Ben what did you start working on with us, Agiliance?
          </SpeakerQuote>

          <SpeakerQuote initials="BL:">
            Yeah, that&apos;s right. Praveen had built a really great
            engineering team, but this was a big challenge for me. The product
            they had was built on a Java stack, and was utilizing a couple of
            libraries I&apos;d never heard of. Andrei had already hammered out
            some great comps, so I had to get up to speed on a lot of material
            in a very short amount of time. Lucky for me, their office was about
            a mile away from my de facto coffee shop (read: office) in Mountain
            View, so I was never short on caffeinated motivation.
          </SpeakerQuote>

          <SpeakerQuote initials="AMH:">
            That project was probably the first real project where it felt like
            we were finally operating officially like a business. Things at that
            point started looking up from my point of view. Like it was actually
            going to work.
          </SpeakerQuote>

          <Divider />

          {/* ===== SECTION 2: RISE, SILICON VALLEY ===== */}
          <SectionHeader
            id="silicon-valley"
            number={2}
            title="Rise, Silicon Valley"
            subtitle="By the fall of 2005, GoInvo had a few projects going at once and some interesting leads."
          />

          <SpeakerQuote initials="DK:">
            By the fall of 2005, we had a few projects going at once and some
            interesting leads.
          </SpeakerQuote>

          <SpeakerQuote initials="AMH:">It did.</SpeakerQuote>

          <SpeakerQuote initials="DK:">
            I will never forget our first meeting with Agile. We were brought in
            by Joel Nave who really wanted to work with us.
          </SpeakerQuote>

          <Sidebar imageSrc={legacyImage('1-agile_logo.png')}>
            Agile (Agiliance) was a leading governance, risk, and compliance
            (GRC) software provider that became one of GoInvo&apos;s most
            important Silicon Valley clients.
          </Sidebar>

          <SpeakerQuote initials="BL:">
            There was also a real sense of desperation in that meeting. The folks
            at Agile knew what had served them well for many years.
          </SpeakerQuote>

          <SpeakerQuote initials="AMH:">
            I also remember taking on that project without knowing the full
            scope of their product.
          </SpeakerQuote>

          <SpeakerQuote initials="DK:">
            I remember that fear factor very well. We didn&apos;t comprehend at
            that time the real breadth of PLM.
          </SpeakerQuote>

          <SpeakerQuote initials="BL:">
            Space was a major milestone. Don&apos;t get me wrong, I could work
            all day from coffee shops.
          </SpeakerQuote>

          <SpeakerQuote initials="DK:">
            Andrei was the alpha designer. Ben was the alpha engineer. I was a
            sort of executive consultant.
          </SpeakerQuote>

          <SpeakerQuote fullName="Donna Driscoll:">
            I was at Adobe at the time doing exploratory research to inform the
            company&apos;s mobile strategy.
          </SpeakerQuote>

          <SpeakerQuote initials="DK:">
            Wow, I had no idea that your coming on was so sudden!
          </SpeakerQuote>

          <SpeakerQuote initials="AMH:">
            I don&apos;t remember it being so sudden, but as always, I&apos;ll
            defer to Donna on the details.
          </SpeakerQuote>

          <SpeakerQuote initials="BL:">
            This was huge. Much like we needed the space, we also needed to grow
            the team.
          </SpeakerQuote>

          <SpeakerQuote initials="AMH:">
            Completely agreed. When they both joined the team, we became a real
            company.
          </SpeakerQuote>

          <Sidebar imageSrc={legacyImage('3-invo_first_studio.jpg')}>
            The first GoInvo studio was a small condo on Lafayette in Santa
            Clara, California.
          </Sidebar>

          <SpeakerQuote initials="DK:">
            The other side of it was that first studio space, a small condo on
            Lafayette down in Santa Clara.
          </SpeakerQuote>

          <SpeakerQuote initials="AMH:">
            That first space was an amazing find by Dirk. It was the perfect loft
            working space.
          </SpeakerQuote>

          <SpeakerQuote initials="BL:">
            That space was great for our size at the time, and it had such a
            great, rustic feel.
          </SpeakerQuote>

          <SpeakerQuote initials="DK:">
            Ben I forgot how you built all of that stuff. I was impressed!
          </SpeakerQuote>

          <SpeakerQuote initials="DD:">
            We did everything ourselves, even making daily lunches for each
            other. That was a part of the day I loved.
          </SpeakerQuote>

          <SpeakerQuote initials="DK:">
            My strongest memory of that studio was the bottle of wine we shared
            for some success.
          </SpeakerQuote>

          <Sidebar imageSrc={legacyImage('6-wine.jpg')}>
            The team celebrating a milestone at the Lafayette studio.
          </Sidebar>

          <SpeakerQuote initials="DK:">
            So, getting back to Agile. If our experience together at Invo
            Silicon Valley could be reduced to one single thing.
          </SpeakerQuote>

          <SpeakerQuote initials="BL:">
            Agile is still hands down the number one work-related experience
            I&apos;ve had in my career.
          </SpeakerQuote>

          <SpeakerQuote initials="AMH:">
            Definitely. Doing the work is one thing. That&apos;s what we got
            paid for.
          </SpeakerQuote>

          <Sidebar imageSrc={legacyImage('9-box_exercise.jpg')}>
            GoInvo&apos;s Box Exercise became a signature collaborative design
            method for wrangling massive complexity.
          </Sidebar>

          <SpeakerQuote initials="AMH:">
            Agile was the first place we instituted The Box Exercise. It worked
            so well with Agile.
          </SpeakerQuote>

          <SpeakerQuote initials="DK:">
            Of course Agile wasn&apos;t the only thing we were working on. That
            first year in Lafayette we were also doing a lot of work.
          </SpeakerQuote>

          <SpeakerQuote initials="AMH:">
            First we got to work with Josh Williams on the Shutterfly project,
            then Noah Stokes with the Yahoo project.
          </SpeakerQuote>

          <SpeakerQuote initials="DK:">
            This was also when Spivot was coming to life. It was Invo&apos;s
            first crack at doing our own product.
          </SpeakerQuote>

          <SpeakerQuote initials="AMH:">
            Spivot was my idea. It came about from messing around with CSS and
            RSS feeds at the time.
          </SpeakerQuote>

          <Sidebar imageSrc={legacyImage('12-spivot.jpg')}>
            Spivot was GoInvo&apos;s first attempt at building their own product
            &mdash; a bit too early for the market.
          </Sidebar>

          <SpeakerQuote initials="BL:">
            Indeed, Spivot was probably just a bit too early.
          </SpeakerQuote>

          <SpeakerQuote initials="DK:">
            One thing that the foundation provided by the Agile work gave us was
            the ability to buy a studio space.
          </SpeakerQuote>

          <SpeakerQuote initials="DK:">
            We really decked it out. We had a lot of great furniture. The
            glass-block entrance. The art.
          </SpeakerQuote>

          <SpeakerQuote initials="AMH:">
            That was all you, Dirk. You had a real knack for environment and
            space.
          </SpeakerQuote>

          <Sidebar imageSrc={legacyImage('13-kifer_studio.jpg')}>
            The Kifer Road studio in Sunnyvale became GoInvo&apos;s permanent
            Silicon Valley home.
          </Sidebar>

          <SpeakerQuote initials="DK:">
            Working with Dennis Fong was fun. Andrei, you worked side-by-side
            with him on Raptr.
          </SpeakerQuote>

          <SpeakerQuote initials="AMH:">
            Yes. One of those serendipitous projects, from a relationship I made
            with him some ten years prior.
          </SpeakerQuote>

          <SpeakerQuote initials="AMH:">
            Dennis was willing to try all sorts of out of the box ideas and
            thinking.
          </SpeakerQuote>

          <SpeakerQuote initials="DK:">
            Remember the fantasy football league we had that first year there?
          </SpeakerQuote>

          <SpeakerQuote initials="DK:">
            Toward the middle of 2008 was when you said you were leaving, Ben.
            That was my saddest day at Invo.
          </SpeakerQuote>

          <Divider />

          {/* ===== SECTION 3: INTERESTING TIMES ===== */}
          <SectionHeader
            id="interesting-times"
            number={3}
            title="Interesting Times"
            subtitle="As Agile winded down, the economic crisis hit, and GoInvo faced its most challenging period."
          />

          <SpeakerQuote initials="DK:">
            As Agile finally started winding down we had a new big client
            hitting: McAfee.
          </SpeakerQuote>

          <SpeakerQuote initials="AMH:">
            Tim and I worked at Adobe during the same period in the late 90s.
            He&apos;s a great guy.
          </SpeakerQuote>

          <Sidebar imageSrc={legacyImage('1-mcafee_box.png')}>
            The McAfee project was probably GoInvo Silicon Valley at its most
            potent.
          </Sidebar>

          <SpeakerQuote initials="DK:">
            The McAfee project was probably Invo SV at its most potent.
          </SpeakerQuote>

          <SpeakerQuote initials="AMH:">
            I have the original schedule still. The core design work was over
            three to four months.
          </SpeakerQuote>

          <SpeakerQuote initials="DK:">
            As Silicon Valley was growing in 2008, the plan had always been to
            expand GoInvo geographically.
          </SpeakerQuote>

          <SpeakerQuote initials="JS:">
            I was at MITRE, which was pretty damn good and a bit cushy, and I
            was learning a ton.
          </SpeakerQuote>

          <SpeakerQuote initials="AMH:">
            Juhan was an easy pick to lead and grow the studio practice outside
            of Silicon Valley.
          </SpeakerQuote>

          <SpeakerQuote initials="DK:">
            It was moving slowly, but finally what cinched it was when we got
            together.
          </SpeakerQuote>

          <SpeakerQuote initials="JS:">
            That was a come-to-Jesus meeting. I was thinking, &ldquo;Man, I got
            to make a decision.&rdquo;
          </SpeakerQuote>

          <SpeakerQuote initials="DK:">
            The part that I hadn&apos;t expected was, for you to agree to it,
            your requirement was that I actually move to Boston.
          </SpeakerQuote>

          <SpeakerQuote initials="JS:">
            I almost made that assumption at the beginning, and maybe that&apos;s
            why I was bullish on it.
          </SpeakerQuote>

          <SpeakerQuote initials="DK:">
            Andrei, as the McAfee project was winding down we had our all-company
            retreat down in Santa Cruz.
          </SpeakerQuote>

          <Sidebar imageSrc={legacyImage('2-seascape_resort.jpg')}>
            The GoInvo all-company retreat at Seascape Resort in Santa Cruz.
          </Sidebar>

          <SpeakerQuote initials="AMH:">
            Probably the best string of months of the entire thing for me was
            most of 2008.
          </SpeakerQuote>

          <Sidebar imageSrc={legacyImage('3-time_cover.jpg')}>
            The 2008 economic crisis hit Silicon Valley hard and changed the
            trajectory of GoInvo forever.
          </Sidebar>

          <SpeakerQuote initials="DK:">
            We talked about what to do, a conversation that started while we
            were at the bloody retreat.
          </SpeakerQuote>

          <SpeakerQuote initials="AMH:">
            It would have been too much for me to take. So rather than let
            everyone go and start over.
          </SpeakerQuote>

          <SpeakerQuote initials="DK:">
            2009 must have been incredibly difficult for you, Andrei. I was off
            in Boston.
          </SpeakerQuote>

          <SpeakerQuote initials="AMH:">
            It was brutal. But we tried our best. We spent all of the first half
            of 2009.
          </SpeakerQuote>

          <SpeakerQuote initials="DK:">
            There were some interesting projects down the stretch. Sean Parker
            brought you in to work with Founder&apos;s Fund.
          </SpeakerQuote>

          <Sidebar imageSrc={legacyImage('4-sean_parker.jpg')}>
            Sean Parker, co-founder of Napster and Facebook&apos;s founding
            president, brought GoInvo in to work with Founder&apos;s Fund.
          </Sidebar>

          <SpeakerQuote initials="AMH:">
            The lack of enough robust client work made it such that we had to let
            a few go every month.
          </SpeakerQuote>

          <SpeakerQuote initials="DK:">
            It was such a sad way to end, and relatively speaking a remarkably
            fast fall.
          </SpeakerQuote>

          <SpeakerQuote initials="AMH:">
            I talked about the experience with Nancy Duarte. She basically told
            me that the only thing we could have done differently.
          </SpeakerQuote>

          <SpeakerQuote initials="DK:">
            Looking back, what are your best memories of doing Invo Silicon
            Valley?
          </SpeakerQuote>

          <SpeakerQuote initials="AMH:">
            I miss being at the studio late at night by myself, doing a little
            work.
          </SpeakerQuote>

          <SpeakerQuote initials="DK:">
            Those were good days. I look back more fondly on my years in
            California than any other point.
          </SpeakerQuote>

          <Sidebar imageSrc={legacyImage('5-andreis_bookshelf.png')}>
            Andrei&apos;s bookshelf at the studio &mdash; a snapshot of the
            influences that shaped GoInvo&apos;s design philosophy.
          </Sidebar>

          <Divider />

          {/* ===== SECTION 4: RISE, BOSTON ===== */}
          <SectionHeader
            id="boston"
            number={4}
            title="Rise, Boston"
            subtitle="GoInvo's Boston studio started lean during the recession and gradually built into a thriving practice."
          />

          <SpeakerQuote initials="JS:">
            We signed in September the agreement that, yes, here are our open
            veins, we&apos;re blood-brothering.
          </SpeakerQuote>

          <SpeakerQuote initials="DK:">
            Beyond being a great space, right from the very beginning it needed
            a lot of work.
          </SpeakerQuote>

          <SpeakerQuote initials="JS:">
            I remember when I made my announcement at MITRE that I was leaving.
          </SpeakerQuote>

          <SpeakerQuote initials="DK:">
            In the presentation you gave your notice?
          </SpeakerQuote>

          <SpeakerQuote initials="JS:">
            It was my, &ldquo;Hey, people, I&apos;m out of here.&rdquo; It was
            a lunchtime tech talk.
          </SpeakerQuote>

          <SpeakerQuote initials="DK:">
            We got started at a moment where the recession was in full swing.
          </SpeakerQuote>

          <SpeakerQuote initials="JS:">
            We did. We were just on the entrails, the surviving entrails of the
            Silicon Valley studio.
          </SpeakerQuote>

          <SpeakerQuote initials="DK:">
            The worse things got in California the more I was out there. Once
            Andrei left I was out there constantly.
          </SpeakerQuote>

          <SpeakerQuote initials="JS:">
            Yeah, because you had to deal with it. You have a million-dollar
            building on the line.
          </SpeakerQuote>

          <SpeakerQuote initials="DK:">That was tough.</SpeakerQuote>

          <SpeakerQuote initials="JS:">
            It was tough. We were just surviving, and not having a big reputation
            here in Boston.
          </SpeakerQuote>

          <SpeakerQuote initials="DK:">
            During this lean time we made our first full-time hire at the studio
            in Eric Benoit.
          </SpeakerQuote>

          <SpeakerQuote fullName="Eric Benoit:">
            I remember getting this email from Juhan via my website&apos;s
            contact form.
          </SpeakerQuote>

          <Sidebar imageSrc={legacyImage('11-eric_benoit.jpg')}>
            Eric Benoit was GoInvo Boston&apos;s first full-time hire, recruited
            via his website by Juhan.
          </Sidebar>

          <SpeakerQuote initials="EB:">
            I remember combing through all the pages on the Invo website and
            watching all the videos.
          </SpeakerQuote>

          <SpeakerQuote initials="EB:">
            There was enough there I was attracted to ignore the
            two-and-a-half-hour daily commute.
          </SpeakerQuote>

          <SpeakerQuote initials="JS:">
            Eric was maybe the only bright spot in that dark time. I remember the
            very bottom.
          </SpeakerQuote>

          <SpeakerQuote initials="DK:">
            Yeah. I called that meeting because I had been funding things out of
            my personal finances.
          </SpeakerQuote>

          <SpeakerQuote initials="JS:">It&apos;s over.</SpeakerQuote>

          <SpeakerQuote initials="DK:">
            It&apos;s over. We talked about it, and we both were interested in
            trying to keep it going.
          </SpeakerQuote>

          <SpeakerQuote initials="JS:">
            We got the Democratic National Committee project from another MITRE
            alum.
          </SpeakerQuote>

          <SpeakerQuote initials="EB:">
            I was excited to do this project for the DNC. Designing something for
            that scale of usage.
          </SpeakerQuote>

          <SpeakerQuote initials="DK:">
            A few months after we got back on our feet is when Jon came onboard
            full time.
          </SpeakerQuote>

          <SpeakerQuote fullName="Jonathan Follett:">
            You and I met at a financial information design conference at the
            Harvard Club back in 2005.
          </SpeakerQuote>

          <Sidebar imageSrc={legacyImage('14-jon_follett.jpg')}>
            Jonathan Follett joined GoInvo after years of publishing UX content
            and running Hot Knife Design.
          </Sidebar>

          <SpeakerQuote initials="DK:">
            You really went all in on publishing UX stuff for a while.
          </SpeakerQuote>

          <SpeakerQuote initials="JF:">
            I had a column at UXmatters for 2 years. I wrote a ton for them.
          </SpeakerQuote>

          <SpeakerQuote initials="DK:">
            Then we all came together summer of 2010.
          </SpeakerQuote>

          <SpeakerQuote initials="DK:">
            Jon, perhaps your first major contribution, and a big part of our
            getting back on the right trajectory, was the PTC project.
          </SpeakerQuote>

          <SpeakerQuote initials="JF:">
            Yeah, that&apos;s right. I was doing a lot of teaching, these
            one-day seminars on web applications.
          </SpeakerQuote>

          <SpeakerQuote initials="JS:">
            The PTC project was Boston&apos;s first big project, meaning three or
            four people full time.
          </SpeakerQuote>

          <SpeakerQuote initials="DK:">
            Maybe the most important project we&apos;ve had here in Boston was
            CodeRyte from the standpoint.
          </SpeakerQuote>

          <SpeakerQuote initials="JS:">
            We had a few goals for where the studio should go. The biggest of
            those was, and is, health and healthcare.
          </SpeakerQuote>

          <SpeakerQuote initials="EB:">
            I was really happy with the way the product turned out. CodeRyte gave
            us the time to get it done right.
          </SpeakerQuote>

          <Divider />

          {/* ===== SECTION 5: TODAY, AND TOMORROW ===== */}
          <SectionHeader
            id="today-tomorrow"
            number={5}
            title="Today, and Tomorrow"
            subtitle="GoInvo looks ahead, with health and healthcare as its North Star."
          />

          <SpeakerQuote initials="JS:">
            We had a few goals for where the studio should go. The biggest of
            those was, and is, health and healthcare. We wanted to be a
            healthcare design studio. And we&apos;re doing it.
          </SpeakerQuote>

          <SpeakerQuote initials="DK:">
            The studio today is the best version of GoInvo that there&apos;s
            ever been. For all of the ups and downs, for all of the great
            memories and the difficult ones, this is the most coherent and
            focused GoInvo there has ever been.
          </SpeakerQuote>

          <Divider />

          {/* Participants */}
          <div className="mt-12">
            <h2 className="font-serif text-2xl font-light mb-6">
              Interview Participants
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  name: 'Andrei Herasimchuk (AMH)',
                  role: 'Co-founder, Chief Designer',
                },
                { name: 'Dirk Knemeyer (DK)', role: 'Co-founder, CEO' },
                {
                  name: 'Ben Listwon (BL)',
                  role: 'Early Partner, Lead UI Designer & Architect',
                },
                {
                  name: 'Donna Driscoll (DD)',
                  role: 'Senior Design & Research',
                },
                {
                  name: 'Juhan Sonin (JS)',
                  role: 'Boston Studio Founder',
                },
                {
                  name: 'Eric Benoit (EB)',
                  role: 'First Boston Full-time Hire, Creative Director',
                },
                {
                  name: 'Jonathan Follett (JF)',
                  role: 'Principal, Business Development',
                },
                {
                  name: 'Uday Gajendar (UG)',
                  role: 'Senior Designer',
                },
                {
                  name: 'Sarah Kaiser (SK)',
                  role: 'Designer',
                },
              ].map((person) => (
                <div key={person.name} className="py-2">
                  <p className="font-semibold">{person.name}</p>
                  <p className="text-gray text-sm">{person.role}</p>
                </div>
              ))}
            </div>
          </div>
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
