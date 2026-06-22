import { api } from "./client";
import type { Product } from "./types";

export async function fetchProducts(): Promise<Product[]> {
  // Active products only (default). Filtering/search is done client-side for snappy UX.
  const { data } = await api.get<Product[]>("/products", { params: { active: "true" } });
  return data;
}

// ── Bills / checkout ─────────────────────────────────────────────────────────
export interface BillItemPayload {
  product_id: string;
  quantity: number;
  unit_price: string; // editable per line; server recomputes the line total
}

export interface NewCustomerPayload {
  name: string;
  phone?: string | null;
}

export interface BillCreatePayload {
  idempotency_key: string;
  items: BillItemPayload[];
  discount_type: "flat" | "percent";
  discount_value: string;
  cash_amount: string;
  upi_amount: string;
  // Customer is entered fresh per bill and optional.
  new_customer?: NewCustomerPayload | null;
}

export interface BillItemOut {
  product_id: string | null;
  product_name: string;
  unit_price: string;
  quantity: number;
  line_total: string;
}

export interface BillOut {
  id: string;
  bill_type: "retail" | "wholesale";
  subtotal: string;
  discount_type: "flat" | "percent";
  discount_value: string;
  discount_amount: string;
  total: string;
  cash_amount: string;
  upi_amount: string;
  customer_id: string | null;
  customer_name: string | null;
  created_by: string | null;
  created_at: string;
  items: BillItemOut[];
  idempotent_replay: boolean;
  idempotency_key: string | null;
}

export async function createBill(payload: BillCreatePayload): Promise<BillOut> {
  const { data } = await api.post<BillOut>("/bills", payload);
  return data;
}
