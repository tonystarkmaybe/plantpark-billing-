import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchBills,
  fetchTodaySummary,
  type BillListItem,
  type BillSummary,
} from "@/api/sales";
import { friendlyError } from "@/api/client";
import { todayISO } from "@/lib/datetime";
import { Spinner } from "@/components/Spinner";
import { Button } from "@/components/Button";
import { SummaryHero } from "./sales/SummaryHero";
import { HistoryFilters, type HistoryFilterValue } from "./sales/HistoryFilters";
import { BillRow } from "./sales/BillRow";
import { BillDetailView } from "./sales/BillDetailView";

const PAGE_SIZE = 20;

export function SalesPage() {
  // ── Summary (its own date) ──────────────────────────────────────────────
  const [date, setDate] = useState(todayISO());
  const [summary, setSummary] = useState<BillSummary | null>(null);
  const [sumLoading, setSumLoading] = useState(true);
  const [sumError, setSumError] = useState<string | null>(null);

  const loadSummary = useCallback(async (d: string) => {
    setSumLoading(true);
    setSumError(null);
    try {
      setSummary(await fetchTodaySummary(d));
    } catch (e) {
      setSumError(friendlyError(e, "Couldn't load the summary."));
    } finally {
      setSumLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary(date);
  }, [date, loadSummary]);

  // ── History (filters + pagination) ──────────────────────────────────────
  const [filters, setFilters] = useState<HistoryFilterValue>({ from: "", to: "" });
  const [bills, setBills] = useState<BillListItem[]>([]);
  const [histLoading, setHistLoading] = useState(true);
  const [histError, setHistError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const filterParams = useCallback(
    (offset: number) => ({
      date_from: filters.from || undefined,
      date_to: filters.to || undefined,
      limit: PAGE_SIZE,
      offset,
    }),
    [filters],
  );

  const loadFirstPage = useCallback(async () => {
    setHistLoading(true);
    setHistError(null);
    try {
      const res = await fetchBills(filterParams(0));
      setBills(res.items);
      setHasMore(res.has_more);
    } catch (e) {
      setHistError(friendlyError(e, "Couldn't load bills."));
    } finally {
      setHistLoading(false);
    }
  }, [filterParams]);

  useEffect(() => {
    loadFirstPage();
  }, [loadFirstPage]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const res = await fetchBills(filterParams(bills.length));
      setBills((prev) => [...prev, ...res.items]);
      setHasMore(res.has_more);
    } catch {
      // Keep what we have; the button stays so they can retry.
    } finally {
      setLoadingMore(false);
    }
  };

  // ── Refresh when the tab regains focus (a bill may have been made) ───────
  const refresh = useCallback(() => {
    loadSummary(date);
    loadFirstPage();
  }, [date, loadSummary, loadFirstPage]);

  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === "visible") refreshRef.current();
    };
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  // ── Detail ──────────────────────────────────────────────────────────────
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <section className="space-y-5">
      <h1 className="text-2xl font-extrabold text-ink">Sales</h1>

      <SummaryHero
        date={date}
        onDateChange={setDate}
        summary={summary}
        loading={sumLoading}
        error={sumError}
        onRetry={() => loadSummary(date)}
      />

      <div className="space-y-3">
        <h2 className="text-lg font-bold text-ink">Recent bills</h2>
        <HistoryFilters value={filters} onChange={setFilters} />

        {histLoading ? (
          <div className="flex justify-center py-12">
            <Spinner className="h-8 w-8 text-primary-600" />
          </div>
        ) : histError ? (
          <div className="py-10 text-center">
            <p className="text-base font-semibold text-danger">{histError}</p>
            <Button variant="secondary" size="action" className="mt-4 max-w-xs" onClick={loadFirstPage}>
              Try again
            </Button>
          </div>
        ) : bills.length === 0 ? (
          <p className="py-12 text-center text-base text-ink-soft">
            No bills for this filter. Try a wider date range.
          </p>
        ) : (
          <>
            <div className="space-y-3">
              {bills.map((b) => (
                <BillRow key={b.id} bill={b} onOpen={setSelectedId} />
              ))}
            </div>
            {hasMore && (
              <Button
                variant="secondary"
                size="action"
                className="mt-2"
                loading={loadingMore}
                loadingLabel="Loading…"
                onClick={loadMore}
              >
                Load more
              </Button>
            )}
          </>
        )}
      </div>

      <BillDetailView billId={selectedId} onClose={() => setSelectedId(null)} />
    </section>
  );
}
