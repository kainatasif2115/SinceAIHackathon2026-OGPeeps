import { cn } from "@/lib/utils";

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

/** A person's initials in a circle; the brand colour for you, a soft tint for others. */
export function Avatar({
  name,
  you = false,
  size = "md",
}: {
  name: string;
  you?: boolean;
  size?: "md" | "lg";
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-bold",
        size === "lg" ? "size-14 text-lg" : "size-9 text-xs",
        you ? "bg-brand text-brand-foreground" : "bg-brand-soft text-accent-foreground",
      )}
    >
      {initials(name)}
    </span>
  );
}
