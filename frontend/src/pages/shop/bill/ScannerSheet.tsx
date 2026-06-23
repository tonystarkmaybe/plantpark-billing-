import { useState } from "react";
import { BottomSheet } from "@/components/BottomSheet";
import { Button } from "@/components/Button";
import { TextInput } from "@/components/TextInput";
import type { Product } from "@/api/types";
import { Barcode } from "lucide-react";

interface ScannerSheetProps {
  open: boolean;
  onClose: () => void;
  products: Product[];
  onScanned: (p: Product) => void;
}

export function ScannerSheet({ open, onClose, products, onScanned }: ScannerSheetProps) {
  const [manualCode, setManualCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSimulateScan = () => {
    if (products.length === 0) {
      setError("No products available to scan.");
      return;
    }
    // Pick a random product to simulate a scan
    const randomProduct = products[Math.floor(Math.random() * products.length)];
    onScanned(randomProduct);
    onClose();
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;

    setError(null);
    // Try to find a product matching name or first few chars of ID
    const found = products.find(
      (p) =>
        p.id.toLowerCase().startsWith(manualCode.trim().toLowerCase()) ||
        p.name.toLowerCase().includes(manualCode.trim().toLowerCase()),
    );

    if (found) {
      onScanned(found);
      setManualCode("");
      onClose();
    } else {
      setError(`No product found matching code/name "${manualCode}"`);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Barcode Scanner">
      <div className="space-y-6">
        {/* Animated Scanner Viewport */}
        <div className="relative overflow-hidden rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center aspect-[4/3]">
          <Barcode className="h-20 w-20 text-slate-700 animate-pulse" />
          <span className="mt-2 text-base font-semibold text-slate-500">Camera Viewport</span>

          {/* Scanning Line Animation */}
          <div className="absolute inset-x-0 h-1 bg-emerald-500 shadow-[0_0_8px_#10b981] animate-scan" />
        </div>

        {error && (
          <p className="rounded-control bg-danger-soft px-4 py-3 text-base font-semibold text-danger">
            {error}
          </p>
        )}

        {/* Action Button */}
        <Button variant="primary" size="action" className="w-full" onClick={handleSimulateScan}>
          Simulate Successful Scan
        </Button>

        {/* Manual Code Input Option */}
        <form onSubmit={handleManualSubmit} className="border-t border-border pt-4 space-y-3">
          <p className="text-base font-semibold text-ink-soft">Or enter item name / SKU code manually</p>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <TextInput
                label="SKU / Barcode"
                placeholder="e.g. Adenium or SKU ID"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              variant="secondary"
              className="h-12 border-2 px-4 rounded-xl flex items-center justify-center font-bold"
              disabled={!manualCode.trim()}
            >
              Add
            </Button>
          </div>
        </form>
      </div>
    </BottomSheet>
  );
}
