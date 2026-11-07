import type { ComponentProps } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The admin app's dropdown: a native <select> (keyboard, screen readers and the
 * phone's own picker keep working) styled to the DNA look, with a pink chevron.
 * `active` tints it while a filter is narrowing the view, so set filters stand out.
 */
export function Select({
  active = false,
  className,
  children,
  ...props
}: ComponentProps<"select"> & { active?: boolean }) {
  return (
    <span className={cn("relative inline-flex", className)}>
      <select
        {...props}
        className={cn(
          "h-9 w-full cursor-pointer appearance-none rounded-full border py-0 pr-9 pl-3.5 text-sm font-medium transition-[border-color,background-color,box-shadow] duration-150 outline-none",
          "hover:border-brand/50 focus-visible:border-brand focus-visible:ring-brand/20 focus-visible:ring-4",
          active
            ? "border-brand/40 bg-brand-soft text-accent-foreground"
            : "text-foreground border-[#ead8e1] bg-white",
        )}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="text-brand pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2"
      />
    </span>
  );
}
