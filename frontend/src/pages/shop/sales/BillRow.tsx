import type { BillListItem } from "@/api/sales";
import { formatINR, toPaise } from "@/lib/money";
import { formatTime, formatDay, isoDayOf, todayISO } from "@/lib/datetime";
import { PaymentBadge } from "./billBadges";

interface BillRowProps {
  bill: BillListItem;
  onOpen: (id: string) => void;
}

/** One large, well-separated, tappable history row. */
export function BillRow({ bill, onOpen }: BillRowProps) {
  const isToday = isoDayOf(bill.created_at) === todayISO();
  const when = isToday ? formatTime(bill.created_at) : `${formatDay(bill.created_at)}, ${formatTime(bill.created_at)}`;
  const customer = bill.customer_name?.trim() || "Walk-in";
  const itemLabel = `${bill.item_count} ${bill.item_count === 1 ? "item" : "items"}`;

  return (
    <button
      type="button"
      onClick={() => onOpen(bill.id)}
      className="flex w-full items-center gap-3 rounded-card border border-border bg-surface p-4 text-left
                 shadow-card transition-transform duration-gentle active:scale-[0.99] hover:border-border-strong"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-ink">{when}</span>
          {bill.is_edited && (
            <span className="inline-flex items-center rounded-full bg-warning-soft px-1.5 py-0.5 text-xs font-semibold text-warning">
              Edited
            </span>
          )}
        </div>
        <div className="mt-0.5 truncate text-base text-ink-soft">
          {customer} · {itemLabel}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-xl font-extrabold text-ink">{formatINR(toPaise(bill.total))}</div>
        <PaymentBadge method={bill.payment_method} />
      </div>
    </button>
  );
}
