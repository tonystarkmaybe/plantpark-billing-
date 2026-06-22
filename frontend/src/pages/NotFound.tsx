import { Link } from "react-router-dom";
import { Wordmark } from "@/components/LeafMark";

export function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-surface-muted px-6 text-center">
      <Wordmark />
      <div>
        <h1 className="text-3xl">Page not found</h1>
        <p className="mt-2 text-base text-ink-soft">That page doesn't exist.</p>
      </div>
      <Link to="/" className="btn-primary btn-tap px-6">
        Go home
      </Link>
    </div>
  );
}
