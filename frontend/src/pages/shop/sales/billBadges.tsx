import type { PaymentMethod } from "@/api/sales";

/** Small Cash / UPI / Split indicator using the established accent colours. */
export function PaymentBadge({ method }: { method: PaymentMethod }) {
  const map = {
    cash: { label: "Cash", cls: "text-cash" },
    upi: { label: "UPI", cls: "text-upi" },
    split: { label: "Split", cls: "text-ink-soft" },
  }[method];
  return <span className={`text-sm font-semibold ${map.cls}`}>{map.label}</span>;
}
