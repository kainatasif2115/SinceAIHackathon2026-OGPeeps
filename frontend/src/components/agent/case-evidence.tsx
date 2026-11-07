import {
  Bell,
  CircleCheck,
  Eye,
  Link,
  LockKeyhole,
  Mail,
  Megaphone,
  MessageSquareText,
  MessagesSquare,
  Monitor,
  NotebookPen,
  Paperclip,
  PhoneCall,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";
import type { CaseDetail } from "@/lib/agent-api";
import { cn } from "@/lib/utils";

type Evidence = CaseDetail["evidence"];

const ARTIFACT_KIND: Record<string, { label: string; icon: LucideIcon }> = {
  sms: { label: "Text message", icon: MessageSquareText },
  email: { label: "Email", icon: Mail },
  call: { label: "Phone call, as the customer described it", icon: PhoneCall },
  user_report: { label: "The customer’s own notes", icon: NotebookPen },
  push_notification: { label: "Push notification", icon: Bell },
  social_ad: { label: "Social media ad", icon: Megaphone },
  screen_note: { label: "Message shown on screen", icon: Monitor },
  chat: { label: "Chat message", icon: MessagesSquare },
};

const VERDICT_CHIP: Record<string, string> = {
  clean: "bg-risk-safe text-risk-safe-fg",
  suspicious: "bg-risk-high text-risk-high-fg",
  malicious: "bg-risk-critical text-risk-critical-fg",
  phishing: "bg-risk-critical text-risk-critical-fg",
};

// The account data the assistant may only look at with the customer's permission.
const CONSENT_LABELS: Record<string, string> = {
  "subscription.recent_events": "Recent changes to the subscription (SIM, eSIM, orders)",
  "subscription.network_status": "Network status of the number",
  "operator_account.recent_logins": "Recent logins to the operator account",
  credential_exposure: "Data-breach check for the customer’s email",
  "device.recent_app_installs": "Recently installed apps",
  "device.security_findings": "Security findings on the device",
  "business.staff_accounts": "Staff accounts of the business",
};

function when(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? null
    : new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
}

/**
 * The item the customer forwarded, shown attached to their first message.
 * Untrusted: it may be written by a scammer, so links are plain text, never clickable.
 */
export function ArtifactCard({
  artifact,
  language,
}: {
  artifact: NonNullable<Evidence["artifact"]>;
  language: string;
}) {
  const kind = ARTIFACT_KIND[artifact.type] ?? { label: artifact.type, icon: Paperclip };
  const received = when(artifact.received_at);
  return (
    <figure className="border-border flex w-full max-w-[85%] flex-col gap-2 rounded-2xl rounded-tr-md border bg-white p-3.5 shadow-sm">
      <figcaption className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
        <span className="text-foreground flex items-center gap-1.5 font-semibold">
          <kind.icon aria-hidden className="text-brand size-3.5" />
          {kind.label}
        </span>
        {artifact.sender && <span>from {artifact.sender}</span>}
        {received && <span>· {received}</span>}
      </figcaption>
      <blockquote lang={language} className="text-sm whitespace-pre-wrap">
        {artifact.body}
      </blockquote>
      {artifact.links && artifact.links.length > 0 && (
        <ul className="flex flex-col gap-1">
          {artifact.links.map((link) => (
            <li key={link} className="text-muted-foreground flex items-start gap-1.5 text-xs">
              <Link aria-hidden className="mt-0.5 size-3.5 shrink-0" />
              <code className="break-all">{link}</code>
            </li>
          ))}
        </ul>
      )}
      <p className="text-muted-foreground text-[0.6875rem]">
        Forwarded by the customer · treated as untrusted
      </p>
    </figure>
  );
}

/** Everything else that came with the case: link check, call warning, gated data. */
export function EvidencePanel({ detail }: { detail: CaseDetail }) {
  const { link_check: linkCheck, call_warning: call, needs_consent: gated } = detail.evidence;
  const granted = new Set(detail.transcript.flatMap((t) => t.granted));
  const refused = new Set(detail.transcript.flatMap((t) => t.refused));

  return (
    <section
      aria-labelledby="evidence-heading"
      className="border-border flex flex-col gap-4 rounded-2xl border bg-white p-5"
    >
      <h3 id="evidence-heading" className="flex items-center gap-2 font-bold">
        <Eye aria-hidden className="text-brand size-4.5" />
        What the assistant could see
      </h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 text-sm">
          <p className="font-semibold">Link check</p>
          {linkCheck ? (
            <>
              <p className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "rounded-md px-2 py-0.5 text-xs font-semibold capitalize",
                    VERDICT_CHIP[linkCheck.verdict] ?? "bg-muted text-foreground",
                  )}
                >
                  {linkCheck.verdict}
                </span>
                {typeof linkCheck.confidence === "number" && (
                  <span className="text-muted-foreground">
                    {Math.round(linkCheck.confidence * 100)} % sure
                  </span>
                )}
              </p>
              {typeof linkCheck.domain_age_days === "number" && (
                <p className="text-muted-foreground">
                  Domain{" "}
                  {linkCheck.domain_age_days >= 365
                    ? `${Math.floor(linkCheck.domain_age_days / 365)} years`
                    : `${linkCheck.domain_age_days} days`}{" "}
                  old
                </p>
              )}
              {linkCheck.categories && linkCheck.categories.length > 0 && (
                <p className="text-muted-foreground">Flags: {linkCheck.categories.join(", ")}</p>
              )}
            </>
          ) : (
            <p className="text-muted-foreground">No link to check.</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5 text-sm">
          <p className="font-semibold">Call warning</p>
          {call ? (
            <>
              <p className="flex flex-wrap items-center gap-2">
                <span className="bg-risk-high text-risk-high-fg inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold">
                  <ShieldAlert aria-hidden className="size-3.5" />
                  {call.warning ? call.warning.replaceAll("_", " ") : "warning"}
                </span>
                {typeof call.confidence === "number" && (
                  <span className="text-muted-foreground">
                    {Math.round(call.confidence * 100)} % sure
                  </span>
                )}
              </p>
              <p className="text-muted-foreground">
                {call.number && <code>{call.number}</code>}
                {call.answered !== undefined &&
                  call.answered !== null &&
                  ` · ${call.answered ? "answered" : "not answered"}`}
                {typeof call.duration_s === "number" &&
                  call.answered &&
                  ` · ${Math.round(call.duration_s / 60)} min`}
                {call.caller_id_possibly_spoofed && " · caller ID may be faked"}
              </p>
            </>
          ) : (
            <p className="text-muted-foreground">No call warning.</p>
          )}
        </div>
      </div>

      {gated.length > 0 && (
        <div className="flex flex-col gap-1.5 text-sm">
          <p className="flex items-center gap-1.5 font-semibold">
            <LockKeyhole aria-hidden className="text-brand size-4" />
            Only with the customer’s permission
          </p>
          <ul className="flex flex-col gap-1">
            {gated.map((field) => (
              <li key={field} className="flex items-center gap-2">
                {granted.has(field) ? (
                  <CircleCheck aria-label="Allowed" className="text-risk-safe-fg size-4 shrink-0" />
                ) : (
                  <LockKeyhole
                    aria-label="Not used"
                    className="text-muted-foreground size-4 shrink-0"
                  />
                )}
                <span>{CONSENT_LABELS[field] ?? field}</span>
                <span className="text-muted-foreground text-xs">
                  {granted.has(field)
                    ? "allowed in the chat"
                    : refused.has(field)
                      ? "refused"
                      : "not used"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
