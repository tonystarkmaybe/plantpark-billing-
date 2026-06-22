import { useMemo, useState } from "react";
import type { Product } from "@/api/types";
import { formatINR, toPaise } from "@/lib/money";
import { ProductThumb } from "@/components/ProductThumb";

interface ProductGridProps {
  products: Product[];
  /** quantity currently in the cart, keyed by product id (for the badge). */
  cartQty: Record<string, number>;
  onPick: (p: Product) => void;
}

function ProductCard({
  product,
  qty,
  onPick,
}: {
  product: Product;
  qty: number;
  onPick: (p: Product) => void;
}) {
  const priceLabel = formatINR(toPaise(product.retail_price));

  return (
    <button
      type="button"
      onClick={() => onPick(product)}
      className="relative flex flex-col gap-2 rounded-card border border-border bg-surface p-3 text-left
                 shadow-card transition-transform duration-gentle active:scale-[0.97] hover:border-border-strong"
    >
      {qty > 0 && (
        <span className="absolute right-2 top-2 z-10 inline-flex h-7 min-w-[28px] items-center justify-center
                         rounded-full bg-primary-600 px-2 text-sm font-bold text-white shadow-card">
          {qty}
        </span>
      )}
      <ProductThumb name={product.name} photoUrl={product.photo_url} />
      <div className="min-h-[2.6rem] text-base font-semibold leading-snug text-ink line-clamp-2">
        {product.name}
      </div>
      <div className="text-lg font-bold text-ink">{priceLabel}</div>
    </button>
  );
}

export function ProductGrid({ products, cartQty, onPick }: ProductGridProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) if (p.category) set.add(p.category);
    return Array.from(set).sort();
  }, [products]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (category && p.category !== category) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [products, query, category]);

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search products…"
        className="field"
        aria-label="Search products"
      />

      {categories.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          <Chip active={category === null} onClick={() => setCategory(null)}>
            All
          </Chip>
          {categories.map((c) => (
            <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
              {c}
            </Chip>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="mt-10 text-center text-base text-ink-soft">
          {products.length === 0
            ? "No products yet. Add products from the Products tab."
            : "No products match your search."}
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} qty={cartQty[p.id] ?? 0} onPick={onPick} />
          ))}
        </div>
      )}
    </div>
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
