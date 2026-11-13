import React, { useState } from 'react'
import { Package } from 'lucide-react'

interface ProductImageProps {
  src?: string | null
  alt: string
  className?: string
  containerClassName?: string
  fallbackIconClassName?: string
  aspectRatio?: 'square' | 'video' | 'auto'
}

export const ProductImage: React.FC<ProductImageProps> = ({
  src,
  alt,
  className = '',
  containerClassName = '',
  fallbackIconClassName,
  aspectRatio = 'square',
}) => {
  const [hasError, setHasError] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  const aspectClass =
    aspectRatio === 'square'
      ? 'aspect-square'
      : aspectRatio === 'video'
      ? 'aspect-video'
      : ''

  const showFallback = !src || hasError

  return (
    <div
      className={`relative w-full ${aspectClass} overflow-hidden rounded-lg bg-slate-50 border border-[#E2E8F0] flex items-center justify-center p-2 select-none ${containerClassName}`}
    >
      {showFallback ? (
        <div className="flex flex-col items-center justify-center text-[#64748B] space-y-1">
          <Package className={fallbackIconClassName || "w-5 h-5 stroke-[1.5] text-[#64748B]/70"} />
          <span className="text-[10px] font-medium tracking-tight text-[#64748B]/80 text-center line-clamp-1 max-w-[120px]">
            {alt}
          </span>
        </div>
      ) : (
        <>
          {!isLoaded && (
            <div className="absolute inset-0 bg-[#E2E8F0]/40 animate-pulse rounded-lg" />
          )}
          <img
            src={src}
            alt={alt}
            loading="lazy"
            onLoad={() => setIsLoaded(true)}
            onError={() => setHasError(true)}
            className={`w-full h-full object-contain transition-opacity duration-200 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            } ${className}`}
          />
        </>
      )}
    </div>
  )
}
