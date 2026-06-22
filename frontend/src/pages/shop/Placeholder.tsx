import type { ReactNode } from "react";
import { Card } from "@/components/Card";

/** Titled "coming soon" screen used by the empty shop tabs until real content lands. */
export function Placeholder({ title, blurb, children }: { title: string; blurb: string; children?: ReactNode }) {
  return (
    <section>
      <h1 className="text-2xl">{title}</h1>
      <Card className="mt-5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 rounded-full bg-primary-50 px-3 py-1 text-sm font-bold text-primary-700">
            Coming soon
          </span>
        </div>
        <p className="mt-4 text-base text-ink-soft">{blurb}</p>
        {children}
      </Card>
    </section>
  );
}
