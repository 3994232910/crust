import { forwardRef } from 'react'
import type { LucideProps } from 'lucide-react'

export const GalaxyIcon = forwardRef<SVGSVGElement, LucideProps>(
  ({ size = 24, strokeWidth = 1.5, className, color, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color ?? 'currentColor'}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Galaxy disk — outer arm */}
      <ellipse cx="12" cy="12" rx="9" ry="3.5" transform="rotate(-25 12 12)" />
      {/* Galaxy disk — inner core */}
      <ellipse cx="12" cy="12" rx="4.5" ry="1.8" transform="rotate(-25 12 12)" />
      {/* Bright center */}
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      {/* Surrounding star dots */}
      <circle cx="3.5" cy="9" r="0.55" fill="currentColor" stroke="none" />
      <circle cx="20.5" cy="15" r="0.55" fill="currentColor" stroke="none" />
      <circle cx="6" cy="17" r="0.45" fill="currentColor" stroke="none" />
      <circle cx="18.5" cy="7.5" r="0.45" fill="currentColor" stroke="none" />
      <circle cx="15" cy="18.5" r="0.4" fill="currentColor" stroke="none" />
      <circle cx="9" cy="5.5" r="0.4" fill="currentColor" stroke="none" />
    </svg>
  ),
)
GalaxyIcon.displayName = 'GalaxyIcon'
