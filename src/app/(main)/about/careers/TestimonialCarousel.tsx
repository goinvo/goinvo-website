'use client'

import { useState } from 'react'
import Image from 'next/image'
import { cn, cloudfrontImage } from '@/lib/utils'

const testimonials = [
  {
    tab: 'a summer internship',
    image: '/images/about/careers/lily-lunch.jpg',
    quote:
      'Interning at Invo made me realize the importance of not only working at an awesome company to help transform software in healthcare but the value of spending your every day in an extremely inclusive environment with a diverse range of people who genuinely want to see you succeed.',
    name: 'Lily Fan',
    role: 'Design Intern',
  },
  {
    tab: '1 year',
    image: '/images/about/bai-laughing.jpg',
    quote:
      'I started working at Invo as an engineer and gradually took on a greater design focus. My friends at Invo mentored and supported me as I learned design basics. But beyond just aiming for design competency, I was also challenged to consider the broader impact of the work\u2014its effect on patients, on access to healthcare, and on health as a whole. If you want to work at a place that challenges you, supports you, and infuses your work with a sense of purpose, come to Invo.',
    name: 'Eric Bai',
    role: 'Designer & Engineer',
  },
  {
    tab: '3 years',
    image: '/images/about/careers/beckett-presentation.jpg',
    quote:
      'GoInvo provided a incubator-like space to expand my toolbox of skills and practices while also giving me a kick in the pants to cultivate my own design principles, passions, and ethics. It was an inspiring environment to do meaningful work with a family of driven, talented people.',
    name: 'Beckett Rucker',
    role: 'Designer',
  },
]

function Divider() {
  return (
    <div
      aria-hidden
      className="block w-full h-[30px] bg-center bg-cover my-4"
      style={{ backgroundImage: "url('/images/ekg-divider.svg')" }}
    />
  )
}

export function TestimonialCarousel() {
  const [active, setActive] = useState(0)
  const t = testimonials[active]

  return (
    <div>
      {/* Tabs — bordered rows matching Gatsby carousel__menu-items */}
      <div className="max-width content-padding mb-8">
        <ul className="list-none p-0 m-0 flex flex-col lg:flex-row lg:gap-4">
          {testimonials.map((item, i) => (
            <li
              key={item.tab}
              className="relative flex flex-1 border-t border-gray-medium last:border-b lg:border-b"
            >
              <button
                type="button"
                onClick={() => setActive(i)}
                className={cn(
                  'w-full py-1 text-center font-sans bg-transparent border-0 cursor-pointer transition-colors',
                  active === i ? 'text-primary' : 'text-secondary hover:text-primary'
                )}
              >
                {item.tab}
              </button>
              {active === i && (
                <span
                  aria-hidden
                  className="absolute top-1/2 right-4 w-[0.6rem] h-[0.6rem] -translate-y-1/2 bg-contain bg-no-repeat bg-center"
                  style={{ backgroundImage: "url('/images/bullet.svg')" }}
                />
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Quote area — full-width gray background, two-column with image + quote */}
      <div className="bg-gray-light pb-12 lg:pb-[50px]">
        <div className="max-width content-padding">
          <div className="flex flex-col lg:flex-row lg:items-stretch">
            <div className="lg:w-1/2 relative h-[300px] lg:h-[500px] -mx-[var(--content-padding,1rem)] lg:mx-0">
              <Image
                src={cloudfrontImage(t.image)}
                alt={t.name}
                fill
                sizes="(min-width: 864px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
            <div className="lg:w-1/2 flex items-center">
              <div className="w-full max-w-[510px] mx-auto p-4 lg:p-8">
                <Divider />
                <div className="relative px-4 lg:px-8 py-8">
                  {/* Opening quote mark */}
                  <span
                    aria-hidden
                    className="absolute -top-4 left-0 w-5 h-5 lg:w-[30px] lg:h-[30px] bg-contain bg-center bg-no-repeat"
                    style={{ backgroundImage: "url('/images/quote.svg')" }}
                  />
                  <p className="header-lg text-black mb-6">{t.quote}</p>
                  <p className="text-gray text-md m-0">
                    <span>{t.name}</span>
                    <br />
                    <span>{t.role}</span>
                  </p>
                  {/* Closing quote mark */}
                  <span
                    aria-hidden
                    className="absolute -bottom-4 right-0 w-5 h-5 lg:w-[30px] lg:h-[30px] bg-contain bg-center bg-no-repeat"
                    style={{
                      backgroundImage: "url('/images/quote.svg')",
                      transform: 'rotateX(180deg) scaleX(-1)',
                    }}
                  />
                </div>
                <Divider />
              </div>
            </div>
          </div>

          {/* Pagination dots */}
          <div className="flex justify-center gap-2 mt-6">
            {testimonials.map((item, i) => (
              <button
                key={item.tab}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Show testimonial ${i + 1}`}
                className={cn(
                  'w-[10px] h-[10px] rounded-full border-0 cursor-pointer p-0',
                  active === i ? 'bg-primary' : 'bg-primary/40'
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
