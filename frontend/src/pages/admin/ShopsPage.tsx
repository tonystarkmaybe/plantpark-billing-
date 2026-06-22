import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { listShops, setShopActive, type ShopRow } from "@/api/admin";
import { friendlyError } from "@/api/client";
import { Spinner } from "@/components/Spinner";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { CreateShopModal } from "./CreateShopModal";
import { ResetPasswordModal } from "./ResetPasswordModal";

type StatusFilter = "all" | "active" | "inactive";

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
}

export function ShopsPage() {
  const [shops, setShops] = useState<ShopRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  const [createOpen, setCreateOpen] = useState(false);
  const [resetShop, setResetShop] = useState<ShopRow | null>(null);
  const [deactivateShop, setDeactivateShop] = useState<ShopRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = (m: string) => {
    setToast(m);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  };
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setShops(await listShops());
    } catch (e) {
      setError(friendlyError(e, "Couldn't load shops."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return shops.filter((s) => {
      if (status === "active" && !s.is_active) return false;
      if (status === "inactive" && s.is_active) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        (s.owner_name ?? "").toLowerCase().includes(q) ||
        (s.owner_email ?? "").toLowerCase().includes(q) ||
        (s.owner_phone ?? "").toLowerCase().includes(q)
      );
    });
  }, [shops, query, status]);

  async function applyActive(shop: ShopRow, isActive: boolean) {
    setBusyId(shop.id);
    try {
      await setShopActive(shop.id, isActive);
      showToast(isActive ? `${shop.name} reactivated.` : `${shop.name} deactivated.`);
      await load();
    } catch (e) {
      showToast(friendlyError(e, "Action failed."));
    } finally {
      setBusyId(null);
      setDeactivateShop(null);
    }
  }

  const toggleActive = (shop: ShopRow) => {
    if (shop.is_active) setDeactivateShop(shop); // confirm before deactivating
    else applyActive(shop, true);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Shops</h1>
          {!loading && !error && (
            <p className="text-sm text-ink-soft">{shops.length} {shops.length === 1 ? "shop" : "shops"}</p>
          )}
        </div>
        <Button variant="primary" size="tap" onClick={() => setCreateOpen(true)}>
          + Add Shop
        </Button>
      </div>

      {/* Filters */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search shop, owner, email, phone…"
          className="h-11 min-w-[14rem] flex-1 rounded-control border-2 border-border bg-white px-3 text-base text-ink focus:border-primary-600 focus:outline-none focus:ring-4 focus:ring-primary-600/20"
        />
        <div className="flex gap-1 rounded-control bg-surface-muted p-1">
          {(["all", "active", "inactive"] as StatusFilter[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              aria-pressed={status === s}
              className={[
                "h-9 rounded-control px-3 text-sm font-semibold capitalize transition-colors",
                status === s ? "bg-primary-600 text-white" : "text-ink-soft",
              ].join(" ")}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16"><Spinner className="h-8 w-8 text-primary-600" /></div>
      ) : error ? (
        <div className="py-12 text-center">
          <p className="text-base font-semibold text-danger">{error}</p>
          <Button variant="secondary" size="tap" className="mt-4" onClick={load}>Try again</Button>
        </div>
      ) : shops.length === 0 ? (
        <div className="rounded-card border border-border bg-surface py-16 text-center shadow-card">
          <p className="text-lg font-bold text-ink">No shops yet</p>
          <p className="mt-1 text-base text-ink-soft">Add your first shop to onboard an owner.</p>
          <Button variant="primary" size="tap" className="mt-5" onClick={() => setCreateOpen(true)}>+ Add Shop</Button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-12 text-center text-base text-ink-soft">No shops match your search.</p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="mt-4 hidden overflow-hidden rounded-card border border-border bg-surface shadow-card md:block">
            <table className="w-full text-left text-base">
              <thead className="border-b border-border bg-surface-muted text-sm text-ink-soft">
                <tr>
                  <Th>Shop</Th><Th>Owner</Th><Th>Email</Th><Th>Phone</Th><Th>Status</Th><Th>Created</Th><Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-b border-border last:border-b-0">
                    <td className="px-4 py-3 font-semibold text-ink">{s.name}</td>
                    <td className="px-4 py-3 text-ink-soft">{s.owner_name ?? "—"}</td>
                    <td className="px-4 py-3 text-ink-soft">{s.owner_email ?? "—"}</td>
                    <td className="px-4 py-3 text-ink-soft">{s.owner_phone ?? "—"}</td>
                    <td className="px-4 py-3"><StatusBadge active={s.is_active} /></td>
                    <td className="px-4 py-3 text-ink-soft">{formatDate(s.created_at)}</td>
                    <td className="px-4 py-3">
                      <RowActions shop={s} busy={busyId === s.id} onToggle={toggleActive} onReset={setResetShop} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="mt-4 space-y-3 md:hidden">
            {filtered.map((s) => (
              <div key={s.id} className="rounded-card border border-border bg-surface p-4 shadow-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-lg font-bold text-ink">{s.name}</div>
                    <div className="truncate text-base text-ink-soft">{s.owner_name ?? "—"}</div>
                  </div>
                  <StatusBadge active={s.is_active} />
                </div>
                <div className="mt-2 space-y-0.5 text-base text-ink-soft">
                  <div className="truncate">{s.owner_email ?? "—"}</div>
                  <div>{s.owner_phone ?? "—"} · {formatDate(s.created_at)}</div>
                </div>
                <div className="mt-3">
                  <RowActions shop={s} busy={busyId === s.id} onToggle={toggleActive} onReset={setResetShop} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <CreateShopModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={load} />
      <ResetPasswordModal shop={resetShop} onClose={() => setResetShop(null)} />
      <ConfirmDialog
        open={deactivateShop !== null}
        title={`Deactivate ${deactivateShop?.name ?? "shop"}?`}
        body="The owner won't be able to log in or use the app until you reactivate it. No data is deleted."
        confirmLabel="Deactivate"
        cancelLabel="Cancel"
        destructive
        onConfirm={() => deactivateShop && applyActive(deactivateShop, false)}
        onCancel={() => setDeactivateShop(null)}
      />

      <AnimatePresence>
        {toast && (
          <motion.div
            className="fixed inset-x-0 top-4 z-[70] flex justify-center px-4"
            initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
          >
            <div className="rounded-control bg-ink px-5 py-3 text-base font-semibold text-white shadow-card-lg">{toast}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-2 font-semibold">{children}</th>;
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2 py-0.5 text-sm font-bold",
        active ? "bg-success-soft text-success" : "bg-surface-muted text-ink-soft",
      ].join(" ")}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function RowActions({
  shop, busy, onToggle, onReset,
}: {
  shop: ShopRow;
  busy: boolean;
  onToggle: (s: ShopRow) => void;
  onReset: (s: ShopRow) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => onToggle(shop)}
        className={[
          "rounded-control px-3 py-1.5 text-sm font-semibold disabled:opacity-50",
          shop.is_active
            ? "border border-border-strong text-danger hover:bg-danger-soft"
            : "border border-border-strong text-success hover:bg-success-soft",
        ].join(" ")}
      >
        {shop.is_active ? "Deactivate" : "Activate"}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => onReset(shop)}
        className="rounded-control border border-border-strong px-3 py-1.5 text-sm font-semibold text-ink hover:bg-surface-muted disabled:opacity-50"
      >
        Reset password
      </button>
    </div>
  );
}
