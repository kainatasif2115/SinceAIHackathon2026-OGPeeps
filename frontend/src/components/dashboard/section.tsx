import type { ReactNode } from "react";

/** Page frame for a dashboard section: a heading, an optional intro, the content. */
export function Section({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 md:px-8 md:py-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
        {intro && <p className="text-muted-foreground mt-1 text-sm">{intro}</p>}
      </div>
      {children}
    </div>
  );
}

export function Card({ children, labelledBy }: { children: ReactNode; labelledBy?: string }) {
  return (
    <section
      aria-labelledby={labelledBy}
      className="rounded-2xl border border-[#eee3e8] bg-white p-5 shadow-[0_1px_2px_rgb(60_20_40/0.04),0_4px_16px_rgb(60_20_40/0.04)] sm:p-6"
    >
      {children}
    </section>
  );
}
