import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { formatINR } from "@/lib/money";

interface MoneyProps {
  /** Amount in integer paise. */
  paise: number;
  className?: string;
  /** Crossfade + slide when the value changes (totals, takings). Default true. */
  animate?: boolean;
}

/**
 * The single money display primitive. Always tabular (digits don't jitter) and,
 * by default, gently crossfades when the amount changes — the small bit of
 * polish that makes totals feel alive. Reduced-motion → instant swap.
 */
export function Money({ paise, className = "", animate = true }: MoneyProps) {
  const reduce = useReducedMotion();
  const text = formatINR(paise);

  if (!animate || reduce) {
    return <span className={`tnum ${className}`}>{text}</span>;
  }

  return (
    <span className={`tnum relative inline-block ${className}`}>
      {/* Invisible sizer keeps layout stable while the value swaps. */}
      <span className="invisible">{text}</span>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={text}
          className="absolute inset-0"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          {text}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
