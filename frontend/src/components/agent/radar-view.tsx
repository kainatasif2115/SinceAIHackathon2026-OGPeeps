"use client";

import { useEffect, useRef, useState } from "react";
import { Link, LoaderCircle, Lock, Radar, TrendingUp, Users } from "lucide-react";
import { getCampaigns, type Campaign } from "@/lib/agent-api";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ago } from "./ticket-meta";

const POLL_MS = 10_000;
const LANGUAGES: Record<string, string> = { fi: "FI", en: "EN", sv: "SV" };

/**
 * Scam-campaign radar: recent chats grouped by fingerprint (link domain, hashed
 * numbers and words). No message text is stored or shown here.
 */
export function RadarView({ onSessionExpired }: { onSessionExpired: () => void }) {
  const [data, setData] = useState<{ min_reports: number; campaigns: Campaign[] } | null>(null);
  const [failed, setFailed] = useState(false);
  const [now, setNow] = useState(0);
  const expired = useRef(onSessionExpired);
  useEffect(() => {
    expired.current = onSessionExpired;
  });

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const res = await getCampaigns();
        if (!alive) return;
        setData(res);
        setNow(Date.now());
      } catch (err) {
        if (!alive) return;
        if (err instanceof ApiError && err.status === 401) expired.current();
        else setFailed(true);
      }
    }
    void load();
    const timer = setInterval(() => void load(), POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  if (!data) {
    return (
      <p className="text-muted-foreground flex items-center gap-2 p-6 text-sm">
        <LoaderCircle aria-hidden className="text-brand size-4 animate-spin" />
        {failed ? "Can’t load the radar. Is the backend running?" : "Loading the radar…"}
      </p>
    );
  }

  const active = data.campaigns.filter((c) => c.reports >= 2);
  const singles = data.campaigns.length - active.length;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-2">
        <p className="text-brand flex items-center gap-1.5 text-sm font-semibold">
          <Radar aria-hidden className="size-4" />
          Scam-campaign radar · last 24 hours
        </p>
        <h1 className="text-3xl font-bold tracking-tight">
          What customers are asking about right now
        </h1>
        <p className="text-muted-foreground max-w-3xl">
          One chatbot sees one customer; DNA sees all of them. Chats about very similar messages are
          grouped into campaigns. Once a campaign has more than {data.min_reports} reports, the next
          customer who asks is told they are not the only one.
        </p>
        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <Lock aria-hidden className="size-3.5" />
          Privacy: no message text is kept. Each chat leaves only its link domains, hashed words and
          numbers, a theme and a time, deleted after 24 hours.
        </p>
      </div>

      {active.length === 0 ? (
        <p className="text-muted-foreground rounded-2xl border border-dashed p-6 text-sm">
          No campaigns yet. Similar questions from two or more customers will appear here.
        </p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {active.map((c) => (
            <li key={`${c.theme}-${c.first_seen}`}>
              <CampaignCard campaign={c} now={now} threshold={data.min_reports} />
            </li>
          ))}
        </ul>
      )}
      {singles > 0 && (
        <p className="text-muted-foreground text-xs">
          {singles} single report{singles === 1 ? "" : "s"} not matching any other chat.
        </p>
      )}
    </div>
  );
}

function CampaignCard({
  campaign: c,
  now,
  threshold,
}: {
  campaign: Campaign;
  now: number;
  threshold: number;
}) {
  const peak = Math.max(1, ...c.hourly);
  return (
    <article className="border-border flex h-full flex-col gap-4 rounded-2xl border bg-white p-5">
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-bold tracking-tight">{c.theme}</h2>
          <p className="text-muted-foreground text-xs">
            First seen {ago(c.first_seen, now)} · latest {ago(c.last_seen, now)}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <p className="font-heading text-3xl leading-none font-bold">{c.reports}</p>
          <p className="text-muted-foreground text-xs">reports</p>
        </div>
      </header>

      <div className="flex flex-wrap gap-1.5">
        {c.rising && (
          <span className="bg-risk-high text-risk-high-fg inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold">
            <TrendingUp aria-hidden className="size-3.5" />
            Rising
          </span>
        )}
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
            c.shown_to_customers
              ? "bg-brand-soft text-accent-foreground"
              : "bg-muted text-muted-foreground",
          )}
        >
          <Users aria-hidden className="size-3.5" />
          {c.shown_to_customers
            ? "Customers are told"
            : `Below the ${threshold}-report privacy threshold`}
        </span>
        {c.demo && (
          <span className="border-border text-muted-foreground rounded-full border px-2.5 py-0.5 text-xs">
            Demo data
          </span>
        )}
      </div>

      <figure className="flex flex-col gap-1.5">
        <div
          role="img"
          aria-label={`Reports per hour over the last 24 hours: ${c.hourly.join(", ")}`}
          className="flex h-14 items-end gap-0.5"
        >
          {c.hourly.map((count, i) => (
            <span
              key={i}
              title={`${23 - i === 0 ? "This hour" : `${23 - i} h ago`}: ${count}`}
              className={cn(
                "flex-1 rounded-t-[3px]",
                count === 0 ? "bg-[#f3e4ec]" : i >= 22 ? "bg-brand" : "bg-[#e79ac0]",
              )}
              style={{ height: count === 0 ? 3 : `${Math.max(12, (count / peak) * 100)}%` }}
            />
          ))}
        </div>
        <figcaption className="text-muted-foreground flex justify-between text-[0.6875rem]">
          <span>24 h ago</span>
          <span>now</span>
        </figcaption>
      </figure>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-muted-foreground text-xs">Link domains</dt>
          <dd className="flex flex-col gap-0.5">
            {c.domains.length ? (
              c.domains.map((d) => (
                <code key={d} className="flex items-center gap-1 text-xs break-all">
                  <Link aria-hidden className="size-3 shrink-0" />
                  {d}
                </code>
              ))
            ) : (
              <span className="text-muted-foreground">none (matched by words)</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">Languages · customers</dt>
          <dd>
            {Object.entries(c.languages)
              .map(([lang, n]) => `${LANGUAGES[lang] ?? lang} ${n}`)
              .join(" · ")}
            <br />
            <span className="text-muted-foreground text-xs">
              {Object.entries(c.audiences)
                .map(([a, n]) => `${a === "small_business" ? "business" : "private"} ${n}`)
                .join(" · ")}
            </span>
          </dd>
        </div>
      </dl>
    </article>
  );
}
