'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface QuoteProps {
  text: string
  author?: string
  role?: string
  background?: 'gray' | 'white'
  className?: string
}

function EkgDivider() {
  return (
    <svg
      viewBox="0 0 2040 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="block w-full h-[30px]"
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <path
        vectorEffect="non-scaling-stroke"
        d="M2 30L992.356 30.6667L996.28 25.4815L1000.2 30.6667H1003.15L1006.09 34.3704L1016.88 4L1029.62 44L1033.54 30.6667L2039 30"
        stroke="#d0cfce"
        strokeLinecap="square"
      />
    </svg>
  )
}

export function Quote({ text, author, role, background, className }: QuoteProps) {
  return (
    <motion.div
      className={cn(
        'p-4',
        background === 'gray' && 'bg-gray-light',
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
    >
      <div className="max-width-sm mx-auto">
        <div className="my-4">
          <EkgDivider />
        </div>
        <blockquote className="relative my-12">
          <svg
            viewBox="0 0 31 22"
            fill="#787473"
            xmlns="http://www.w3.org/2000/svg"
            className="absolute w-5 h-5 lg:w-[30px] lg:h-[30px] -top-[25px] lg:-top-[35px] lg:-left-[35px]"
            aria-hidden="true"
          >
            <path d="M6.88874 8.06782C5.89421 8.06782 4.95769 7.00809 5.51532 6.1846C6.55555 4.6484 7.83132 3.39269 9.23986 2.61755C9.90807 2.24974 10.1554 1.40406 9.79165 0.72765C9.42792 0.0519394 8.59163 -0.198144 7.92274 0.169666C3.33208 2.69557 0 8.94694 0 15.0339C0 18.875 3.09029 22 6.88874 22C10.6872 22 13.7775 18.875 13.7775 15.0339C13.7775 11.1928 10.6879 8.06782 6.88874 8.06782Z" />
            <path d="M24.1113 8.06786C23.1164 8.06786 22.1796 7.00827 22.7374 6.18452C23.7777 4.64826 25.0535 3.39268 26.4624 2.61759C27.1306 2.24978 27.3779 1.4041 27.0142 0.727689C26.6511 0.0526751 25.8149 -0.197408 25.1453 0.169705C20.5546 2.69561 17.2225 8.94698 17.2225 15.0339C17.2225 18.8751 20.3128 22 24.1113 22C27.9097 22 31 18.8751 31 15.0339C31 11.1928 27.9097 8.06786 24.1113 8.06786Z" />
          </svg>
          <p className="font-serif text-[1.5rem] leading-[2.125rem] font-light">
            {text}
          </p>
          <svg
            viewBox="0 0 31 22"
            fill="#787473"
            xmlns="http://www.w3.org/2000/svg"
            className="absolute w-5 h-5 lg:w-[30px] lg:h-[30px] -bottom-[25px] right-0 lg:-bottom-[35px] lg:-right-[35px]"
            style={{ transform: 'rotateX(180deg) scaleX(-1)' }}
            aria-hidden="true"
          >
            <path d="M6.88874 8.06782C5.89421 8.06782 4.95769 7.00809 5.51532 6.1846C6.55555 4.6484 7.83132 3.39269 9.23986 2.61755C9.90807 2.24974 10.1554 1.40406 9.79165 0.72765C9.42792 0.0519394 8.59163 -0.198144 7.92274 0.169666C3.33208 2.69557 0 8.94694 0 15.0339C0 18.875 3.09029 22 6.88874 22C10.6872 22 13.7775 18.875 13.7775 15.0339C13.7775 11.1928 10.6879 8.06782 6.88874 8.06782Z" />
            <path d="M24.1113 8.06786C23.1164 8.06786 22.1796 7.00827 22.7374 6.18452C23.7777 4.64826 25.0535 3.39268 26.4624 2.61759C27.1306 2.24978 27.3779 1.4041 27.0142 0.727689C26.6511 0.0526751 25.8149 -0.197408 25.1453 0.169705C20.5546 2.69561 17.2225 8.94698 17.2225 15.0339C17.2225 18.8751 20.3128 22 24.1113 22C27.9097 22 31 18.8751 31 15.0339C31 11.1928 27.9097 8.06786 24.1113 8.06786Z" />
          </svg>
        </blockquote>
        {(author || role) && (
          <p className="text-gray text-sm leading-[1.4375rem]">
            <span>{author}</span>
            {role && (
              <>
                <br />
                <span>{role}</span>
              </>
            )}
          </p>
        )}
        <div className="mt-8">
          <EkgDivider />
        </div>
      </div>
    </motion.div>
  )
}
