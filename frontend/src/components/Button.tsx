import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Spinner } from "./Spinner";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "action" | "tap" | "sm";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  loadingLabel?: string;
  children: ReactNode;
}

const variantClass: Record<Variant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
  danger: "btn-danger",
};
const sizeClass: Record<Size, string> = {
  action: "btn-action",
  tap: "btn-tap",
  sm: "btn-sm",
};

/**
 * The single button primitive. Buttons look unmistakably pressable (solid fills,
 * clear edges) and are never thin text links. Use variant="primary" + size="action"
 * for the one clear primary action per screen.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "tap", loading = false, loadingLabel, children, className = "", disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={`${variantClass[variant]} ${sizeClass[size]} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading}
      {...rest}
    >
      {loading ? (
        <>
          <Spinner className="h-5 w-5" />
          <span>{loadingLabel ?? "Please wait…"}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
});
