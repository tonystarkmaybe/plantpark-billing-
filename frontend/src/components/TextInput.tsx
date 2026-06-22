import { forwardRef, useId, useState } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";

interface TextInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  label: string;
  error?: string | null;
  /** Trailing control (e.g. a show/hide password toggle). */
  trailing?: ReactNode;
}

/** 56px-tall labeled input with a clear focus state and inline error text. */
export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { label, error, trailing, className = "", ...rest },
  ref,
) {
  const id = useId();
  const errId = `${id}-error`;
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={id}
          className={`field ${error ? "field-error" : ""} ${trailing ? "pr-28" : ""} ${className}`}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errId : undefined}
          {...rest}
        />
        {trailing && (
          <div className="absolute inset-y-0 right-2 flex items-center">{trailing}</div>
        )}
      </div>
      {error && (
        <p id={errId} className="mt-2 text-base font-semibold text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
});

/** A large, obvious show/hide toggle for password fields. */
export function PasswordToggle({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="h-tap min-w-[64px] rounded-control px-3 text-base font-semibold text-primary-700 hover:bg-surface-muted"
      aria-pressed={shown}
    >
      {shown ? "Hide" : "Show"}
    </button>
  );
}

/** Controlled password field with built-in show/hide. */
export const PasswordInput = forwardRef<HTMLInputElement, Omit<TextInputProps, "trailing" | "type">>(
  function PasswordInput(props, ref) {
    const [shown, setShown] = useState(false);
    return (
      <TextInput
        ref={ref}
        type={shown ? "text" : "password"}
        trailing={<PasswordToggle shown={shown} onToggle={() => setShown((s) => !s)} />}
        {...props}
      />
    );
  },
);
