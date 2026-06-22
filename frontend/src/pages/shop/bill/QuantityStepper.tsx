interface QuantityStepperProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  /** When true, decrementing below min is allowed and calls onChange(min-1) — used to signal "remove". */
  allowZero?: boolean;
}

/** Big +/− stepper with a numeric field between. Tap targets are 48px. */
export function QuantityStepper({ value, onChange, min = 1, allowZero = false }: QuantityStepperProps) {
  const floor = allowZero ? 0 : min;
  const dec = () => onChange(Math.max(floor, value - 1));
  const inc = () => onChange(value + 1);

  return (
    <div className="inline-flex items-stretch overflow-hidden rounded-control border border-border-strong bg-white shadow-sm">
      <button
        type="button"
        onClick={dec}
        disabled={value <= floor}
        className="flex h-12 w-12 items-center justify-center text-2xl font-bold text-ink-soft
                   transition-colors duration-gentle hover:bg-surface-muted active:bg-surface-sunken
                   disabled:opacity-35"
        aria-label="Decrease quantity"
      >
        −
      </button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onChange={(e) => {
          const n = parseInt(e.target.value.replace(/[^0-9]/g, ""), 10);
          onChange(Number.isFinite(n) ? Math.max(floor, n) : floor);
        }}
        className="tnum h-12 w-14 border-x border-border text-center text-xl font-extrabold text-ink focus:outline-none"
        aria-label="Quantity"
      />
      <button
        type="button"
        onClick={inc}
        className="flex h-12 w-12 items-center justify-center text-2xl font-bold text-primary-600
                   transition-colors duration-gentle hover:bg-primary-50 active:bg-primary-100"
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}
