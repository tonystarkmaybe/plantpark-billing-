import { useState } from "react";
import { BottomSheet } from "@/components/BottomSheet";
import { TextInput } from "@/components/TextInput";
import { Button } from "@/components/Button";
import { createProduct } from "@/api/products";
import type { Product } from "@/api/types";
import { friendlyError } from "@/api/client";

interface QuickAddSheetProps {
  open: boolean;
  onClose: () => void;
  onAdded: (p: Product, qty: number) => void;
}

export function QuickAddSheet({ open, onClose, onAdded }: QuickAddSheetProps) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price.trim()) return;

    setLoading(true);
    setError(null);

    try {
      // Create product in catalog first
      const product = await createProduct({
        name: name.trim(),
        category: "Quick Add",
        retail_price: parseFloat(price).toFixed(2),
        last_wholesale_price: null,
      });

      const qty = Math.max(1, parseInt(quantity) || 1);
      onAdded(product, qty);
      setName("");
      setPrice("");
      setQuantity("1");
      onClose();
    } catch (err) {
      setError(friendlyError(err, "Could not create custom product."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Quick Add Custom Item"
      footer={
        <Button
          variant="primary"
          size="action"
          className="w-full"
          loading={loading}
          disabled={!name.trim() || !price.trim() || loading}
          onClick={handleSave}
        >
          Create & Add to Bill
        </Button>
      }
    >
      <form onSubmit={handleSave} className="space-y-4">
        {error && (
          <p className="rounded-control bg-danger-soft px-4 py-3 text-base font-semibold text-danger">
            {error}
          </p>
        )}

        <TextInput
          label="Item Name"
          placeholder="e.g. Ad-hoc Plant, Pot, Soil"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={loading}
          required
        />

        <TextInput
          label="Price (₹)"
          placeholder="0.00"
          type="number"
          step="0.01"
          min="0"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          disabled={loading}
          required
        />

        <TextInput
          label="Quantity"
          placeholder="1"
          type="number"
          min="1"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          disabled={loading}
          required
        />
      </form>
    </BottomSheet>
  );
}
