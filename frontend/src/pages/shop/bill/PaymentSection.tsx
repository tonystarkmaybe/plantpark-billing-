import { useEffect } from "react";
import { Check } from "lucide-react";
import type { PayMethod } from "@/store/billing";
import { formatINR, fromPaise, toPaise } from "@/lib/money";
import { useAuth } from "@/store/auth";

interface PaymentSectionProps {
  totalPaise: number;
  method: PayMethod | null;
  cash: string;
  upi: string;
  due: string;
  setMethod: (m: PayMethod) => void;
  setCash: (v: string) => void;
  setUpi: (v: string) => void;
  setDue: (v: string) => void;
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
  due,
  setMethod,
  setCash,
  setUpi,
  setDue,
}: PaymentSectionProps) {
  // Keep one-tap methods exact as the total changes (e.g. discount edited later).
  useEffect(() => {
    if (method === "cash") {
      setCash(fromPaise(totalPaise));
      setUpi("0");
      setDue("0");
    } else if (method === "upi") {
      setCash("0");
      setUpi(fromPaise(totalPaise));
      setDue("0");
    } else if (method === "due") {
      setCash("0");
      setUpi("0");
      setDue(fromPaise(totalPaise));
    }
    // Intentionally not depending on cash/upi/due — only react to total/method.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPaise, method]);

  const select = (m: PayMethod) => {
    setMethod(m);
    if (m === "split") {
      setCash(fromPaise(totalPaise));
      setUpi("0");
      setDue("0");
    }
  };

  const editCash = (v: string) => {
    setCash(v);
    const remaining = Math.max(0, totalPaise - toPaise(v) - toPaise(due));
    setUpi(fromPaise(remaining));
  };
  const editUpi = (v: string) => {
    setUpi(v);
    const remaining = Math.max(0, totalPaise - toPaise(v) - toPaise(due));
    setCash(fromPaise(remaining));
  };
  const editDue = (v: string) => {
    setDue(v);
    const remaining = Math.max(0, totalPaise - toPaise(cash) - toPaise(v));
    setUpi(fromPaise(remaining));
  };

  const sumPaise = toPaise(cash) + toPaise(upi) + toPaise(due);
  const balanced = sumPaise === totalPaise;

  const user = useAuth((s) => s.user);
  const upiId = user?.business_upi;
  const businessName = user?.business_name || user?.shop_name || "Nursery";

  const upiAmountPaise = method === "upi" ? totalPaise : (method === "split" ? toPaise(upi) : 0);
  const showQrCode = upiAmountPaise > 0;

  const amountInRupees = (upiAmountPaise / 100).toFixed(2);
  const upiUrl = upiId
    ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(businessName)}&am=${amountInRupees}&cu=INR`
    : "";
  const qrImageUrl = upiUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiUrl)}`
    : "";

  return (
    <div>
      <span className="mb-2 block text-base font-semibold text-ink">Payment</span>
      <div className="grid grid-cols-4 gap-2">
        <MethodButton active={method === "cash"} accent="cash" onClick={() => select("cash")}>
          Cash
        </MethodButton>
        <MethodButton active={method === "upi"} accent="upi" onClick={() => select("upi")}>
          UPI
        </MethodButton>
        <MethodButton active={method === "due"} accent="neutral" onClick={() => select("due")}>
          Due
        </MethodButton>
        <MethodButton active={method === "split"} accent="neutral" onClick={() => select("split")}>
          Split
        </MethodButton>
      </div>

      {method === "split" && (
        <div className="mt-4 space-y-3">
          <SplitField label="Cash" accent="cash" value={cash} onChange={editCash} />
          <SplitField label="UPI" accent="upi" value={upi} onChange={editUpi} />
          <SplitField label="Due" accent="due" value={due} onChange={editDue} />
          <div
            className={[
              "flex items-center justify-between rounded-control px-4 py-3 text-base font-semibold",
              balanced ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
            ].join(" ")}
            role="status"
          >
            <span className="flex items-center gap-1.5">
              {balanced && <Check className="h-5 w-5" strokeWidth={3} />}
              {balanced ? "Balances to total" : "Cash + UPI + Due must equal the total"}
            </span>
            <span>
              {formatINR(sumPaise)} / {formatINR(totalPaise)}
            </span>
          </div>
        </div>
      )}

      {showQrCode && (
        <div className="mt-4 rounded-card border border-border bg-surface p-4 shadow-card flex flex-col items-center text-center">
          {upiId ? (
            <>
              <div className="mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-upi">UPI Payment QR</span>
              </div>
              <div className="relative mb-3 flex h-48 w-48 items-center justify-center rounded-2xl border-2 border-border bg-white p-2 shadow-inner overflow-hidden">
                <img
                  src={qrImageUrl}
                  alt={`UPI QR Code for ${formatINR(upiAmountPaise)}`}
                  className="h-full w-full object-contain"
                />
                <div className="absolute left-0 right-0 h-0.5 bg-upi opacity-40 shadow-[0_0_8px_#2F6FB0] animate-scan" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xl font-extrabold text-ink">{formatINR(upiAmountPaise)}</p>
                <p className="text-sm font-semibold text-ink-soft">{businessName}</p>
                <p className="text-xs font-medium text-ink-faint tnum">{upiId}</p>
              </div>
            </>
          ) : (
            <div className="py-4 px-2">
              <p className="text-base font-semibold text-danger">UPI Not Configured</p>
              <p className="mt-1 text-sm text-ink-soft">
                UPI ID is missing. Please ask your administrator to configure business details for {businessName}.
              </p>
            </div>
          )}
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
  accent: "cash" | "upi" | "due";
  value: string;
  onChange: (v: string) => void;
}) {
  const accentClass =
    accent === "cash"
      ? "text-cash"
      : accent === "upi"
        ? "text-upi"
        : "text-danger";
  return (
    <div className="flex items-center gap-3">
      <span className={`w-16 text-lg font-bold ${accentClass}`}>{label}</span>
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
