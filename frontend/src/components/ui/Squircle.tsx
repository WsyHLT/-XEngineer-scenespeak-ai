"use client";

import type { ReactNode } from "react";

import { cn, SQUIRCLE, SQUIRCLE_LG, SQUIRCLE_XL } from "@/lib/designSystem";

type SquircleProps = {
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "auto";
  className?: string;
  as?: "div" | "span" | "button";
  onClick?: () => void;
  title?: string;
  type?: "button" | "submit";
  "aria-label"?: string;
};

const SIZE_CLASS = {
  sm: `h-8 w-8 ${SQUIRCLE}`,
  md: `h-10 w-10 ${SQUIRCLE_LG}`,
  lg: `h-12 w-12 ${SQUIRCLE_LG}`,
  xl: `h-14 w-14 ${SQUIRCLE_XL}`,
  auto: SQUIRCLE_LG,
} as const;

export default function Squircle({
  children,
  size = "auto",
  className,
  as: Tag = "div",
  ...rest
}: SquircleProps) {
  return (
    <Tag
      className={cn(
        "inline-flex items-center justify-center",
        size !== "auto" && SIZE_CLASS[size],
        size === "auto" && SIZE_CLASS.auto,
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
