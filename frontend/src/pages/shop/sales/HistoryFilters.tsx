import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { shiftDay, todayISO } from "@/lib/datetime";

export interface HistoryFilterValue {
  from: string; // YYYY-MM-DD or ""
  to: string; // YYYY-MM-DD or ""
  is_edited?: boolean;
}

interface HistoryFiltersProps {
  value: HistoryFilterValue;
  onChange: (next: HistoryFilterValue) => void;
}

/** Collapsible filters: kept closed by default so the list stays clean. */
export function HistoryFilters({ value, onChange }: HistoryFiltersProps) {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();

  const activeCount = (value.from || value.to ? 1 : 0) + (value.is_edited ? 1 : 0);

  const setRange = (from: string, to: string) => onChange({ ...value, from, to });

  const today = todayISO();
  const presetToday = () => setRange(today, today);
  const presetWeek = () => setRange(shiftDay(today, -6), today);
  const presetAll = () => setRange("", "");

  const isToday = value.from === today && value.to === today;
  const isWeek = value.from === shiftDay(today, -6) && value.to === today;
  const isAll = !value.from && !value.to;

  return (
    <div className="rounded-card border border-border bg-surface shadow-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-tap w-full items-center justify-between px-4 text-base font-semibold text-ink"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          Filters
          {activeCount > 0 && (
            <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-primary-600 px-1.5 text-sm font-bold text-white">
              {activeCount}
            </span>
          )}
        </span>
        <ChevronDown className={`h-5 w-5 text-ink-soft transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduce ? { opacity: 1 } : { height: "auto", opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="space-y-4 border-t border-border px-4 py-4">
              {/* Date range */}
              <div>
                <span className="mb-2 block text-base font-semibold text-ink-soft">Date range</span>
                <div className="flex flex-wrap gap-2">
                  <Preset active={isAll} onClick={presetAll}>All time</Preset>
                  <Preset active={isToday} onClick={presetToday}>Today</Preset>
                  <Preset active={isWeek} onClick={presetWeek}>This week</Preset>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="date"
                    value={value.from}
                    max={value.to || today}
                    onChange={(e) => setRange(e.target.value, value.to || e.target.value)}
                    className="field h-12 flex-1 text-base"
                    aria-label="From date"
                  />
                  <span className="text-ink-soft">to</span>
                  <input
                    type="date"
                    value={value.to}
                    max={today}
                    min={value.from || undefined}
                    onChange={(e) => setRange(value.from || e.target.value, e.target.value)}
                    className="field h-12 flex-1 text-base"
                    aria-label="To date"
                  />
                </div>
              </div>

              {/* Special filters */}
              <div className="border-t border-border pt-4">
                <label className="flex items-center gap-2.5 text-base font-semibold text-ink cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!value.is_edited}
                    onChange={(e) => onChange({ ...value, is_edited: e.target.checked ? true : undefined })}
                    className="h-5 w-5 rounded border-border text-primary-600 focus:ring-primary-600/20"
                  />
                  <span>Show edited bills only</span>
                </label>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Preset({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "h-10 rounded-full border-2 px-4 text-base font-semibold transition-colors",
        active ? "border-primary-600 bg-primary-600 text-white" : "border-border bg-surface text-ink-soft",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
