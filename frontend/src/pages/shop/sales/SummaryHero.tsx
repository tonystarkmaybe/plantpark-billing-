import type { BillSummary } from "@/api/sales";
import { formatINR, toPaise } from "@/lib/money";
import { friendlyDayLabel } from "@/lib/datetime";
import { Spinner } from "@/components/Spinner";
import { Button } from "@/components/Button";
import { DateSelector } from "./DateSelector";

interface SummaryHeroProps {
  date: string;
  onDateChange: (ymd: string) => void;
  summary: BillSummary | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

/** Today's takings: one big number, a count, and a calm 2×2 breakdown. */
export function SummaryHero({ date, onDateChange, summary, loading, error, onRetry }: SummaryHeroProps) {
  const label = friendlyDayLabel(date);
  const salesLabel = label === "Today" ? "Today's Sales" : `Sales · ${label}`;

  return (
    <section className="rounded-card border border-border bg-surface p-5 shadow-card">
      <DateSelector value={date} onChange={onDateChange} />

      <div className="mt-5 min-h-[7rem]">
        {loading ? (
          <div className="flex h-28 items-center justify-center">
            <Spinner className="h-8 w-8 text-primary-600" />
          </div>
        ) : error ? (
          <div className="py-6 text-center">
            <p className="text-base font-semibold text-danger">{error}</p>
            <Button variant="secondary" size="tap" className="mt-3" onClick={onRetry}>
              Try again
            </Button>
          </div>
        ) : summary && summary.bill_count === 0 ? (
          <div className="py-8 text-center">
            <p className="text-xl font-bold text-ink">No sales {label === "Today" ? "yet today" : "on this day"}</p>
            <p className="mt-1 text-base text-ink-soft">When you make a bill, it'll show up here.</p>
          </div>
        ) : summary ? (
          <>
            <p className="text-base font-semibold text-ink-soft">{salesLabel}</p>
            <p className="mt-1 text-5xl font-extrabold tracking-tight text-ink">
              {formatINR(toPaise(summary.total_sales))}
            </p>
            <p className="mt-1 text-lg font-semibold text-ink-soft">
              {summary.bill_count} {summary.bill_count === 1 ? "bill" : "bills"}
            </p>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <Stat label="Cash" value={formatINR(toPaise(summary.cash_total))} accent="cash" />
              <Stat label="UPI" value={formatINR(toPaise(summary.upi_total))} accent="upi" />
              <Stat label="Due" value={formatINR(toPaise(summary.due_total || "0"))} accent="due" />
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: "cash" | "upi" | "due" }) {
  const labelColor =
    accent === "cash"
      ? "text-cash"
      : accent === "upi"
        ? "text-upi"
        : accent === "due"
          ? "text-danger"
          : "text-ink-soft";
  return (
    <div className="rounded-control bg-surface-muted px-4 py-3">
      <div className={`text-base font-semibold ${labelColor}`}>{label}</div>
      <div className="mt-0.5 text-xl font-extrabold text-ink">{value}</div>
    </div>
  );
}
