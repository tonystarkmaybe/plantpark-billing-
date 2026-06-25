import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchPublicBill, type BillOut } from "@/api/billing";
import { BillReceipt } from "@/pages/shop/sales/BillReceipt";
import { Spinner } from "@/components/Spinner";
import { Button } from "@/components/Button";
import { Printer } from "lucide-react";

export function PublicBillReceiptPage() {
  const { billId } = useParams<{ billId: string }>();
  const [bill, setBill] = useState<BillOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!billId) return;
    setLoading(true);
    setError(null);
    fetchPublicBill(billId)
      .then((data) => {
        setBill(data);
      })
      .catch((err) => {
        console.error("Failed to load invoice", err);
        setError("Invoice not found or could not be loaded.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [billId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface p-6">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (error || !bill) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-surface p-6 text-center">
        <h1 className="text-xl font-bold text-ink">{error || "Bill not found"}</h1>
        <p className="mt-2 text-sm text-ink-soft">Please verify the link and try again.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface py-8 px-4 print:py-0 print:px-0">
      <div className="mx-auto max-w-lg rounded-control bg-white p-6 shadow-md border-2 border-border print:shadow-none print:border-none print:p-0">
        <BillReceipt bill={bill as any} />

        <div className="mt-8 flex justify-center print:hidden">
          <Button
            variant="primary"
            size="action"
            className="flex items-center gap-2"
            onClick={() => window.print()}
          >
            <Printer className="h-5 w-5" />
            Print / Save PDF
          </Button>
        </div>
      </div>
    </div>
  );
}
