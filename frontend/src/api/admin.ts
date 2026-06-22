import { api } from "./client";

export interface ShopRow {
  id: string;
  name: string;
  owner_name: string | null;
  owner_phone: string | null;
  owner_email: string | null;
  is_active: boolean;
  created_at: string;
}

export interface OwnerInfo {
  id: string;
  email: string;
  role: string;
  shop_id: string | null;
  is_active: boolean;
}

export interface ShopCreateResponse {
  shop: {
    id: string;
    name: string;
    owner_name: string | null;
    owner_phone: string | null;
    is_active: boolean;
    created_at: string;
  };
  owner: OwnerInfo;
}

export interface ShopCreatePayload {
  name: string;
  owner_name?: string | null;
  owner_phone?: string | null;
  owner_email: string;
  owner_password: string;
}

export interface AdminCustomerRow {
  id: string;
  name: string;
  phone: string | null;
  shop_id: string;
  shop_name: string;
  created_at: string;
}

export interface AdminCustomerList {
  items: AdminCustomerRow[];
  total: number;
  limit: number;
  offset: number;
}

export async function listShops(): Promise<ShopRow[]> {
  const { data } = await api.get<ShopRow[]>("/admin/shops");
  return data;
}

export async function createShop(payload: ShopCreatePayload): Promise<ShopCreateResponse> {
  const { data } = await api.post<ShopCreateResponse>("/admin/shops", payload);
  return data;
}

export async function setShopActive(shopId: string, isActive: boolean): Promise<void> {
  await api.patch(`/admin/shops/${shopId}`, { is_active: isActive });
}

export async function resetOwnerPassword(shopId: string, newPassword: string): Promise<void> {
  await api.post(`/admin/shops/${shopId}/reset-password`, { new_password: newPassword });
}

export interface AdminCustomerParams {
  q?: string;
  shop_id?: string;
  limit?: number;
  offset?: number;
}

export async function listAdminCustomers(params: AdminCustomerParams): Promise<AdminCustomerList> {
  const query: Record<string, string | number> = {
    limit: params.limit ?? 50,
    offset: params.offset ?? 0,
  };
  if (params.q?.trim()) query.q = params.q.trim();
  if (params.shop_id) query.shop_id = params.shop_id;
  const { data } = await api.get<AdminCustomerList>("/admin/customers", { params: query });
  return data;
}
