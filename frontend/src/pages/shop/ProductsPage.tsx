import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Plus } from "lucide-react";
import type { Product } from "@/api/types";
import { listProducts } from "@/api/products";
import { friendlyError } from "@/api/client";
import { Spinner } from "@/components/Spinner";
import { Button } from "@/components/Button";
import { ProductCard } from "./products/ProductCard";
import { ProductForm } from "./products/ProductForm";

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [showRetired, setShowRetired] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce the search box → API query.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listProducts({ q: debouncedQ, active: showRetired ? "all" : "true" });
      setProducts(data);
    } catch (e) {
      setError(friendlyError(e, "Couldn't load products."));
    } finally {
      setLoading(false);
    }
  }, [debouncedQ, showRetired]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) if (p.category) set.add(p.category);
    return Array.from(set).sort();
  }, [products]);

  const visible = useMemo(
    () => (category ? products.filter((p) => p.category === category) : products),
    [products, category],
  );

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  };

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (p: Product) => {
    setEditing(p);
    setFormOpen(true);
  };
  const handleSaved = (message: string) => {
    setFormOpen(false);
    setEditing(null);
    showToast(message);
    load();
  };

  const isEmpty = !loading && !error && products.length === 0 && !debouncedQ && !showRetired;

  return (
    <section className="pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-ink">Products</h1>
        {!isEmpty && (
          <button
            type="button"
            onClick={() => setShowRetired((v) => !v)}
            aria-pressed={showRetired}
            className={[
              "h-tap rounded-control px-3 text-base font-semibold transition-colors",
              showRetired ? "bg-primary-50 text-primary-700" : "text-ink-soft hover:bg-surface-muted",
            ].join(" ")}
          >
            {showRetired ? "Hide retired" : "Show retired"}
          </button>
        )}
      </div>

      {!isEmpty && (
        <>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            className="field mt-4"
            aria-label="Search products"
          />

          {categories.length > 0 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              <Chip active={category === null} onClick={() => setCategory(null)}>All</Chip>
              {categories.map((c) => (
                <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
                  {c}
                </Chip>
              ))}
            </div>
          )}
        </>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8 text-primary-600" />
        </div>
      ) : error ? (
        <div className="py-12 text-center">
          <p className="text-base font-semibold text-danger">{error}</p>
          <Button variant="secondary" size="action" className="mt-4" onClick={load}>
            Try again
          </Button>
        </div>
      ) : isEmpty ? (
        <EmptyState onAdd={openAdd} />
      ) : visible.length === 0 ? (
        <p className="mt-12 text-center text-base text-ink-soft">
          No products match your search.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {visible.map((p) => (
            <ProductCard key={p.id} product={p} onEdit={openEdit} />
          ))}
        </div>
      )}

      {/* Sticky Add button (hidden on the empty state, which has its own CTA) */}
      {!isEmpty && (
        <div
          className="fixed inset-x-0 z-30 px-4"
          style={{ bottom: "calc(64px + env(safe-area-inset-bottom))" }}
        >
          <button
            type="button"
            onClick={openAdd}
            className="mx-auto flex h-14 w-full max-w-screen-sm items-center justify-center gap-2 rounded-card
                       bg-primary-600 text-lg font-bold text-white shadow-card-lg transition-transform active:scale-[0.99]"
          >
            <Plus className="h-6 w-6" strokeWidth={2.5} />
            Add Product
          </button>
        </div>
      )}

      {/* Success toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className="fixed inset-x-0 top-4 z-[70] flex justify-center px-4"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            <div className="max-w-screen-sm rounded-control bg-ink px-5 py-3 text-base font-semibold text-white shadow-card-lg">
              {toast}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ProductForm
        open={formOpen}
        product={editing}
        categories={categories}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSaved={handleSaved}
      />
    </section>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "h-tap shrink-0 rounded-full border-2 px-4 text-base font-semibold transition-colors",
        active
          ? "border-primary-600 bg-primary-600 text-white"
          : "border-border bg-surface text-ink-soft hover:border-border-strong",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="mt-10 flex flex-col items-center text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary-50 text-5xl">🪴</div>
      <h2 className="mt-5 text-xl font-bold text-ink">Let's set up your shop</h2>
      <p className="mt-2 max-w-xs text-base text-ink-soft">
        Add your plants, pots, soil and tools here. They'll appear on the billing screen so you can ring up sales.
      </p>
      <Button variant="primary" size="action" className="mt-6 max-w-xs" onClick={onAdd}>
        + Add your first product
      </Button>
    </div>
  );
}
