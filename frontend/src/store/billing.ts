import { create } from "zustand";
import type { Product } from "@/api/types";
import type { DiscountType } from "@/lib/money";

export type PayMethod = "cash" | "upi" | "split" | "due";

export interface CartLine {
  product_id: string;
  product_name: string;
  unit_price: string; // per-unit, decimal string — pre-filled from the product, editable per line
  quantity: number;
  photo_url: string | null;
}

/** Customer is entered fresh per bill and optional (blank name = no customer). */
export interface CustomerInput {
  name: string;
  phone: string;
}

interface BillingState {
  lines: CartLine[];
  discountType: DiscountType;
  discountValue: string;
  payMethod: PayMethod | null;
  cash: string;
  upi: string;
  due: string;
  customer: CustomerInput;
  remarks: string;
  /** Generated when the user first attempts to save; reused for retries of THIS cart. */
  idempotencyKey: string | null;

  /** Tap a product: add a line at its saved price (or +qty if already in the cart). */
  addUnit: (p: Product, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  setLinePrice: (productId: string, unitPrice: string) => void;
  removeLine: (productId: string) => void;
  lineFor: (productId: string) => CartLine | undefined;

  setDiscount: (type: DiscountType, value: string) => void;
  setPayMethod: (m: PayMethod) => void;
  setCash: (v: string) => void;
  setUpi: (v: string) => void;
  setDue: (v: string) => void;
  setCustomer: (c: CustomerInput) => void;
  setRemarks: (v: string) => void;

  ensureIdempotencyKey: () => string;
  resetForNewBill: () => void;
}

function freshKey(): string {
  // Prefer the platform UUID; fall back for very old webviews.
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const initial = {
  lines: [] as CartLine[],
  discountType: "flat" as DiscountType,
  discountValue: "",
  payMethod: null as PayMethod | null,
  cash: "",
  upi: "",
  due: "",
  customer: { name: "", phone: "" } as CustomerInput,
  remarks: "",
  idempotencyKey: null as string | null,
};

export const useBilling = create<BillingState>((set, get) => ({
  ...initial,

  addUnit: (p, quantity = 1) =>
    set((s) => {
      const existing = s.lines.find((l) => l.product_id === p.id);
      if (existing) {
        return {
          lines: s.lines.map((l) =>
            l.product_id === p.id ? { ...l, quantity: l.quantity + quantity } : l,
          ),
        };
      }
      return {
        lines: [
          ...s.lines,
          {
            product_id: p.id,
            product_name: p.name,
            unit_price: p.retail_price, // pre-fill from the product's saved price
            quantity,
            photo_url: p.photo_url,
          },
        ],
      };
    }),

  setQuantity: (productId, quantity) =>
    set((s) => ({
      lines:
        quantity <= 0
          ? s.lines.filter((l) => l.product_id !== productId)
          : s.lines.map((l) => (l.product_id === productId ? { ...l, quantity } : l)),
    })),

  setLinePrice: (productId, unitPrice) =>
    set((s) => ({
      lines: s.lines.map((l) =>
        l.product_id === productId ? { ...l, unit_price: unitPrice } : l,
      ),
    })),

  removeLine: (productId) =>
    set((s) => ({ lines: s.lines.filter((l) => l.product_id !== productId) })),

  lineFor: (productId) => get().lines.find((l) => l.product_id === productId),

  setDiscount: (type, value) => set({ discountType: type, discountValue: value }),
  setPayMethod: (m) => set({ payMethod: m }),
  setCash: (v) => set({ cash: v }),
  setUpi: (v) => set({ upi: v }),
  setDue: (v) => set({ due: v }),
  setCustomer: (c) => set({ customer: c }),
  setRemarks: (v) => set({ remarks: v }),

  ensureIdempotencyKey: () => {
    const existing = get().idempotencyKey;
    if (existing) return existing;
    const key = freshKey();
    set({ idempotencyKey: key });
    return key;
  },

  // Clear everything and start a brand-new bill (fresh idempotency key on save).
  resetForNewBill: () => set({ ...initial }),
}));
