import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "orange" | "green" | "gray" | "blue";
  className?: string;
}

export function Badge({ children, variant = "gray", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full",
        {
          "bg-[rgba(255,107,53,0.12)] text-[#FF6B35]": variant === "orange",
          "bg-[rgba(16,185,129,0.12)] text-[#10B981]": variant === "green",
          "bg-[var(--bg-tertiary)] text-[var(--text-secondary)]": variant === "gray",
          "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300": variant === "blue",
        },
        className
      )}
    >
      {children}
    </span>
  );
}
