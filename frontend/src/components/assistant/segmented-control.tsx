"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

type Option<T extends string> = {
  value: T;
  label: string;
  /** Full name for screen readers when the visible label is an abbreviation. */
  srLabel?: string;
  lang?: string;
};

type Props<T extends string> = {
  legend: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  disabledHint?: string;
  /** `sm` is the compact control used for the short language codes. */
  size?: "md" | "sm";
  className?: string;
};

/**
 * A row of native radio buttons styled as a segmented control. Native radios
 * give arrow-key navigation and correct screen reader semantics for free.
 */
export function SegmentedControl<T extends string>({
  legend,
  options,
  value,
  onChange,
  disabled,
  disabledHint,
  size = "md",
  className,
}: Props<T>) {
  const name = useId();
  return (
    <fieldset
      disabled={disabled}
      title={disabled ? disabledHint : undefined}
      className={cn("min-w-0 shrink-0 disabled:opacity-60", className)}
    >
      <legend className="sr-only">{legend}</legend>
      <div className="border-border bg-background inline-flex rounded-md border p-0.5">
        {options.map((option) => (
          <label
            key={option.value}
            lang={option.lang}
            className={cn(
              "text-muted-foreground relative flex cursor-pointer items-center justify-center rounded-sm font-medium transition-colors duration-150 select-none",
              size === "sm"
                ? "min-h-7 min-w-8 px-2 text-xs font-semibold"
                : "min-h-9 px-2.5 text-sm",
              "hover:text-foreground has-[:checked]:bg-primary has-[:checked]:text-primary-foreground",
              "has-[:focus-visible]:outline-ring has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2",
              "has-[:disabled]:cursor-not-allowed",
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            <span aria-hidden={option.srLabel ? true : undefined}>{option.label}</span>
            {option.srLabel && <span className="sr-only">{option.srLabel}</span>}
          </label>
        ))}
      </div>
      {disabled && disabledHint && <span className="sr-only">{disabledHint}</span>}
    </fieldset>
  );
}
