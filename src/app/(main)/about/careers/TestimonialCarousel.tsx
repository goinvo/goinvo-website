'use client'

import { useState } from 'react'
import Image from 'next/image'
import { cn, cloudfrontImage } from '@/lib/utils'

const testimonials = [
  {
    tab: 'a summer internship',
    image: '/images/about/careers/lily-lunch.jpg',
    quote: 'Interning at Invo made me realize the importance of not only working at an awesome company to help transform software in healthcare but the value of spending your every day in an extremely inclusive environment with a diverse range of people who genuinely want to see you succeed.',
    name: 'Lily Fan',
    role: 'Design Intern',
  },
  {
    tab: '1 year',
    image: '/images/about/bai-laughing.jpg',
    quote: 'I started working at Invo as an engineer and gradually took on a greater design focus. My friends at Invo mentored and supported me as I learned design basics. But beyond just aiming for design competency, I was also challenged to consider the broader impact of the work\u2014its effect on patients, on access to healthcare, and on health as a whole. If you want to work at a place that challenges you, supports you, and infuses your work with a sense of purpose, come to Invo.',
    name: 'Eric Bai',
    role: 'Designer & Engineer',
  },
  {
    tab: '3 years',
    image: '/images/about/careers/beckett-presentation.jpg',
    quote: 'GoInvo provided an incubator-like space to expand my toolbox of skills and practices while also giving me a kick in the pants to deliver in a real-world context. I was empowered to define my own work style and explore the boundaries of what design means in healthcare.',
    name: 'Beckett Rucker',
    role: 'Designer & Engineer',
  },
]

export function TestimonialCarousel() {
  const [active, setActive] = useState(0)
  const t = testimonials[active]

  return (
    <div>
      {/* Tabs */}
      <div className="max-width content-padding mb-8">
        <h2 className="header-lg mb-6">
          Experiencing GoInvo for<span className="text-primary font-serif">...</span>
        </h2>
        <div className="flex gap-4">
          {testimonials.map((item, i) => (
            <button
              key={item.tab}
              onClick={() => setActive(i)}
              className={cn(
                'px-4 py-2 text-sm font-semibold uppercase tracking-wider border cursor-pointer transition-colors',
                active === i
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-gray-light text-gray hover:border-gray-medium'
              )}
            >
              {item.tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content — full-width split: image left, gray bg + quote right */}
      <div className="flex flex-col lg:flex-row">
        <div className="lg:w-1/2">
          <Image
            src={cloudfrontImage(t.image)}
            alt={t.name}
            width={960}
            height={640}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="lg:w-1/2 bg-gray-lightest py-12 lg:py-16">
          <div className="max-w-[510px] mr-auto content-padding">
            <p className="text-gray italic text-lg leading-relaxed mb-6">
              &ldquo;{t.quote}&rdquo;
            </p>
            <p className="font-semibold">{t.name}</p>
            <p className="text-gray text-sm">{t.role}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
