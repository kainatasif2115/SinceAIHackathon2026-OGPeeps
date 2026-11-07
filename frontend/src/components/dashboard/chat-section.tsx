"use client";

import { useState } from "react";
import { Assistant } from "@/components/assistant/assistant";
import { SegmentedControl } from "@/components/assistant/segmented-control";
import type { Audience } from "@/lib/api";
import { useAccount } from "./account-context";

/**
 * The assistant inside the dashboard. Business accounts start in Business mode and can
 * switch to Private for a personal matter (those checks are never shared with the team);
 * the assistant follows the switch until a conversation starts.
 */
export function ChatSection() {
  const { account } = useAccount();
  const business = Boolean(account.company);
  const [audience, setAudience] = useState<Audience>(business ? "small_business" : "consumer");

  return (
    <div className="flex min-h-[70dvh] flex-1 flex-col gap-3 px-3 py-3 md:h-full md:px-6 md:py-6">
      {business && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-muted-foreground text-sm">
            {audience === "small_business"
              ? `Business mode: shared with ${account.company}${account.role === "owner" ? "" : "'s owner"}.`
              : "Private mode: only you see this check."}
          </p>
          <SegmentedControl
            legend="Who is this about?"
            value={audience}
            onChange={setAudience}
            size="sm"
            options={[
              { value: "small_business", label: "Business" },
              { value: "consumer", label: "Private" },
            ]}
          />
        </div>
      )}
      <div className="border-border min-h-0 flex-1 overflow-hidden rounded-3xl border bg-white">
        <Assistant variant="panel" defaultAudience={audience} expanded />
      </div>
    </div>
  );
}
