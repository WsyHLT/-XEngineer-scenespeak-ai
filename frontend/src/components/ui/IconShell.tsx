"use client";

import type { ReactNode, ButtonHTMLAttributes } from "react";

import { cn, ICON_SHELL, ICON_SHELL_ACTIVE, SQUIRCLE } from "@/lib/designSystem";

type Size = "sm" | "md" | "lg";

const SIZE_MAP: Record<Size, string> = {
  sm: `${SQUIRCLE} h-7 w-7 [&_svg]:h-3.5 [&_svg]:w-3.5`,
  md: `${SQUIRCLE} h-8 w-8 [&_svg]:h-4 [&_svg]:w-4`,
  lg: "rounded-2xl h-9 w-9 [&_svg]:h-[18px] [&_svg]:w-[18px]",
};

type Props = {
  children: ReactNode;
  size?: Size;
  active?: boolean;
  className?: string;
} & Pick<ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "title" | "type" | "disabled" | "aria-label">;

export function IconShell({
  children,
  size = "md",
  active,
  className,
  onClick,
  ...rest
}: Props) {
  const shell = cn(ICON_SHELL, SIZE_MAP[size], active && ICON_SHELL_ACTIVE, className);

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(shell, "transition-colors duration-200 hover:bg-indigo-500/14 hover:text-indigo-200/85")}
        {...rest}
      >
        {children}
      </button>
    );
  }

  return <span className={shell}>{children}</span>;
}
