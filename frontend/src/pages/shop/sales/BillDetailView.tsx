import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronLeft } from "lucide-react";
import { fetchBillDetail, deleteBill, type BillDetail } from "@/api/sales";
import { friendlyError } from "@/api/client";
import { Spinner } from "@/components/Spinner";
import { Button } from "@/components/Button";
import { BillReceipt } from "./BillReceipt";
import { useAuth } from "@/store/auth";
import { EditBillSheet } from "./EditBillSheet";
import { ConfirmDialog } from "@/components/ConfirmDialog";

interface BillDetailViewProps {
  billId: string | null;
  onClose: () => void;
  onUpdated?: () => void;
}

/**
 * Full-screen bill detail that slides in over the Sales tab. Self-contained:
 * fetches the bill, renders the shared receipt, and hosts the (placeholder)
 * Print / WhatsApp actions that later prompts will wire up.
 */
export function BillDetailView({ billId, onClose, onUpdated }: BillDetailViewProps) {
  const reduce = useReducedMotion();
  const [bill, setBill] = useState<BillDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const user = useAuth((s) => s.user);
  const canEdit = user?.role === "shop_owner" || user?.role === "admin";
  const canDelete = user?.role === "admin";

  useEffect(() => {
    if (!billId) return;
    let cancelled = false;
    setBill(null);
    setError(null);
    setNotFound(false);
    setLoading(true);
    (async () => {
      try {
        const data = await fetchBillDetail(billId);
        if (!cancelled) setBill(data);
      } catch (e) {
        if (cancelled) return;
        const status = (e as { response?: { status?: number } })?.response?.status;
        if (status === 404) setNotFound(true);
        else setError(friendlyError(e, "Couldn't load this bill."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [billId]);

  // Close on Escape.
  useEffect(() => {
    if (!billId) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [billId, onClose]);

  const handleBillUpdated = (updatedBill: BillDetail) => {
    setBill(updatedBill);
    if (onUpdated) onUpdated();
  };

  const handleDelete = async () => {
    if (!billId) return;
    setDeleting(true);
    try {
      await deleteBill(billId);
      setDeleteConfirm(false);
      if (onUpdated) onUpdated();
      onClose();
    } catch (e) {
      alert(friendlyError(e, "Failed to delete the bill."));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AnimatePresence>
      {billId && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col bg-surface-muted"
          initial={reduce ? { opacity: 0 } : { x: "100%" }}
          animate={reduce ? { opacity: 1 } : { x: 0 }}
          exit={reduce ? { opacity: 0 } : { x: "100%" }}
          transition={{ type: "tween", duration: 0.22, ease: "easeOut" }}
          role="dialog"
          aria-modal="true"
          aria-label="Bill detail"
        >
          {/* Top bar */}
          <div className="flex items-center gap-2 border-b border-border bg-surface px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <button
              type="button"
              onClick={onClose}
              className="flex h-tap items-center gap-1 rounded-control px-3 text-base font-semibold text-primary-700 hover:bg-surface-muted"
            >
              <ChevronLeft className="h-5 w-5" /> Back
            </button>
            <h1 className="text-lg font-bold text-ink">Bill</h1>
          </div>

          {/* Body */}
          <div className="mx-auto w-full max-w-screen-sm flex-1 overflow-y-auto px-4 py-5">
            {loading ? (
              <div className="flex justify-center py-20">
                <Spinner className="h-8 w-8 text-primary-600" />
              </div>
            ) : notFound ? (
              <div className="py-20 text-center">
                <p className="text-xl font-bold text-ink">Bill not found</p>
                <p className="mt-1 text-base text-ink-soft">It may have been removed.</p>
                <Button variant="secondary" size="action" className="mt-6 max-w-xs" onClick={onClose}>
                  Back to Sales
                </Button>
              </div>
            ) : error ? (
              <div className="py-20 text-center">
                <p className="text-base font-semibold text-danger">{error}</p>
                <Button variant="secondary" size="action" className="mt-4 max-w-xs" onClick={onClose}>
                  Back to Sales
                </Button>
              </div>
            ) : bill ? (
              <div className="rounded-card border border-border bg-surface p-5 shadow-card">
                <BillReceipt bill={bill} />
              </div>
            ) : null}
          </div>

          {/* Actions */}
          {bill && !loading && (
            <div className="border-t border-border bg-surface px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <div className="mx-auto flex flex-col w-full max-w-screen-sm gap-3">
                {(canEdit || canDelete) && (
                  <div className="flex gap-3">
                    {canEdit && (
                      <Button
                        variant="primary"
                        size="action"
                        onClick={() => setEditOpen(true)}
                        className={`${canDelete ? "flex-1" : "w-full"} font-bold`}
                      >
                        Edit Bill
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="action"
                        onClick={() => setDeleteConfirm(true)}
                        className={`${canEdit ? "flex-1" : "w-full"} font-bold !text-danger hover:!bg-danger-soft border-2 border-danger/20 hover:border-danger/30`}
                      >
                        Delete Bill
                      </Button>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="secondary" size="action" disabled>
                    Print
                    <span className="ml-1 rounded-full bg-surface-muted px-2 py-0.5 text-sm font-semibold text-ink-soft">
                      Soon
                    </span>
                  </Button>
                  <Button variant="secondary" size="action" disabled>
                    WhatsApp
                    <span className="ml-1 rounded-full bg-surface-muted px-2 py-0.5 text-sm font-semibold text-ink-soft">
                      Soon
                    </span>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {bill && (
            <EditBillSheet
              open={editOpen}
              onClose={() => setEditOpen(false)}
              bill={bill}
              onUpdated={handleBillUpdated}
            />
          )}

          {bill && (
            <ConfirmDialog
              open={deleteConfirm}
              title="Delete Bill"
              body="Are you sure you want to delete this bill? This action is permanent and cannot be undone."
              confirmLabel={deleting ? "Deleting..." : "Delete"}
              destructive
              onConfirm={handleDelete}
              onCancel={() => !deleting && setDeleteConfirm(false)}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
