import { Button as HeadlessButton } from "@headlessui/react";
import clsx from "clsx";
import type { MouseEvent, ReactNode } from "react";

type Variant = "solid" | "outline" | "danger" | "ghost";
type Size = "sm" | "md";

interface BtnProps {
  children: ReactNode;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  variant?: Variant;
  color?: string;
  size?: Size;
  small?: boolean;
  outline?: boolean;
  className?: string;
  disabled?: boolean;
}

const base =
  "inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/40 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

const sizes: Record<Size, string> = {
  sm: "px-2.5 py-1 text-[11px]",
  md: "px-4 py-1.5 text-xs",
};

const variants: Record<Variant, string> = {
  solid: "bg-primary-700 text-white shadow-sm hover:bg-primary-600",
  outline: "border border-primary-700 text-primary-700 bg-transparent hover:bg-primary-50",
  danger: "bg-red-600 text-white shadow-sm hover:bg-red-500",
  ghost: "text-gray-600 hover:bg-gray-100",
};

export function Btn({
  children,
  onClick,
  variant,
  color,
  size,
  small,
  outline,
  className,
  disabled,
}: BtnProps) {
  const resolvedSize = size ?? (small ? "sm" : "md");

  let resolvedVariant: Variant;
  if (variant) {
    resolvedVariant = variant;
  } else if (outline) {
    resolvedVariant = "outline";
  } else {
    resolvedVariant = "solid";
  }

  const colorOverride =
    !variant && color
      ? resolvedVariant === "outline"
        ? `border-[${color}] text-[${color}] hover:bg-[${color}]/10`
        : `bg-[${color}] text-white hover:brightness-110`
      : undefined;

  return (
    <HeadlessButton
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        base,
        sizes[resolvedSize],
        colorOverride ?? variants[resolvedVariant],
        className,
      )}
    >
      {children}
    </HeadlessButton>
  );
}
