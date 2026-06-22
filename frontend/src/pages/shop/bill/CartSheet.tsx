import { BottomSheet } from "@/components/BottomSheet";
import { Button } from "@/components/Button";
import { formatINR, toPaise } from "@/lib/money";
import type { Totals } from "@/lib/money";
import { useBilling, type CartLine } from "@/store/billing";
import { QuantityStepper } from "./QuantityStepper";
import { DiscountSection } from "./DiscountSection";
import { CustomerSection } from "./CustomerSection";
import { PaymentSection } from "./PaymentSection";

interface CartSheetProps {
  open: boolean;
  onClose: () => void;
  totals: Totals;
  /** Save handler (page owns the API call + idempotency key). */
  onCheckout: () => void;
  saving: boolean;
  errorMsg: string | null;
}

/**
 * The full cart: each line shows an editable per-unit price (pre-filled from the
 * product, adjustable for size) and a quantity stepper, followed by discount,
 * customer, and payment, topped off by one big sticky "Save Bill · ₹X" action.
 * The cart is preserved on recoverable errors so the user can simply retry.
 */
export function CartSheet({ open, onClose, totals, onCheckout, saving, errorMsg }: CartSheetProps) {
  const {
    lines,
    setQuantity,
    setLinePrice,
    discountType,
    discountValue,
    setDiscount,
    payMethod,
    cash,
    upi,
    setPayMethod,
    setCash,
    setUpi,
    customer,
    setCustomer,
  } = useBilling();

  const sumPaise = toPaise(cash) + toPaise(upi);
  const balanced = sumPaise === totals.totalPaise;
  const canSave = lines.length > 0 && payMethod !== null && balanced && !saving;

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="New bill"
      footer={
        <div className="space-y-3">
          {errorMsg && (
            <p className="rounded-control bg-danger-soft px-4 py-3 text-base font-semibold text-danger" role="alert">
              {errorMsg}
            </p>
          )}
          <Button
            variant="primary"
            size="action"
            className="w-full"
            disabled={!canSave}
            loading={saving}
            loadingLabel="Saving bill…"
            onClick={onCheckout}
          >
            Save Bill · {formatINR(totals.totalPaise)}
          </Button>
          {!balanced && lines.length > 0 && payMethod !== null && (
            <p className="text-center text-base font-semibold text-ink-soft">
              Cash + UPI must add up to {formatINR(totals.totalPaise)}.
            </p>
          )}
        </div>
      }
    >
      {lines.length === 0 ? (
        <p className="py-10 text-center text-base text-ink-soft">
          Your cart is empty. Tap products to add them.
        </p>
      ) : (
        <div className="space-y-6">
          {/* Line items */}
          <ul className="divide-y divide-border">
            {lines.map((l) => (
              <LineRow
                key={l.product_id}
                line={l}
                onPrice={(v) => setLinePrice(l.product_id, v)}
                onQty={(n) => setQuantity(l.product_id, n)}
              />
            ))}
          </ul>

          {/* Totals */}
          <div className="space-y-1 rounded-control bg-surface-muted px-4 py-3">
            <Row label="Subtotal" value={formatINR(totals.subtotalPaise)} />
            {totals.discountPaise > 0 && (
              <Row label="Discount" value={`− ${formatINR(totals.discountPaise)}`} />
            )}
            <div className="flex items-center justify-between pt-1 text-xl font-extrabold text-ink">
              <span>Total</span>
              <span>{formatINR(totals.totalPaise)}</span>
            </div>
          </div>

          <DiscountSection
            type={discountType}
            value={discountValue}
            discountPaise={totals.discountPaise}
            capped={totals.discountCapped}
            onChange={setDiscount}
          />

          <CustomerSection value={customer} onChange={setCustomer} />

          <PaymentSection
            totalPaise={totals.totalPaise}
            method={payMethod}
            cash={cash}
            upi={upi}
            setMethod={setPayMethod}
            setCash={setCash}
            setUpi={setUpi}
          />
        </div>
      )}
    </BottomSheet>
  );
}

/** One cart line: name, editable unit price, quantity stepper, and line total. */
function LineRow({
  line,
  onPrice,
  onQty,
}: {
  line: CartLine;
  onPrice: (value: string) => void;
  onQty: (quantity: number) => void;
}) {
  const linePaise = toPaise(line.unit_price) * line.quantity;
  return (
    <li className="py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 text-lg font-semibold text-ink">{line.product_name}</div>
        <div className="shrink-0 text-lg font-bold text-ink">{formatINR(linePaise)}</div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-3">
        {/* Editable per-unit price (size-based pricing is normal) */}
        <label className="flex items-center gap-1 rounded-control border-2 border-border bg-white px-3 py-1.5">
          <span className="text-lg font-bold text-ink-soft">₹</span>
          <input
            type="text"
            inputMode="decimal"
            value={line.unit_price}
            onChange={(e) => onPrice(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="0.00"
            className="w-20 bg-transparent text-lg font-bold text-ink outline-none"
            aria-label={`Price for ${line.product_name}`}
          />
          <span className="text-base font-medium text-ink-faint">each</span>
        </label>
        <QuantityStepper value={line.quantity} onChange={onQty} allowZero />
      </div>
    </li>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-base text-ink-soft">
      <span>{label}</span>
      <span className="font-semibold text-ink">{value}</span>
    </div>
  );
}
