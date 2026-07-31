import { useId } from "react";
import { cn } from "@/lib/utils";

const MARK_SIZES = {
  sm: "size-8",
  md: "size-9",
  lg: "size-14",
} as const;

const WORDMARK_SIZES = {
  sm: { top: "text-[0.7rem] tracking-[0.18em]", bottom: "text-[0.42rem] tracking-[0.28em]" },
  md: { top: "text-[0.9rem] tracking-[0.2em]", bottom: "text-[0.52rem] tracking-[0.32em]" },
  lg: { top: "text-xl tracking-[0.22em]", bottom: "text-[0.68rem] tracking-[0.4em]" },
} as const;

type LogoSize = keyof typeof MARK_SIZES;

/**
 * Emblema: hexágono (rede/prospecção) + seta ascendente com ponto de mira
 * (crescimento e precisão na captação de leads).
 */
export function LogoMark({ size = "md", className }: { size?: LogoSize; className?: string }) {
  const uid = useId();
  const badgeId = `atl-badge-${uid}`;
  const goldId = `atl-gold-${uid}`;

  return (
    <svg
      viewBox="0 0 40 40"
      className={cn(MARK_SIZES[size], "shrink-0", className)}
      role="img"
      aria-label="ATL Prospect"
    >
      <defs>
        <linearGradient id={badgeId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#241a10" />
          <stop offset="100%" stopColor="#0f0b07" />
        </linearGradient>
        <linearGradient id={goldId} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#b8823a" />
          <stop offset="55%" stopColor="#e8c477" />
          <stop offset="100%" stopColor="#f6e3a8" />
        </linearGradient>
      </defs>
      <rect x="0.5" y="0.5" width="39" height="39" rx="10" fill={`url(#${badgeId})`} />
      <rect
        x="0.5"
        y="0.5"
        width="39"
        height="39"
        rx="10"
        fill="none"
        stroke={`url(#${goldId})`}
        strokeWidth="1.1"
      />
      <path
        d="M20 8 L30.4 14 L30.4 26 L20 32 L9.6 26 L9.6 14 Z"
        fill="none"
        stroke={`url(#${goldId})`}
        strokeWidth="1.8"
      />
      <path
        d="M13.5 24.5 L20 14.5 L26.5 24.5"
        fill="none"
        stroke={`url(#${goldId})`}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="20" cy="14.5" r="2" fill={`url(#${goldId})`} />
    </svg>
  );
}

export function Logo({
  size = "md",
  showWordmark = true,
  className,
}: {
  size?: LogoSize;
  showWordmark?: boolean;
  className?: string;
}) {
  const wordmark = WORDMARK_SIZES[size];

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      {showWordmark && (
        <div className="flex flex-col leading-none">
          <span className={cn("font-semibold text-current", wordmark.top)}>ATL</span>
          <span
            className={cn(
              "font-medium bg-gradient-to-r from-amber-700 via-amber-500 to-amber-300 bg-clip-text text-transparent dark:from-amber-500 dark:via-amber-300 dark:to-amber-200",
              wordmark.bottom
            )}
          >
            PROSPECT
          </span>
        </div>
      )}
    </div>
  );
}
