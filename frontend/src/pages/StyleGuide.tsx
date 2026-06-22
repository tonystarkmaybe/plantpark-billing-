import { useState } from "react";
import { Button } from "@/components/Button";
import { Card, ListRow } from "@/components/Card";
import { TextInput, PasswordInput } from "@/components/TextInput";
import { StatCard } from "@/components/StatCard";
import { Money } from "@/components/Money";
import { ProductThumb } from "@/components/ProductThumb";
import { LeafMark } from "@/components/LeafMark";

/**
 * Dev-only living design reference. Not linked in nav. Renders the color shades,
 * type scale, buttons, inputs, and a sample card/list row so the design system
 * stays visible and consistent. Visit /_styleguide.
 */
const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;

const typeScale: { cls: string; label: string }[] = [
  { cls: "text-4xl font-extrabold", label: "Display 40 / extrabold" },
  { cls: "text-3xl font-bold", label: "Heading 32 / bold" },
  { cls: "text-2xl font-bold", label: "Heading 26 / bold" },
  { cls: "text-xl font-semibold", label: "Title 22 / semibold" },
  { cls: "text-lg font-semibold", label: "Subtitle 19 / semibold" },
  { cls: "text-base font-medium", label: "Body 17 / medium (default)" },
  { cls: "text-sm font-medium", label: "Small 15 / medium" },
  { cls: "text-xs font-semibold uppercase tracking-wide text-ink-soft", label: "Overline 13" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

export function StyleGuide() {
  const [demo, setDemo] = useState("");
  const [err, setErr] = useState("");
  const [takings, setTakings] = useState(615000); // paise, for the animated-money demo

  return (
    <div className="min-h-dvh bg-surface-muted">
      <div className="mx-auto max-w-screen-sm space-y-10 px-4 py-10">
        <header className="flex items-center gap-2">
          <LeafMark className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-2xl">Plantora Design Tokens</h1>
            <p className="text-base text-ink-soft">Dev-only reference · /_styleguide</p>
          </div>
        </header>

        <Section title="Brand green">
          <div className="grid grid-cols-5 gap-2">
            {shades.map((s) => (
              <div key={s} className="overflow-hidden rounded-control border border-border">
                <div className={`h-14 bg-primary-${s}`} />
                <div className="px-2 py-1 text-xs font-semibold">{s}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Semantic & surfaces">
          <div className="grid grid-cols-3 gap-3">
            {[
              ["bg-success text-white", "success"],
              ["bg-danger text-white", "danger"],
              ["bg-warning text-white", "warning"],
              ["bg-ink text-white", "ink"],
              ["bg-ink-soft text-white", "ink-soft"],
              ["bg-surface-muted text-ink border border-border", "surface-muted"],
            ].map(([cls, label]) => (
              <div key={label} className={`flex h-16 items-center justify-center rounded-control text-sm font-semibold ${cls}`}>
                {label}
              </div>
            ))}
          </div>
        </Section>

        <Section title="Type scale">
          <Card className="space-y-3">
            {typeScale.map((t) => (
              <div key={t.label} className={t.cls}>
                {t.label}
              </div>
            ))}
          </Card>
        </Section>

        <Section title="Buttons">
          <div className="space-y-3">
            <Button variant="primary" size="action">Primary action (56px)</Button>
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="secondary" size="sm">Small</Button>
            </div>
            <Button variant="primary" size="action" loading loadingLabel="Working…">
              Loading
            </Button>
            <Button variant="primary" size="action" disabled>Disabled</Button>
          </div>
        </Section>

        <Section title="Summary stats & animated money">
          <Card className="space-y-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-ink-soft">Today's sales</p>
              <p className="mt-1 text-5xl font-extrabold tracking-tightest text-ink">
                <Money paise={takings} />
              </p>
              <p className="mt-1 text-lg font-semibold text-ink-soft">12 bills</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Cash" paise={425000} accent="cash" />
              <StatCard label="UPI" paise={190000} accent="upi" />
            </div>
            <Button variant="secondary" size="sm" onClick={() => setTakings((t) => t + 12500)}>
              Add a sale (watch the total animate)
            </Button>
          </Card>
        </Section>

        <Section title="Product card">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              { name: "Money Plant", price: 12000, qty: 2 },
              { name: "Snake Plant", price: 25000, qty: 0 },
              { name: "Areca Palm", price: 45000, qty: 0 },
            ].map((p) => (
              <button
                key={p.name}
                type="button"
                className="relative flex flex-col gap-2 rounded-card bg-surface p-3 text-left shadow-sm
                           transition-[transform,box-shadow] duration-gentle hover:shadow-card active:scale-[0.97]"
              >
                {p.qty > 0 && (
                  <span className="absolute right-2 top-2 z-10 inline-flex h-7 min-w-[28px] items-center justify-center
                                   rounded-full bg-primary-600 px-2 text-sm font-bold text-white shadow-sm">
                    {p.qty}
                  </span>
                )}
                <ProductThumb name={p.name} photoUrl={null} />
                <div className="min-h-[2.6rem] text-base font-semibold leading-snug text-ink line-clamp-2">{p.name}</div>
                <div className="text-lg font-bold text-ink"><Money paise={p.price} animate={false} /></div>
              </button>
            ))}
          </div>
        </Section>

        <Section title="Inputs">
          <Card className="space-y-5">
            <TextInput
              label="Normal field"
              placeholder="Type here…"
              value={demo}
              onChange={(e) => setDemo(e.target.value)}
            />
            <PasswordInput label="Password (show/hide)" placeholder="Secret" />
            <TextInput
              label="Field with error"
              value={err}
              onChange={(e) => setErr(e.target.value)}
              error="Email or password is incorrect."
              placeholder="Invalid example"
            />
          </Card>
        </Section>

        <Section title="Card & list row">
          <Card className="p-0 overflow-hidden">
            <ListRow
              leading={<div className="h-12 w-12 rounded-control bg-primary-100" />}
              title="Money Plant"
              subtitle="Plants"
              trailing={<span className="text-lg font-bold text-ink tnum">₹149.50</span>}
            />
            <ListRow
              leading={<div className="h-12 w-12 rounded-control bg-primary-100" />}
              title="Snake Plant"
              subtitle="Plants"
              trailing={<span className="text-lg font-bold text-ink tnum">₹250.00</span>}
            />
          </Card>
        </Section>
      </div>
    </div>
  );
}
