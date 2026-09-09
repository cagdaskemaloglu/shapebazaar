import { cn } from "@/lib/utils";
import { type ButtonHTMLAttributes, forwardRef } from "react";
import Link from "next/link";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  asChild?: boolean;
  href?: string;
}

const variantClass = {
  primary: "bg-[#FF6B35] text-white hover:bg-[#e85e2a] border border-transparent shadow-sm",
  secondary: "bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--border-strong)]",
  ghost: "bg-transparent text-[var(--text-primary)] border border-[var(--border)] hover:bg-[var(--bg-secondary)]",
  danger: "bg-red-500 text-white hover:bg-red-600 border border-transparent",
};

const sizeClass = {
  sm: "text-xs px-3 py-1.5 h-8 rounded-lg",
  md: "text-sm px-4 py-2 h-9 rounded-xl",
  lg: "text-sm px-6 py-3 h-11 rounded-xl",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, asChild, href, ...props }, ref) => {
    const classes = cn(
      "inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]",
      variantClass[variant],
      sizeClass[size],
      className
    );

    if (asChild && href) {
      return (
        <Link href={href} className={classes}>
          {children}
        </Link>
      );
    }

    // When asChild is true but href comes from children, render as wrapper
    if (asChild) {
      return <span className={classes}>{children}</span>;
    }

    return (
      <button ref={ref} className={classes} {...props}>
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
