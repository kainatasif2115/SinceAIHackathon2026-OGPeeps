"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";

type Health = {
  status: string;
  simset_version: string;
  guidance_passages: number;
  claude_configured: boolean;
  mongodb_configured: boolean;
};

export function BackendStatus() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then(setHealth)
      .catch(() => setError(true));
  }, []);

  if (error) {
    return <Badge variant="destructive">Backend not reachable. Is it running on port 8000?</Badge>;
  }
  if (!health) {
    return <Badge variant="outline">Checking backend…</Badge>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      <Badge>Backend {health.status}</Badge>
      <Badge variant="secondary">
        SimSet v{health.simset_version} · {health.guidance_passages} guidance passages
      </Badge>
      <Badge variant={health.claude_configured ? "secondary" : "outline"}>
        Claude {health.claude_configured ? "configured" : "not configured"}
      </Badge>
      <Badge variant={health.mongodb_configured ? "secondary" : "outline"}>
        MongoDB {health.mongodb_configured ? "configured" : "not configured"}
      </Badge>
    </div>
  );
}
