import type { ReactNode } from "react";

interface SectionHeaderProps {
  title: ReactNode;
  /** Optional trailing control (e.g. a "Show retired" toggle or count). */
  action?: ReactNode;
  className?: string;
}

/** Consistent section heading: bold title on the left, optional action on the right. */
export function SectionHeader({ title, action, className = "" }: SectionHeaderProps) {
  return (
    <div className={`flex items-center justify-between gap-3 ${className}`}>
      <h2 className="text-xl font-bold tracking-tight text-ink">{title}</h2>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
