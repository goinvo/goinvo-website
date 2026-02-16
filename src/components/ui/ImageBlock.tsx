'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ImageBlockProps {
  src: string
  alt: string
  title?: string
  caption?: string
  size?: 'small' | 'medium' | 'large' | 'full'
  className?: string
}

export function ImageBlock({
  src,
  alt,
  title,
  caption,
  size = 'large',
  className,
}: ImageBlockProps) {
  const sizeClasses = {
    small: 'max-width-sm',
    medium: 'max-width-md',
    large: 'max-width',
    full: 'w-full',
  }

  return (
    <motion.figure
      className={cn('my-8', sizeClasses[size], className)}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
    >
      {title && <h4 className="font-serif text-lg mb-4">{title}</h4>}
      <div className="relative">
        <Image
          src={src}
          alt={alt}
          width={1200}
          height={800}
          className="w-full h-auto"
        />
      </div>
      {caption && (
        <figcaption className="mt-2 text-sm text-gray italic">{caption}</figcaption>
      )}
    </motion.figure>
  )
}
