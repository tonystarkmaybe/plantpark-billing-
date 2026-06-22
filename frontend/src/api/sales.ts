import { api } from "./client";

export type PaymentMethod = "cash" | "upi" | "split";

export interface BillSummary {
  date: string; // YYYY-MM-DD (shop timezone)
  total_sales: string;
  bill_count: number;
  cash_total: string;
  upi_total: string;
}

export interface BillListItem {
  id: string;
  created_at: string;
  total: string;
  customer_name: string | null;
  item_count: number;
  payment_method: PaymentMethod;
}

export interface BillListResponse {
  items: BillListItem[];
  limit: number;
  offset: number;
  has_more: boolean;
}

export interface BillDetailItem {
  product_id: string | null;
  product_name: string;
  unit_price: string;
  quantity: number;
  line_total: string;
}

export interface BillDetail {
  id: string;
  shop_name: string | null;
  subtotal: string;
  discount_type: "flat" | "percent";
  discount_value: string;
  discount_amount: string;
  total: string;
  cash_amount: string;
  upi_amount: string;
  payment_method: PaymentMethod;
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  created_at: string;
  items: BillDetailItem[];
}

/** date optional (YYYY-MM-DD, shop time). Defaults to today on the server. */
export async function fetchTodaySummary(date?: string): Promise<BillSummary> {
  const { data } = await api.get<BillSummary>("/bills/summary/today", {
    params: date ? { date } : {},
  });
  return data;
}

export interface BillListParams {
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

export async function fetchBills(params: BillListParams): Promise<BillListResponse> {
  const query: Record<string, string | number> = {
    limit: params.limit ?? 20,
    offset: params.offset ?? 0,
  };
  if (params.date_from) query.date_from = params.date_from;
  if (params.date_to) query.date_to = params.date_to;
  const { data } = await api.get<BillListResponse>("/bills", { params: query });
  return data;
}

export async function fetchBillDetail(id: string): Promise<BillDetail> {
  const { data } = await api.get<BillDetail>(`/bills/${id}`);
  return data;
}
