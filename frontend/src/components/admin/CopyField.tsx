import { useState } from "react";

interface CopyFieldProps {
  label: string;
  value: string;
  /** Render the value in a monospace block (for passwords). */
  mono?: boolean;
}

/** A labelled read-only value with a one-tap copy button. */
export function CopyField({ label, value, mono }: CopyFieldProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked — fall back to selecting nothing; value is still visible.
    }
  };

  return (
    <div>
      <div className="text-sm font-semibold text-ink-soft">{label}</div>
      <div className="mt-1 flex items-stretch gap-2">
        <div
          className={[
            "flex-1 select-all rounded-control border-2 border-border bg-surface-muted px-3 py-2 text-ink",
            mono ? "font-mono text-lg tracking-wide" : "text-base",
          ].join(" ")}
        >
          {value}
        </div>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded-control bg-primary-600 px-4 text-base font-semibold text-white hover:bg-primary-700"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
