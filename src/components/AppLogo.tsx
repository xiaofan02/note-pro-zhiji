import { useId } from "react";
import { cn } from "@/lib/utils";

type AppLogoProps = {
  className?: string;
  /** Pixel size of the square logo */
  size?: number;
};

/**
 * In-app brand mark: neural / circuit motif (distinct from legacy sparkle flower).
 */
export function AppLogo({ className, size = 32 }: AppLogoProps) {
  const uid = useId().replace(/:/g, "");
  const gid = `zhiji-${uid}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={`${gid}-bg`} x1="6" y1="4" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="hsl(195 95% 42%)" />
          <stop offset="1" stopColor="hsl(225 85% 48%)" />
        </linearGradient>
        <linearGradient id={`${gid}-glow`} x1="16" y1="8" x2="16" y2="26" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" stopOpacity="0.95" />
          <stop offset="1" stopColor="white" stopOpacity="0.45" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="30" height="30" rx="8" fill={`url(#${gid}-bg)`} />
      <rect x="1" y="1" width="30" height="30" rx="8" stroke="white" strokeOpacity="0.12" strokeWidth="1" />
      {/* Network edges */}
      <path
        d="M9 16h6M16 9v6M16 16l7 7M16 16l7-7"
        stroke={`url(#${gid}-glow)`}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.9}
      />
      {/* Nodes */}
      <circle cx="9" cy="16" r="2.25" fill="white" fillOpacity={0.95} />
      <circle cx="16" cy="9" r="2.25" fill="white" fillOpacity={0.95} />
      <circle cx="16" cy="16" r="2.75" fill="white" />
      <circle cx="23" cy="23" r="2.25" fill="white" fillOpacity={0.9} />
      <circle cx="23" cy="9" r="2" fill="white" fillOpacity={0.85} />
    </svg>
  );
}

export default AppLogo;
