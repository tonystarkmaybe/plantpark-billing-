import type { ReactNode } from "react";
import { Money } from "./Money";

type Accent = "ink" | "primary" | "cash" | "upi";

interface StatCardProps {
  label: string;
  /** Amount in paise (rendered with the Money primitive), or pass `value` for custom content. */
  paise?: number;
  value?: ReactNode;
  accent?: Accent;
  /** Animate the money value on change (default false for calm summary tiles). */
  animate?: boolean;
  className?: string;
}

const labelColor: Record<Accent, string> = {
  ink: "text-ink-soft",
  primary: "text-primary-600",
  cash: "text-cash",
  upi: "text-upi",
};

/**
 * A compact summary tile: small color-coded label over one big tabular number.
 * White card, soft lift. Used across the Sales summary and day book.
 */
export function StatCard({ label, paise, value, accent = "ink", animate = false, className = "" }: StatCardProps) {
  return (
    <div className={`rounded-card bg-surface p-4 shadow-sm ${className}`}>
      <div className={`text-sm font-semibold uppercase tracking-wide ${labelColor[accent]}`}>{label}</div>
      <div className="mt-1 text-2xl font-extrabold tracking-tight text-ink">
        {value ?? (paise !== undefined ? <Money paise={paise} animate={animate} /> : null)}
      </div>
    </div>
  );
}
