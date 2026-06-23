import { formatINR } from "@/lib/money";
import { Plus, Scan } from "lucide-react";

interface CartBarProps {
  itemCount: number;
  totalPaise: number;
  onOpenCheckout: () => void;
  onOpenQuickAdd: () => void;
  onOpenScanner: () => void;
}

export function CartBar({
  itemCount,
  totalPaise,
  onOpenCheckout,
  onOpenQuickAdd,
  onOpenScanner,
}: CartBarProps) {
  const unit = itemCount === 1 ? "item" : "items";
  const hasItems = itemCount > 0;

  // Calculate dynamic bottom position for the floating buttons.
  // 64px (bottom nav) + env(safe-area-inset-bottom)
  // If checkout bar is open, add 80px (checkout bar height).
  const floatingBottom = hasItems
    ? "calc(64px + 80px + 12px + env(safe-area-inset-bottom))"
    : "calc(64px + 16px + env(safe-area-inset-bottom))";

  return (
    <>
      {/* Floating Action Buttons */}
      <div
        className="fixed inset-x-0 z-30 px-4 flex justify-center gap-3 pointer-events-none transition-all duration-300"
        style={{ bottom: floatingBottom }}
      >
        <button
          type="button"
          onClick={onOpenQuickAdd}
          className="pointer-events-auto flex h-11 items-center gap-1.5 rounded-full bg-slate-900 px-4
                     text-base font-bold text-white shadow-card-lg transition-transform active:scale-95 hover:bg-slate-800"
        >
          <Plus className="h-4.5 w-4.5" />
          Quick Add
        </button>

        <button
          type="button"
          onClick={onOpenScanner}
          className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-slate-900
                     text-white shadow-card-lg transition-transform active:scale-95 hover:bg-slate-800"
          aria-label="Scan barcode"
        >
          <Scan className="h-5 w-5" />
        </button>
      </div>

      {/* Checkout Summary Bar */}
      {hasItems && (
        <div
          className="fixed inset-x-0 z-20 border-t border-border bg-white shadow-[0_-4px_16px_rgba(0,0,0,0.04)]
                     pb-[env(safe-area-inset-bottom)]"
          style={{ bottom: "64px" }}
        >
          <div className="mx-auto flex h-20 max-w-screen-sm items-center justify-between px-5">
            {/* Left Info */}
            <div className="space-y-0.5">
              <span className="tnum text-2xl font-extrabold text-ink">
                {formatINR(totalPaise)}
              </span>
              <p className="text-xs font-semibold text-ink-soft">
                {itemCount} {unit} · {itemCount} qty.
              </p>
            </div>

            {/* Right Action */}
            <button
              type="button"
              onClick={onOpenCheckout}
              className="flex h-12 items-center justify-center rounded-xl bg-emerald-500 px-8 text-lg
                         font-bold text-white shadow-btn transition-all duration-gentle hover:bg-emerald-600
                         active:scale-[0.98]"
            >
              Preview
            </button>
          </div>
        </div>
      )}
    </>
  );
}
