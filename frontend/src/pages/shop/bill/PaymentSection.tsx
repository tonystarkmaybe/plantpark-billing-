import { useEffect } from "react";
import { Check } from "lucide-react";
import type { PayMethod } from "@/store/billing";
import { formatINR, fromPaise, toPaise } from "@/lib/money";

interface PaymentSectionProps {
  totalPaise: number;
  method: PayMethod | null;
  cash: string;
  upi: string;
  setMethod: (m: PayMethod) => void;
  setCash: (v: string) => void;
  setUpi: (v: string) => void;
}

/**
 * CASH / UPI / SPLIT. One-tap CASH or UPI puts the whole total in one bucket.
 * SPLIT shows two fields that auto-fill each other so they always balance with
 * minimal typing; a manual imbalance is flagged and blocks checkout upstream.
 */
export function PaymentSection({
  totalPaise,
  method,
  cash,
  upi,
  setMethod,
  setCash,
  setUpi,
}: PaymentSectionProps) {
  // Keep one-tap methods exact as the total changes (e.g. discount edited later).
  useEffect(() => {
    if (method === "cash") {
      setCash(fromPaise(totalPaise));
      setUpi("0");
    } else if (method === "upi") {
      setCash("0");
      setUpi(fromPaise(totalPaise));
    }
    // Intentionally not depending on cash/upi — only react to total/method.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPaise, method]);

  const select = (m: PayMethod) => {
    setMethod(m);
    if (m === "split") {
      setCash(fromPaise(totalPaise));
      setUpi("0");
    }
  };

  const editCash = (v: string) => {
    setCash(v);
    setUpi(fromPaise(Math.max(0, totalPaise - toPaise(v))));
  };
  const editUpi = (v: string) => {
    setUpi(v);
    setCash(fromPaise(Math.max(0, totalPaise - toPaise(v))));
  };

  const sumPaise = toPaise(cash) + toPaise(upi);
  const balanced = sumPaise === totalPaise;

  return (
    <div>
      <span className="mb-2 block text-base font-semibold text-ink">Payment</span>
      <div className="grid grid-cols-3 gap-2">
        <MethodButton active={method === "cash"} accent="cash" onClick={() => select("cash")}>
          Cash
        </MethodButton>
        <MethodButton active={method === "upi"} accent="upi" onClick={() => select("upi")}>
          UPI
        </MethodButton>
        <MethodButton active={method === "split"} accent="neutral" onClick={() => select("split")}>
          Split
        </MethodButton>
      </div>

      {method === "split" && (
        <div className="mt-4 space-y-3">
          <SplitField label="Cash" accent="cash" value={cash} onChange={editCash} />
          <SplitField label="UPI" accent="upi" value={upi} onChange={editUpi} />
          <div
            className={[
              "flex items-center justify-between rounded-control px-4 py-3 text-base font-semibold",
              balanced ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
            ].join(" ")}
            role="status"
          >
            <span className="flex items-center gap-1.5">
              {balanced && <Check className="h-5 w-5" strokeWidth={3} />}
              {balanced ? "Balances to total" : "Cash + UPI must equal the total"}
            </span>
            <span>
              {formatINR(sumPaise)} / {formatINR(totalPaise)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function MethodButton({
  active,
  accent,
  onClick,
  children,
}: {
  active: boolean;
  accent: "cash" | "upi" | "neutral";
  onClick: () => void;
  children: React.ReactNode;
}) {
  const accentActive =
    accent === "cash"
      ? "bg-cash text-white border-cash"
      : accent === "upi"
        ? "bg-upi text-white border-upi"
        : "bg-ink text-white border-ink";
  const accentIdle =
    accent === "cash"
      ? "border-border text-cash hover:border-cash"
      : accent === "upi"
        ? "border-border text-upi hover:border-upi"
        : "border-border text-ink hover:border-ink";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        "h-14 rounded-control border-2 text-lg font-bold transition-colors",
        active ? accentActive : accentIdle,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function SplitField({
  label,
  accent,
  value,
  onChange,
}: {
  label: string;
  accent: "cash" | "upi";
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className={`w-16 text-lg font-bold ${accent === "cash" ? "text-cash" : "text-upi"}`}>{label}</span>
      <span className="text-xl font-bold text-ink">₹</span>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ""))}
        className="field flex-1 text-xl font-bold"
        aria-label={`${label} amount`}
      />
    </div>
  );
}
