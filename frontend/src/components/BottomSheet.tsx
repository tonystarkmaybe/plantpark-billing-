import { useEffect } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  /** Sticky footer area (e.g. a primary action). */
  footer?: ReactNode;
}

/**
 * Reusable bottom sheet: dim backdrop + panel that slides up from the bottom.
 * Phone-first, max height capped with internal scroll. Respects reduced motion.
 */
export function BottomSheet({ open, onClose, title, children, footer }: BottomSheetProps) {
  const reduce = useReducedMotion();

  // Lock background scroll while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div
            className="absolute inset-0 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
          />
          <motion.div
            className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[88dvh] w-full max-w-screen-sm
                       flex-col rounded-t-card bg-surface shadow-card-lg
                       pb-[env(safe-area-inset-bottom)]"
            role="dialog"
            aria-modal="true"
            initial={reduce ? { opacity: 0 } : { y: "100%" }}
            animate={reduce ? { opacity: 1 } : { y: 0 }}
            exit={reduce ? { opacity: 0 } : { y: "100%" }}
            transition={{ type: "tween", duration: 0.22, ease: "easeOut" }}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-xl font-bold text-ink">{title}</h2>
              <button
                onClick={onClose}
                className="h-tap min-w-[48px] rounded-control px-3 text-base font-semibold text-ink-soft hover:bg-surface-muted"
                aria-label="Close"
              >
                Close
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

            {footer && <div className="border-t border-border px-5 py-4">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
