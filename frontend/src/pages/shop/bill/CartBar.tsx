import { formatINR } from "@/lib/money";

interface CartBarProps {
  itemCount: number;
  totalPaise: number;
  onOpen: () => void;
}

/**
 * Always-visible bar pinned just above the bottom navigation. Shows how many
 * items and the running total; tapping it expands the full cart. Hidden when
 * the cart is empty.
 */
export function CartBar({ itemCount, totalPaise, onOpen }: CartBarProps) {
  if (itemCount === 0) return null;
  const unit = itemCount === 1 ? "item" : "items";

  return (
    <div
      className="fixed inset-x-0 z-30 px-4"
      style={{ bottom: "calc(64px + env(safe-area-inset-bottom))" }}
    >
      <button
        type="button"
        onClick={onOpen}
        className="mx-auto flex h-16 w-full max-w-screen-sm items-center justify-between rounded-card
                   bg-primary-600 px-5 text-white shadow-card-lg transition-transform active:scale-[0.99]"
      >
        <span className="flex items-center gap-3">
          <span className="inline-flex h-8 min-w-[32px] items-center justify-center rounded-full bg-white/20 px-2 text-base font-bold">
            {itemCount}
          </span>
          <span className="text-lg font-bold">View cart · {itemCount} {unit}</span>
        </span>
        <span className="text-xl font-extrabold">{formatINR(totalPaise)}</span>
      </button>
    </div>
  );
}
