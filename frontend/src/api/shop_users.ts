import { api } from "./client";

export interface Salesperson {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface SalespersonCreatePayload {
  email: string;
  password: string;
}

export async function listSalespeople(): Promise<Salesperson[]> {
  const { data } = await api.get<Salesperson[]>("/shop/users");
  return data;
}

export async function createSalesperson(payload: SalespersonCreatePayload): Promise<Salesperson> {
  const { data } = await api.post<Salesperson>("/shop/users", payload);
  return data;
}

export async function updateSalespersonStatus(userId: string, isActive: boolean): Promise<Salesperson> {
  const { data } = await api.patch<Salesperson>(`/shop/users/${userId}`, { is_active: isActive });
  return data;
}

export async function resetSalespersonPassword(userId: string, newPassword: string): Promise<Salesperson> {
  const { data } = await api.post<Salesperson>(`/shop/users/${userId}/reset-password`, { new_password: newPassword });
  return data;
}

export async function deleteSalesperson(userId: string): Promise<void> {
  await api.delete(`/shop/users/${userId}`);
}

