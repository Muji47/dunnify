import React from "react";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showWordmark?: boolean;
  className?: string;
  sparkColor?: string;
}

export function Logo({
  size = "md",
  showWordmark = true,
  className = "",
}: LogoProps) {
  // Dimensions map
  const dimensions = {
    sm: { icon: 24, font: "text-lg", squircle: "w-7 h-7 rounded-lg" },
    md: { icon: 32, font: "text-xl", squircle: "w-9 h-9 rounded-xl" },
    lg: { icon: 40, font: "text-2xl", squircle: "w-11 h-11 rounded-2xl" },
    xl: { icon: 52, font: "text-3xl", squircle: "w-14 h-14 rounded-2xl" },
  };

  const { icon, font, squircle } = dimensions[size];

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* "The Recovery D" Monogram Icon */}
      <div
        className={`${squircle} relative bg-[#0B1528] border border-emerald-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.2)] group transition-all duration-300 hover:border-emerald-400 hover:shadow-[0_0_25px_rgba(16,185,129,0.35)]`}
      >
        <svg
          width={icon}
          height={icon}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="overflow-visible"
        >
          <defs>
            <linearGradient id="recoveryArrowGrad" x1="8" y1="8" x2="42" y2="40" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#34D399" />
              <stop offset="50%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <linearGradient id="spineGrad" x1="10" y1="10" x2="18" y2="38" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#F8FAFC" />
              <stop offset="100%" stopColor="#94A3B8" />
            </linearGradient>
            <filter id="emeraldGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#10B981" floodOpacity="0.4" />
            </filter>
          </defs>

          {/* Upright Backbone Spine of the "D" */}
          <rect
            x="11"
            y="9"
            width="5"
            height="30"
            rx="2.5"
            fill="url(#spineGrad)"
          />

          {/* Unbroken Recovery Circular Arrow forming the loop of the "D" */}
          <path
            d="M 13.5 12
               C 22 12, 36 14, 36 24
               C 36 33.5, 23 35.5, 17 34"
            stroke="url(#recoveryArrowGrad)"
            strokeWidth="4.5"
            strokeLinecap="round"
            filter="url(#emeraldGlow)"
          />

          {/* Arrowhead completing the continuous recovery cycle back toward the spine */}
          <path
            d="M 19 30.5 L 14.5 34.5 L 19.5 38"
            stroke="url(#recoveryArrowGrad)"
            strokeWidth="3.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Energy core spark dot inside the loop */}
          <circle cx="25" cy="24" r="1.8" fill="#34D399" className="animate-pulse" />
        </svg>
      </div>

      {/* Wordmark with emerald spark dotting the letter 'i' */}
      {showWordmark && (
        <div className="flex items-baseline tracking-tight select-none">
          <span className={`font-extrabold ${font} text-slate-50 tracking-[-0.03em]`}>
            Dunn
            {/* The letter 'i' with custom emerald diamond spark dot */}
            <span className="relative inline-flex flex-col items-center">
              <span className="inline-block w-1.5 h-1.5 rotate-45 bg-emerald-400 rounded-[1px] shadow-[0_0_8px_#10B981] mb-[3px] animate-pulse" />
              <span className="leading-none">ı</span>
            </span>
            fy
          </span>
        </div>
      )}
    </div>
  );
}

export function FaviconSVG() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="16" fill="#080F1C" />
      <rect x="1" y="1" width="62" height="62" rx="15" stroke="#10B981" strokeOpacity="0.3" strokeWidth="2" />
      <g transform="translate(8, 8)">
        <defs>
          <linearGradient id="favGrad" x1="8" y1="8" x2="42" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#34D399" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
        </defs>
        <rect x="11" y="9" width="5" height="30" rx="2.5" fill="#F8FAFC" />
        <path
          d="M 13.5 12 C 22 12, 36 14, 36 24 C 36 33.5, 23 35.5, 17 34"
          stroke="url(#favGrad)"
          strokeWidth="4.5"
          strokeLinecap="round"
        />
        <path
          d="M 19 30.5 L 14.5 34.5 L 19.5 38"
          stroke="url(#favGrad)"
          strokeWidth="3.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
