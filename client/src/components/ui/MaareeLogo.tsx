import React from 'react'

export interface MaareeLogoProps {
  variant?: 'full' | 'icon' | 'symbol' | 'stacked' | 'receipt' | 'pill'
  theme?: 'light' | 'dark' | 'auto' | 'mono'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  showSubtitle?: boolean
  subtitle?: string
  className?: string
  onClick?: () => void
}

/**
 * MAAREE 360 — Official Brand Logo & Identity Component
 * 
 * Assets:
 * - /brand/maaree360-logo-white.png (White text + Emerald 360 on dark navy #0B1425 / #101C35)
 * - /brand/maaree360-logo-dark.png (Navy text + Emerald 360 on light #FFFFFF / #F7F8FA)
 * - /brand/maaree360-symbol-white.png (Standalone symbol on dark)
 * - /brand/maaree360-symbol-dark.png (Standalone symbol on light)
 * - /brand/icon-192x192.png (High-res squircle app icon)
 */
export const MaareeLogo: React.FC<MaareeLogoProps> = ({
  variant = 'full',
  theme = 'dark',
  size = 'md',
  showSubtitle = false,
  subtitle = 'Retail Management System',
  className = '',
  onClick,
}) => {
  const isDark = theme === 'dark'

  // Height mappings for full horizontal logo
  const fullSizeMap = {
    xs: 'h-5',
    sm: 'h-7',
    md: 'h-8 sm:h-9',
    lg: 'h-10 sm:h-11',
    xl: 'h-12 sm:h-14',
  }

  // Height mappings for standalone symbol
  const symbolSizeMap = {
    xs: 'h-5',
    sm: 'h-6 sm:h-7',
    md: 'h-7 sm:h-8',
    lg: 'h-9 sm:h-10',
    xl: 'h-11 sm:h-12',
  }

  // 1. Standalone Icon / Symbol Variant (Collapsed sidebar, breadcrumb, mobile bar)
  if (variant === 'icon' || variant === 'symbol') {
    const symbolSrc = isDark ? '/brand/maaree360-symbol-white.png' : '/brand/maaree360-symbol-dark.png'
    return (
      <div
        className={`inline-flex items-center justify-center shrink-0 select-none ${className}`}
        onClick={onClick}
        title="MAAREE 360"
      >
        <img
          src={symbolSrc}
          alt="MAAREE 360"
          className={`${symbolSizeMap[size]} w-auto object-contain shrink-0`}
          loading="eager"
        />
      </div>
    )
  }

  // 2. Thermal Receipt Monochrome Variant
  if (variant === 'receipt') {
    return (
      <div className={`flex flex-col items-center justify-center text-center select-none font-mono ${className}`}>
        <div className="flex items-center justify-center gap-1.5 mb-0.5">
          <span className="font-mono font-black text-sm tracking-wide text-black uppercase">
            MAAREE 360
          </span>
        </div>
        {showSubtitle && (
          <span className="font-mono text-[9px] font-semibold tracking-wider text-black uppercase">
            {subtitle}
          </span>
        )}
      </div>
    )
  }

  // 3. Stacked / Hero Variant (Authentication pages, business setup, lock screens)
  if (variant === 'stacked') {
    const logoSrc = isDark ? '/brand/maaree360-logo-white.png' : '/brand/maaree360-logo-dark.png'
    return (
      <div
        className={`flex flex-col items-center justify-center text-center select-none ${className}`}
        onClick={onClick}
      >
        <img
          src={logoSrc}
          alt="MAAREE 360"
          className={`${fullSizeMap[size]} w-auto object-contain shrink-0`}
          loading="eager"
        />
        {showSubtitle && (
          <span className="text-[10px] sm:text-[11px] font-semibold tracking-wider uppercase text-slate-500 mt-2">
            {subtitle}
          </span>
        )}
      </div>
    )
  }

  // 4. Pill / Badge Variant (Enclosed in dark navy squircle card)
  if (variant === 'pill') {
    return (
      <div
        className={`inline-flex items-center justify-center bg-[#0B1425] border border-white/[0.08] px-3.5 py-1.5 rounded-lg select-none shadow-xs ${className}`}
        onClick={onClick}
      >
        <img
          src="/brand/maaree360-logo-white.png"
          alt="MAAREE 360"
          className={`${fullSizeMap[size]} w-auto object-contain shrink-0`}
          loading="eager"
        />
      </div>
    )
  }

  // 5. Full Horizontal Logo (Default — Expanded sidebar, page headers, modals)
  const fullSrc = isDark ? '/brand/maaree360-logo-white.png' : '/brand/maaree360-logo-dark.png'

  return (
    <div
      className={`inline-flex flex-col items-start select-none ${className}`}
      onClick={onClick}
    >
      <img
        src={fullSrc}
        alt="MAAREE 360"
        className={`${fullSizeMap[size]} w-auto object-contain shrink-0`}
        loading="eager"
      />
      {showSubtitle && (
        <span
          className={`text-[9px] font-semibold tracking-widest uppercase mt-1 pl-0.5 ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}
        >
          {subtitle}
        </span>
      )}
    </div>
  )
}

// Named alias for backward compatibility across existing components
export const TillProLogo = MaareeLogo
export default MaareeLogo
