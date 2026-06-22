interface ProductThumbProps {
  name: string;
  photoUrl: string | null;
  /** Tailwind height class for the media box. Defaults to a grid-card height. */
  className?: string;
}

/**
 * Shared product image used by both the billing grid and the products tab so
 * the catalog looks identical in both places. Falls back to a tinted tile with
 * the product's initial when there's no photo.
 */
export function ProductThumb({ name, photoUrl, className = "h-24 w-full" }: ProductThumbProps) {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt=""
        className={`${className} rounded-control object-cover`}
        loading="lazy"
      />
    );
  }
  const initial = name.trim().charAt(0).toUpperCase() || "•";
  return (
    <div
      className={`${className} flex items-center justify-center rounded-control
                  bg-gradient-to-br from-primary-50 to-primary-100 text-3xl font-extrabold text-primary-400`}
    >
      {initial}
    </div>
  );
}
