import type { Product } from "@/api/types";
import { ProductThumb } from "@/components/ProductThumb";
import { formatINR, toPaise } from "@/lib/money";

interface ProductCardProps {
  product: Product;
  onEdit: (p: Product) => void;
  selected?: boolean;
  selectMode?: boolean;
  onSelectToggle?: () => void;
}

/** A tappable catalog card. Mirrors the billing grid card so the app feels coherent. */
export function ProductCard({ product, onEdit, selected, selectMode, onSelectToggle }: ProductCardProps) {
  const wholesale = product.last_wholesale_price
    ? `wholesale: ${formatINR(toPaise(product.last_wholesale_price))}`
    : "wholesale: —";

  const handleClick = () => {
    if (selectMode && onSelectToggle) {
      onSelectToggle();
    } else {
      onEdit(product);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={[
        "relative flex flex-col gap-2 rounded-card border p-3 text-left shadow-card transition-all duration-gentle active:scale-[0.97]",
        selectMode
          ? selected
            ? "border-primary-600 bg-primary-50/20"
            : "border-border bg-surface hover:border-border-strong"
          : "border-border bg-surface hover:border-border-strong"
      ].join(" ")}
    >
      {!product.is_active && (
        <span className="absolute left-2 top-2 z-10 rounded-full bg-ink/80 px-2 py-0.5 text-sm font-bold text-white">
          Retired
        </span>
      )}
      {selectMode && (
        <div className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 border-primary-600 bg-white shadow-sm">
          {selected && (
            <div className="h-3 w-3 rounded-full bg-primary-600" />
          )}
        </div>
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

