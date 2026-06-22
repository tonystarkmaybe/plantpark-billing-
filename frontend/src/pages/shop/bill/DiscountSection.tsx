import type { DiscountType } from "@/lib/money";
import { formatINR } from "@/lib/money";

interface DiscountSectionProps {
  type: DiscountType;
  value: string;
  discountPaise: number;
  capped: boolean;
  onChange: (type: DiscountType, value: string) => void;
}

/** Discount control: ₹ flat (default) or % toggle, with live computed amount. */
export function DiscountSection({ type, value, discountPaise, capped, onChange }: DiscountSectionProps) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-base font-semibold text-ink">Discount</span>
        <div className="flex gap-1 rounded-control bg-surface-muted p-1" role="group" aria-label="Discount type">
          {(["flat", "percent"] as DiscountType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onChange(t, value)}
              aria-pressed={type === t}
              className={[
                "h-10 w-12 rounded-control text-lg font-bold transition-colors",
                type === t ? "bg-primary-600 text-white" : "text-ink-soft",
              ].join(" ")}
            >
              {t === "flat" ? "₹" : "%"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(type, e.target.value.replace(/[^0-9.]/g, ""))}
          placeholder="0"
          className="field flex-1 text-xl font-bold"
          aria-label={type === "flat" ? "Discount amount in rupees" : "Discount percentage"}
        />
        <span className="text-lg font-semibold text-ink-soft">
          − {formatINR(discountPaise)}
        </span>
      </div>

      {capped && (
        <p className="mt-2 text-base font-semibold text-warning">
          {type === "percent"
            ? "Discount can't be more than 100% — using 100%."
            : "Discount can't be more than the subtotal — capped to the subtotal."}
        </p>
      )}
    </div>
  );
}
