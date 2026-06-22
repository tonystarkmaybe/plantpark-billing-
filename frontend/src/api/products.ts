import { api } from "./client";
import type { Product } from "./types";

export type ActiveFilter = "true" | "false" | "all";

export interface ProductListParams {
  q?: string;
  category?: string;
  active?: ActiveFilter;
}

export async function listProducts(params: ProductListParams = {}): Promise<Product[]> {
  const query: Record<string, string> = { active: params.active ?? "true" };
  if (params.q?.trim()) query.q = params.q.trim();
  if (params.category) query.category = params.category;
  const { data } = await api.get<Product[]>("/products", { params: query });
  return data;
}

export interface ProductWritePayload {
  name: string;
  category: string | null;
  retail_price: string; // 2-decimal money string
  last_wholesale_price: string | null;
}

export async function createProduct(payload: ProductWritePayload): Promise<Product> {
  const { data } = await api.post<Product>("/products", payload);
  return data;
}

/** Partial update — send only the keys you want changed. */
export async function updateProduct(
  id: string,
  patch: Partial<ProductWritePayload> & { is_active?: boolean },
): Promise<Product> {
  const { data } = await api.patch<Product>(`/products/${id}`, patch);
  return data;
}

/** Soft delete (retire): keeps history, hides from billing. */
export async function retireProduct(id: string): Promise<void> {
  await api.delete(`/products/${id}`);
}

export async function reactivateProduct(id: string): Promise<Product> {
  return updateProduct(id, { is_active: true });
}

/** Image upload (multipart). Replaces any existing image server-side. */
export async function uploadProductImage(id: string, file: File): Promise<Product> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post<Product>(`/products/${id}/image`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function deleteProductImage(id: string): Promise<Product> {
  const { data } = await api.delete<Product>(`/products/${id}/image`);
  return data;
}
