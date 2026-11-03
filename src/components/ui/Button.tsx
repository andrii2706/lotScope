"use client";

import type React from "react";

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "md" | "lg";
}) {
  const styles = {
    primary:
      "bg-accent text-accent-ink shadow-[0_1px_2px_rgba(16,24,40,0.06)] hover:brightness-110 active:brightness-95 disabled:bg-panel2 disabled:text-faint disabled:hover:brightness-100",
    secondary: "border border-line2 bg-surface text-ink shadow-[0_1px_2px_rgba(16,24,40,0.05)] hover:bg-panel2",
    ghost: "text-muted hover:bg-ink/5 hover:text-ink",
    danger: "text-bad hover:bg-bad-bg",
  }[variant];
  const sizes = { md: "min-h-10 px-4 text-sm", lg: "min-h-12 px-5 text-[15px]" }[size];
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-[10px] font-semibold transition disabled:cursor-not-allowed ${sizes} ${styles} ${className}`}
    >
      {children}
    </button>
  );
}
