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
            onChange={(e) => onChange({ ...value, phone: e.target.value })}
            placeholder="Phone number for the receipt"
            className="field"
            aria-label="Customer phone number for the receipt"
            autoComplete="off"
          />
          <p className="mt-1.5 text-sm text-ink-soft">
            We'll only use this number to send this customer their bill.
          </p>
        </div>
      </div>
    </div>
  );
}
