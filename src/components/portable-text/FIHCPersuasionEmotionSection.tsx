import Image from 'next/image'
import { cloudfrontImage } from '@/lib/utils'

const referentCards = [
  {
    title: 'Message-referent',
    description: 'Anti-smoking messaging and images: Disgusted to the tar lining',
    image: '/images/features/faces-in-health-communication/15-plot-message-self-referent3.jpg',
  },
  {
    title: 'Plot-referent',
    description: 'Anger and sadness for the smoker',
    image: '/images/features/faces-in-health-communication/15-plot-message-self-referent4.jpg',
  },
  {
    title: 'Self-referent',
    description: 'Shame for their own smoking',
    image: '/images/features/faces-in-health-communication/15-plot-message-self-referent5.jpg',
  },
]

export function FIHCPersuasionEmotionSection() {
  return (
    <div className="my-8">
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-y-8 lg:gap-y-0 mb-8">
        <div className="flex justify-center lg:justify-start lg:pr-4">
          <Image
            src={cloudfrontImage('/images/features/faces-in-health-communication/15-plot-message-self-referent1.jpg')}
            alt=""
            width={2000}
            height={2000}
            className="w-full max-w-[243px] h-auto"
          />
        </div>
        <div className="lg:pl-4 lg:pt-2">
          <p className="my-4 leading-relaxed">
            <strong>Healthcare graphics and health campaigns rely heavily on emotion to motivate behavior.</strong>{' '}
            When individuals are exposed to these messages, they may express three pathways of emotions
            <sup><a href="#references" className="!text-primary !no-underline hover:!underline hover:!text-black">27</a></sup>
            {' '}&mdash; plot-referent, message-referent, and self-referent.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-y-6 md:gap-y-0 md:gap-x-0 mb-8">
        {referentCards.map((card) => (
          <div key={card.title} className="text-center">
            <div className="max-w-[205px] mx-auto">
              <Image
                src={cloudfrontImage(card.image)}
                alt=""
                width={2000}
                height={2000}
                className="w-full h-auto"
              />
            </div>
            <p className="mt-4 mb-0 max-w-[205px] mx-auto text-base leading-[26px] uppercase">{card.title}</p>
            <p className="mt-0 mb-3 max-w-[205px] min-h-[52px] mx-auto text-xs leading-[26px] flex items-start justify-center">
              {card.description}
            </p>
          </div>
        ))}
      </div>

      <div className="hidden lg:block relative my-8">
        <Image
          src={cloudfrontImage('/images/features/faces-in-health-communication/16-PC-impact-what-we-believe.jpg')}
          alt=""
          width={2000}
          height={2000}
          className="w-full h-auto"
        />
        <div className="absolute top-[37%] left-0 w-full grid grid-cols-3 text-base font-semibold leading-[26px] text-center">
          <div className="px-4">
            <p className="px-4">These narratives have the power to touch our emotions,</p>
          </div>
          <div className="px-4">
            <p className="px-4">impact what we believe,</p>
          </div>
          <div className="px-4">
            <p className="px-4">teach us new behaviors.</p>
          </div>
        </div>
      </div>

      <div className="lg:hidden relative my-8">
        <Image
          src={cloudfrontImage('/images/features/faces-in-health-communication/16-mobile-impact-what-we-believe.jpg')}
          alt=""
          width={2000}
          height={2000}
          className="w-full h-auto"
        />
        <div className="absolute top-[40%] left-0 w-1/2 text-base font-semibold leading-[26px]">
          <div className="px-4 mb-[40%]">These narratives have the power to touch our emotions,</div>
          <div className="px-4 mb-[40%]">impact what we believe,</div>
          <div className="px-4">teach us new behaviors.</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-y-8 lg:gap-y-0 mb-4">
        <div className="flex justify-center lg:justify-start lg:pr-4">
          <Image
            src={cloudfrontImage('/images/features/faces-in-health-communication/17-quit-smoking.jpg')}
            alt=""
            width={2000}
            height={2000}
            className="w-full max-w-[308px] h-auto"
          />
        </div>
        <div className="lg:pl-4">
          <p className="my-4 leading-relaxed">
            We fully experience the self-referent emotion when we recognize a relationship between a message and ourselves.
            This emotion influences how we perceive the possible outcomes and severity of consequences of an action.
            <sup><a href="#references" className="!text-primary !no-underline hover:!underline hover:!text-black">27</a></sup>{' '}
            <strong>
              There is a clear distinction between recognizing a risk which triggers an emotional response and experiencing
              an &quot;enduring perception of future risk&quot; influenced by self-referential emotions.
            </strong>
            <sup><a href="#references" className="!text-primary !no-underline hover:!underline hover:!text-black">27</a></sup>
          </p>
          <p className="my-4 leading-relaxed">
            For example, adult smokers reduced cigarette consumption and increased intentions to quit when they could see
            themselves reflected in the messaging.
            <sup><a href="#references" className="!text-primary !no-underline hover:!underline hover:!text-black">28</a></sup>
          </p>
        </div>
      </div>

      <p className="my-6 font-serif text-[1.5rem] leading-[2.125rem] text-black">
        Self-referent emotions surface when the reader relates to the narrative,{' '}
        <span className="text-primary">diverse representation in infographics makes these narratives more effective.</span>
      </p>

      <div className="hidden lg:block my-8">
        <Image
          src={cloudfrontImage('/images/features/faces-in-health-communication/18-diversity.jpg')}
          alt=""
          width={2000}
          height={2000}
          className="w-full h-auto"
        />
      </div>

      <div className="lg:hidden my-8">
        <Image
          src={cloudfrontImage('/images/features/faces-in-health-communication/18-mobile-diversity.jpg')}
          alt=""
          width={2000}
          height={2000}
          className="w-full h-auto"
        />
      </div>
    </div>
  )
}
