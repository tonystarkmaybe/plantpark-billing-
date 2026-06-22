import { Loader2 } from "lucide-react";

interface SpinnerProps {
  className?: string;
  label?: string;
}

/** Accessible inline spinner (lucide Loader2). */
export function Spinner({ className = "h-5 w-5", label = "Loading" }: SpinnerProps) {
  return <Loader2 className={`animate-spin ${className}`} role="status" aria-label={label} />;
}
