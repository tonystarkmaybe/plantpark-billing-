import { motion, useReducedMotion } from "motion/react";
import { Check } from "lucide-react";
import type { BillOut } from "@/api/billing";
import { Button } from "@/components/Button";
import { formatINR, toPaise } from "@/lib/money";

interface SuccessViewProps {
  bill: BillOut;
  onNewBill: () => void;
}

/**
 * The satisfying end-of-sale confirmation. Big check, the total in large type,
 * how it was paid, and the bill reference. "New Bill" is the one clear next
 * action. Print + WhatsApp are visible placeholders (out of scope this prompt).
 */
export function SuccessView({ bill, onNewBill }: SuccessViewProps) {
  const reduce = useReducedMotion();
  const cash = toPaise(bill.cash_amount);
  const upi = toPaise(bill.upi_amount);
  const due = bill.due_amount ? toPaise(bill.due_amount) : 0;

  const channels = [];
  if (cash > 0) channels.push(`Cash ${formatINR(cash)}`);
  if (upi > 0) channels.push(`UPI ${formatINR(upi)}`);
  if (due > 0) channels.push(`Due ${formatINR(due)}`);

  let payLabel = channels.join(" + ");
  if (!payLabel) {
    payLabel = "Paid by Cash";
  } else if (cash > 0 && upi === 0 && due === 0) {
    payLabel = "Paid by Cash";
  } else if (upi > 0 && cash === 0 && due === 0) {
    payLabel = "Paid by UPI";
  } else if (due > 0 && cash === 0 && upi === 0) {
    payLabel = `Due ${formatINR(due)}`;
  }

  const when = new Date(bill.created_at);
  const timeLabel = isNaN(when.getTime())
    ? ""
    : when.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  const billRef = `#${bill.id.slice(0, 8).toUpperCase()}`;

  return (
    <div className="flex flex-col items-center pt-6 text-center">
      <motion.div
        className="flex h-24 w-24 items-center justify-center rounded-full bg-success-soft"
        initial={reduce ? { opacity: 0 } : { scale: 0.6, opacity: 0 }}
        animate={reduce ? { opacity: 1 } : { scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 18 }}
      >
        <Check className="h-12 w-12 text-success" strokeWidth={3} />
      </motion.div>

      <h1 className="mt-5 text-2xl font-extrabold text-ink">Bill Saved</h1>

      <div className="mt-1 text-4xl font-extrabold tracking-tight text-ink">{formatINR(toPaise(bill.total))}</div>
      <div className="mt-1 text-lg font-semibold text-ink-soft">{payLabel}</div>

      {bill.customer_name && (
        <div className="mt-1 text-base text-ink-soft">For {bill.customer_name}</div>
      )}

      <div className="mt-2 text-base text-ink-soft font-medium">
        {billRef}
        {timeLabel && <> · {timeLabel}</>}
        {bill.salesperson_email && <> · Billed by: {bill.salesperson_email}</>}
      </div>

      <div className="mt-8 w-full max-w-xs space-y-3">
        <Button variant="primary" size="action" className="w-full" onClick={onNewBill}>
          New Bill
        </Button>

        {/* Placeholders — Print & WhatsApp arrive in a later prompt. */}
        <Button variant="secondary" size="action" className="w-full" disabled>
          Print receipt
          <span className="ml-2 rounded-full bg-surface-muted px-2 py-0.5 text-sm font-semibold text-ink-soft">
            Soon
          </span>
        </Button>
        <Button variant="secondary" size="action" className="w-full" disabled>
          Share on WhatsApp
          <span className="ml-2 rounded-full bg-surface-muted px-2 py-0.5 text-sm font-semibold text-ink-soft">
            Soon
          </span>
        </Button>
      </div>
    </div>
  );
}
