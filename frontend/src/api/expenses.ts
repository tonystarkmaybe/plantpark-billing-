import { api } from "./client";

export interface ExpenseRow {
  id: string;
  shop_id: string;
  amount: string;
  reason: string;
  created_by: string | null;
  created_at: string;
}

export async function createExpense(amount: string, reason: string): Promise<ExpenseRow> {
  const { data } = await api.post<ExpenseRow>("/expenses", { amount, reason });
  return data;
}

export async function listExpenses(limit = 100, offset = 0): Promise<ExpenseRow[]> {
  const { data } = await api.get<ExpenseRow[]>("/expenses", {
    params: { limit, offset },
  });
  return data;
}

export async function deleteExpense(id: string): Promise<void> {
  await api.delete(`/expenses/${id}`);
}

export async function updateExpense(id: string, amount: string, reason: string): Promise<ExpenseRow> {
  const { data } = await api.patch<ExpenseRow>(`/expenses/${id}`, { amount, reason });
  return data;
}
