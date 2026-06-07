"use client";

import type { ReactNode } from "react";

import { cn, type TintPreset, TINT_OVERLAY, TINT_OVERLAY_HIDDEN } from "@/lib/designSystem";

type Props = {
  visible: boolean;
  tint?: TintPreset;
  onClick?: () => void;
  className?: string;
  children?: ReactNode;
  zIndex?: string;
};

export default function TintedOverlay({
  visible,
  tint = "indigo",
  onClick,
  className,
  children,
  zIndex = "z-[200]",
}: Props) {
  return (
    <div
      className={cn(
        "fixed inset-0 flex items-center justify-center p-4 transition-all duration-300 backdrop-blur-md sm:p-6",
        zIndex,
        visible ? `${TINT_OVERLAY[tint]} opacity-100` : `${TINT_OVERLAY_HIDDEN[tint]} opacity-0 backdrop-blur-none`,
        className,
      )}
      onClick={onClick}
      role="presentation"
    >
      {children}
    </div>
  );
}
