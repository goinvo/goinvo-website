# Services pages at other design studios (surveyed 2026-11-18)

Why: the new-design Services page felt crowded. This is what twelve studios do on theirs,
measured the same way as ours. Each page was loaded at 1440×900 in a headless browser;
"screens" is page height ÷ 900, "words" is the visible text of the main content, "first
screen" is the words visible before any scroll (cookie banners can add a few).

| Studio | Page | Screens | Words | First screen (words) | Prices | Durations | Remote / in person |
|---|---|---|---|---|---|---|---|
| **GoInvo (new design, b585122)** | /services?design=human | 8.4 | 444 | 28 + three cards with nine facts | yes | yes | a band with a chart |
| Metalab | metalab.com/what-we-do | 9.8 | 686 | 8 | no | no | no |
| ustwo | ustwo.com/services | 7.0 | 430 | 19 | no | "from 8 weeks" | no |
| Instrument | instrument.com/services | 5.8 | 265 | one sentence | no | no | no |
| Clay | clay.global/services | 8.6 | 463 | 53 | no | no | no |
| frog | frog.co/services | 9.7 | 1052 | 37 | no | no | no |
| IDEO | ideo.com/design-services | 8.3 | 1175 | one sentence | no | no | no |
| Fuzzy Math | fuzzymath.com/services | 6.5 | 686 | 68 | no | no | no |
| thoughtbot | thoughtbot.com/services | 7.8 | 811 | 88 | no | no | one sentence |
| Designit | designit.com/services | 5.5 | 206 | headline only | no | no | no |
| Ramotion | ramotion.com/services | 4.6 | 437 | 105 | no | no | no |
| Punchcut | punchcut.com/services | 4.2 | 323 | 6 | no | no | no |
| Fantasy | fantasy.co/services | 14.0 | 627 | headline only | no | no | no |

Not counted: Work & Co has no services page (404); Artefact and Modus did not load.

## What they have in common

1. **The first screen is one statement.** All twelve open with a headline or one sentence and
   nothing else to read. None puts service cards, prices or a chart there.
2. **One pattern, repeated.** Below the statement the page is the same block again and again,
   one per service: a name, one or two sentences, a short list, one picture or a row of client
   logos. Nine of twelve are built this way. A reader learns the block once.
3. **Working together is a sentence, not a section.** Only thoughtbot mentions distance at all:
   "We are equipped to partner with teams around the world with our fully-remote delivery
   model." Punchcut says "Seamless integration"; ustwo says "in a way that fits your goals and
   team". Nobody draws a schedule or a time-zone diagram.
4. **Nobody shows a price.** Only ustwo shows a duration ("Discover · from 8 weeks").
5. **Proof sits between the blocks**: a client quote or logos after a service, not in a
   separate numbers section.

## Where ours differs

- Ours is not longer than the others (8.4 screens against a median of 7.4; 444 words against
  about 450). It is denser and more varied: the first screen carries a headline, a sentence,
  three pictures and nine facts, and the page then changes pattern six times (cards, a dark
  band with a list and photo, a chart, tabs with steps, big numbers, picture tiles, a quote).
- The time-zone chart has no counterpart anywhere in the sample.
- Our price and duration per service have no counterpart either, and are worth keeping: they
  answer the question every other page makes a buyer book a call to ask.

## The closest model

ustwo: each service is a stage the buyer is at, labelled with a duration, then "Typical
activities" and "Outcomes" side by side, the clients it was done for, and a client quote before
the next one. Punchcut's "Sprints / Projects / Teams" is the same idea as our three engagements.

Raw data and screenshots were kept outside the repository (session scratch); the script that
produced them is reproduced by re-running a headless browser over the URLs above.
