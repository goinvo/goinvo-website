'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface CardProps {
  href?: string
  image?: string
  imageAlt?: string
  title?: string
  description?: string
  tags?: string[]
  className?: string
  children?: React.ReactNode
}

export function Card({
  href,
  image,
  imageAlt = '',
  title,
  description,
  tags,
  className,
  children,
}: CardProps) {
  const content = (
    <motion.div
      className={cn(
        'bg-white overflow-hidden shadow-card transition-shadow duration-[var(--transition-card)]',
        href && 'hover:shadow-card-hover cursor-pointer',
        className
      )}
      whileHover={href ? { y: -4 } : undefined}
      transition={{ duration: 0.3 }}
    >
      {image && (
        <div className="relative aspect-[16/10] overflow-hidden">
          <Image
            src={image}
            alt={imageAlt}
            fill
            className="object-cover image--interactive"
          />
        </div>
      )}
      <div className="p-6">
        {title && <h3 className="font-serif text-xl mb-2">{title}</h3>}
        {description && <p className="text-gray text-md mb-4">{description}</p>}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="text-xs uppercase tracking-wider text-gray bg-gray-light px-2 py-1"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        {children}
      </div>
    </motion.div>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }

  return content
}
