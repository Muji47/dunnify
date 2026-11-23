import React from "react";
import Image from "next/image";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showWordmark?: boolean;
  className?: string;
  theme?: "dark" | "light";
  iconOnly?: boolean;
}

export function Logo({
  size = "md",
  showWordmark = true,
  className = "",
  theme = "dark",
  iconOnly = false,
}: LogoProps) {
  // Dimensions map
  const heights = {
    sm: { h: 28, w: 120, iconSize: 28 },
    md: { h: 36, w: 154, iconSize: 36 },
    lg: { h: 44, w: 188, iconSize: 44 },
    xl: { h: 56, w: 240, iconSize: 56 },
  };

  const { h, w, iconSize } = heights[size];

  if (iconOnly || !showWordmark) {
    return (
      <div className={`inline-flex items-center ${className}`}>
        <img
          src="/brand/dunnify-icon.png"
          alt="Dunnify Recovery Icon"
          width={iconSize}
          height={iconSize}
          className="object-contain drop-shadow-[0_0_12px_rgba(16,185,129,0.3)] transition-transform duration-300 hover:scale-105"
        />
      </div>
    );
  }

  const logoSrc =
    theme === "light"
      ? "/brand/dunnify-logo-dark-text.png"
      : "/brand/dunnify-logo-white-text.png";

  return (
    <div className={`inline-flex items-center ${className}`}>
      <img
        src={logoSrc}
        alt="Dunnify"
        style={{ height: `${h}px`, width: "auto" }}
        className="object-contain select-none transition-all duration-300 hover:opacity-95"
      />
    </div>
  );
}

export function FaviconSVG() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="16" fill="#080F1C" />
      <image href="/brand/dunnify-icon.png" x="8" y="8" width="48" height="48" />
    </svg>
  );
}
