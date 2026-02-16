'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface QuoteProps {
  text: string
  author?: string
  role?: string
  className?: string
}

function QuoteMark({ flip }: { flip?: boolean }) {
  return (
    <svg
      width="20"
      height="16"
      viewBox="0 0 20 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('text-primary', flip && 'rotate-180 scale-x-[-1]')}
      aria-hidden="true"
    >
      <path
        d="M4.36 15.48C3.21 15.48 2.27 15.07 1.54 14.25C0.81 13.39 0.45 12.32 0.45 11.04C0.45 9.5 0.94 7.86 1.92 6.12C2.94 4.34 4.36 2.72 6.18 1.26L7.56 2.82C6.54 3.62 5.72 4.46 5.1 5.34C4.52 6.22 4.16 7.08 4.02 7.92C4.56 7.72 5.1 7.62 5.64 7.62C6.7 7.62 7.58 7.98 8.28 8.7C9.02 9.42 9.39 10.36 9.39 11.52C9.39 12.72 8.99 13.7 8.19 14.46C7.43 15.14 6.12 15.48 4.36 15.48ZM14.64 15.48C13.49 15.48 12.55 15.07 11.82 14.25C11.09 13.39 10.73 12.32 10.73 11.04C10.73 9.5 11.22 7.86 12.2 6.12C13.22 4.34 14.64 2.72 16.46 1.26L17.84 2.82C16.82 3.62 16 4.46 15.38 5.34C14.8 6.22 14.44 7.08 14.3 7.92C14.84 7.72 15.38 7.62 15.92 7.62C16.98 7.62 17.86 7.98 18.56 8.7C19.3 9.42 19.67 10.36 19.67 11.52C19.67 12.72 19.27 13.7 18.47 14.46C17.71 15.14 16.4 15.48 14.64 15.48Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function Quote({ text, author, role, className }: QuoteProps) {
  return (
    <motion.blockquote
      className={cn('my-12 py-8', className)}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
    >
      <div className="relative">
        <div className="mb-2">
          <QuoteMark />
        </div>
        <p className="font-serif text-xl md:text-2xl text-black leading-relaxed mb-2">
          {text}
        </p>
        <div className="flex justify-end mb-4">
          <QuoteMark flip />
        </div>
      </div>
      {(author || role) && (
        <footer className="text-gray">
          {author && <cite className="not-italic font-semibold">{author}</cite>}
          {role && <span className="block text-sm mt-1">{role}</span>}
        </footer>
      )}
    </motion.blockquote>
  )
}
