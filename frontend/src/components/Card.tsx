import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/** White rounded card on the tinted background. */
export function Card({ children, className = "", ...rest }: CardProps) {
  return (
    <div className={`card p-5 ${className}`} {...rest}>
      {children}
    </div>
  );
}

interface ListRowProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
}

/** A consistent list row: leading media, title/subtitle, trailing value/action. */
export function ListRow({ leading, title, subtitle, trailing, className = "", ...rest }: ListRowProps) {
  return (
    <div className={`list-row ${className}`} {...rest}>
      {leading && <div className="shrink-0">{leading}</div>}
      <div className="min-w-0 flex-1">
        <div className="truncate text-lg font-semibold text-ink">{title}</div>
        {subtitle && <div className="truncate text-base text-ink-soft">{subtitle}</div>}
      </div>
      {trailing && <div className="shrink-0 text-right">{trailing}</div>}
    </div>
  );
}
