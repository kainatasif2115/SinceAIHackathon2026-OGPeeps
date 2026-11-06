import {
  CircleCheck,
  CircleExclamationPoint,
  Info,
  OctagonExclamationPoint,
  TriangleExclamationPoint,
  type LucideIcon,
} from "lucide-react";
import type { RiskLevel } from "@/lib/api";

type RiskStyle = {
  icon: LucideIcon;
  /** Tinted surface + readable text colour (>= 6.5:1 in both themes). */
  surface: string;
  /** Outline colour for the answer card (>= 3:1 against the card). */
  line: string;
};

// Colour is never the only signal: every level also has its own icon and a
// text label (see i18n `risk`). none/low share green, told apart by icon/label.
export const RISK_STYLES: Record<RiskLevel, RiskStyle> = {
  none: {
    icon: CircleCheck,
    surface: "bg-risk-safe text-risk-safe-fg",
    line: "border-risk-safe-line",
  },
  low: { icon: Info, surface: "bg-risk-safe text-risk-safe-fg", line: "border-risk-safe-line" },
  medium: {
    icon: CircleExclamationPoint,
    surface: "bg-risk-medium text-risk-medium-fg",
    line: "border-risk-medium-line",
  },
  high: {
    icon: TriangleExclamationPoint,
    surface: "bg-risk-high text-risk-high-fg",
    line: "border-risk-high-line",
  },
  critical: {
    icon: OctagonExclamationPoint,
    surface: "bg-risk-critical text-risk-critical-fg",
    line: "border-risk-critical-line",
  },
};
