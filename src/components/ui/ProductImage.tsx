'use client'

import { cn } from '@/lib/utils'
import Image from 'next/image'

interface ProductImageProps {
  src?: string | null
  alt: string
  size?: 'thumb' | 'preview' | 'card'
  categoriaCorHex?: string | null
  className?: string
}

const sizeMap = {
  thumb:   { w: 56,  h: 56,  cls: 'w-14 h-14'  },
  preview: { w: 200, h: 200, cls: 'w-full h-48' },
  card:    { w: 160, h: 110, cls: 'w-full h-28' },
}

export function ProductImage({
  src,
  alt,
  size = 'thumb',
  categoriaCorHex,
  className,
}: ProductImageProps) {
  const { w, h, cls } = sizeMap[size]
  const bg = categoriaCorHex ?? '#FF5B22'

  if (!src) {
    return (
      <div
        className={cn(
          cls,
          'rounded-xl flex items-center justify-center flex-shrink-0',
          className
        )}
        style={{ background: `${bg}20` }}
        aria-label={alt}
      >
        <span className="text-2xl opacity-60">🍽️</span>
      </div>
    )
  }

  return (
    <div className={cn(cls, 'relative rounded-xl overflow-hidden flex-shrink-0', className)}>
      <Image
        src={src}
        alt={alt}
        width={w}
        height={h}
        className="object-cover w-full h-full"
        loading="lazy"
      />
    </div>
  )
}
