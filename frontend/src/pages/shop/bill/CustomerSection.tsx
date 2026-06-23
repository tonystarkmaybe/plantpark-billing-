import type { CustomerInput } from "@/store/billing";

interface CustomerSectionProps {
  value: CustomerInput;
  onChange: (c: CustomerInput) => void;
}

/**
 * Customer details, entered fresh on each bill and optional. Name + phone only;
 * the phone field is clearly labeled for its purpose (giving the number is the
 * customer's consent to receive receipts there).
 */
export function CustomerSection({ value, onChange }: CustomerSectionProps) {
  return (
    <div>
      <span className="mb-2 block text-base font-semibold text-ink">
        Customer <span className="font-normal text-ink-soft">(optional)</span>
      </span>
      <div className="space-y-3">
        <input
          type="text"
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          placeholder="Customer name"
          className="field"
          aria-label="Customer name"
          autoComplete="off"
        />
        <div>
          <input
            type="tel"
            inputMode="tel"
            value={value.phone}
            onChange={(e) => onChange({ ...value, phone: e.target.value.replace(/\D/g, "").substring(0, 10) })}
            placeholder="10-digit phone number"
            className={`field ${value.phone && value.phone.length < 10 ? "border-danger focus:border-danger focus:ring-danger/20" : ""}`}
            aria-label="Customer phone number for the receipt"
            autoComplete="off"
          />
          {value.phone && value.phone.length < 10 ? (
            <p className="mt-1.5 text-sm font-semibold text-danger">
              Phone number must be exactly 10 digits.
            </p>
          ) : (
            <p className="mt-1.5 text-sm text-ink-soft">
              We'll only use this number to send this customer their bill.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
