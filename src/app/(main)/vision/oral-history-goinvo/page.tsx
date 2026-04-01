import type { Metadata } from 'next'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { ScrollNav } from './ScrollNav'
import './oral-history.css'

export const metadata: Metadata = {
  title: 'An Oral History of GoInvo',
  description:
    'An interview with past and present Invoites about the past and present of GoInvo.',
}

export default function OralHistoryGoinvoPage() {
  return (
    <div id="oral-history-legacy">
      <ScrollNav />
      <SetCaseStudyHero image="https://www.goinvo.com/old/images/features/an-oral-history/hero-part_2.jpg" />

<article className='oral-history' id='feature-article'>
<div className='overall-header'>
<div>An Oral History of GoInvo</div>
</div>
<header className='one' id='section1-origins'>
<div className='header-wrapper'>
<div className='inner-header-wrapper'>
<div className='main-header-content two-col'>
<div className='header-title'>Origins</div>
<div className='header-content'></div>
</div>
<div className='right-header-content'>
<div className='two-images'>
<img src='https://www.goinvo.com/old/images/features/an-oral-history/andrei-sqr.jpg' />
<img src='https://www.goinvo.com/old/images/features/an-oral-history/dirk-sqr.jpg' />
</div>
<div className='content'>Andrei Herasimchuk and Dirk Knemeyer incorporated GoInvo in Palo Alto, California, on June 29, 2004.</div>
</div>
</div>
</div>
</header>
<header className='nav-wrapper stuck'>
<nav className='main-nav'>
<div className='title'>An Oral History of GoInvo</div>
<a className='one' href='#section1-origins'>
<div className='nav-div'>1. Origins</div>
</a>
<a className='two' href='#section2-silicon'>
<div className='nav-div'>2. Rise, Silicon Valley</div>
</a>
<a className='three' href='#section3-interesting-times'>
<div className='nav-div'>3. Interesting Times</div>
</a>
<a className='four' href='#section4-boston'>
<div className='nav-div'>4. Rise, Boston</div>
</a>
<a className='five' href='#section5-todaytomorrow'>
<div className='nav-div'>5. Today, and Tomorrow</div>
</a>
</nav>
</header>
<header className='nav-wrapper scroll-nav'>
<nav className='main-nav'>
<div className='title'>An Oral History of GoInvo</div>
<a className='one' href='#section1-origins'>
<div className='nav-div'>1. Origins</div>
</a>
<a className='two' href='#section2-silicon'>
<div className='nav-div'>2. Rise, Silicon Valley</div>
</a>
<a className='three' href='#section3-interesting-times'>
<div className='nav-div'>3. Interesting Times</div>
</a>
<a className='four' href='#section4-boston'>
<div className='nav-div'>4. Rise, Boston</div>
</a>
<a className='five' href='#section5-todaytomorrow'>
<div className='nav-div'>5. Today, and Tomorrow</div>
</a>
</nav>
</header>
<section className='interview-content' id='section1-origins-content'>
<div className='row'>
<h4 className='intro-quote'>To celebrate our 10 year anniversary some of Invo’s leaders past and present came together to remember the ups and downs of our studio.</h4>
</div>
<div className='row'>
<div className='interview-wrapper'>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='full-name'>Dirk Knemeyer:</span>
<span className='speaker-text'>
So it all started with a
<a href='http://boxesandarrows.com/information-design-the-understanding-discipline/'>Boxes and Arrows article.</a>
</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar andrei'></div>
<div className='speaker-speaks'>
<span className='full-name'>Andrei Herasimchuk:</span>
<span className='speaker-text'>I haven’t read that article in a while, and re-reading my comments on it, I’m surprised at how much I still agree with my younger self! In fact, many of my concerns about titles, job descriptions, and confusion over design and the tech sector have come to fruition. Having said that, I know I come off as overly direct in the way I speak and write, but I really was attempting to be as diplomatic as I knew how in my comments to that article.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: Yeah, there is still a lot of truth there. It’s funny, because I don’t generally like rough feedback and critiques, but I knew that I had the opportunity to learn a lot from engaging you, so I did. At one point you told me that usually people didn’t engage because of your style, but the learning was worth it for me.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar andrei'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>AMH: And the fact that you responded in a diplomatic manner earned you a lot of points with me. I was back working at Adobe in 2003 on Project Shadowland (which would later become <a href="http://www.adobe.com/products/photoshop-lightroom.html?sdid=KKTJE&skwcid=AL!3085!3!50837904378!e!!g!!adobe%20lightroom&ef_id=ZqVPA4jz3GwAAAZ7:20140723194115:s">Adobe Photoshop Lightroom</a>) and I was in an environment with Adobe’s engineers where everyone was always direct and blunt with each other. It was a manner of working that I tend to prefer, as the work you get done is of a high caliber, but I often forget it’s not for everyone.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: True, but it is certainly common in the engineering community. Not so much among designers though! :-) It is a little-known fact that when you first came up with the <a href="http://www.designbyfire.com/">“Design by Fire”</a> concept for a brand it was loosely you, me, Ben Listwon, and Bob Baxley doing something undefined around it. I remember a call where the three of you were at your house in Sunnyvale and I was at my house in Toledo, Ohio and we were talking about that. Nothing really happened with it while we were together, but you took off with Design by Fire and it was really important in the global design conversation for a while.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar andrei'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>AMH: I was in the midst of doing a lot of product research at Adobe, not the least of which was trying to understand better how blogging tools, databases, and web technologies worked to see what could work in Shadowland. I had been noodling with a Design by Fire logo and concepts for content focused on digital design trends. Initially, I was thinking we could write and publish a design book and have a digital component with it. Ultimately, I just went ahead and built a blog with <a href="http://www.movabletype.com/">MovableType</a> tools. Near the end of 2003, I hit Publish without much thought other than, “I have to learn how these web tools work.” That, and I had a bunch of things I wanted to say to the world. In the first few months of 2004, I went on a tear writing and publishing all sorts of material, getting as much attention as I could from the early design bloggers who had already paved the road on the Internet. I used my Adobe background as a quick means to gain credibility within the online design community, along with a few contests, giving away signed Photoshop and Illustrator boxes. A few key articles came out of that period, <a href="http://www.designbyfire.com/?p=5">Gurus v. Bloggers</a>, <a href="http://www.designbyfire.com/?p=6">I would RTFM if there was a FM to FR</a>, and the biggie, <a href="http://www.designbyfire.com/?p=4">Design Eye for Usability Guy</a>.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: Design Eye for the Usability Guy was definitely the high-water mark. Unlike you, I didn’t have a center of gravity for my writing. A bunch of stuff was hitting through my employer’s website, but I was also making the rounds on the popular online publications like Boxes and Arrows, <a href="http://www.uxmatters.com/">UXmatters</a>, and <a href="http://www.digital-web.com/">Digital Web</a>. I was starting to speak at conferences quite a bit, too, and participate on different boards. I was learning and exploring all at once, and my ability to communicate well in the process really brought up my profile.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar andrei'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>AMH: I was doing something similar, in that I was learning publicly what worked and what didn’t. How to write, how to be snarky, how to build MT templates, how PHP, Apache, and other web tech worked. I was learning completely out in the open, which is partly the ethos of Design by Fire. The brand was a play on Trial by Fire, and evokes a passionate fire within sensibility, both things I was deeply immersed in at that time.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: While the blog finally quieted the influence certainly continued. A few years later they <a href="http://www.designbyfire.nl/">even started a conference around you/the idea</a> which I think is about the greatest compliment for one’s ideas. At some point when we were just talking about design theory I told you about my desire to create a design studio. I actually don’t even remember doing it, but I was sharing that idea with a lot of people at the time. Anyway, sometime later my employer was reneging on a variety of agreements around my compensation and an equity position in the firm. So I was ready to do something else. Then, out of the blue you asked me if I wanted to do the design studio I talked about, and do it together with you. So we did.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar andrei'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>AMH: Yes. Something that was going on for me at the time was that I was having trouble being back at Adobe but not being a part of the design team I had helped to create. I felt too much like an outsider and was somewhat unhappy with my role there. After two years doing my best to help the Shadowland project, I was still unable to find a satisfying role within the company. So, I asked you about starting a design company, since you had brought it up multiple times in email exchanges and phone conversations.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: And don’t forget that Bob Baxley was involved with us on it for about five minutes! I remember the first time I flew out to meet with you and Bob. I think it was May of 2004. We had already decided to move forward—never having met!—and it was time to figure out the identity and start really planning. We had talked about the name Syntex Design, which I think you liked more than I did. But along with Bob and your wife, Donna Driscoll, we came up with GoInvo. That’s one of the three things I will never forget from that trip, sitting in the studio in your backyard and hammering through a naming exercise. The other two things are y’all driving me up and down the peninsula introducing me to Silicon Valley, and when my plane was flying into SFO. I had never been to California, and I remember looking out the window as the plane was coming in and thinking, “Hey, it’s the Pacific Ocean!” (I learned later that it was actually San Francisco Bay.) It was thrilling to be flying in, knowing we were going to start something that I was so excited and optimistic about.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar andrei'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>AMH: Yeah, Bob decided he wasn’t ready for a startup gig, and lucky for him, he joined Apple right before the stock took off. So he did well enough for himself.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: Of course, I spent the first year in Boston instead of Silicon Valley. It didn’t make a whole lot of sense from a business perspective, but my girlfriend was there and life is all about priorities, right? Actually, at the time I saw it as an asset, because we could put both Silicon Valley and Boston on our website. This was before working remotely was common, so there was a certain cachet in having multiple locations, although in a perfect world I would have just been in Silicon Valley from the beginning.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar andrei'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>AMH: That first year was difficult for me. I had never worked solo in my career up to that point. Being on my own and trying to figure it all out while you were remote was something I had a rough time doing.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: Yeah, the first six months were especially tough sledding. We had a couple of really small projects—under $10,000—and then the <a href="http://www.gsb.stanford.edu/">Stanford</a> project that was from one of Bob’s connections. But even that was only a $15K’er. Thinking back, it is remarkable we were able to attract work and get momentum. We both drew a lot of attention in the digital design community, and you had a number of relationships in Silicon Valley. But neither of us were really selling.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar andrei'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>AMH: Selling was something I still hadn’t gotten the hang of at all. I knew how to sell software, and I had done that with Specular, but I had never dealt with selling services or myself in a services capacity. It was all brand new to me, and the more I learned about it, the more I was glad that you had a real background in this area. I learned the hard way, in those early months of GoInvo, that I’m a horrible salesman.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: Nah, just a creator at heart! So, the big breakthrough for us was the Memory Matrix project. That came in through your friend <a href="http://en.wikipedia.org/wiki/Lou_Montulli">Lou Montulli</a>, one of the original <a href="http://en.wikipedia.org/wiki/Netscape">Netscape</a> engineers. Lou’s company was being funded by <a href="http://en.wikipedia.org/wiki/James_H._Clark">Jim Clark</a>, so Lou had real money backing him.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar andrei'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>AMH: I remember meeting with Lou, Alex, Jeff, Jason, and Garrett at Alex’s house in Palo Alto. Alex was also one of the first Netscape engineers. Initially, Lou and Alex wanted me to join them, but I was committed to GoInvo. As much as I liked all of those guys, I really wanted to build a company I had a stake in as a founder.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: Yeah we were both ready to run our own thing at that point. Memory Matrix really did so much for us. Along with being a big chunk of cash it connected us to new people who would become future clients, and it gave us the opportunity to start bringing really good people into the fold. That was the first time we worked with <a href="https://twitter.com/dbedingfield">Dave Bedingfield</a>, and he went on to be, in my mind, our most important resource in the history of the Silicon Valley studio.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar andrei'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>AMH: Bedingfield was one of our secret weapons. I had reached out to <a href="http://www.shauninman.com/pendium/">Shaun Inman</a> to see if he could help us with building a Flash prototype of the Memory Matrix client so we could do some early testing and research. Shaun was busy, but he gave me the contact info for Bedingfield, who was living in Portland at the time. Turns out that Bedingfield taught new media at SCAD (<a href="https://www.scad.edu/">Savannah College of Art and Design</a>) and was the guy responsible for teaching Flash to Shaun.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: We also brought <a href="https://www.linkedin.com/in/firewheel">Josh Williams</a> in on that project. He was really talented back then but, wow, has he taken off since! And I think <a href="http://jeffcroft.com/">Jeff Croft</a>, as a little-known designer in Kansas City, was working on <a href="http://www.shutterfly.com/">Shutterfly</a> for us too. Or, maybe he was just creating the Invo website, I don’t remember. But we had quite the little team of alpha talent designing their software.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar andrei'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>AMH: We sub-contracted Josh’s design studio, Firewheel Design, to do all the icons we needed for the Memory Matrix product, which by that time had been acquired by Shutterfly. Jeff helped us as well, on a few smaller projects, but not the Memory Matrix project. This was right around the time Josh was noodling with a few mobile games that would eventually lead him towards making <a href="http://en.wikipedia.org/wiki/Gowalla">Gowalla</a>. Jeff would later join <a href="http://blueflavor.com/">Blue Flavor</a> and head to Seattle, to work with the likes of <a href="https://twitter.com/twatson">Tom Watson</a> and <a href="https://twitter.com/dkr">Keith Robinson</a>.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: I think a lot of us had interesting adventures in our careers during this acceleration of the web. The other big project around that time was PROTRADE. That came in via a friend of mine, connecting me to their smart product manager, <a href="https://www.linkedin.com/profile/view?id=3854&authType=NAME_SEARCH&authToken=OhSD&locale=en_US&srchid=7776351406149061543&srchindex=1&srchtotal=1&trk=vsrp_people_res_name&trkInfo=VSRPsearchId%3A7776351406149061543%2CVSRPtargetId%3A3854%2CVSRPcmpt%3Aprimary">Josh Crandall</a>. It was right in my wheelhouse: a fantasy sports game conceived of as a stock market. I was still in Boston at the time but they were in San Mateo, so I started doing the bi-coastal thing. While my plan was to move out to the Valley after Fran finished graduate school, PROTRADE started that process a little bit early.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar andrei'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>AMH: I still think you were crazy to fly back and forth as much as you did. But then again, I’m deathly afraid of flying.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: You’ve gotten a lot better with it, going to Europe seemingly every year now! I had a great time working on PROTRADE. I got along famously with the two guys running it, <a href="https://www.linkedin.com/pub/mike-kerns/0/19/632">Mike Kerns</a> and <a href="http://en.wikipedia.org/wiki/Jeff_Ma">Jeff Ma</a>. My best day there was when I raised some issues with the core game philosophy that had nothing to do with the software and UI. Kerns and I spent half the day in the conference room working through stuff. Ma was in there for part of it as well but what I remember best is that, at the end, Kerns said “This is the best day we’ve had at PROTRADE in a really long time.” And it was wonderful to hear because it’s why I was a service provider in the first place: to dig into really hard and knotty problems and kick their ass and make a difference.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar andrei'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>AMH: I wish I had known who Jeff Ma was at that time. We could have parlayed our earnings by a few multiples in a few trips to Vegas with him.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: Ha ha, no doubt! Toward the end of our time at PROTRADE they hired <a href="http://svpg.com/team/">Marty Cagan</a> to be the new product tsar. Chief Product Officer or something similar. So, after that, my work fell under Marty. Now as you know my strengths were more down the creative director path than as a practicing designer. Before Marty joined there was a UI engineer I worked with who would basically translate all of my hand-waving and whiteboard drawings into a product. Well, Marty wanted to bring his own people in to do the work anyway, so he just tried to get me to kerchunk as much stuff as possible while our contract ran out. I still remember sitting in my office there trying to wrangle pixels, on the phone with you to get help. At one point I thought, “I run around saying GoInvo is the best software design studio in the world yet here I am struggling to do remedial pixel pushing.” In retrospect it is funny but at the time it was a little horrifying. It did help me better find my place in the world.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar andrei'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>AMH: I remember trying to help a little on that project, but I was so deeply immersed with Shutterfly that I had a hard time spreading my focus. Something I’m sure you’ll agree with is that I’m horrible at multitasking. I can only focus or work on one thing at a time. I felt bad that I was ineffective at helping out more with PROTRADE.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: It was my responsibility and it did all right, so no need to feel bad. One of our other early clients was <a href="http://www.mitre.org/">MITRE</a>. Little did we know that particular client would end up keeping Invo going even after we bade a fond farewell to Silicon Valley.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar andrei'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>AMH: Juhan! First time I met Juhan Sonin, I thought he was crazy, as in literally crazy. Then the more I talked to him about design and process, the more I realized he actually was crazy, but in one of the best ways possible. His energy and passion are infectious. And he has no filter, so whatever comes to his mind will eventually make its way to his mouth. When it does, watch out! You’ll learn something new every single time you chat with him.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar juhan'></div>
<div className='speaker-speaks'>
<span className='full-name'>Juhan Sonin:</span>
<span className='speaker-text'>When the padded cell fits...</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: MITRE was a great example of how our being different helped us. Invo has always been iconoclastic. That’s a big part of your personality, Andrei,as well as mine. Well, Juhan read your posts on <a href="https://web.archive.org/web/20051029021414/http://www.ixda.org/en/">the old interaction design discussion list</a> and, as a kindred spirit, thought you were the only one on there who “got it.” So thanks to being ourselves we got the MITRE work, and eventually Juhan to boot!</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar juhan'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>JS: I had an immediate intellectual and design connection with Andrei based on his torrid posts on the <a href="http://www.ixda.org/">IxDA list</a>. He vigorously advocated for a no-nonsense and <a href="http://en.wikipedia.org/wiki/Systems_engineering">systems engineering</a> approach to product design (at least that was my interpretation) which dovetailed into my growing up in hard-science-based organizations and learn-and-design-by-making-real-things mantra. Over time, I also desired a physical connection, but my assless chaps never turned Andrei’s eyes off of Donna.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar donna'></div>
<div className='speaker-speaks'>
<span className='full-name'>Donna Driscoll:</span>
<span className='speaker-text'>And that last comment is why we initially thought you were literally crazy, Captain Sonin. But when you flew out and we met for the first time I knew you and Andrei would become kindred spirits. You shared the same design philosophy.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar andrei'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>AMH: Indeed, we did and we still do to this day.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: Even though my intention was always to come out to Silicon Valley it was never a <em>fait accompli</em>. My girlfriend was very career-minded and, while she did focus on jobs in the valley, she was applying in other geos as well. I might have ultimately moved without her if it came to that, but she got a job at Yahoo, and out to California we headed. For me, at least, it immediately started to feel more like a real company instead of a couple of freelancers at that point.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar andrei'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>AMH: Having Dirk move out to Silicon Valley was the point at which the company started to take off. Working remotely, while great for some teams, is really a barrier when you’re building a company. With that barrier gone, we were able to finally focus full time on building the studio.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: Of course the bigger thing for us was bringing Ben Listwon on board. You were keen on that from the very beginning and we were finally starting to get enough work, and the kind of work, that allowed for that to happen. I just couldn’t wait to meet him in the flesh, because you always said he was perhaps the smartest guy in the valley, which is really saying something.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar ben'></div>
<div className='speaker-speaks'>
<span className='full-name'>Ben Listwon:</span>
<span className='speaker-text'>Ugh, jeepers, I don’t think that’s right. Honestly, I’ve been blessed to work with people that make me look smart, and I’ve tried, even after Invo, to hire or work with only the folks that will outshine my abilities.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>I do remember our first meeting though, at Coffee & More (was it always called that?) in Sunnyvale. I couldn’t tell if I was interviewing, being interviewed, or what, but I knew you were both serious about the business, and that was all that mattered. The passion and drive was clear as day, and that’s what makes an organization as durable as Invo has been.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar donna'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DD: Ben’s being too modest. He’s often the smartest guy in the room, and the kindest, treating everyone he meets, no matter who they are, with equal respect. Ben had been my best friend since our days at PayPal and when I learned that he was joining Invo, I knew that among the three of you this was going to become something amazing.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: Ben what did you start working on with us, Agiliance?</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar ben'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>BL: Yeah, that’s right. Praveen had built a really great engineering team, but this was a big challenge for me. The product they had was built on a Java stack, and was utilizing a couple of libraries I’d never heard of. Andrei had already hammered out some great comps, so I had to get up to speed on a lot of material in a very short amount of time. Lucky for me, their office was about a mile away from my de facto coffee shop (read: office) in Mountain View, so I was never short on caffeinated motivation.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar andrei'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>AMH: That project was probably the first real project where it felt like we were finally operating officially like a business. Things at that point started looking up from my point of view. Like it was actually going to work.</span>
</div>
</div>
</div>
<div className='sidebar'>
<div className='sidebar-box solid boxes-and-arrows mobile-hide'>
<img className='center' src='https://www.goinvo.com/old/images/features/an-oral-history/3_boxes_arrows_logo.gif' />
<p>The venerable Boxes & Arrows was one of the first online UX publications, a favourite of the early intelligentsia.</p>
</div>
<div className='sidebar-box solid boxes-and-arrows extra-top-margin mobile-hide'>
<img className='center' src='https://www.goinvo.com/old/images/features/an-oral-history/4-adobe_logo.gif' />
<p>Andrei dropped out of Amherst College in 1990 to join Specular International, an early digital graphics company, as a founding member. In 1995 he left to join Adobe as their first interface designer. Andrei envisioned the creative strategy that resulted in the Adobe Creative Suite and built the Adobe design team from the ground up. After leaving Adobe for a few years to work on startups, Andrei returned in 2002 to serve as the project lead for Lightroom.</p>
</div>
<div className='sidebar-box dotted usability-guy extra-top-margin mobile-hide'>
<img src='https://www.goinvo.com/old/images/features/an-oral-history/5-jakob_neilson.jpg' />
<p>“Usability Guy” Jakob Nielsen was the premier thought leader in UX-related disciplines prior to the emergence of Jeffrey Zeldman Dirk predicted the decline of Nielsen and his left-brained approach to the Internet with the controversial <a href="http://www.digital-web.com/articles/end_of_usability_culture/">The End of Usability Culture</a>.</p>
</div>
<div className='sidebar-box dotted bob-baxely extra-top-margin mobile-hide'>
<img src='https://www.goinvo.com/old/images/features/an-oral-history/6-bob_baxley.jpg' />
<p>Bob Baxley authored one of the first books on interaction design, “<a href="http://www.amazon.com/Making-Web-Work-Designing-Applications/dp/0735711968">Making the Web Work</a>”. After noodling around at Invo for a few months he moved on to Director-level design roles at Yahoo! and then Apple, where he oversaw design for Apple.com. Today Bob is Head of Product Design & Research at Pinterest.</p>
</div>
<div className='sidebar-box dotted extra-top-margin mobile-hide'>
<img src='https://www.goinvo.com/old/images/features/an-oral-history/7-w3c_logo.png' />
<p>Andrei’s logo design for Syntex was later donated to the W3C.</p>
</div>
<div className='sidebar-box dotted extra-top-margin mobile-hide'>
<img src='https://www.goinvo.com/old/images/features/an-oral-history/8-business_card_small.png' />
<p>Like any good design firm, our first business cards were designed to impress.</p>
</div>
<div className='sidebar-box dotted dave-bedingfield extra-top-margin'>
<img src='https://www.goinvo.com/old/images/features/an-oral-history/9-dave_bedingfield.jpg' />
<p>Notoriously avoiding photographs, Dave Bedingfield is one of the best digital designers alive. He was part of Invo Silicon Valley from its earliest days.</p>
</div>
<div className='sidebar-box dotted williams-croft extra-top-margin'>
<img src='https://www.goinvo.com/old/images/features/an-oral-history/10-josh_williams_jeff_croft.png' />
<p>Before being ready to hire full-time staff, GoInvo worked with top guns like Josh Williams and Jeff Croft. Williams was the founder of Gowalla; Croft wrote Pro CSS Techniques.</p>
</div>
<div className='sidebar-box solid extra-top-margin protrade mobile-hide'>
<img className='center' src='https://www.goinvo.com/old/images/features/an-oral-history/11-protrade.png' />
<p>PROTRADE was re-branded to Citizen Sports, then purchased by Yahoo! Sports for more than $40M.</p>
</div>
<div className='sidebar-box dotted jeff-ma extra-top-margin'>
<img src='https://www.goinvo.com/old/images/features/an-oral-history/12-jeff_ma.png' />
<p>Jeff Ma was one of the leaders of the infamous MIT blackjack team and the real person behind protagonist “Kevin Lewis” in the best-selling book, <a href="http://www.amazon.com/Bringing-Down-House-Students-Millions/dp/B001AQY05Y">Bringing Down the House</a>.</p>
</div>
<div className='sidebar-box dotted juhan-sonin extra-top-margin'>
<img src='https://www.goinvo.com/old/images/features/an-oral-history/13-juhan_sonin.png' />
<p>Juhan Sonin became part of the Invo orbit as a client in 2005. He went on to open the Boston studio with Dirk in 2009.</p>
</div>
<div className='sidebar-box dotted donna-driscol extra-top-margin'>
<img src='https://www.goinvo.com/old/images/features/an-oral-history/14-donna_driscoll.jpg' />
<p>Donna Driscoll was one of the first hires at GoInvo. A usability engineer at Netscape and WebTV. She was early at PayPal, and became a design manager. At GoInvo she spent time in senior design and research roles, as well as directing the Silicon Valley studio.</p>
</div>
<div className='sidebar-box dotted ben-listwon extra-top-margin'>
<img src='https://www.goinvo.com/old/images/features/an-oral-history/15-ben_listwon.jpg' />
<p>A boy wonder, Ben left Cornell to start a calendaring application, Jump!, which was purchased by Microsoft and became MS Calendar. He went on to be a lead UI designer and architect for Microsoft, PayPal, Idealab!, and Yelp, the latter two of which he also helped to found.</p>
</div>
<div className='sidebar-box solid dana-street-roasting solid extra-top-margin mobile-hide'>
<img className='center' src='https://www.goinvo.com/old/images/features/an-oral-history/16-dana-_st_roasting_logo.png' />
<p>The favourite of various movers-and-shakers in Silicon Valley, Dana Street Roasting Company was Ben’s go-to hangout and meeting place.</p>
</div>
</div>
</div>
</section>
<header className='two' id='section2-silicon'>
<div className='header-wrapper'>
<div className='inner-header-wrapper'>
<div className='main-header-content'>
<div className='header-title'>Rise, Silicon Valley</div>
<div className='header-content'></div>
</div>
</div>
</div>
</header>
<header className='nav-wrapper middle-nav'>
<nav className='main-nav'>
<div className='title'>An Oral History of GoInvo</div>
<a className='one' href='#section1-origins'>
<div className='nav-div'>1. Origins</div>
</a>
<a className='two' href='#section2-silicon'>
<div className='nav-div'>2. Rise, Silicon Valley</div>
</a>
<a className='three' href='#section3-interesting-times'>
<div className='nav-div'>3. Interesting Times</div>
</a>
<a className='four' href='#section4-boston'>
<div className='nav-div'>4. Rise, Boston</div>
</a>
<a className='five' href='#section5-todaytomorrow'>
<div className='nav-div'>5. Today,  and Tomorrow</div>
</a>
</nav>
</header>
<section className='interview-content' id='section2-silicon-content'>
<div className='row'>
<div className='interview-wrapper'>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='full-name'>Dirk Knemeyer:</span>
<span className='speaker-text'>By the fall of 2005, we had a few projects going at once and some interesting leads. Ben was working with us pretty much full-time as well. But it was Agile that changed everything.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar andrei'></div>
<div className='speaker-speaks'>
<span className='full-name'>Andrei Herasimchuk:</span>
<span className='speaker-text'>It did.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: I will never forget our first meeting with Agile. We were brought in by <a href="https://www.linkedin.com/pub/joel-nave/0/611/a28">Joel Nave</a> who really wanted to work with us. He is one of my favourite clients to this day. The senior VP, <a href="https://www.linkedin.com/in/rajbhargava">Raj Bhargava</a>, was also there. We hadn’t met Raj before but he made quite the impression. He told us how the future of Agile depended on the redesign, and how much trust and responsibility they would be giving if they chose us. I had never had a conversation like that. Well, we ended up getting the business and that also allowed us to turn Invo into a “real” company.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar ben'></div>
<div className='speaker-speaks'>
<span className='full-name'>Ben Listwon:</span>
<span className='speaker-text'>There was also a real sense of desperation in that meeting. The folks at Agile knew what had served them well for many years, but that things were changing and they didn’t want to be left behind. The opportunity was huge, but there was a real danger of missing the mark. So, yeah, it was definitely a first for me, coming from a startup background where there was little legacy and far less consequence to failure. It was exhilarating and scary.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar andrei'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>AMH: I also remember taking on that project without knowing the full scope of their product.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>We were only given a cursory look at it, but once Dirk was able to secure the contract, they then showed us everything. When I saw the depths of the product, and how much work needed to be done, I about had a panic attack. The product was massive, and had legacy design and technological issues throughout that had to be overcome. It was beyond daunting, to the say the least.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text:'>DK: I remember that fear factor very well. We didn’t comprehend at that time the real breadth of PLM. But for Invo, we were able to do two things thanks to Agile: hire a full team and get our first studio space.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar ben'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>BL: Space was a <span className="bold">major</span> milestone. Don’t get me wrong, I could work all day from coffee shops, but having a space to collaborate was key to our continued momentum. I don’t think I fully appreciated that fact until we had the space.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text:'>DK: Andrei was the alpha designer. Ben was the alpha engineer. I was a sort of executive consultant cum creative guy cum dude who was running the business. But now we could add two more people to make a real software team. We convinced Donna Driscoll to join (which wasn’t too hard since you are her husband and Ben essentially her best friend) and hired young Tiffany Altieri from just out in the wild, I think off of <a href="http://sfbay.craigslist.org/">Craig’s List</a>.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar donna'></div>
<div className='speaker-speaks'>
<span className='full-name'>Donna Driscoll:</span>
<span className='speaker-text'>I was at Adobe at the time doing exploratory research to inform the company’s mobile strategy. I remember Andrei picking me up from work and telling me there was this amazing opportunity for me with Invo—and he needed an answer by the following morning. Nothing like advance notice and being able to prepare!</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text:'>DK: Wow, I had no idea that your coming on was so sudden!</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar andrei'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>AMH: I don’t remember it being so sudden, but as always, I’ll defer to Donna on the details.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>As for Tiffany, yes, we found her via Craig’s List. She was young and hungry to learn web technology and design. When I interviewed her, two things tipped the scales in her favor besides her skills. She was articulate and passionate, and she graduated from <a href="http://www.smith.edu/">Smith College</a> in <a href="http://en.wikipedia.org/wiki/Northampton,_Massachusetts">Northampton, MA</a>. Having worked with my first startup in <a href="https://www.amherst.edu/">Amherst</a>, and having lived in that part of the country for half a decade, I knew a lot about Smith. The women who graduate from there are very sharp, so I figured Tiffany had the right pedigree along with her early skillset that could make her a good fit for us.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar ben'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>BL: This was huge. Much like we needed the space, we also needed to grow the team. Part of that was just bandwidth, but the bigger part was having more voices in the mix. Like you said Dirk, we had a pretty solid three-legged stool going, but that meant that it was hard for any one of us to step outside the role(s) we were in. What was great was that Donna brought a whole new discipline of user testing and behavior to the table, and Tiffany was fresh out of school, ready to take on the world. It is impossible to overstate the importance of either Tiff or Donna in Invo’s history.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar andrei'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>AMH: Completely agreed. When they both joined the team, we  became a real company.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text:'>DK: The other side of it was that first studio space, a small condo on Lafayette down in <a href="http://en.wikipedia.org/wiki/Santa_Clara,_California">Santa Clara</a>. We found that on Craig’s List, too!</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar andrei'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>AMH: That first space was an amazing find by Dirk. It was the perfect loft working space for a small company to grow up in. Working there was a joy.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar ben'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>BL: That space was great for our size at the time, and it had such a great, rustic feel with the original wood floors. I know Juhan will have something to say about wood floors! Anyway, we ended up building our own desks and those portable whiteboards ourselves, so the whole thing had a real authenticity to it when you walked in. It was as much a statement about our getting things done, as it was a place to do those things.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text:'>DK: Ben I forgot how you built all of that stuff. I was impressed!</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar donna'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DD: We did everything ourselves, even making daily lunches for each other. That was a part of the day I loved, sitting down and eating together. I would bring in a lot of veg I was growing in my garden. Tiff loved cooking eggs. People underestimate how powerful the mere act of sitting down to have a meal together can have on the bonding experience. We felt like family.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>Especially like family when dishes would pile up and we’d all try to ignore them and pretend like they weren’t our responsibility.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text:'>DK: My strongest memory of that studio was the bottle of wine we shared for some success, maybe signing the Agile contract? It was a Heitz Cellar cabernet, well aged. It remains one of the best bottles of wine I’ve had. I don’t know how much of that was the wine or the happiness of shared success together, but I so enjoyed it. Remember how we had a loft in that space, up a narrow spiral staircase? We planned to use it as a meeting space but I’m not sure it ever got used.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar andrei'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>AMH: At one point I was going to try and use it as a workspace, but the staircase was too much to handle as Ben and I had to do a lot of work collaboratively. Going up and down that thing 20 times a day was not something I wanted to do.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar ben'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>BL: Pretty sure I used it as a nap spot a couple of times, so not completely disused! Easily my strongest memory was the single bathroom we had for all of us. Since I sat nearby, the rest of the office would often shout over, asking if it was occupied. I remember we joked about getting one of those traffic signal lights or an airplane bathroom indicator, so we could tell when it was okay to go.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar donna'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DD: And since there was Tiff and I, it was important that the seat stayed down.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text:'>DK: So, getting back to Agile. If our experience together at Invo Silicon Valley could be reduced to one single thing the Agile project would probably be it. First big project. Lasted... more than three years? Brought the core team together. Let us work across their company and from the C-suite to the real guts of the product. They got a huge exit thanks in part to our work. And they were really a fantastic group of people. When I think of Agile it is just in the warmest possible terms.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar ben'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>BL: Agile is still hands down the number one work-related experience I’ve had in my career. (Though I could’ve done without the couple thousand extra miles of driving we did.) The pinnacle of the whole engagement, and I remember this well, was the enormous ear-to-ear grin on Joel’s face after they did a presentation to a packed Oracle developer audience. After the talk was over, Joel told us how a couple of directors had approached him about incorporating a lot of the Agile work into other Oracle products. It was validation of all the hard work that everyone had put in, and he was justifiably proud.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar andrei'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>AMH: Definitely. Doing the work is one thing. That’s what we got paid for. Being able to directly help out the people we worked with and get to know them as people, like Joel, made the job fulfilling.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text:'>DK: Something special happens when the client has a spirit of innovation and really buys into the idea that our work is going to fundamentally change their business. While some of their executives were more circumspect, it seemed most were just so fully on board with what we were doing. <a href="https://www.linkedin.com/profile/view?id=98602&authType=NAME_SEARCH&authToken=77d2&locale=en_US&trk=tyah2&trkInfo=tarId%3A1406834890983%2Ctas%3Asteve%20van%20l%2Cidx%3A1-1-1">Steve</a>, <a href="https://www.linkedin.com/profile/view?id=1538990&authType=OUT_OF_NETWORK&authToken=mSgl&locale=en_US&srchid=7776351406834911873&srchindex=1&srchtotal=3265&trk=vsrp_people_res_name&trkInfo=VSRPsearchId%3A7776351406834911873%2CVSRPtargetId%3A1538990%2CVSRPcmpt%3Aprimary">Kishore</a>, <a href="https://www.linkedin.com/profile/view?id=39273&authType=NAME_SEARCH&authToken=nj4p&locale=en_US&trk=tyah2&trkInfo=tarId%3A1406834947907%2Ctas%3Aray%20hein%2Cidx%3A1-1-1">Ray</a>. And their designers were great too. Anthony and <a href="https://www.linkedin.com/profile/view?id=1609640&authType=OUT_OF_NETWORK&authToken=sffN&locale=en_US&trk=tyah2&trkInfo=tarId%3A1406834847120%2Ctas%3Amichelle%2Cidx%3A1-3-3">Michele</a>. Who am I missing?</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar ben'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>BL: We had a couple of great product allies too, <a href="https://www.linkedin.com/profile/view?id=1238601&authType=NAME_SEARCH&authToken=MVx3&locale=en_US&srchid=7776351406834973416&srchindex=1&srchtotal=2&trk=vsrp_people_res_name&trkInfo=VSRPsearchId%3A7776351406834973416%2CVSRPtargetId%3A1238601%2CVSRPcmpt%3Aprimary">Brian</a> and <a href="https://www.linkedin.com/profile/view?id=65271&authType=OUT_OF_NETWORK&authToken=UbX1&locale=en_US&trk=tyah2&trkInfo=tarId%3A1406835001406%2Ctas%3Adrees%20d%2Cidx%3A1-1-1">Drees</a>. You’re right though, the thing that made that project so rewarding was seeing all those folks transform from just an average team of software makers into a group that was empowered to make decisions and really drive the company, as well as each other. I know I will always be really proud of not only what was built, but who everyone became.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text:'>DK: Since we worked with Agile for such a long time a number of our key Silicon Valley team members ended up working on it over the years. I think it was the first thing Uday worked on at Invo, in fact.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar ben'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>BL: The part Uday played was huge. He really clicked with Andrei and Joel, in a way that allowed the whole team some more breathing room, because he could riff on things after just a few minutes of soaking something up. I remember though, there was this look on Uday’s face on one of the first days he spent at Agile, like “Oh man, what did I just get into?” In the end, I think that was because he dropped into a project where we were overhauling so much history that it would seem overwhelming to anyone coming in. You really ran with it though.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar uday'></div>
<div className='speaker-speaks'>
<span className='full-name'>Uday Gajendar:</span>
<span className='speaker-text'>LOL totally! I agree with Ben on that. It was a bit of sheer terror in the beginning but ultimately Agile was a major defining experience for me in terms of diving into and driving “good design” in a wholly authentic, integrative manner, with a fabulous team and unparalleled camaraderie. Small personal bonus: having previously started my design career at Oracle in 2001, seeing the Agile UX being bought by and folded back into Oracle in 2008 was a bit of a “cherry on top” for me ;-) #sweetrevenge (But I didn’t say that!)</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>I greatly enjoyed the dynamic with Ben, Tiffany, and Andrei there on-site at Agile, along with Joel, Brian, and the rest of the team. I learned a great deal from Andrei in terms of design mechanics and leadership, and the collaboration with Agile’s team to me epitomized how to do a project correctly with an outside design firm, with a true bona fide partnership feel that we can all share the merits and rewards equally. Great times!</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text:'>DK: One of the key things we did for Agile was help them develop agile methodologies. Yes, I know, it is confusing: the company is called Agile, and they were changing over to agile instead of waterfall. Raj had Andrei and me in to meet with him in early 2006 and gave us each a book about the lean manufacturing process. He wanted us to help him lead the conversion of Agile Software from their waterfall process over to lean. I was working that at the management and leadership levels while you guys were leading the charge on the product side. This was when agile methods were still not well-known so there was an awareness process as well as an educational one.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar andrei'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>AMH: One thing about the Agile project that many people probably don’t know is that it was one of the first times I took a little bit of a step back and let someone else drive a larger design vision. I had never really done that with anything I oversaw, ever. Even back at Adobe. Uday had wanted to do something bold on the project, so along the way I asked him to go for it. And he did, taking on a more artistic approach to the overall aesthetic that surprised me, in a good way. It was great to see him push both the work and himself in that way, something I love watching him do to this day.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar donna'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DD: I can’t recall if Agile was the first client we did the box exercise with, but I think it was such an important exercise in conveying to the team that there is no such thing as “the best design.” Each design solution has pros and cons and when you go through the exercise, no matter which option you choose, you are embracing the pros and acknowledging and owning the cons.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar uday'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>UG: Agree, the box exercise was a powerful device for wrangling massive complexity in a joint, collaborative manner. Really helped bring folks together in terms of the problem area, priorities, and a sense of “discipline” around the focus areas to drive productive engagement for the actual design. I found myself applying variations of the box exercise at later, post-Invo design projects, including at Citrix. I remember drafting an article for publication about that, and submitting it to some conferences with Dirk and Andrei, but sadly, it was rejected. (Note, this is the same UX community of folks who complained when Andrei said everyone should learn how to sketch ;-).)</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar andrei'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>AMH: Agile was the first place we instituted The Box Exercise. It worked so well with Agile that we used it for a lot of things later, and charged for it! Interestingly enough, the whole thing came out of a need to solve some team dynamics among design, engineering, and product managers on the project. While I had a rough version of the process with the exercise in my personal work or how to use it for a client, I had never formally developed the idea as a team exercise until we met a roadblock on the Agile project. The Box Exercise itself was something I would do on my own, in my sketchbook, or on a whiteboard. It is how I start almost every project I do, but I had never had to do it collaboratively, or formally. So doing the exercise in the open as a team, like the way we did with Agile, was a total experiment on my part. I’m glad to it worked, because if it hadn’t, I hadn’t yet figured out how we were going to help that team get through some rough early conceptual work for a total redesign.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text:'>DK: Of course Agile wasn’t the only thing we were working on. That first year in Lafayette we were also doing a lot of work for Yahoo! Small Business. One of the things we had to do was design a bunch of templates for small businesses in various industries to use for skinning their sites. We must have done, geez, in the low hundreds? That’s definitely not the kind of work we do so we rounded up a lot of well-known designers from around the world to contribute some for us. Our friends at <a href="http://madmadmad.com/">Madhouse</a> took the point on it for us. I don’t remember all of the other designers we brought in for it anymore but old friends Bedingfield and Croft were part of the team. Oh, and <a href="http://esbueno.noahstokes.com/">Noah Stokes</a>.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar andrei'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>AMH: First we got to work with Josh Williams on the Shutterfly project, then Noah Stokes with the Yahoo project, and over the next couple of years we’d get a chance to collaborate with <a href="http://www.nixonnow.org/about/">Paul Nixon</a>, <a href="http://www.mezzoblue.com/about/dave/">Dave Shea</a>, and others. That was one of the great benefits at GoInvo; getting to work with great designers in the industry.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar ben'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>BL: Noah remains someone I admire. Wouldn’t have gotten the chance without that gig.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text:'>DK: This was also when Spivot was coming to life. It was Invo’s first crack at doing our own product. Whose idea was it?</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar andrei'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>AMH: Spivot was my idea. It came about from messing around with CSS and RSS feeds at the time, digging more into Dave Shea’s work with the CSS Zen Garden, and first relaunch of the New York Times web site in the Web 2.0 heyday. Once you dig into how the separation of content and presentation works, the idea to take headlines and turn them into more dynamically presented content is a logical leap. So much so that the same idea became a big product five years later when Flipboard was launched. As it was, Spivot was a classic example of trying to do something innovative a bit too soon, as the technology to reliably fetch and parse that many RSS inputs was too difficult. The REST API boom hadn’t kicked in yet, and web browsers still didn't have all the CSS 3.0 features needed to make a rich interface fully baked in.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>When I showed Ben the mockups of the idea, he agree it would be cool, and it could be something we try to build. In the end, it was just a bit out of reach in 2006 to pull off with our resources, and the tech was still not quite there for us.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar ben'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>BL: Indeed, Spivot was probably just a bit too early. What made Flipboard, Reader, and others work just a few years later, was a wonderful confluence of media companies finally understanding the digital publishing cycle and mobile devices making short reads not only possible, but probable.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>Andrei’s definitely right though, the other big challenge was balancing massive amounts of work on Spivot with keeping the lights on at Invo. The complex challenges of Spivot’s technology were very compelling to solve, but were an intellectual distraction from running the studio. It was a bittersweet reality that we had to walk away from pursuing Spivot further, but I’m always happy to see the concept validated by folks building amazing products that push the conventions of traditional publishing and consumption.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text:'>DK: One thing that the foundation provided by the Agile work gave us was the ability to buy a studio space. In retrospect it seems wildly ambitious, but I had come up through successful medium-sized agencies where the proprietors were also the building owners. My first employer and mentor, <a href="https://www.linkedin.com/pub/ken-lauerer/46/604/504">Ken Lauerer</a>, taught me that this was a great move from a cultural-control and financial perspective. So I was keen on this sort of thing. Ben, I think you and Andrei were fully on board with it too?</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar ben'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>BL: I was, but it was definitely a big deal. Since the biggest thing I’d ever bought was a car, a building was a huge commitment. That said, it was a terrific thing for us to do. For starters, we needed a bigger space to grow within, but the real value was in legitimizing the business. For our clients, this meant formalized spaces for meetings and presentations, and crucially for us it meant ownership and control of what we could do within the space. As creatives, that’s the one thing we lacked in the Lafayette space, the ability to influence the built environment.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar andrei'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>AMH: I loved the new office, but it was certainly a big investment. One that was well worth it, had the market not crashed in 2008. As Donna can attest, I loved that space. I loved the big sign, I loved the high ceilings, I loved everything about being in a real office that could house everyone we wound up hiring. So hindsight makes the purchase look like a risky move—and to be clear, it was risky—but I’d do the same thing all over again.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text:'>DK: Yeah, me too.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar ben'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>BL: All I remember about our initial encounters with the space were the “quirky” neighbors we had. The day that spice warehouse next door started to stink, and the little bahn mi place on the corner that sold Vietnamese staple foods but also, weirdly, obscure US candies like <a href="http://www.necco.com/candy/wafers.aspx">Necco wafers</a>. I digress.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar uday'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>UG: I remember really enjoying that Kifer Road space for its amazing high ceilings and that warehouse-studio feel. It was quite echo-y, though. Definitely needed some nice bamboo flooring ;-) The upper area was really nicely decked out. Loved that wooden exotic furniture, it was a style that I saw at some design studios in Australia, too!</span>
</div>
</div>
</div>
<div className='sidebar'>
<div className='sidebar-box solid extra-top-margin agile-software mobile-hide'>
<img className='center' src='https://www.goinvo.com/old/images/features/an-oral-history/1-agile_logo.png' />
<p>Agile Software Corporation was a San Jose, California-based provider of Product Lifecycle Management (PLM) software.</p>
</div>
<div className='sidebar-box dotted raj-nav extra-top-margin'>
<img src='https://www.goinvo.com/old/images/features/an-oral-history/2-raj_bhargava_joel_nave.png' />
<p>Executive leader Raj Bhargava and UX leader Joel Nave worked together to get Agile to invest in a complete redesign of their massive PLM suite.</p>
</div>
<div className='sidebar-box dotted extra-top-margin tiffany-altieri mobile-hide'>
<img src='https://www.goinvo.com/old/images/features/an-oral-history/4-tiffany_altieri.jpg' />
<p>The talented and hard-working Tiffany Altieri was the first young creative to start and grow up at GoInvo, part of the Silicon Valley studio through its rise. A prototypical designer-engineer, Tiffany gravitated to the engineering side and today is a Silicon Valley veteran.</p>
</div>
<div className='sidebar-box dotted stairwell extra-top-margin'>
<img src='https://www.goinvo.com/old/images/features/an-oral-history/3-invo_first_studio.jpg' />
<p>GoInvo’s first studio, in a residential condo complex that was converted from old industrial space at 1777 Lafayette St. in Santa Clara, California shared characteristics with all subsequent Invo locations: high ceilings, open spaces, and a spirit of creativity.</p>
</div>
<div className='sidebar-box dotted whiteboards extra-top-margin mobile-hide'>
<img src='https://www.goinvo.com/old/images/features/an-oral-history/5-invo_whiteboard.jpg' />
<p>As handy with physical tools as he was with digital, Ben provided low-cost furniture and collaboration tools in that first studio.</p>
</div>
<div className='sidebar-box solid wine extra-top-margin mobile-hide'>
<img className='center' src='https://www.goinvo.com/old/images/features/an-oral-history/6-wine.jpg' />
<p>A joy in wine was shared by the Invo SV team, with most of us traveling up to wine country from time to time.</p>
</div>
<div className='sidebar-box solid oracle extra-top-margin mobile-hide'>
<img className='center' src='https://www.goinvo.com/old/images/features/an-oral-history/7-oracle_logo.png' />
<p>In May 2007 Oracle acquired Agile for $495M.</p>
</div>
<div className='sidebar-box dotted uday-gajendar extra-top-margin'>
<img src='https://www.goinvo.com/old/images/features/an-oral-history/8-uday_gajendar.jpg' />
<p>A senior designer with a philosophical bent, Uday Gajendar joined Invo from frog design at the beginning of 2007. He has worked for many top enterprise software companies, including Oracle, Citrix, and BEA. Today he is on the Design Council for VC Kleiner Perkins Caufield & Byers and the Director of UX for CloudPhysics.</p>
</div>
<div className='sidebar-box dotted box-ex extra-top-margin mobile-hide'>
<img src='https://www.goinvo.com/old/images/features/an-oral-history/9-box_exercise.jpg' />
<p>“The Box Exercise” was Andrei’s name for GoInvo’s unique approach to product architecture.</p>
</div>
<div className='sidebar-box solid uday-pdf extra-top-margin mobile-hide'>
<p>In 2008, Uday published a paper on The Box Exercise. <a href="/old/images/features/an-oral-history/10-the_box_exercise.pdf">Download the PDF</a>.</p>
</div>
<div className='sidebar-box dotted box-ex extra-top-margin double-top'>
<img src='https://www.goinvo.com/old/images/features/an-oral-history/11-stokes.jpg' />
<p>A fresh-faced young designer/ developer when working with Invo, the irreverent Noah Stokes is now the owner of <a href="http://hellobold.com/">Bold</a>.</p>
</div>
<div className='sidebar-box dotted spivot extra-top-margin mobile-hide'>
<img src='https://www.goinvo.com/old/images/features/an-oral-history/12-spivot.jpg' />
<p>Spivot was Flipboard three years early and before the iPad made that style of content consumption more of a living room (as opposed to office) activity.</p>
</div>
<div className='sidebar-box dotted sunnyvale extra-top-margin'>
<img src='https://www.goinvo.com/old/images/features/an-oral-history/13-kifer_studio.jpg' />
<p>The office condos at 1294 Kifer Rd. in Sunnyvale, California featured Class A office space in the front and warehouse space in the back. We turned our warehouse into a studio.</p>
</div>
</div>
</div>
<div className='row'>
<div className='rslides-container'>
<ul className='rslides' id='slideshow'>
<li>
<img src='https://www.goinvo.com/old/images/features/an-oral-history/slides/a.jpg' />
</li>
<li>
<img src='https://www.goinvo.com/old/images/features/an-oral-history/slides/b.jpg' />
</li>
<li>
<img src='https://www.goinvo.com/old/images/features/an-oral-history/slides/c.jpg' />
</li>
<li>
<img src='https://www.goinvo.com/old/images/features/an-oral-history/slides/e.jpg' />
</li>
<li>
<img src='https://www.goinvo.com/old/images/features/an-oral-history/slides/f.jpg' />
</li>
<li>
<img src='https://www.goinvo.com/old/images/features/an-oral-history/slides/g.jpg' />
</li>
<li>
<img src='https://www.goinvo.com/old/images/features/an-oral-history/slides/h.jpg' />
</li>
<li>
<img src='https://www.goinvo.com/old/images/features/an-oral-history/slides/i.jpg' />
</li>
<li>
<img src='https://www.goinvo.com/old/images/features/an-oral-history/slides/j.jpg' />
</li>
<li>
<img src='https://www.goinvo.com/old/images/features/an-oral-history/slides/k.jpg' />
</li>
<li>
<img src='https://www.goinvo.com/old/images/features/an-oral-history/slides/l.jpg' />
</li>
<li>
<img src='https://www.goinvo.com/old/images/features/an-oral-history/slides/q.jpg' />
</li>
<li>
<img src='https://www.goinvo.com/old/images/features/an-oral-history/slides/r.jpg' />
</li>
<li>
<img src='https://www.goinvo.com/old/images/features/an-oral-history/slides/m.jpg' />
</li>
<li>
<img src='https://www.goinvo.com/old/images/features/an-oral-history/slides/n.jpg' />
</li>
<li>
<img src='https://www.goinvo.com/old/images/features/an-oral-history/slides/o.jpg' />
</li>
<li>
<img src='https://www.goinvo.com/old/images/features/an-oral-history/slides/p.jpg' />
</li>
</ul>
<div className='caption'>Memorable moments from our SV team and studio</div>
</div>
</div>
<div className='row'>
<div className='interview-wrapper'>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text:'>DK: We really decked it out. We had a lot of great furniture. The glass-block entrance. The art.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-text:'>The Pacific Green stuff from Australia. For it being all of our first time doing our own building I think we did a pretty good job with it.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar andrei'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>AMH: That was all you, Dirk. You had a real knack for environment and space. The first studio had a great feel, and the bigger office was even better. The furniture and the way you outfitted the office was amazing.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar ben'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>BL: To this day, I still love our entryway, with the glass block and the rugged steel sign. The furniture was awesome. I think Joel once called it “the sanctuary” because of the big, lush plants Donna brought in, and the overall rainforest feel of the pieces.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar uday'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>UG: Yup quite the “sanctuary” of design goodness ;-) Really nice space to indulge yourself in. I personally enjoyed the “Lunch Table” which I think was supposed to be a giant surfboard type of concept? Great way to mingle and chat during the day. Wished we had more “happy hours” ;-) Loved the conference room upstairs too, where we brought in students from San Jose State, that class Andrei and I taught a few times.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text:'>DK: Andrei, you’ve still got that sign somewhere, don’t you? It must weigh hundreds of pounds.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar donna'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DD: It weighs more like a ton. And is in the exact same spot in our home studio where we put it when we brought it home. Andrei loves the sign. I wish we could hang it, but I think it would bring down the wall and our whole studio would implode.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar andrei'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>AMH: Waiting to buy a big mansion—or, as Donna will tell me, a farm somewhere in the country—so I can hang it back up on the wall!</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text:'>DK: So other than Agile, what were we working on in our first year on Kifer?</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar ben'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>BL: I spent a while focusing on building our internal development practices, which is another way of saying we had some housekeeping to do with our code. It was crucial to our clients though, that we had a considered platform when we entered discussions, and presented a more unified vision of our practice. <a href="http://robbrackett.com/">Rob Brackett</a> was a key player in getting that platform right, as he is one of those rare folks that makes you more solid through experimentation and growth.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar andrei'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>AMH: Hiring Rob at that time was key. We met him through a contact from Juhan. Rob turned out to be a great engineer with all the right design instincts. He clicked right away with Ben, helping him build out the engineering and technical side of the company.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-textWe'>We also brought David Bedingfield back on board at the Kifer office. He had been critical on the Shutterfly project, and we were able to bring him on full time. David’s a craftsman, and everything he worked on was great. He and Rob designed and built the Splashnote Editor, one of the first fully fleshed-out web apps for our clients, before hardly anyone was doing that sort of work in 2007. It was a page design editor that had multiple undo, free-form layout, and plug-ins. Like Spivot, it was ahead of its time.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar uday'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>UG: After Agile I helped on a few small client projects, including <a href="https://www.mcafee.com/">McAfee</a>, doing early concept work for their Antivirus notification app, and GXL for <a href="http://en.wikipedia.org/wiki/Dennis_Fong">Dennis Fong</a>, which became Raptr. Oh, and updating the Invo website, at least with some web concepts.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text:'>DK: Working with Dennis Fong was fun. Andrei, you worked side-by-side with him on Raptr, and we had a whole team working with his brother <a href="https://www.linkedin.com/in/lylefong">Lyle</a> on <a href="http://www.lithium.com/">Lithium</a>.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar andrei'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>AMH: Yes. One of those serendipitous projects, from a relationship I made with him some ten years prior. I had met Dennis when he was still very young, and he and his brother Lyle were building Gamers.com. Being able to work with him, then getting the project with Lithium, Lyle’s company, is one of those things that happens so often here. It’s one of the biggest lessons in our business: Relationships are key. It’s how so much of Silicon Valley operates.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar ben'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>BL: I don’t think it was too much of an arm-twist to get Andrei fired up about working on something so intimately involved with gaming! Seriously though, the Raptr team was a blast to work with because they already knew the value of a great design. And, because they’d worked together multiple times, they were fast as heck at building things.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar andrei'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>AMH: Dennis was willing to try all sorts of out of the box ideas and thinking. That made the project a lot of fun to work on. However, Dennis was still building his new company, so unfortunately some of the more advanced concepts had to be shelved because of time and engineering resources. While that part was somewhat of a disappointment, it was one of the projects I had enjoyed working on most in quite some time.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar uday'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>UG: Yes, I helped out on the Raptr project in early days when it was called GXL, back at <a href="http://www.plugandplaytechcenter.com/">the Plug & Play Tech Center</a> nearby. I remember meeting Dennis and liking his energy and creative thinking. We did the Box Exercise to break out the elements and structure... and I jammed on tons of wireframes and whiteboard sketching sessions before doing the pixel comps. I think that was my first true “consumer” design project, something that spoke to a very specialized audience of gamers. Fun times and cool project. Also where Andrei let me “run” it a bit which gave me more client engagement experience firsthand, Dennis was a great first run at that as he’s a very gracious and accommodating client.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar ben'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>BL: As a studio though, I think Lithium had more impact on a greater number of the team. <a href="https://www.linkedin.com/profile/view?id=1362108&authType=OUT_OF_NETWORK&authToken=ERHe&locale=en_US&trk=tyah2&trkInfo=tarId%3A1406839298062%2Ctas%3Achudo%2Cidx%3A1-1-1">Chudo</a> was a big part of making that project succeed, and an instant culture fit with the whole team. He had all that funky music on a slingbox or something.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text:'>DK: Remember the fantasy football league we had that first year there? I remember the draft really well, up in our conference room. Who won that, <a href="https://www.linkedin.com/profile/view?id=3026051&authType=NAME_SEARCH&authToken=-27A&locale=en_US&srchid=7776351406837926106&srchindex=1&srchtotal=79&trk=vsrp_people_res_name&trkInfo=VSRPsearchId%3A7776351406837926106%2CVSRPtargetId%3A3026051%2CVSRPcmpt%3Aprimary">Burnett</a>? Ben you paid like $50 for <a href="http://en.wikipedia.org/wiki/Laurence_Maroney">Laurence Maroney</a> which was not as insane at the time as it sounds now.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar ben'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>BL: I never claimed to know anything about football, I just enjoy a good wager. I also remember the table-top arcade simulator we got after a while. Improbably, that ended up being more popular than the Playstation, or any other entertainment source upstairs.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar andrei'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>AMH: And the Nintendo Wii! I remember buying <a href="http://www.guitarhero.com/">Guitar Hero</a> for it. The upstairs conference room was great, and we utilized it for so many meetings and events. Uday and I taught an interaction design class at <a href="http://www.sjsu.edu/">San Jose State</a>, and we’d have the students over to the office. We were able to cram all of them upstairs in that conference room.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: You played A LOT of Guitar Hero up there! We also did the GoInvo Master Academy during this time. That was one of the many things we were ahead of our time on. We wanted to have a full certification program for designers and, eventually, engineers, since it was such a wild west out there of uneven education and training for people in our field. Nobody else was doing anything like that at the time, now it’s a pretty popular thing to do. But we had some great instructors teach courses for us: <a href="http://www.lukew.com/about/">Luke Wroblewski</a>, <a href="http://www.portigal.com/about-us/">Steve Portigal</a>, <a href="http://rosenfeldmedia.com/">Lou Rosenfeld</a>... Ah, what could have been!</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar uday'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>UG: Ah yes, that’s what it was! Now I remember. I find it somewhat amusing and ironic now that <a href="http://www.uie.com/about/">Jared Spool</a> is doing his whole <a href="http://unicorninstitute.com/">Unicorn Institute</a> and Lou has his <a href="http://rosenfeldmedia.com/training/">retinue of paid pros doing classes</a>. And <a href="http://www.adaptivepath.com/">Adaptive Path</a> with their money-making classes too. We were simply ahead of our time ;-)</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar andrei'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>AMH: A running theme here.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar ben'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>BL: This will always be pretty special to me. I don’t think I’d have had the opportunity to meet a lot of these folks, were it not for Invo. That’s part of what makes client work unique, but having additional guests in the space, and having you guys bring in your contacts in the industry and community was a bonus I’ll never forget.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: Toward the middle of 2008 was when you said you were leaving, Ben. That was my saddest day at Invo. The idea of having the company without you being a part of it was just incomprehensible to me.</span>
</div>
</div>
</div>
<div className='sidebar'>
<div className='sidebar-box dotted steel-sign extra-top-margin mobile-hide'>
<img src='https://www.goinvo.com/old/images/features/an-oral-history/15-invo_lobby.jpg' />
<p>Over 500 pounds of metal hanging with distinction in the Kifer Rd. lobby.</p>
</div>
<div className='sidebar-box dotted rob-bracket extra-top-margin'>
<img src='https://www.goinvo.com/old/images/features/an-oral-history/16-rob_brackett.jpg' />
<p>Rob Brackett joined Invo soon after leaving university and quickly established himself as Ben’s top engineer. He went on to serve as an engineer at Apple and a fellow at Code for America.</p>
</div>
<div className='sidebar-box dotted dennis-fong extra-top-margin'>
<img src='https://www.goinvo.com/old/images/features/an-oral-history/17-dennis_fong.jpg' />
<p>Dennis Fong, aka “Thresh”, was the first professional video game superstar. He sold Xfire to Viacom for $102M in 2006, then picked GoInvo to create his next gaming idea.</p>
</div>
<div className='sidebar-box solid extra-top-margin plug-n-play mobile-hide'>
<img className='center' src='https://www.goinvo.com/old/images/features/an-oral-history/18-plug_and_play_logo.png' />
<p>An early open workspace, the Plug & Play Tech Center has multiple offices in Silicon Valley and housed a handful of GoInvo clients.</p>
</div>
<div className='sidebar-box dotted guitar-hero extra-top-margin'>
<img src='https://www.goinvo.com/old/images/features/an-oral-history/19-rob_ms_pacman.jpg' />
</div>
<div className='sidebar-box dotted extra-top-margin invo-friends mobile-hide'>
<img src='https://www.goinvo.com/old/images/features/an-oral-history/20-wroblewski_portigal_rosenfeld.png' />
<p>Invo often works with our friends, as was the case involving Luke Wroblewski, Lou Rosenfeld, Steve Portigal in the Invo Master Academy.</p>
</div>
</div>
</div>
</section>
<header className='three' id='section3-interesting-times'>
<div className='header-wrapper'>
<div className='inner-header-wrapper'>
<div className='main-header-content'>
<div className='header-title'>Interesting Times</div>
<div className='header-content'></div>
</div>
</div>
</div>
</header>
<header className='nav-wrapper middle-nav'>
<nav className='main-nav'>
<div className='title'>An Oral History of GoInvo</div>
<a className='one' href='#section1-origins'>
<div className='nav-div'>1. Origins</div>
</a>
<a className='two' href='#section2-silicon'>
<div className='nav-div'>2. Rise, Silicon Valley</div>
</a>
<a className='three' href='#section3-interesting-times'>
<div className='nav-div'>3. Interesting Times</div>
</a>
<a className='four' href='#section4-boston'>
<div className='nav-div'>4. Rise, Boston</div>
</a>
<a className='five' href='#section5-todaytomorrow'>
<div className='nav-div'>5. Today,  and Tomorrow</div>
</a>
</nav>
</header>
<section className='interview-content' id='section3-interesting-times-content'>
<div className='row'>
<div className='interview-wrapper'>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='full-name'>Dirk Knemeyer:</span>
<span className='speaker-text'>As Agile finally started winding down we had a new big client hitting: <a href="http://www.mcafee.com/us/">McAfee</a>. Andrei, your old buddy Tim Kinslow got hired over there and wanted us to redesign the Total Protection Suite.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar andrei'></div>
<div className='speaker-speaks'>
<span className='full-name'>Andrei Herasimchuk:</span>
<span className='speaker-text'>Tim and I worked at Adobe during the same period in the late 90s. He’s a great guy. He had moved over to McAfee and was trying to find ways to inject new ideas into their core product line. He reached out to us and we spent a few months discussing what that could look like if we were to come on board.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: The McAfee project was probably Invo SV at its most potent. We only worked with them for about 10 months, and much of that was supplementary projects, not the massive redesign. I think we actually completed the redesign itself in... three months? Four? It seems impossibly fast, but I guess we scaled up the team for it.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar andrei'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>AMH: I have the original schedule still. The core design work was over three to four months, but the entire project lasted nine months! As had become part of our core practice, and one Juhan has kept going over in Boston, we helped to build the things we designed. On the McAfee project, we did exactly that, and plenty of front-end code that Rob had written found its way into the shipping version of the product.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar ben'></div>
<div className='speaker-speaks'>
<span className='full-name'>Ben Listwon:</span>
<span className='speaker-text'>Yeah, McAfee was sort of the coming-of-age of the SV tech practice too. Rob and Tiff had really taken the wheel and I think the effort they put into really owning our development standards made it possible to meet the McAfee team where we needed to technically. They had a lot of low-level tech hurdles, and we had a high-level library of abstractions, so what could have gone horribly ended up being smooth sailing because of their hard work.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: There was a lot of political stuff going on there, too. We weren’t privy to all of the details but they had a remote UX team in the <a href="http://en.wikipedia.org/wiki/Seattle">Seattle</a> area and shifted instead to building a new local team in Santa Clara. So all of the work we were doing was sort of the transition. Yes, we were the ones redesigning their flagship software suite, but before we started, their Seattle group was their internal UX team, and after we left they had their own local team in the valley.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar andrei'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>AMH: It was tough navigating those waters on the project. It was also nice having <a href="https://www.linkedin.com/profile/view?id=1442784&authType=NAME_SEARCH&authToken=Nepg&locale=en_US&srchid=7776351411755926621&srchindex=1&srchtotal=2110&trk=vsrp_people_res_name&trkInfo=VSRPsearchId%3A7776351411755926621%2CVSRPtargetId%3A1442784%2CVSRPcmpt%3Aprimary">Chris Robinson</a>, <a href="https://www.linkedin.com/profile/view?id=1849280&authType=NAME_SEARCH&authToken=f6ae&locale=en_US&srchid=7776351411755966130&srchindex=1&srchtotal=2&trk=vsrp_people_res_name&trkInfo=VSRPsearchId%3A7776351411755966130%2CVSRPtargetId%3A1849280%2CVSRPcmpt%3Aprimary">Monica Keefe</a>, and <a href="https://www.linkedin.com/profile/view?id=6932434&authType=NAME_SEARCH&authToken=e43E&locale=en_US&trk=tyah2&trkInfo=tarId%3A1411756117519%2Ctas%3Aelisabeth%20miles%2Cidx%3A1-1-1">Elisabeth Miles</a> on the team by that time. They really took the project and ran with it. Given the pressure of that project, and how much was a stake, I’m confident I would have been crushed under the weight of it without them.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: As Silicon Valley was growing in 2008, the plan had always been to expand GoInvo geographically as opposed to in one location. The magic number was 20. We didn’t want more than 20 people in any one studio.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>We had a list of five designers who we thought would be worthy of building another GoInvo around, basically ... five people who we thought were worthy but also were in markets where it seemed possible in a certain way.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>Juhan, you were actually at the top of the list, and the idea was to go one at a time. Start with you and talk to you, as opposed to have a big process of trying all these different streams at once, it was really narrow focus. As the McAfee project came in, and as Invo Silicon Valley was swelling to 20 people, it clearly was the moment that Andrei had pre-agreed to expand out into.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar juhan'></div>
<div className='speaker-speaks'>
<span className='full-name'>Juhan Sonin:</span>
<span className='speaker-text'>I was at <a href="http://en.wikipedia.org/wiki/Mitre_Corporation">MITRE</a>, which was pretty damn good and a bit cushy, and I was learning a ton. It was an interesting time for us to have talked because it was at the crescendo moment. I’m asking myself “what happens next?” Not everything can be flowers and honey and sex. It was hard because it was a really good situation where I was protected in an R&D environment. You had this umbrella from having to worry about what quarter it was and what the money looked like.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>The more we talked the more I saw the work that you guys were doing, and also the more that I thought, “It’s time for me to shift.” It’s almost like the seven-year itch. I was six years at <a href="http://en.wikipedia.org/wiki/National_Center_for_Supercomputing_Applications">NCSA</a>. Then it was six or seven years at MITRE. There may be an internal clock for me, whether on the organization or idea front. Wait, I’ve been at Invo how long now? Six years? Oh ho...</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar andrei'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>AMH: Juhan was an easy pick to lead and grow the studio practice outside of Silicon Valley. His passion for design and drive to earn real money made him the ideal choice to run a studio.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: It was moving slowly, but finally what cinched it was when we got together. I was taking a trip to <a href="http://en.wikipedia.org/wiki/Cape_Cod">Cape Cod</a>, and you came down and we had a face-to-face meeting, which was where it all sank in.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar juhan'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>JS: That was a come-to-Jesus meeting. I was thinking, “Man, I got to make a decision.” You have a business to run. You have other people on your short list, and who you’d rather put the noose on. So what the hell was I doing? That’s why I think I needed this one-on-one session to help me go over the cliff.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: The part that I hadn’t expected was, for you to agree to it, your requirement was that I actually move to Boston to help. I hadn’t expected that. I thought I would stay in Silicon Valley and maybe come to Boston periodically, and be very engaged with you, but you would be out here on your own. That was hard for me because I loved California.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar juhan'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>JS: I almost made that assumption at the beginning, and maybe that’s why I was bullish on it. I was like, “Okay, I’ll do this, but ...” I think I made that mental connection, that dream connection, that you were going to be here doing it with me, so I wouldn’t be completely alone. I think that helped me through the initial part, so thank you.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: It was probably naïve of me to think that the way to build a new studio was just turn you loose out in the wild. When someone is entering a business, they need a little more integration than I had imagined. That created a moment for me of having to make a decision. I was very keen, as I mentioned before, to start with new things and start learning, so ultimately I was happy to do that. I immediately bought a house in Somerville and started making plans, and shifted my life to Boston; but we flipped the switch on the studio January 1st of 2009.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar andrei'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>AMH: And it has been amazing to watch Juhan take the studio in Boston, make it his own over the years, and really grow a special team of designers, artists, engineers, and makers there.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: Andrei, as the McAfee project was winding down we had our all-company retreat down in <a href="http://en.wikipedia.org/wiki/Santa_Cruz,_California">Santa Cruz</a>. That was such a turning point, in retrospect. We planned that when things were at their very peak. And it was a really nice venue and event. Unfortunately, it was October 2008. We had more money in the bank than ever before. But I was looking at our big monthly burn and a non-existent sales pipeline, and I realized that with our large size we were suddenly and improbably in a very vulnerable position.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar andrei'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>AMH: Probably the best string of months of the entire thing for me was most of 2008, with all of our earnings, a full studio of designers, everyone working and kicking ass, projects humming along, doing great work... Then the worst month was probably October 2008. All of our major clients called us within a two-week period and told us their budgets had been completely frozen. We were basically locked out. I had never felt so ill for so long as I did during October, November, and December of 2008. It was brutal on the psyche.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: We talked about what to do, a conversation that started while we were at the bloody retreat, and finally decided to try and weather the storm. I think we now both agree that was a mistake. But we worked hard to build up to where we were at, and the idea of following the classic advice&mdash;cutting fast and cutting deep&mdash;was a bitter pill at that point.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar andrei'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>AMH: It would have been too much for me to take. So rather than let everyone go and start over, we decided to try and swing around to making our own software with the people we had on board, while also searching for whatever client work we could get. Although in early 2009, everything was grim from a business point of view.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: 2009 must have been incredibly difficult for you, Andrei. I was off in Boston, only involved in the Silicon Valley studio in a very executive capacity. And over the course of the year the company just suffered from the economic conditions which made getting work incredibly difficult.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar andrei'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>AMH: It was brutal. But we tried our best. We spent all of the first half of 2009 prototyping and building up a few product ideas, settling on making tools for web developers. We got far into the project, and almost got funded, but in the end the deals never came through.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: There were some interesting projects down the stretch. Sean Parker brought you in to work with Founder’s Fund. And you were working with one or two other VC’s as well. It was weird: during our early years almost everything we did was direct-to-client but suddenly when there is little work and things are going sideways working with VS’s opened up as a new avenue. Albeit not one significant enough to sustain us.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar andrei'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>AMH: The lack of enough robust client work made it such that we had to let a few go every month the first two quarters of 2009. Not my best days to say the least. Looking back on it, I’m not sure how I managed to get through those times.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: It was such a sad way to end, and relatively speaking a remarkably fast fall. What do you think we should have done differently? Or what would you have done differently?</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar andrei'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>AMH: I talked about the experience with Nancy Duarte. She basically told me that the only thing we could have done differently would have been to make sure our staff included 30% to 40% contractors. That way, when things like this happen, you can release contractors, keep your core key people, and do what you can to weather the storm better. Other than that, we were on track to build a great business, even with the expense of doing so in Silicon Valley, where salaries are high, real estate is expensive, and people still want to pay lower rates for consultants than is practical. The problem with being in the services industry, especially one that offers up design as its service, is that there are ups and downs in the economy, and you have to have enough money to survive the down periods when they occur. And they will occur. We were short on money by about six months, probably nine months. But considering we built the thing from scratch with only $20,000 of our own money, it’s an extraordinary accomplishment that we built it up as big as we did in five years.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: By the time we realized the serious problem we were in I had already moved to Boston and bought a house. It seemed impossible not to follow through with the Boston studio as a result&mdash;the house was an anchor at that point&mdash;but in retrospect the idea of expanding into a new market while in that situation seems stupid. Could skipping that investment have saved Silicon Valley? I’m not sure. Even out in Boston it was Q3 of 2010 before we started to find our footing, the recession was just gutting. Regardless, the very idea of making that move in that financial environment doesn’t make sense.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar andrei'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>AMH: Skipping out on Boston would not have saved Silicon Valley. In fact, seeing it through in Boston was easily the best decision, and has proven to be the case over time.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: Looking back, what are your best memories of doing Invo Silicon Valley?</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar andrei'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>AMH: I miss being at the studio late at night by myself, doing a little work, finding myself in a rut with whatever design task I was trying to get through, then reaching over and turning on the amp to my bass. I’d practice playing, cranking it up pretty high. No one was around, our business neighbors were gone, so I could turn up the volume to 11.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>Turning out the lights at GoInvo Silicon Valley that last day was a sad moment. A lot of great things came out of the studio, and we had a chance to work with a lot of great people. We'll miss those days, but always looking forward to see what the future brings for the new studio, the people who have joined the team, and what they do with their time there.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: Those were good days. I look back more fondly on my years in California than any other point in my adult life. But, now Invo is in Boston. Remember our looking for space, Juhan?</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar juhan'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>JS: We signed in September the agreement that, yes, here are our open veins, we’re blood-brothering. We started looking at spaces right away. I remember there was one place in Davis Square which had the windows on the top, you couldn’t even see out. I was like, “Oh, no!” It was affordable, it was in a great location, but the space didn’t feel great.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>Just by a crazy coincidence, Abby and Ivan had their company Tipjoy that Facebook would later buy. They said, “You know, there’s an old yoga studio in our building. You may want to look at the space.” It just instantly grabbed me. And it was the space more than anything that really made me internalize, “Yes, we’re doing the company.”</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: Beyond being a great space, right from the very beginning it needed a lot of work. It wasn’t like, “Now we’ve rented an office; let’s move in the tables and chairs.” We were in there with paint and sledgehammers, ripping something down in order to create something new there.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar juhan'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>JS: I remember when I made my announcement at MITRE that I was leaving [INSERT PDF = juhan_tminus7200min]. I did a little presentation, no one knew that I was leaving except Harry and Rob McCready. It was called 700,234 seconds. It was one of these things where it was a countdown in seconds, or how many seconds I had left at the organization. People were getting their calculators out.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: In the presentation you gave your notice?</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar juhan'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>JS: It was my,“Hey, people, I’m out of here.” It was a lunchtime tech talk, and there were two of us doing a little talk and it was at the end. I went through it and I said, “Hey, I have 700,000 seconds left in my MITRE career.” Then silence. I was one of the crew leaders there. Then people locked on in a good way.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: We got started at a moment where the recession was in full swing. In Silicon Valley, the studio was really suffering from a lack of work relative to the size of the staff. It was the beginning of a year of downsizing, and finally removing the Silicon Valley studio altogether. Not surprisingly we started really slow in Boston as well.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar juhan'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>JS: We did. We were just on the entrails, the surviving entrails of the Silicon Valley studio. Some of the first projects we had were through the SV office. That’s when Andrei and I worked the projects. That’s when I was in a lot of the design. There was nobody else, other than Rani who came in part-time. I was doing design for clients.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>The first couple years were like that where the first 2 1/2 years ... Jon did design, actually, at the beginning, I did design. Now it’s a little different. Remember the <a href="http://www.curl.com/">Curl</a> project? That was me and <a href="https://www.linkedin.com/profile/view?id=13751180&authType=NAME_SEARCH&authToken=Tktb&locale=en_US&srchid=7776351412888773897&srchindex=1&srchtotal=8&trk=vsrp_people_res_name&trkInfo=VSRPsearchId%3A7776351412888773897%2CVSRPtargetId%3A13751180%2CVSRPcmpt%3Aprimary">Brian Staats</a>.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>When you’re starting a studio, it’s not an instant culture. You have to grow these things, and you’re figuring out what you want to do. You were doing this bi-coastal thing, trying to help Silicon Valley survive, and there I was.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: The worse things got in California the more I was out there. Once Andrei left I was out there constantly.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar juhan'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>JS: Yeah, because you had to deal with it. You have a million-dollar building on the line and a multi-million dollar company. I’m looking at this selfishly. You had other things to do, and I wasn’t expecting you to be here the whole time, but when you’re alone, completely alone, in a big space like this, I remember I’d get my bike and ride inside, like a fat bear on a small trike at a circus. I’d do that just to calm my mind and think about other things.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>It was sometimes a lonely experience for the first year at least, because I was doing almost all the design alone. I didn’t get that feedback loop that I had been used to for the 15 years before that where I had someone next to me, or two offices down, or a whole crew, I could say, “What do you think of this?”</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>It was, “Let me look at this,” and then, “Let me look at it some more,” and, “Let me go ride my bike for ten minutes.”</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: That was tough.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar juhan'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>JS: It was tough. We were just surviving, and not having a big reputation here in Boston, having a really hard time getting any kind of traction in projects.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: During this lean time we made our first full-time hire at the studio in <a href="https://www.linkedin.com/profile/view?id=22053382&authType=NAME_SEARCH&authToken=-il9&locale=en_US&srchid=7776351412889408993&srchindex=1&srchtotal=87&trk=vsrp_people_res_name&trkInfo=VSRPsearchId%3A7776351412889408993%2CVSRPtargetId%3A22053382%2CVSRPcmpt%3Aprimary">Eric Benoit</a>, who has become the most important member of our team. What I remember is that I wasn’t sure that he was a designer. He had on a sport coat. He wasn’t dressed like a creative, he was dressed like more of a business guy. So his work was strong for a young guy but it wasn’t clear to me that he would develop as a designer. Of course now he’s a star and wears a t-shirt and jeans every day. The sport coat is hanging in a closet somewhere I think.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar eric'></div>
<div className='speaker-speaks'>
<span className='full-name'>Eric Benoit:</span>
<span className='speaker-text'>I remember getting this email from Juhan via my website’s contact form. He asked if I was interested in designing “meaty apps” in the health space. I’m still not sure how he found me.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: I think I found you via the Googles or maybe you had a portfolio up at AIGA? That’s how I used to find people.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar eric'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>EB: I remember combing through all the pages on the Invo website and watching all the videos and being jazzed with what they had to say, and the fact that Invo was focused on designing software. Prior to Invo I was working more on websites at the time, but in my freelance moonlighting I started designing software, which was piquing my interest.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>The interview I thought went well and it seemed there was a mutual interest there. But then there was radio silence. So I followed up about a week and a half later and I think Juhan was like, yes, here is an offer.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar juhan'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>JS: I think it was two weeks later. Ooof! I could blame it on post-New Year’s holiday sleepiness, but it was just my idiocy. But our custom website was to die for... <a href="http://www.mit.edu/~juhan/designjedis.html">literally</a>.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar eric'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>EB: There was enough there I was attracted to ignore the two-and-a-half-hour daily commute I was signing up for. I was actually looking at buying a used car at the time but once I knew I was doing this commute I decided to buy a brand new car so I didn’t have to worry about breaking down.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar juhan'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>JS: Eric was maybe the only bright spot in that dark time. I remember the very bottom, when you and I huddled up at <a href="http://www.yelp.com/biz/starbucks-arlington-16">Starbucks</a>.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: Yeah. I called that meeting because I had been funding things out of my personal finances for some time at that point, and I was out of money. I was saying, “Look I want to continue, but nobody can get paid. You can’t get paid anymore, Benoit can’t get paid.”</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar juhan'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>JS: It’s over.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: It’s over. We talked about it, and we both were interested in trying to keep it going. I don’t know how long we could have just done that. I was out of money, so very quickly I would have hit a wall and needed a job, I was already sort of looking. I don’t know how long your tolerance would have been, but just by the grace of God it worked out. We talked in March of 2010; by April we had a project, by May we had another project. It just started to run again.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar juhan'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>JS: We got the <a href="http://www.democrats.org/">Democratic National Committee</a> project from another MITRE alum who moved down to DC. That got our nose above water.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar eric'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>EB: I was excited to do this project for the DNC. Designing something for that scale of usage and it was for a good cause; getting people eligible to vote!</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>This was my first project in the studio. I think I fumbled around on the project just trying to figure out how to work with Juhan and how to design software since I had no formal training in UI/UX design. I remember coming to the end of the three-month project and Juhan bringing up the fact that Invo doesn’t have any future projects at the moment so he wasn’t sure how much longer this would be going. He ended up getting a small web app gig for me to work on to keep me there. I was happy for that.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar juhan'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>JS: Luckily, we snagged a gig working with a Boston non-profit on evolving their online, k-6 learning software, helping kids to read and teachers to evaluate the students’ progress. Eric and I worked very closely, our desks were just a few feet apart and we went back and forth on design ideas daily. That first year cemented our personal process. If you look at our idea canvases in Photoshop/Indesign, they’re almost identical in format...like a woodworking shop with little bits and sculptures scattered all over the table, with the piece de resistance in the middle. (In my case, it was the piece of crap in the middle, and Eric’s was The Piece.)</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar eric'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>EB: I remember how quiet (and empty!) the first handful of months were at the studio. There were many days where it was just me at the studio while Dirk and Juhan were out at client meetings. Probably not too normal to be only a few months in as a new hire and you’re the only one in the office at times, but I was fine with that.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: A few months after we got back on our feet is when Jon came onboard full time. Jon, you were really part of the studio from the earliest days, not as part of the GoInvo team but just as friend of the studio, friend of mine, and coming in and participating.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar jon'></div>
<div className='speaker-speaks'>
<span className='full-name'>Jonathan Follett:</span>
<span className='speaker-text'>You and I met at a financial information design conference at the <a href="http://www.harvardclub.com/Club/Scripts/Home/home.asp">Harvard Club</a> back in 2005. I remember that you had a slide up of your two boys, and you talked about how the word “user” rubbed you the wrong way, which was in the early years of the user experience. I always felt that way as well, just that there were two industries that referred to their clients as users, the computer industry and the illicit drug industry. That resonated with me.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>I talked to you afterwards. We had a really good conversation, and you gave me your card. I think you were in Somerville at the time, and I was excited about that. I’m like,“Oh, that’s cool,” but you told me that summer you were going to move to Silicon Valley to build Invo there.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>You were doing a ton of publishing at the time, and I was just starting to put on my writing-tech-publications hat. I think I asked you for a lot of advice, and you introduced me to <a href="https://www.linkedin.com/in/nickfinck">Nick Finck</a> over at <a href="http://www.digital-web.com/">Digital Web</a>, and <a href="https://www.linkedin.com/in/pabini">Pabini Gabriel-Petit</a> over at <a href="http://www.uxmatters.com/">UXmatters</a>.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: You really went all in on publishing UX stuff for a while.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar jon'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>JF: I had a column at UXmatters for 2 years. I wrote a ton for them. I eventually was writing for <a href="https://www.linkedin.com/in/zeldman">Jeffrey Zeldman</a> at <a href="http://alistapart.com/">A List Apart</a> while building my consultancy, <a href="http://www.hotknifedesign.com/">Hot Knife Design</a>. I was doing that, and one day I was online looking at your blog, and it said, “Home in Boston.” I wrote you and said,“We’ve got to get together! Let’s go get some food and beers.” We went to <a href="http://www.yelp.com/biz/border-cafe-cambridge">Border Café</a> in <a href="http://en.wikipedia.org/wiki/Harvard_Square">Harvard Square</a>, and you had that wonderful perfect-bound piece that you guys did for the Silicon Valley studio. It was beautiful.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>You gave me one of those, and we talked about different ways we could collaborate. I think the first idea was that, as Hot Knife took on more complex software design, Juhan would be able to contribute to that in a way that would up-level our team, and that if there were major software design pieces that I encountered while selling, that were not a good fit for my business at the time, I could pass those along. Hot Knife was probably 25% software and 75% websites and content management, so this made good sense for us both.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: Yeah you were working in the studio one day a week, which was really nice.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar jon'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>JF: Sometimes even more than that.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: Given that you were in so much, I wonder why we didn’t come together earlier. Do you have a thought of why that was?</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar jon'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>JF: Part of it was figuring out if I could work with Juhan. Our first encounter, before I started coming out to the studio, was like me getting stuck by a cactus. I’m going to this IxDA Christmas party thing, and you said,“Oh, Juhan’s going to that. You should really say hi.” I go in, and this guy comes in. He’s wearing some kind of jacket with a scarf, a very colorful scarf ... comes in with two women. One’s Katie, and the other is Valeska. Everybody is laughing uproariously. I figured they’ve already hit the bar a couple times because they’re having way too good a time for the IxDA Christmas party. They’re having a rip-roaring time. I’m like, “Okay. I don’t really want to horn in on this, but I said to Dirk that I would introduce myself.” I go up...</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>I’m like, “Hey, Dude.”</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>Juhan’s like, “What?”</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>I said, “You know, my friend, Dirk Knemeyer, said I should introduce myself. I’m Jon Follett. How you doing?”</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>Then he said, “Why the fuck should I care about that?”</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>I couldn’t tell if he was kidding or not so I said, “I don’t know. Because he’s your business partner,” and then he defused it in some way, but I was very confused at the time. Then I went out and hung out with some of the other folks I knew there.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar juhan'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>JS: We talked a little bit after that. I did start out with this huge jab to the heart, just to get a reaction.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar jon'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>JF: That’s how I remember meeting you. I think there was some doubt as to what the status was and whether it would make sense for us to work together every day. Plus Hot Knife was fine. It was more websites, but it was okay.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: Then we all came together summer of 2010.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar jon'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>JF: Yeah, that’s right. It was really getting too awkward to try to figure out how to work together with having separate studios or whatever. I think we all decided that it made most sense for us to go forward together, so we had that meeting where I basically jumped onboard.</span>
</div>
</div>
</div>
<div className='sidebar'>
<div className='sidebar-box solid mcafee-total mobile-hide'>
<img className='center' src='https://www.goinvo.com/old/images/features/an-oral-history/1-mcafee_box.png' />
<p>GoInvo designed McAfee Total Protection 2010, a complete redesign of the venerable security suite. Citing the improved quality of design and user experience, PC Mag increased their rating of the product to 4 stars.</p>
</div>
<div className='sidebar-box dotted extra-top-margin question-mark extra-top-margin mobile-hide'>
<img src='https://www.goinvo.com/old/images/features/an-oral-history/question_mark.png' />
<p>The other four designers on the expansion list were never publicly revealed. Two are now running their own companies, one works directly for a top Silicon Valley VC, and the fourth has a C-level creative position in a major technology corporation.</p>
</div>
<div className='sidebar-box dotted seascape-retreat extra-top-margin mobile-hide'>
<img src='https://www.goinvo.com/old/images/features/an-oral-history/2-seascape_resort.jpg' />
<p>An all-company retreat at the Seascape Resort in Santa Cruz, CA represented the high-water mark for the Silicon Valley studio and later proved to be the beginning of the end.</p>
</div>
<div className='sidebar-box solid time-cover extra-top-margin mobile-hide'>
<img className='center' src='https://www.goinvo.com/old/images/features/an-oral-history/3-time_cover.jpg' />
<p>“The Great Recession” of 2008 crippled GoInvo and led to the company’s Boston expansion turning into an all-out relocation.</p>
</div>
<div className='sidebar-box dotted time-cover extra-top-margin'>
<img src='https://www.goinvo.com/old/images/features/an-oral-history/4-sean_parker.jpg' />
<p>During the later days of the Silicon Valley studio, while there was no business from large companies, power-playing VC’s like Sean Parker came to GoInvo for help on smaller initiatives.</p>
</div>
<div className='sidebar-box dotted andrei-bookcase extra-top-margin'>
<img src='https://www.goinvo.com/old/images/features/an-oral-history/5-andreis_bookshelf.png' />
<p>Andrei’s bookcase reflected the many facets of his personality, as well as design influences.</p>
</div>
<div className='sidebar-box dotted pilates-studio extra-top-margin'>
<img src='https://www.goinvo.com/old/images/features/an-oral-history/6-pilates_1.jpg' />
<img src='https://www.goinvo.com/old/images/features/an-oral-history/7-pilates_2.jpg' />
<p>The space in Arlington before we converted it from a pilates studio to our design studio.</p>
</div>
<div className='sidebar-box dotted rani-brian extra-top-margin mobile-hide'>
<img src='https://www.goinvo.com/old/images/features/an-oral-history/9-staats_rani.jpg' />
<p>Rani Manoharan and Brian Staats were the first creators contracted at Invo Boston. Exceptional talents, they continue to grow in their careers.</p>
</div>
<div className='sidebar-box dotted early-boston-studio extra-top-margin'>
{/* Flash video removed - Flickr Flash embed no longer supported */}
<p>The early days of the studio featured lots of open space, along with some boredom and loneliness.</p>
</div>
<div className='sidebar-box dotted eric-benoit extra-top-margin'>
<img src='https://www.goinvo.com/old/images/features/an-oral-history/11-eric_benoit.jpg' />
<p>The first full-time hire at Invo Boston, Eric Benoit had a lot of talent but little software experience. Taking a chance on each other couldn’t have turned out better; he is now a creative director for the firm.</p>
</div>
<div className='sidebar-box dotted erics-new-car extra-top-margin mobile-hide'>
<img src='https://www.goinvo.com/old/images/features/an-oral-history/12-hyundai_accent.jpg' />
<p>Eric’s first new car, a silver 2010 Hyundai Accent, bought for the long daily commute to Invo. The cheapest new car he could find, it didn’t even come with a stereo.</p>
</div>
<div className='sidebar-box dotted extra-top-margin'>
<img src='https://www.goinvo.com/old/images/features/an-oral-history/13-juhan_eric_helicopter.jpg' />
<p>Juhan and Eric have now collaborated on more than 20 software design projects.</p>
</div>
<div className='sidebar-box dotted jonathan-follet extra-top-margin mobile-hide'>
<img src='https://www.goinvo.com/old/images/features/an-oral-history/14-jon_follett.jpg' />
<p>Jonathan Follett joined GoInvo Boston in the summer of 2010 as a third principal, with Juhan and Dirk. While in the early days he still flexed his creative muscles, over the last four years Jon has spearheaded new business development.</p>
</div>
<div className='sidebar-box solid extra-top-margin iiid mobile-hide'>
<img className='center' src='https://www.goinvo.com/old/images/features/an-oral-history/15-IIID_Logo.png' />
<p>Jon and Dirk met in 2005 when Dirk gave a presentation called “Innovating the Online Experience: Financial Services” at the International Institute for Information Design’s Financial Communications Conference.</p>
</div>
<div className='sidebar-box dotted extra-top-margin zeldman-et-al mobile-hide'>
<img src='https://www.goinvo.com/old/images/features/an-oral-history/16-zeldman_wodtke_pabini_finck.jpg' />
<p>The Invo team is grateful to Jeffrey Zeldman, Christina Wodtke, Pabini Gabriel-Petit, and Nick Finck as publishers of the seminal UX publications to which we frequently and humbly contributed.</p>
</div>
<div className='sidebar-box blank'></div>
<div className='sidebar-box blank'></div>
<div className='sidebar-box blank'></div>
<div className='sidebar-box blank'></div>
<div className='sidebar-box blank'></div>
<div className='sidebar-box solid extra-top-margin mobile-hide'>
<img className='center' src='https://www.goinvo.com/old/images/features/an-oral-history/17-ixda_boston_logo.png' />
<p>The 2008 IxDA Boston Christmas party brought Juhan and Jon together for the first time, in a wince-worthy way.</p>
</div>
</div>
</div>
</section>
<header className='four' id='section4-boston'>
<div className='header-wrapper'>
<div className='inner-header-wrapper'>
<div className='main-header-content'>
<div className='header-title'>Rise, Boston</div>
<div className='header-content'></div>
</div>
</div>
</div>
</header>
<header className='nav-wrapper middle-nav'>
<nav className='main-nav'>
<div className='title'>An Oral History of GoInvo</div>
<a className='one' href='#section1-origins'>
<div className='nav-div'>1. Origins</div>
</a>
<a className='two' href='#section2-silicon'>
<div className='nav-div'>2. Rise, Silicon Valley</div>
</a>
<a className='three' href='#section3-interesting-times'>
<div className='nav-div'>3. Interesting Times</div>
</a>
<a className='four' href='#section4-boston'>
<div className='nav-div'>4. Rise, Boston</div>
</a>
<a className='five' href='#section5-todaytomorrow'>
<div className='nav-div'>5. Today, and Tomorrow</div>
</a>
</nav>
</header>
<section className='interview-content' id='section4-boston-content'>
<div className='row'>
<div className='interview-wrapper'>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='full-name'>Dirk Knemeyer:</span>
<span className='speaker-text'>Jon, perhaps your first major contribution, and a big part of our getting back on the right trajectory, was the PTC project.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar jon'></div>
<div className='speaker-speaks'>
<span className='full-name'>John Follett:</span>
<span className='speaker-text'>Yeah, that’s right. I was doing a lot of teaching, these one-day seminars on web applications. Nancy from <a href="http://www.ptc.com/">PTC</a> was in the group that came to see me one Saturday at <a href="http://www.bentley.edu/">Bentley University</a>, and I’d been up the whole night before preparing for it. It was stupidest thing to do because I was so exhausted. She kept asking me questions, and I knew she was really enjoying the class, but I was just being tortured because I was so exhausted from my preparation.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>Later on we were at that <a href="http://uxpaboston.org/">UXPA</a> conference, Eric Benoit and I, and talked with Nancy some more. I think that was how it really got started. After that you and Juhan went and pitched their executives. That project enabled us to hire a couple more designers and really get going.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>That made a huge difference.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar juhan'></div>
<div className='speaker-speaks'>
<span className='full-name'>Juhan Sonin:</span>
<span className='speaker-text'>The PTC project was Boston’s first big project, meaning three or four people full time for over five months. It was a jumpstart for the studio. It allowed us to do lots of different things and go from having a few contractors to hiring people and building a stronger team. We helped PTC re-imagine what their next-generation CAD software was going to be. It’s a huge application, competing with <a href="http://www.autodesk.com/">Autodesk</a> and <a href="http://www.solidworks.com/">SolidWorks</a>. It had a massive number of screen states, and we had to come up with a strategy for how the UI was going to be implemented, and help their engineers and designers come up with a way to keep track of their own design. They had let it go for 20 years, just by adding parts and pieces. Eventually it was a year- and-a-half relationship and very good for the studio.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: It was an example, and this is so often the case, where it is a really strong person or team on the client side that makes for a strong engagement.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar juhan'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>JS: I give Nancy a lot of credit, she was a fantastic advocate for us but also a good designer.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar sarah'></div>
<div className='speaker-speaks'>
<span className='full-name'>Sarah Kaiser:</span>
<span className='speaker-text'>I came onto PTC after the initial UI design work was complete, to create a framework for the icons. It was my first big client project and a hell of a primer, made easy only by lead designer Dawa Chung’s unrelenting work ethic and Juhan’s guidance.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>Conceptually, the goal was very simple: evaluate the existing suite, identify the most challenging areas, and unify the design in a style guide. But, as Juhan said, there was 20 years’ worth of platform back story to learn. Dawa persisted and worked nights sorting through documentation to find icon examples and stayed optimistic and driven with every reiteration they threw at us. Her attitude was infectious (in a good way).</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>We delivered a great design to the client and PTC loved it. The big takeaway I got from that project was: At the end of the day, a resilient, positive attitude as a project lead is infectious in the best way. I also learned to identify personality stress points with client contacts and strategies to avoid pressing them. We put together a style guide of the UI and icons in wiki format, an exercise that really helped the engineers and drilled some good lessons into me as a junior designer.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: Jon, with <a href="http://www.hotknifedesign.com/">Hot Knife Design</a> you were running the business, but you were also the lead designer. When you started at Invo you did jump into the sales, but you also were still on the design side as well.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar jon'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>JF: Yeah. I was the lead designer for our early work with <a href="https://www.surveysampling.com/">Survey Sampling International</a> (SSI). They’re still a client a few years later. That was interesting because we went down to Connecticut to meet their international team. There were guys who flew in from the Netherlands, from Hungary, and of course within the United States. Juhan very much wanted me to just lead that particular project, soup to nuts, and in the beginning I wasn’t familiar with all of Invo’s architecture techniques. I was flying by the seat of my pants to keep up with all the requirements. Once we had mapped out the entire system, no one could tell what to do with it. It was that unwieldy. There were so many features and functions we ended up just dropping to try and get the UX in a healthy place. The intention was for us to redesign the admin panel but once we got into it and saw the whole picture we decided to focus on the user-facing parts instead. That’s when single-page applications were not the norm. There were so many nested popups and tabs all over the place. Anyplace you could have a tab, it had tabs.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar juhan'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>JS: There were similarities to Oracle in terms of its complexity, but also the way you had to get to things. I think, Jon, it had a similar click-to-performance ratio that we had with other services like that, where it was a mess. Jon, I think you probably depleted the number of clicks at least by half. Just that alone was a massive coup for them. It’s nice because you fostered that relationship with SSI and with David.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar jon'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>JF: That’s one thing that I was always really good at for Hot Knife: getting repeat business. I had a bunch of clients who were with me for a good long time. I think you share that same attitude, Juhan, where people enjoy working with you and want to come back.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar juhan'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>JS: You had a little more formality around it, which I did not have, and probably still don’t have.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>I think it’s something you brought that was good for the studio. I’m a little more ad hoc and you have a little more structure around it, which we needed.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: Maybe the most important project we’ve had here in Boston was <a href="http://solutions.3m.com/wps/portal/3M/en_US/Health-Information-Systems/HIS/Products-and-Services/Products-List-A-Z/CodeRyte-CodeComplete/">CodeRyte</a> from the standpoint that it was big, it gave us a lot of business, but it also was a really wonderful project.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar juhan'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>JS: We had a few goals for where the studio should go. The biggest of those was, and is, health and healthcare. This has grown from my FFRCD days at MITRE, working for the government, working for the planet. Well, a MITRE executive who liked my work connected me with her husband who is sort of a serial COO who has led a number of startups to big exits. He had a startup in <a href="http://en.wikipedia.org/wiki/Bethesda,_Maryland">Bethesda</a> and they needed some help on a design, and to strategically rethink where they were going in the company.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>They had a technology that was coming out of academia in natural language processing, <a href="http://en.wikipedia.org/wiki/Natural_language_processing">NLP</a>, which was still growing and maturing but was at a point where we could get some real efficiency gains from implementing it in certain fields. They needed a way to have hospitals use NLP to dramatically change how they coded medical records.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>Eric Benoit led the project. It grew into a four-FTE project over course of almost a year to design and develop a production system. The first customer was Memorial Hermann down in Houston, Texas. We worked very closely with their various users. Out of the gate it was processing $4 billion in claims data per year, which is enormous for a new production prototype. That alone changed the course of CodeRyte. It allowed us to shape a brand new product for a rising healthcare company.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar eric'></div>
<div className='speaker-speaks'>
<span className='full-name'>Eric Benoit:</span>
<span className='speaker-text'>I was really happy with the way the product turned out. CodeRyte gave us the time to get it done right. They had us on board as a true partner; nobody was counting time... just getting this new product delivered. This was also a good test for me. At this point, I hadn’t yet led software into production nor an engineering team. I learned a shit ton and it was really validating to see my design kick ass in the real world.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>There were periods of time when CodeRyte was having trouble with the back end, handling all of these documents. But Invo was able to keep Memorial Hermann engaged with the project, because of the progress we could show on the front end. They could click around, play with it, see its potential and how nice it was, despite the bugs. Our constant pushes to staging for Memorial Hermann to see weekly builds kept them vested in the product becoming great. That helped take the design to another level.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar jon'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>JF: That really changed the whole game of the studio. You gave a little insight on the creative side, but on the sales side, once <a href="http://www.3m.com/">3M</a> bought CodeRyte, it made everything easier. There are times when groupthink and executive pressure can lead people to make bad decisions around timelines in software. I see it all the time on the sales side, “Oh, we want to get this done right away. We would start next week if we could. We want this project to be done in three months with solid production code.”</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>You know what? It doesn’t work that way. You’ll ship bad stuff, you’ll ship buggy stuff, you’ll ship poorly designed stuff. You might make that goal because somebody decided that was the goal, but you start to realize that human beings play a lot of weird games in their heads with software. What they do is compress timelines, they compress processes, and they compress the right way to do things to match their own measures for success, whether it’s quarterly numbers, whether it’s to impress a boss, or whether it’s to impress the shareholders.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>What that 3M/CodeRyte project gave was an example of, “Look we have done this before in an extremely complex space. If you want to work with us, we can help you get there; but let’s not screw around. Let’s be real about what we can do, and let’s make something great together.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>Let’s not just make up arbitrary deadlines and put pressure on each other, and make things hard because you guys just want to ship at this point or another.”</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar eric'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>EB: The CodeRyte project also gave us street cred in handling <a href="http://en.wikipedia.org/wiki/Protected_health_information">PHI</a>, working with a large healthcare system and dealing with the pain it takes to build for healthcare systems.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar juhan'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>JS: It helps when you have George Moon, who is an executive there and knows his stuff. This is an engineer who ran projects and actually could code. It was a rare combination of someone could handle executive-level demands and understands the 1s and 0s of a service. When you have that kind of ally on the client side, it brings the whole project together.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: Going back to the Silicon Valley days, one of the things that I was keen on was the idea of an apprentice program, the notion of having people join the studio as interns and evolve to apprentices, journeymen, and then masters, but we never fully implemented that. In Boston you’ve really expanded the vision and made that a reality, Juhan.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar juhan'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>JS: Regardless of how many years’ experience someone has, it’s always really hard to find very good people. It’s even tougher to find great designers who have got 10 years’ experience, 15 years’ experience, who want to join a studio. They often, at least in this day and age, want to found their own company, do their own startup, get an executive job, whatever it is. Design now has become very in vogue, and somewhat seasoned designers can get very prestigious jobs. Finding that kind of talent, and people also who design software, and the entire experience of using a product, again is also another rare attribute. The prototypical designer is going to have business savvy, they understand the technical underpinnings, and can be an artist on the design side. We find it easier to spot the talent while they are still in school and train them in this more holistic and complete approach to design. You’ve been talking about it for a long time, and that fit very well what I’ve done in the past, because I’ve been in lots of academic or R&D type environments where we thought PhDs or master’s students would be very good and we grew them over time.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>That kind of ethos has permeated here where we are very aggressive in finding fabulous students, sometimes early in their careers, like as freshmen, as sophomores...</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: ...even out of high school.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar juhan'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>JS: Half the studio has been siphoned from that kind of process. It takes years. This is not something that happens overnight. It’s taken us years and years of vetting, of going through the job and career fairs at seven or eight different universities in order to cull just a couple people every year to come in. Maybe only one works out. We have six people now on staff that came from the academic university side over the past six years. One per year usually sticks around and grows and does something really fabulous for us.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar eric'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>EB: It’s great seeing students come in with various backgrounds. And it’s exciting to see the projects they come up with.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: As the upswing was really going, we also diversified a little bit to focus more on the art side, not art for the sake of client projects but art for the sake of our own creative ambitions and ideas for products. Bringing on <a href="https://www.linkedin.com/pub/sarah-kaiser/27/bb1/315">Sarah Kaiser</a> was a big part of that.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar juhan'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>JS: There was something about it that just oozed yumminess. I remember seeing her portfolio and loving it. There was something so good. We didn’t have an artist in residence. We didn’t have someone who could do these luscious graphic stories for us, which I thought we were missing and it was something that I yearned for, for a decade.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>We got together on Skype and there was this instant connection. We have similar gross minds, and similar artistic desirements for our life, and it was like this really snap connection. The second I mentioned the word “neuticle,” she didn’t know what it was, and in real-time I could see her typing. Then she just started laughing hysterically and says, “I’m buying a pair now.”</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar sarah'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>SK: Like Juhan said, the neuticle thing was was probably what sold me. Out of college I’d gotten a number of offers and was very closely considering taking one in London, but advertising had never appealed to me. And I liked the work they were doing at Invo and the style of leadership that Juhan exuded. He believed a lot in personal growth and self-directed learning, and that was something I was really excited about too, but beside that I figured anyone who could comfortably use the word “neuticle” in their first discussion with a new hire was a winner, and clearly someone I could get along with. Besides that, Boston is beautiful and his crew were great, funny and crazy talented people. I knew I was in good hands.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: At that point, things were starting to really hum and run. We were growing, we were expanding, adding people. The studio wasn’t just surviving, it was thriving.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar juhan'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>JS: By 2011, lots of different projects, clients, efforts, were gurgling... that we had been slowly working on for several years had come together and braided nicely into one solid river. Whether it was our work at the national policy level, where we were doing guidance on design for personal health records, or working on <a href="http://cms.hhs.gov/">CMS</a> and <a href="http://www.hhs.gov/">HHS</a> design work, and then trickling down all the way to big pharma work on massive conditions like diabetes, and hardware and software projects that were multimillion dollars in scale. And our open-source hGraph project was taking off.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>This is about the time we brought on <a href="http://www.linkedin.com/pub/ben-salinas/53/706/19b">Ben Salinas</a> and <a href="https://www.linkedin.com/pub/reshma-mehta/8/ba2/73a">Reshma Mehta</a>. They are excellent examples of the triple threat I talked about before with the business, engineering, and art sides all coming together. Ben is a designer and engineer who owns an engineering company specializing in coffee roasting and brewing equipment; Reshma was trained as an electrical engineer but taught herself software design and owned her own consultancy.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar eric'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>EB: I really value Ben’s input. He can deconstruct things more methodically than me and pinpoint the root issue. Things come more from my gut, so bouncing problems off Ben helps break them down for me. Plus he understands the engineering space far better than me, so he is my resident translator when it comes to engineer-to-designer-speak. Ben constantly comes up with ways to hack the software he uses to design and prototype... It’s always interesting to see the latest trick he cooks up. We didn’t give Ben a slow break-in period. We really threw him into the fire. I was about a year on CodeRyte and we had just started a slow rollout of the product. I was transitioning off the project, and we slotted Ben in to lead the remaining releases and our front-end team... for a product he knew nothing about. Not an easy task for a first project. And he did great. I wish Reshma could have hung around longer. She fit in great at the studio with her punchy attitude.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>Both Ben and Reshma contributed to our work for <a href="https://www.dataxu.com/">DataXu</a>. DataXu is a programmatic marketing software company, who became one of those ideal clients for us. Aaron Kechley, SVP Product, brought us in to drive the future of their application. We provided vision on multiple areas of the product and then repeatedly honed in on individual concepts to bring into production. It’s 1.5 years since we started and we’re continuing to integrate the vision we first delivered.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar jon'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>JF: It really is amazing to see the talented designers and engineers come in to the studio and develop their craft. I think <a href="https://www.linkedin.com/pub/jennifer-patel/41/183/bb1">Jen Patel</a>, in particular, is emblematic of that growth. She’s become one of our lead designers in the healthcare space, in particular working with clients like <a href="http://www.partners.org/">Partners HealthCare</a> to create some amazing UI for their enterprise-grade IRB software. She was also the Invo lead on a project we did on design patterns for electronic health records, <a href="http://inspiredehrs.org/">Inspired EHRs</a> with the California HealthCare Foundation and <a href="http://toomanyclicks.com/">Dr. Jeff Belden</a> from the <a href="http://missouri.edu/">University of Missouri</a>.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar jen'></div>
<div className='speaker-speaks'>
<span className='full-name'>Jen Patel:</span>
<span className='speaker-text'>Inspired EHRs: Designing for Clinicians is one of our contributions to affecting health care on a national scale. Electronic health records are an important part of hospital systems but seriously lack in usability, leading to many gaps that could be the cause of injury, sickness, or, worse, death. In the book we worked on several key areas of electronic health records, helped to develop the foundations of each chapter, designed beautiful interfaces that are intuitive for physicians and support how they work on a daily basis. We built prototypes, integrated as interactive pieces in the ebook, to demonstrate how such interfaces could function, giving readers a chance to mess around with the tools we’ve designed. Inspired EHRs evolved into an open sourced, lightweight design policy for electronic health records.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: We were always focused on culture, but as we started to thrive we made some unusual investments in culture. One of those was with <a href="http://www.lindseywcollins.com/">Lindsey Witmer</a>.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar jon'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>JF: That was a year-long experiment that was filled with both intentional outcomes and completely unintentionally hilarious moments because Lindsey wanted us to be honest about who we were, and that led to a lot of bonding, and laughing. And of course we had <a href="https://www.linkedin.com/pub/danny-hadley/9a/75a/47b">Danny Hadley</a> who was not into all of the special vegetable concoctions she came up with. Yes, so it was an interesting dichotomy there. The idea was that we were going to eat better and exercise more, and then we were going to understand how our lives were balanced or unbalanced, and then use that information to try to make incremental improvements. Before Lindsey, the refrigerator used to have snacks that <a href="https://www.linkedin.com/pub/christian-hogan/10/267/914">Christian</a> was into, so we had a weekly order from <a href="http://www.peapod.com/">Peapod</a> where it was the most foul developer/engineer midnight snacks like Ding- Dongs, Little Debbies, Rice Krispie Treats. Lindsey cleaned all of that out and started bringing in locally-grown vegetables, vegetables that no one had ever heard of before except Lindsey. She had these very lovely hand-written labels. Snacks were now all 900 different kinds of bird seed. It was kale chips. It was juices. The healthy-eating aspect of that I think has continued in terms of when I look in the refrigerator now it’s closer to what Lindsey prescribed for us than what Christian did, intentionally or unintentionally.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar juhan'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>JS: Human behavior takes a long time to change, and I think that’s why the experiment with her worked, because it forced us over time to rethink and relive how we eat. We just had lunch today all together in our kitchen. It’s a requirement for us. We cook together, we eat together, and we talk together. It’s a very important component of the studio. The kitchen really is another heart, other than the main studio space, in how we live together.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar jon'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>JF: That is a very strong part of our culture. I do also remember working with Lindsey on the balanced, or imbalanced, parts of life, consciously trying to re-jigger my schedule so I would work in exercise without having to come back home at 9:00 p.m. At the time I was only getting 4 hours of sleep.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>It seems odd that you’d need somebody to point that out to you, that you should be sleeping more, but it really was a total ecosystem evaluation of all the things I was doing or not doing and trying to make some recommendations and changes.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar juhan'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>JS: I can tell you I had been in health for about eight years at that point, or health and health design. I had still struggled to lose; and struggle is the wrong word. I hadn’t really put much movement into it, even though I knew I should. I’d probably gained some weight at that point. I was 224 pounds&mdash;for a 5’11 guy, not so good.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>Not just Lindsey, but the food, the mindset, it also bore out. Care Cards started germinating. You can’t anticipate the consequences, like you said, Jon, of certain actions. When we do smart little bets like this, it will shift and move our thinking, move our bodies, and then it’ll have these good consequences.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: Juhan, this was about the time your MIT class started to integrate more with general life at the studio.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar juhan'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>JS: After four or five years of teaching MIT’s 2.009 product design engineering class, Roger and Sarah said,“Hey, you know, can we sit in? How can we be involved?” They became mentors for some of the sections of the lab and the class and fell in love with it.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>By 2014 <a href="http://www.linkedin.com/pub/roger-zhu/16/660/528">Roger</a> is mentoring one session. He teaches two workshops. One’s a beautiful sketching class. Sarah teaches a Photoshop and Illustrator class and also has done the final graphics for some of the classes. We’ve injected Invo into the MIT community. It has also invaded our studio in a very good way for ideas, for projects, for education. <a href="https://www.linkedin.com/pub/emily-twaddell/6/b75/a03">Emily</a> is a mentor as well.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: During this period, and after the collapse, I actually moved back to Ohio, the state than I’m from. I was pretty much wiped out financially, and I needed to be closer to family. I needed to rethink my life.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>Initially I was doing much less on Invo Boston. I raised money for and was growing a startup, <a href="http://facio.com/">Facio</a>, for a couple of years. We also tried to get Invo Columbus up and running.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar juhan'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>JS: With Facio, you were the titular head without any kind of executive or partner support.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: No help at the top, that’s right. I struggled through and suffered with that, and it really viscerally communicated to me the wisdom and importance of having at least one other person who is there&mdash;all in&mdash;with you.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>My ideas are typically about ten years ahead of their time, and Facio proved to be another one of those cases. It taught me that maybe when I have ideas that I think are great I should pause a little bit before trying to put an investment of myself into them at the moment, because there’s a reasonable chance that it’s not the right time for the idea yet.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>The most important thing I learned is that I’m not cut out to be a salesperson, which I had done a lot of in the previous decade, but I’m really not even cut out to be a CEO, which had been my role in a number of companies at that point, successes and failures.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>In the process of working Facio, there were different moments where I was trying to bring other people in to help me at an executive level. One of them, <a href="https://www.linkedin.com/pub/dave-burnett/1/72a/72">Dave Burnett</a>, wanted to be the CEO, and I was against that because I thought that I should be the CEO. But I don’t think that anymore. I wish I had realized that earlier because he would have been a star. I have high expectations for myself and the things that I involve my time in. I think I would be a better CEO than most people, but for an organization to achieve the kind of ambition and success I would have it achieve, I’m not the right person for that role. Learning that in my late 30s might have taken some time but is a lesson that has now allowed me to reframe how I’ll live the rest of my life.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar juhan'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>JS: How much closer are you to your sweet spot?</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: Much closer. As Facio wound down and we started to organically figure out how I could be of use to GoInvo again, a lot of that is now in really creative problem-solving and writing.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>There’s other administrivia and stuff that I might not like as much, but the meaty part of my time is spent doing what I enjoy, seeing something in the world and seeing how it can be improved, and doing a lot of research and communicating about it, stuff like that.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar jon'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>JF: Another part of the Columbus story is with Invo Columbus.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: The idea with Invo Columbus was that, with me being out there already, working on Facio and having office space, if we could get someone in who was really high quality we could build a studio around them. It could organically grow out of the other investments that we were making in Columbus. It just so happened that in Columbus was <a href="https://www.linkedin.com/in/erikdahl">Erik Dahl</a>, who is a real luminary in the user experience community.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>I approached Erik and courted him in a process similar to what you and I went through, Juhan. He agreed to come on board but there were a lot of differences. The biggest problem was that even though Erik and I were in the same space, I wasn’t in that business. I was focused on Facio. I mean, I would meet with Erik every week. He knew he had an open opportunity to engage me and I would make time for him. But I was focused and working on other things. It was up to him to come to me, and I think that made it hard because he was in the same position I was in with Facio, as the single founder, the single executive who was leading that thing. I think some of it is personality, too, where someone with a different personality type might have engaged me more, and Erik didn’t do that.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar juhan'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>JS: I think there was an initial good bond between us which worked, and then it came time to actually institute the studio in Columbus. I was not putting my focus on Invo Columbus because Dirk was doing Facio and that was his deal. I think I probably should have doubled or tripled my attention rate on it if we want to make it at all successful. It was like we were dropping the baby bird out of the nest before he knew nature of flying. Erik is exceptional at doing the work. That was never a problem, but everything else about a running studio was something new to Erik that at least we could have given him a better scaffolding. Just like when you go and do your 12-step program as an alcoholic, you have your buddy who is your care team. We didn’t have a care team for Erik.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar jon'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>JF: There was a lot of good stuff that came out of Columbus. Erik really took the open studios concept and instantiated it very effectively in the Columbus area. Invo Columbus was a magnet for the UX community in Columbus for two years. They would have ridiculous amounts of people coming to the open studios. Sometimes the studio was full of visitors. People showed up with new products. Erik is a very good connector.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>What I learned from Erik was how he creates that space for collaboration. That’s really what he is very good at, and that’s why he’s on the <a href="http://www.ixda.org/">IxDA</a> board right now.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar juhan'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>JS: There was also a bit of a different ethos going on. There are some leaders in the UX community like Erik, I would put <a href="https://www.linkedin.com/in/lisadebettencourt">Lisa Caldwell</a> who was at the Boston studio for a while, and <a href="http://davemalouf.com/">Dave Malouf</a> in this group as well. They are very oriented towards facilitation, towards bringing the anthropology and the research and the usability and the group grope of, “How are we evolving this idea?”</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>It’s a different take on design, that is sometimes the yin to our yang, where those of us who are sort of the Invo core past and present, we side more on the maker/creation side, a little more entrepreneurial and driven by a strong creative vision. They’re just very different philosophical takes on how you produce. Maybe that was also one of the magnetic dipoling where we didn’t quite match with Erik because of our distinct differences in how we create.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>I think that different studios should take on different personalities, so didn’t think that would ultimately be the downfall for either one of us. But maybe the gap was just a little too much.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: Invo Columbus just hobbled along for a while. Erik was probably with us for two and a half years, initially as a resource doing projects for Boston, and part of it trying to make Invo Columbus go on its own. It never really got wind behind it. We did have some good talent in Columbus. <a href="https://www.linkedin.com/in/scottsullivanli">Scott Sullivan</a>, who is a hell of a guy, he’s now doing really wonderful things with <a href="http://www.adaptivepath.com/">Adaptive Path</a>. We had <a href="https://www.linkedin.com/pub/derek-briggs/55/3b0/83">Derek Briggs</a> there, too, who’s with <a href="http://www.neo.com/">Neo</a> and very successful as well.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>One thing that has followed Invo around is we have been able to attract the best talent. We did that with Facio too, with <a href="https://www.linkedin.com/in/travisthetechie">Travis Smith</a> and <a href="https://www.linkedin.com/in/jaredfaris">Jared Faris</a>. It’s kind of humbling, actually, the kind of people who choose to work with us.</span>
</div>
</div>
</div>
<div className='sidebar'>
<div className='sidebar-box blank'></div>
<div className='sidebar-box blank'></div>
<div className='sidebar-box solid ptc mobile-hide'>
<img className='center' src='https://www.goinvo.com/old/images/features/an-oral-history/1-ptc_logo.png' />
<p>PTC’s Creo software, with a new UI by GoInvo, was released in June, 2011 to replace and supersede products formerly known as Pro/ENGINEER, CoCreate, and ProductView.</p>
</div>
<div className='sidebar-box blank'></div>
<div className='sidebar-box solid ssi mobile-hide'>
<img className='center' src='https://www.goinvo.com/old/images/features/an-oral-history/2-ssi_logo.png' />
<p>Survey Sampling International (SSI) is the premier global provider of sampling, data collection and data analytic solutions for consumer and business-to-business survey research.</p>
</div>
<div className='sidebar-box blank'></div>
<div className='sidebar-box blank'></div>
<div className='sidebar-box blank'></div>
<div className='sidebar-box blank'></div>
<div className='sidebar-box blank'></div>
<div className='sidebar-box dotted george-moon extra-top-margin mobile-hide'>
<img src='https://www.goinvo.com/old/images/features/an-oral-history/3-george_moon.jpg' />
<p>George Moon, VP of Product, CodeRyte Inc.</p>
</div>
<div className='sidebar-box dotted extra-top-margin yang-dan'>
<img src='https://www.goinvo.com/old/images/features/an-oral-history/4-yang_dan.jpg' />
<p>Yang Dan graduated from our apprenticeship program and later joined Microsoft as a UX Designer.</p>
</div>
<div className='sidebar-box blank'></div>
<div className='sidebar-box blank'></div>
<div className='sidebar-box blank'></div>
<div className='sidebar-box solid data-xu mobile-hide'>
<img className='center' src='https://www.goinvo.com/old/images/features/an-oral-history/5-data_xu.png' />
<p>Inc. magazine ranked DataXu, a provider of programmatic marketing solutions for brands and agencies, as the #1 fastest growing private company in the advertising and marketing industry and #5 overall on the 2013 Inc. 500.</p>
</div>
<div className='sidebar-box dotted extra-top-margin double-top inspired-ehr'>
<img src='https://www.goinvo.com/old/images/features/an-oral-history/6-inspired_ehr.jpg' />
<p><a href="http://inspiredehrs.org/">Inspired EHRs: Designing for Clinicians</a></p>
</div>
<div className='sidebar-box blank'></div>
<div className='sidebar-box dotted extra-top-margin double-top lindsey-food'>
<img src='https://www.goinvo.com/old/images/features/an-oral-history/7-real_food.jpg' />
<img src='https://www.goinvo.com/old/images/features/an-oral-history/8-lindsey.jpg' />
<p>Lindsey’s work with Invo Boston helped us incorporate healthy eating and lifestyle habits into the studio culture.</p>
</div>
<div className='sidebar-box blank'></div>
<div className='sidebar-box dotted media-lab-photos'>
<img src='https://www.goinvo.com/old/images/features/an-oral-history/9-mit_2009.jpg' />
<img src='https://www.goinvo.com/old/images/features/an-oral-history/10-mit_crowd.jpg' />
<img src='https://www.goinvo.com/old/images/features/an-oral-history/11-mit_thing.jpg' />
<p>Invo Boston’s culture of learning is most evident in our tight integration with MIT’s product design and engineering class 2.009. GoInvo designers and engineers help teach and mentor students.</p>
</div>
<div className='sidebar-box blank'></div>
<div className='sidebar-box blank'></div>
<div className='sidebar-box blank'></div>
<div className='sidebar-box blank'></div>
<div className='sidebar-box dotted eric-dahl'>
<img src='https://www.goinvo.com/old/images/features/an-oral-history/12-erik_dahl.jpg' />
<p>Erik Dahl joins GoInvo to open up the Columbus studio.</p>
</div>
</div>
</div>
</section>
<header className='five' id='section5-todaytomorrow'>
<div className='header-wrapper'>
<div className='inner-header-wrapper'>
<div className='main-header-content'>
<div className='header-title'>Today, and Tomorrow</div>
<div className='header-content'></div>
</div>
</div>
</div>
</header>
<header className='nav-wrapper middle-nav'>
<nav className='main-nav'>
<div className='title'>An Oral History of GoInvo</div>
<a className='one' href='#section1-origins'>
<div className='nav-div'>1. Origins</div>
</a>
<a className='two' href='#section2-silicon'>
<div className='nav-div'>2. Rise, Silicon Valley</div>
</a>
<a className='three' href='#section3-interesting-times'>
<div className='nav-div'>3. Interesting Times</div>
</a>
<a className='four' href='#section4-boston'>
<div className='nav-div'>4. Rise, Boston</div>
</a>
<a className='five' href='#section5-todaytomorrow'>
<div className='nav-div'>5. Today, and Tomorrow</div>
</a>
</nav>
</header>
<section className='content interview-content' id='section5-todaytomorrow'>
<div className='row'>
<div className='interview-wrapper'>
<div className='interview-content'>
<div className='speaker-avatar juhan'></div>
<div className='speaker-speaks'>
<span className='full-name'>Juhan Sonin:</span>
<span className='speaker-text'>We had a couple of really good years in 2012, 2013. Then things started going in the other direction. You’d seen it during the McAfee times out in Silicon Valley. We made a few choices project-wise that were good but not great, and we were suffering from a lack of focus. We had maybe 18 people in the company. We were at the maximum. I was losing complete insight into things that were going on. And we didn’t have enough lieutenants who could take a strong lead on things and let me just touch everything in a thoughtful way without having to go too deep into the weeds. I was still in the weeds too often.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>Then there was a dip in the projects, and I think it gave us an opportunity to set the stage again, to make sure that we have the right kinds of people here and really hone our goals for the next two years, the next 10 years, and on. November through March was tumultuous because there was some genuine financial peril and to adapt we cut down quite a bit. That hurt but, looking back, the cuts we made were probably for the best. It pared us back to the people who are closest to the core.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>We are now a more mature organization, we know what we want, we know the kind of people we want to hire. That self-awareness is something we didn’t have a year and a half ago.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar jon'></div>
<div className='speaker-speaks'>
<span className='full-name'>Jonathan Follett:</span>
<span className='speaker-text'>I think that’s right. We have a better grasp of who we are and what we want as an organization. I think that is extremely important when you’re talking about the kind of work that you go after.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>One friend of mine said that he used to chase logos, but now he wants to do interesting work. For the most part, we’ve always gone after interesting work. Some projects have been for big brand companies and some for the market leaders that will emerge in the future, but we’ve always gone for interesting work.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>Juhan, we talked about this one time and said, “If what we end up being is a studio where great people come to do interesting work, then that’s a pretty fantastic goal that not a lot of people get to have in their lives.” There aren’t a lot of people who can say, “I really love what I’m doing. I love the people I’m working with. When I come to work there are interesting challenges, working on technologies that are going to be useful to human beings, hopefully now and in the future.” If that’s where we end up, we’re good with that.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>These have not been free lessons; they’ve been paid for with stress, struggle, and hard times. So we are not going to forget them.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='full-name'>Dirk Knemeyer:</span>
<span className='speaker-text'>While I wish the bad times hadn’t happened it was good for me to get back more fully engaged in Invo Boston when there was some stress and struggle. It created sort of a perfect opportunity for us to re-frame what we were doing, and how. 2014 has been kind of up and down, but the foundation is good.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>Ever since we started Invo in 2004 the intent to develop products was there. And we did <a href="http://www.designbyfire.com/?p=32">Spivot</a>. We prototyped the <a href="https://yes.goinvo.com/articles/involution-master-academy-announces-winter-2008-semester">Invo Master Academy</a>. Facio wasn’t a studio project but the germ of it started with the studio. But we’ve been working some small projects over the last few years, and as part of our re-focus have sort of formalized a future intent to have internal product development be a core and regular part of how we grow.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar juhan'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>JS: One of the first products out of the Boston studio was the <a href="http://designaxioms.com/">Design Axioms</a>. Sarah Kaiser, Dirk, and I collaborated to create this visual set of design principles.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>We know that architects are expected to have a handle on civil, material, and mechanical engineering, landscape architecture, building contracting and city codes, aesthetics, interior design, manipulating light, home energy consumption, and how people engage with buildings and each other. Well, interface designers require a similarly broad spectrum of skills from typography to layout and graphic design to interaction design to storytelling. And that’s where the Design Axioms come in. Sarah’s artwork was graphically inspired by Cold War era propaganda&emdash;so the content is framed in an agitprop style.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>We learned a lot from putting together the Design Axioms, and the <a href="http://www.carecards.me/">Care Cards</a> soon followed. It was a natural fit for us as a studio, with so much of our work in healthcare. The Care Cards basically put you in touch with habits to improve your health, life, and well-being. They’re sometimes surprising, but always practical, and nudge you toward the healthiest life possible.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar jon'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>JF: When I think of Invo Boston software products, I think of <a href="http://hgraph.org/">hGraph</a>. hGraph is an open source visualization technique for showing all of a patient’s health metrics in one picture.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>While hGraph isn’t a digital product in the traditional sense of a stand-alone application, the technique has been adopted and used by a variety of heavy hitters in health including Walgreens, as well as on corporate campus clinics at Facebook and Apple. We get more positive response, business leads, and industry recognition from hGraph than from any other product we have. hGraph has been featured in <a href="http://www.wired.com/">Wired</a> and other online publications, been recognized at the <a href="http://healthdatapalooza.org/">National Health Datapalooza</a> and has generally had a great impact for the studio reputation.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: Going back to our points about re-focusing, we’ve recently made a couple of pretty big shifts in the business we want to pursue. The first one is targeting the Boston market. We have clients from around the world, but most of our clients are pretty close to Boston. And the client relationships that have lasted the longest and been sort of holistically the best for all involved are more local. And, we genuinely believe working close and having a lot of face-to-face time is a pretty big deal. So the only question is, why we didn’t make that change sooner?</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar jon'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>JF: I think the renewed focus on Boston comes with a certain level of organizational maturity and long-term experience with complex software projects. Obviously, the face-to-face check-ins are just easier if you don’t have to jump on a plane. And, as issues arise on a project, being close to a client geographically allows you to have ad hoc meetings in person to mitigate those. In my opinion, the value of the in-person meeting is immeasurable. It’s so much easier to understand people when you have the body language to go along with the conversation.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>If we didn’t explicitly focus on Boston before, it was because we had West Coast leads coming in for projects that were based on the reputation of the Silicon Valley studio or other contacts that we had developed nationally. As the studio has evolved and our long-term client relationships have solidified, we’ve found those to be largely in the Boston area and New England, generally. So, I think this explicit Boston-centric focus for the near future is simply articulating what is already a reality for the studio. This is not to say that we won’t be taking on projects in other geographies. It just won’t be our primary business.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: The second significant change, which is another sort of more limited and humble focus, is focusing on customers in healthcare and b2b/ enterprise. This is another sort of “why didn’t we do that earlier?” Most of our customers have been in these spaces for a long time. But, Juhan and I both are so future-focused and bored with the old, in with the new kind of thing. Earlier this year we even talked about focusing solely on really bleeding-edge technologies. Which, y’know, is cool and all but is not a great way to run a stable business. So we are still interested in and do the bleeding-edge tech stuff but, as a business, we are focusing on the work that is actually out there in some proportion.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar jon'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>JF: We’re really building a reputation as a go-to-firm for healthcare software design and innovation. And healthcare encompasses a variety of emerging technologies, like <a href="http://en.wikipedia.org/wiki/Genomics">genomics</a> and <a href="http://en.wikipedia.org/wiki/Personalized_medicine">personalized medicine</a>, the <a href="http://en.wikipedia.org/wiki/Internet_of_Things">Internet of Things</a>, <a href="http://en.wikipedia.org/wiki/Wearable_technology">wearables</a>, and even robotics. So, our focus on healthcare design really fits with both the work that’s coming in to the studio and some future tech exploration as well.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: So now we’re here. What I like best about now is that our culture has never been better. The studio feels like the home of an old professor: kind of idiosyncratic, layers of things accumulated over time, really comfy, and everything in its right place. The people we have like each other and everything is just sort of happy and healthy. It’s pretty wonderful.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar jon'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>JF: I really enjoy the team at Invo Boston the way it’s configured today. Everyone is a joy to work with and we’ve got so many talented people. The Friday afternoon family dinners, where someone cooks for the whole studio, are not only filled with fantastic food, but also a riot. We’ve got some pretty wonderful people, who are fun to be around.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar eric'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>EB: The studio is humming with interesting activity&mdash;from the meaningful projects, to cooking for and breaking bread with the entire team, to group trips for growing our collective brain. Also, a nice addition to the growing team with varying backgrounds has been seeing their hobbies and how they infect the studio.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: And what about the future? What do all of you hope for the future of GoInvo?</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar eric'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>EB: Starting to build out some sort of R&D wing where we are prototyping more of our future thinking ideas. With the goal that some of these future thinking prototypes mature into a product that could live out in the wild.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar jon'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>JF: Growing to a comfortable size in Boston and continuing to build our reputation as the go-to firm for healthcare software design and innovation are among my immediate goals for the studio in the near term. Long-term I’d love to see us influence the healthcare industry in a positive way and be known for that work.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar dirk'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>DK: As for me, I hope we continue working on the hardest and most interesting things. That we are creating things that make a real difference in the world. That where we go or end up makes a meaningful difference on the world. We do that now in small ways, and we surely make a large difference in the lives of our employees and clients. But I want us to make a macro difference, to be a real and meaningful force for good.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar juhan'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>JS: First and foremost, we need to concentrate on our staff: continue to grow our brains, increase our individual and group happiness quotients, and find fabulous people to amplify our vibe and collective understanding.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>Second, we need to continue to build and make real things with real impact. Learning-by-doing experiences promote a “constructivist” approach to informal learning. By making our own products, that we open source and sculpt over years, we learn the service evolution game. We feel the pain, struggle, and rarified joy of ownership.</span>
</div>
</div>
<div className='interview-content'>
<div className='speaker-avatar'></div>
<div className='speaker-speaks'>
<span className='speaker-text'>The third and final vector is participating with local and national governance. Shaping policy through design will ultimately lead to long-term influence on culture and infrastructure. That is Invo’s aim for leaving a lasting, “Good” mark on our fellow citizens and planet.</span>
</div>
</div>
</div>
<div className='sidebar'>
<div className='sidebar-box blank'></div>
<div className='sidebar-box blank'></div>
<div className='sidebar-box blank'></div>
<div className='sidebar-box dotted design-axioms extra-top-margin'>
<img src='https://www.goinvo.com/old/images/features/an-oral-history/1-design_axioms.jpg' />
<p>The Design Axioms describe the minimal rule set for designing interfaces: the 16 foundational concepts that are required knowledge for engineers and designers to create usable and elegant interfaces.</p>
</div>
<div className='sidebar-box dotted health-axioms extra-top-margin'>
<img src='https://www.goinvo.com/old/images/features/an-oral-history/2-design_axiom_sketches.jpg' />
<p>Preliminary sketches of the Care Cards</p>
</div>
<div className='sidebar-box dotted hgraph extra-top-margin'>
<img src='https://www.goinvo.com/old/images/features/an-oral-history/3-hgraph.jpg' />
<p>hGraph (Health Graph) is a standardized visual representation of a patient’s health status. This single picture method provides a person with a significant understanding of his or her total well being because it compiles multiple metrics into a unified graph that can be viewed at a glance.</p>
</div>
<div className='sidebar-box blank'></div>
<div className='sidebar-box dotted studio-lunch extra-top-margin'>
<img src='https://www.goinvo.com/old/images/features/an-oral-history/4-friday_lunch.jpg' />
<p>The Friday afternoon family dinner at Invo Boston.</p>
</div>
</div>
</div>
<div className='row'>
<div className='social-buttons centered'>
<p>Share this article:</p>
<a className='fb' href='https://www.facebook.com/sharer/sharer.php?u=http://www.goinvo.com/features/an-oral-history/'>Facebook</a>
<a className='twitter' href='https://twitter.com/home?status=http://www.goinvo.com/features/an-oral-history/'>Twitter</a>
<a className='plus' href='https://plus.google.com/share?url=http://www.goinvo.com/features/an-oral-history/'>Google+</a>
<a className='in' href='https://www.linkedin.com/shareArticle?mini=true&amp;url=http://www.goinvo.com/features/an-oral-history/&amp;title=An%20Oral%20History%20of%20Involution%20Studios&amp;summary=&amp;source='>LinkedIn</a>
<a className='mail' href='mailto:?body=http://www.goinvo.com/features/an-oral-history/'>Mail</a>
<div className='comments centered'></div>
</div>
<div className='fb-comments'>
<p>Comment on this article:</p>
<div className='fb-comments' data-colorscheme='light' data-href='http://www.goinvo.com/features/an-oral-history' data-numposts='5' data-width='100%'>
</div>
</div>
</div>
</section>
<div className='credit-wrapper'>
<div className='row'>
<div id='credits'>
<div className='authors'>
<h1>Where are they now?</h1>
<div className='person'>
<div className='image'>
<img src="https://www.goinvo.com/old/images/features/an-oral-history/credits/1-andrei_herasimchuk.png" alt="1 andrei herasimchuk" />
</div>
<div className='content'>
<h2>Andrei Herasimchuk <small><a href="https://twitter.com/trenti">@trenti</a></small></h2>
<p>Andrei is the designer in residence at <a href="http://www.shv.com/">Sutter Hill Venutures</a> in Palo Alto, CA. He was design director at <a href="https://twitter.com/">Twitter</a> and led the design of <a href="http://mail.yahoo.com">Yahoo Mail</a>.</p>
</div>
<p className='mobile'>Andrei is the designer in residence at <a href="http://www.shv.com/">Sutter Hill Venutures</a> in Palo Alto, CA. He was design director at <a href="https://twitter.com/">Twitter</a> and led the design of <a href="http://mail.yahoo.com">Yahoo Mail</a>.</p>
</div>
<div className='person'>
<div className='image'>
<img src="https://www.goinvo.com/old/images/features/an-oral-history/credits/2-ben_listwon.png" alt="2 ben listwon" />
</div>
<div className='content'>
<h2>Ben Listwon <small><a href="https://twitter.com/benjaminlistwon">@benjaminlistwon</a></small></h2>
<p>After taking a few years off to start a family and investigate into some of the world’s big problems, Ben re-joined Invo as chief engineer in 2014. Today he’s contributing to our work on Partners Healthcare.</p>
</div>
<p className='mobile'>After taking a few years off to start a family and investigate into some of the world’s big problems, Ben re-joined Invo as chief engineer in 2014. Today he’s contributing to our work on Partners Healthcare.</p>
</div>
<div className='person'>
<div className='image'>
<img src="https://www.goinvo.com/old/images/features/an-oral-history/credits/3-dirk_knemeyer.png" alt="3 dirk knemeyer" />
</div>
<div className='content'>
<h2>Dirk Knemeyer <small><a href="https://twitter.com/dknemeyer">@dknemeyer</a></small></h2>
<p>Dirk continues with Invo, providing business and marketing strategy while researching and writing on the intersection between technology, society, and humanity.</p>
</div>
<p className='mobile'>Dirk continues with Invo, providing business and marketing strategy while researching and writing on the intersection between technology, society, and humanity.</p>
</div>
<div className='person'>
<div className='image'>
<img src="https://www.goinvo.com/old/images/features/an-oral-history/credits/4-donna_driscoll.png" alt="4 donna driscoll" />
</div>
<div className='content'>
<h2>Donna Driscoll <small><a href="https://twitter.com/dahnahdee">@dahnahdee</a></small></h2>
<p>Donna is currently a principal user experience researcher at <a href="https://www.linkedin.com/">LinkedIn </a> in Mountain View, CA.</p>
</div>
<p className='mobile'>Donna is currently a principal user experience researcher at <a href="https://www.linkedin.com/">LinkedIn </a> in Mountain View, CA.</p>
</div>
<div className='person'>
<div className='image'>
<img src="https://www.goinvo.com/old/images/features/an-oral-history/credits/5-eric_benoit.png" alt="5 eric benoit" />
</div>
<div className='content'>
<h2>Eric Benoit <small><a href="https://twitter.com/ebenoit">@ebenoit</a></small></h2>
<p>Eric is the creative director at Invo specializing in system design and software application.</p>
</div>
<p className='mobile'>Eric is the creative director at Invo specializing in system design and software application.</p>
</div>
<div className='person'>
<div className='image'>
<img src="https://www.goinvo.com/old/images/features/an-oral-history/credits/6-jen_patel.png" alt="6 jen patel" />
</div>
<div className='content'>
<h2>Jennifer Patel <small><a href="https://twitter.com/catamariface">@catamariface</a></small></h2>
<p>Jennifer is a designer, engineer, and project lead at Invo. She is currently driving a large-scale business process service for Partners Healthcare.</p>
</div>
<p className='mobile'>Jennifer is a designer, engineer, and project lead at Invo. She is currently driving a large-scale business process service for Partners Healthcare.</p>
</div>
<div className='person'>
<div className='image'>
<img src="https://www.goinvo.com/old/images/features/an-oral-history/credits/7-jon_follett.png" alt="7 jon follett" />
</div>
<div className='content'>
<h2>Jon Follett <small><a href="https://twitter.com/jonfollett">@jonfollett</a></small></h2>
<p>Jon is the director of business development for Invo. His new book from O'Reilly Media, <a href="http://shop.oreilly.com/product/0636920030676.do">Designing for Emerging Technologies</a> hits the shelves in December 2014.</p>
</div>
<p className='mobile'>Jon is the director of business development for Invo. His new book from O'Reilly Media, <a href="http://shop.oreilly.com/product/0636920030676.do">Designing for Emerging Technologies</a> hits the shelves in December 2014.</p>
</div>
<div className='person'>
<div className='image'>
<img src="https://www.goinvo.com/old/images/features/an-oral-history/credits/8-juhan_sonin.png" alt="8 juhan sonin" />
</div>
<div className='content'>
<h2>Juhan Sonin <small><a href="https://twitter.com/jsonin">@jsonin</a></small></h2>
<p>Juhan leads Invo by keeping its creative juices flowing.</p>
</div>
<p className='mobile'>Juhan leads Invo by keeping its creative juices flowing.</p>
</div>
<div className='person'>
<div className='image'>
<img src="https://www.goinvo.com/old/images/features/an-oral-history/credits/9-sarah_kaiser.png" alt="9 sarah kaiser" />
</div>
<div className='content'>
<h2>Sarah Kaiser <small><a href="https://twitter.com/damntorren">@DamnTorren</a></small></h2>
<p>Sarah is an artist and designer at Invo specializing in user interface, motion graphics and illustration.</p>
</div>
<p className='mobile'>Sarah is an artist and designer at Invo specializing in user interface, motion graphics and illustration.</p>
</div>
<div className='person'>
<div className='image'>
<img src="https://www.goinvo.com/old/images/features/an-oral-history/credits/10-uday_gajender.png" alt="10 uday gajender" />
</div>
<div className='content'>
<h2>Uday Gajendar <small><a href="https://twitter.com/udanium">@udanium</a></small></h2>
<p>Uday is a catalyst for design innovation working his magic at <a href="https://www.cloudphysics.com/">CloudPhysics</a>.</p>
</div>
<p className='mobile'>Uday is a catalyst for design innovation working his magic at <a href="https://www.cloudphysics.com/">CloudPhysics</a></p>
</div>
</div>
<div className='contributors'>
<div className='cont-wrapper'>
<h2>Design Team</h2>
<div className='contributor'>
<div className='image'>
<img src="https://www.goinvo.com/old/images/features/democracy/contrib/brian.jpg" alt="Brian" />
</div>
<div className='info'>
<h3>Designer</h3>
<p>Brian Liston<br /><small><a href="https://twitter.com/lliissttoonn">@lliissttoonn</a></small></p>
</div>
</div>
<div className='contributor'>
<div className='image'>
<img src="https://www.goinvo.com/old/images/features/ebola/contrib/adam.jpeg" alt="Adam" />
</div>
<div className='info'>
<h3>Web Designer</h3>
<p>Adam Pere<br /><small><a href="http://adampere.com">adampere.com</a></small></p>
</div>
</div>
<div className='contributor'>
<div className='image'>
<img src="https://www.goinvo.com/old/images/features/democracy/contrib/emily.jpg" alt="Emily" />
</div>
<div className='info'>
<h3>Editor</h3>
<p>Emily Twaddell<br /><small><a href="http://twitter.com/mimitwaddell">@mimitwaddell</a></small></p>
</div>
</div>
</div>
</div>
</div>
</div>
</div>
</article>

      {/* Newsletter */}
      <div className="bg-gray-lightest py-12 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <NewsletterForm />
        </div>
      </div>
    </div>
  )
}
