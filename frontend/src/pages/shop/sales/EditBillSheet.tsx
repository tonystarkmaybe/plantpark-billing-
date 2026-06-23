import { useState, useEffect } from "react";
import { BottomSheet } from "@/components/BottomSheet";
import { Button } from "@/components/Button";
import { TextInput } from "@/components/TextInput";
import { editBill, type BillDetail } from "@/api/sales";
import { friendlyError } from "@/api/client";
import { AlertCircle } from "lucide-react";

interface EditBillSheetProps {
  open: boolean;
  onClose: () => void;
  bill: BillDetail;
  onUpdated: (updatedBill: BillDetail) => void;
}

export function EditBillSheet({ open, onClose, bill, onUpdated }: EditBillSheetProps) {
  const [cash, setCash] = useState("");
  const [upi, setUpi] = useState("");
  const [due, setDue] = useState("");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize values when sheet is opened or bill changes
  useEffect(() => {
    if (open && bill) {
      setCash(bill.cash_amount);
      setUpi(bill.upi_amount);
      setDue(bill.due_amount);
      setRemarks(bill.remarks || "");
      setError(null);
    }
  }, [open, bill]);

  const billTotal = parseFloat(bill.total) || 0;
  const cashNum = parseFloat(cash) || 0;
  const upiNum = parseFloat(upi) || 0;
  const dueNum = parseFloat(due) || 0;
  const currentSum = cashNum + upiNum + dueNum;
  const difference = billTotal - currentSum;
  const isBalanced = Math.abs(difference) < 0.01;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBalanced) {
      setError(`Payment amounts do not match the total bill amount of ₹${bill.total}`);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const updated = await editBill(bill.id, {
        cash_amount: cashNum,
        upi_amount: upiNum,
        due_amount: dueNum,
        remarks: remarks.trim() || null,
      });
      onUpdated(updated);
      onClose();
    } catch (err) {
      setError(friendlyError(err, "Failed to update bill payments."));
    } finally {
      setLoading(false);
    }
  };

  const footer = (
    <div className="flex gap-3">
      <Button
        variant="secondary"
        size="action"
        onClick={onClose}
        disabled={loading}
        className="flex-1"
        type="button"
      >
        Cancel
      </Button>
      <Button
        variant="primary"
        size="action"
        onClick={handleSubmit}
        disabled={loading || !isBalanced}
        className="flex-1 font-bold"
        type="submit"
      >
        {loading ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  );

  return (
    <BottomSheet open={open} onClose={onClose} title="Edit Payment Split" footer={footer}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-start gap-2.5 rounded-control bg-danger-soft p-3.5 text-danger" role="alert">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <p className="text-base font-semibold leading-snug">{error}</p>
          </div>
        )}

        <div className="rounded-card border border-border bg-surface-muted p-4">
          <div className="flex justify-between text-base font-semibold text-ink-soft">
            <span>Bill Total:</span>
            <span>₹{bill.total}</span>
          </div>
          <div className="mt-2 flex justify-between text-base font-semibold text-ink-soft">
            <span>Current Split Sum:</span>
            <span className={isBalanced ? "text-primary-700 font-bold" : "text-danger font-bold"}>
              ₹{currentSum.toFixed(2)}
            </span>
          </div>
          <div className="mt-2.5 border-t border-border pt-2 flex justify-between text-base font-bold">
            <span>Difference / Remaining:</span>
            <span className={isBalanced ? "text-primary-700" : "text-danger"}>
              {isBalanced ? "✓ Balanced" : `₹${difference.toFixed(2)}`}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <TextInput
              label="Cash Amount (₹)"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={cash}
              onChange={(e) => setCash(e.target.value)}
              placeholder="0.00"
              disabled={loading}
              className="w-full text-lg font-semibold"
            />
          </div>
          <div>
            <TextInput
              label="UPI Amount (₹)"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={upi}
              onChange={(e) => setUpi(e.target.value)}
              placeholder="0.00"
              disabled={loading}
              className="w-full text-lg font-semibold"
            />
          </div>
          <div>
            <TextInput
              label="Due Amount (₹)"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              placeholder="0.00"
              disabled={loading}
              className="w-full text-lg font-semibold"
            />
          </div>
        </div>

        <div>
          <label className="field-label">Remarks</label>
          <textarea
            className="field min-h-[88px] py-3 text-base"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Add bill remarks (optional)..."
            disabled={loading}
          />
        </div>
      </form>
    </BottomSheet>
  );
}
