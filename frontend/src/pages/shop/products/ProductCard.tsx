import type { Product } from "@/api/types";
import { ProductThumb } from "@/components/ProductThumb";
import { formatINR, toPaise } from "@/lib/money";

interface ProductCardProps {
  product: Product;
  onEdit: (p: Product) => void;
}

/** A tappable catalog card. Mirrors the billing grid card so the app feels coherent. */
export function ProductCard({ product, onEdit }: ProductCardProps) {
  const wholesale = product.last_wholesale_price
    ? `wholesale: ${formatINR(toPaise(product.last_wholesale_price))}`
    : "wholesale: —";

  return (
    <button
      type="button"
      onClick={() => onEdit(product)}
      className="relative flex flex-col gap-2 rounded-card border border-border bg-surface p-3 text-left
                 shadow-card transition-transform duration-gentle active:scale-[0.97] hover:border-border-strong"
    >
      {!product.is_active && (
        <span className="absolute left-2 top-2 z-10 rounded-full bg-ink/80 px-2 py-0.5 text-sm font-bold text-white">
          Retired
        </span>
      )}
      <ProductThumb name={product.name} photoUrl={product.photo_url} />

      <div className="min-h-[2.6rem] text-base font-semibold leading-snug text-ink line-clamp-2">
        {product.name}
      </div>

      <div className="text-lg font-bold text-ink">{formatINR(toPaise(product.retail_price))}</div>
      <div className="text-base text-ink-soft">{wholesale}</div>
    </button>
  );
}
