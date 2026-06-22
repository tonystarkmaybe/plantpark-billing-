import { useEffect, useMemo, useState } from "react";
import type { Product } from "@/api/types";
import {
  createBill,
  fetchProducts,
  type BillCreatePayload,
  type BillItemPayload,
  type BillOut,
} from "@/api/billing";
import { friendlyError } from "@/api/client";
import { Spinner } from "@/components/Spinner";
import { Button } from "@/components/Button";
import { computeTotals, fromPaise, toPaise } from "@/lib/money";
import { useBilling } from "@/store/billing";
import { ProductGrid } from "./bill/ProductGrid";
import { CartBar } from "./bill/CartBar";
import { CartSheet } from "./bill/CartSheet";
import { SuccessView } from "./bill/SuccessView";

export function BillPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Transient checkout state.
  const [cartOpen, setCartOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedBill, setSavedBill] = useState<BillOut | null>(null);

  const {
    lines,
    addUnit,
    discountType,
    discountValue,
    cash,
    upi,
    customer,
    ensureIdempotencyKey,
    resetForNewBill,
  } = useBilling();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await fetchProducts();
        if (!cancelled) setProducts(data);
      } catch (e) {
        if (!cancelled) setLoadError(friendlyError(e, "Couldn't load products."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const totals = useMemo(
    () => computeTotals(lines.map((l) => ({ unitPrice: l.unit_price, quantity: l.quantity })), discountType, discountValue),
    [lines, discountType, discountValue],
  );

  const cartQty = useMemo(() => {
    const m: Record<string, number> = {};
    for (const l of lines) m[l.product_id] = l.quantity;
    return m;
  }, [lines]);

  const itemCount = useMemo(() => lines.reduce((n, l) => n + l.quantity, 0), [lines]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleCheckout = async () => {
    setSaving(true);
    setSaveError(null);

    const items: BillItemPayload[] = lines.map((l) => ({
      product_id: l.product_id,
      quantity: l.quantity,
      unit_price: fromPaise(toPaise(l.unit_price)),
    }));

    const name = customer.name.trim();
    const payload: BillCreatePayload = {
      idempotency_key: ensureIdempotencyKey(),
      items,
      discount_type: discountType,
      discount_value: discountValue.trim() ? fromPaise(toPaise(discountValue)) : "0",
      cash_amount: fromPaise(toPaise(cash)),
      upi_amount: fromPaise(toPaise(upi)),
      // Customer is optional: send it only when a name was entered.
      new_customer: name ? { name, phone: customer.phone.trim() || null } : null,
    };
    // Percent discounts are a plain number, not money — send the raw value.
    if (discountType === "percent") {
      payload.discount_value = discountValue.trim() || "0";
    }

    try {
      const bill = await createBill(payload);
      setCartOpen(false);
      setSavedBill(bill); // success screen (covers idempotent replay too — same bill)
    } catch (e) {
      // Recoverable: keep the cart and the idempotency key so a retry is safe.
      setSaveError(friendlyError(e, "Couldn't save the bill. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  const handleNewBill = () => {
    setSavedBill(null);
    setSaveError(null);
    resetForNewBill();
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  if (savedBill) {
    return <SuccessView bill={savedBill} onNewBill={handleNewBill} />;
  }

  return (
    <div>
      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8 text-primary-600" />
        </div>
      ) : loadError ? (
        <div className="py-12 text-center">
          <p className="text-base font-semibold text-danger">{loadError}</p>
          <Button
            variant="secondary"
            size="action"
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Try again
          </Button>
        </div>
      ) : (
        <ProductGrid products={products} cartQty={cartQty} onPick={addUnit} />
      )}

      <CartBar itemCount={itemCount} totalPaise={totals.totalPaise} onOpen={() => setCartOpen(true)} />

      <CartSheet
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        totals={totals}
        onCheckout={handleCheckout}
        saving={saving}
        errorMsg={saveError}
      />
    </div>
  );
}
