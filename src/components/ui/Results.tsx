'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { Result } from '@/types'

interface ResultsProps {
  items: Result[]
  className?: string
}

export function Results({ items, className }: ResultsProps) {
  return (
    <section className={cn('my-12', className)}>
      <div className={cn(
        'grid gap-8',
        items.length === 1
          ? 'grid-cols-1 max-w-md mx-auto'
          : items.length === 2
            ? 'grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto'
            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
      )}>
        {items.map((item, index) => (
          <motion.div
            key={index}
            className={items.length === 1 ? 'text-left' : 'text-center'}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <div className="font-serif text-3xl md:text-4xl text-primary mb-2">
              {item.stat}
            </div>
            <p className="text-gray text-md">{item.description}</p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
