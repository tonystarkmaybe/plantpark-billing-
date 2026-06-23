import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Plus, Download, Upload, Image, CheckCircle, AlertCircle } from "lucide-react";
import type { Product } from "@/api/types";
import { listProducts, downloadSampleFile, bulkUploadProducts, bulkDeleteProducts, bulkUploadPhotos } from "@/api/products";
import type { BulkPhotosResponse } from "@/api/products";
import { friendlyError } from "@/api/client";
import { Spinner } from "@/components/Spinner";
import { Button } from "@/components/Button";
import { BottomSheet } from "@/components/BottomSheet";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ProductCard } from "./products/ProductCard";
import { ProductForm } from "./products/ProductForm";

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [showRetired, setShowRetired] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deletingBulk, setDeletingBulk] = useState(false);
  const [confirmBulkDeleteOpen, setConfirmBulkDeleteOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce the search box → API query.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listProducts({ q: debouncedQ, active: showRetired ? "all" : "true" });
      setProducts(data);
    } catch (e) {
      setError(friendlyError(e, "Couldn't load products."));
    } finally {
      setLoading(false);
    }
  }, [debouncedQ, showRetired]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) if (p.category) set.add(p.category);
    return Array.from(set).sort();
  }, [products]);

  const visible = useMemo(
    () => (category ? products.filter((p) => p.category === category) : products),
    [products, category],
  );

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  };

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (p: Product) => {
    setEditing(p);
    setFormOpen(true);
  };
  const handleSaved = (message: string) => {
    setFormOpen(false);
    setEditing(null);
    showToast(message);
    load();
  };

  const toggleSelectProduct = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelectedIds((prev) => {
      const allSelected = visible.every((p) => prev.has(p.id));
      const next = new Set(prev);
      if (allSelected) {
        for (const p of visible) next.delete(p.id);
      } else {
        for (const p of visible) next.add(p.id);
      }
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setDeletingBulk(true);
    try {
      const ids = Array.from(selectedIds);
      const res = await bulkDeleteProducts(ids);
      showToast(res.detail);
      setSelectedIds(new Set());
      setSelectMode(false);
      setConfirmBulkDeleteOpen(false);
      load();
    } catch (err) {
      alert(friendlyError(err, "Failed to delete products in bulk."));
    } finally {
      setDeletingBulk(false);
    }
  };

  const isEmpty = !loading && !error && products.length === 0 && !debouncedQ && !showRetired;

  return (
    <section className="pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-ink">Products</h1>
        <div className="flex items-center gap-1.5">
          {selectMode && (
            <button
              type="button"
              onClick={selectAllVisible}
              className="h-tap rounded-control px-3 text-base font-semibold text-primary-700 hover:bg-primary-50"
            >
              {visible.every((p) => selectedIds.has(p.id)) ? "Deselect All" : "Select All"}
            </button>
          )}
          {!isEmpty && (
            <button
              type="button"
              onClick={() => {
                setSelectMode((v) => !v);
                setSelectedIds(new Set());
              }}
              className={[
                "h-tap rounded-control px-3 text-base font-semibold transition-colors",
                selectMode ? "bg-primary-50 text-primary-700" : "text-ink-soft hover:bg-surface-muted",
              ].join(" ")}
            >
              {selectMode ? "Exit Select" : "Select"}
            </button>
          )}
          {!isEmpty && (
            <button
              type="button"
              onClick={() => setShowRetired((v) => !v)}
              aria-pressed={showRetired}
              className={[
                "h-tap rounded-control px-3 text-base font-semibold transition-colors",
                showRetired ? "bg-primary-50 text-primary-700" : "text-ink-soft hover:bg-surface-muted",
              ].join(" ")}
            >
              {showRetired ? "Hide retired" : "Show retired"}
            </button>
          )}
        </div>
      </div>

      {!isEmpty && (
        <>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            className="field mt-4"
            aria-label="Search products"
          />

          {categories.length > 0 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              <Chip active={category === null} onClick={() => setCategory(null)}>All</Chip>
              {categories.map((c) => (
                <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
                  {c}
                </Chip>
              ))}
            </div>
          )}
        </>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8 text-primary-600" />
        </div>
      ) : error ? (
        <div className="py-12 text-center">
          <p className="text-base font-semibold text-danger">{error}</p>
          <Button variant="secondary" size="action" className="mt-4" onClick={load}>
            Try again
          </Button>
        </div>
      ) : isEmpty ? (
        <EmptyState onAdd={openAdd} onBulk={() => setBulkOpen(true)} />
      ) : visible.length === 0 ? (
        <p className="mt-12 text-center text-base text-ink-soft">
          No products match your search.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {visible.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              onEdit={openEdit}
              selectMode={selectMode}
              selected={selectedIds.has(p.id)}
              onSelectToggle={() => toggleSelectProduct(p.id)}
            />
          ))}
        </div>
      )}

      {/* Sticky Add & Bulk buttons (hidden on the empty state, which has its own CTA) */}
      {!isEmpty && !selectMode && (
        <div
          className="fixed inset-x-0 z-30 px-4"
          style={{ bottom: "calc(64px + env(safe-area-inset-bottom))" }}
        >
          <div className="mx-auto flex w-full max-w-screen-sm gap-3">
            <Button
              variant="secondary"
              className="flex-1 h-14 text-base font-bold bg-white border-2 shadow-card-lg"
              onClick={() => setBulkOpen(true)}
            >
              Bulk Upload
            </Button>
            <button
              type="button"
              onClick={openAdd}
              className="flex-1 flex h-14 items-center justify-center gap-2 rounded-card
                         bg-primary-600 text-base font-bold text-white shadow-card-lg transition-transform active:scale-[0.99]"
            >
              <Plus className="h-5 w-5" strokeWidth={2.5} />
              Add Product
            </button>
          </div>
        </div>
      )}

      {/* Sticky Bulk Action buttons when in Select Mode */}
      {!isEmpty && selectMode && (
        <div
          className="fixed inset-x-0 z-30 px-4"
          style={{ bottom: "calc(64px + env(safe-area-inset-bottom))" }}
        >
          <div className="mx-auto flex w-full max-w-screen-sm gap-3">
            <Button
              variant="secondary"
              className="flex-1 h-14 text-base font-bold bg-white border-2 shadow-card-lg"
              onClick={() => {
                setSelectMode(false);
                setSelectedIds(new Set());
              }}
            >
              Cancel
            </Button>
            <button
              type="button"
              disabled={selectedIds.size === 0 || deletingBulk}
              onClick={() => setConfirmBulkDeleteOpen(true)}
              className="flex-1 flex h-14 items-center justify-center gap-2 rounded-card
                         bg-red-600 text-base font-bold text-white shadow-card-lg transition-transform active:scale-[0.99] disabled:opacity-50"
            >
              Delete Selected ({selectedIds.size})
            </button>
          </div>
        </div>
      )}

      {/* Success toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className="fixed inset-x-0 top-4 z-[70] flex justify-center px-4"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            <div className="max-w-screen-sm rounded-control bg-ink px-5 py-3 text-base font-semibold text-white shadow-card-lg">
              {toast}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ProductForm
        open={formOpen}
        product={editing}
        categories={categories}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSaved={handleSaved}
      />

      <BulkUploadSheet
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        onUploaded={(msg) => {
          setBulkOpen(false);
          showToast(msg);
          load();
        }}
      />

      <ConfirmDialog
        open={confirmBulkDeleteOpen}
        title={`Delete ${selectedIds.size} products?`}
        body="This will permanently delete products that have no sales history. Products with sales history will be retired (deactivated) so your transaction reports stay accurate. This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onConfirm={handleBulkDelete}
        onCancel={() => setConfirmBulkDeleteOpen(false)}
      />
    </section>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "h-tap shrink-0 rounded-full border-2 px-4 text-base font-semibold transition-colors",
        active
          ? "border-primary-600 bg-primary-600 text-white"
          : "border-border bg-surface text-ink-soft hover:border-border-strong",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function EmptyState({ onAdd, onBulk }: { onAdd: () => void; onBulk: () => void }) {
  return (
    <div className="mt-10 flex flex-col items-center text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary-50 text-5xl">🪴</div>
      <h2 className="mt-5 text-xl font-bold text-ink">Let's set up your shop</h2>
      <p className="mt-2 max-w-xs text-base text-ink-soft">
        Add your plants, pots, soil and tools here. They'll appear on the billing screen so you can ring up sales.
      </p>
      <div className="mt-6 flex flex-col w-full max-w-xs gap-3">
        <Button variant="primary" size="action" onClick={onAdd}>
          + Add your first product
        </Button>
        <Button variant="secondary" size="action" className="border-2 bg-white" onClick={onBulk}>
          Bulk Upload Excel/CSV
        </Button>
      </div>
    </div>
  );
}

interface BulkUploadSheetProps {
  open: boolean;
  onClose: () => void;
  onUploaded: (message: string) => void;
}

export function BulkUploadSheet({ open, onClose, onUploaded }: BulkUploadSheetProps) {
  const [activeTab, setActiveTab] = useState<"products" | "photos">("products");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [result, setResult] = useState<BulkPhotosResponse | null>(null);

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setError(null);
    setUploading(false);
    setResult(null);
  }, [open]);

  const handleTabChange = (tab: "products" | "photos") => {
    setActiveTab(tab);
    setFile(null);
    setError(null);
    setResult(null);
  };

  const handleDownloadSample = async () => {
    setDownloading(true);
    setError(null);
    try {
      await downloadSampleFile();
    } catch (err) {
      setError(friendlyError(err, "Could not download sample file."));
    } finally {
      setDownloading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      if (activeTab === "products") {
        const imported = await bulkUploadProducts(file);
        onUploaded(`Successfully imported ${imported.length} products.`);
      } else {
        const res = await bulkUploadPhotos(file);
        setResult(res);
      }
    } catch (err) {
      const defaultErr = activeTab === "products"
        ? "Failed to upload file. Please check row data."
        : "Failed to upload ZIP archive. Please verify it is a valid ZIP file under 50MB.";
      setError(friendlyError(err, defaultErr));
    } finally {
      setUploading(false);
    }
  };

  const handleFinishPhotosUpload = () => {
    if (result) {
      onUploaded(result.detail);
    } else {
      onClose();
    }
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={activeTab === "products" ? "Bulk Product Upload" : "Bulk Photos Upload"}
      footer={
        result ? (
          <div className="w-full">
            <Button
              variant="primary"
              size="action"
              className="w-full"
              onClick={handleFinishPhotosUpload}
            >
              Done
            </Button>
          </div>
        ) : (
          <div className="flex gap-3 w-full">
            <Button variant="secondary" size="action" className="flex-1 border" onClick={onClose} disabled={uploading}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="action"
              className="flex-1"
              disabled={!file || uploading}
              loading={uploading}
              onClick={handleUpload}
            >
              {activeTab === "products" ? "Import" : "Upload"}
            </Button>
          </div>
        )
      }
    >
      <div className="space-y-5">
        {/* Tab Switcher (hidden when viewing results) */}
        {!result && (
          <div className="flex border-b border-border">
            <button
              type="button"
              onClick={() => handleTabChange("products")}
              disabled={uploading}
              className={`flex-1 pb-3 text-center text-base font-bold transition-all border-b-2 ${
                activeTab === "products"
                  ? "border-primary-600 text-primary-600"
                  : "border-transparent text-ink-soft hover:text-ink"
              }`}
            >
              Products (Excel/CSV)
            </button>
            <button
              type="button"
              onClick={() => handleTabChange("photos")}
              disabled={uploading}
              className={`flex-1 pb-3 text-center text-base font-bold transition-all border-b-2 ${
                activeTab === "photos"
                  ? "border-primary-600 text-primary-600"
                  : "border-transparent text-ink-soft hover:text-ink"
              }`}
            >
              Photos (ZIP)
            </button>
          </div>
        )}

        {error && (
          <p className="rounded-control bg-danger-soft px-4 py-3 text-base font-semibold text-danger">
            {error}
          </p>
        )}

        {result ? (
          /* Results View for Photos Upload */
          <div className="space-y-4 text-center py-4">
            <div className="flex justify-center">
              <CheckCircle className="h-16 w-16 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-extrabold text-ink text-lg">Upload Complete</h3>
              <p className="text-sm text-ink-soft mt-1">{result.detail}</p>
            </div>

            <div className="rounded-xl border border-border bg-emerald-50/50 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-left">
                <Image className="h-5 w-5 text-emerald-600" />
                <span className="text-sm font-semibold text-ink">Matched Images</span>
              </div>
              <span className="text-lg font-bold text-emerald-700">{result.matched}</span>
            </div>

            {result.errors.length > 0 && (
              <div className="space-y-2 text-left">
                <p className="text-sm font-bold text-ink-soft flex items-center gap-1.5 text-amber-700">
                  <AlertCircle className="h-4 w-4" /> Not imported or issues ({result.errors.length}):
                </p>
                <div className="max-h-48 overflow-y-auto rounded-xl border border-amber-100 bg-amber-50/30 p-3.5 text-sm font-medium text-amber-800 space-y-1">
                  {result.errors.map((err, idx) => (
                    <p key={idx} className="leading-relaxed">• {err}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : activeTab === "products" ? (
          /* Products Tab Content */
          <>
            <div className="rounded-xl border border-border bg-slate-50 p-4 space-y-3">
              <h3 className="font-bold text-ink text-base">1. Download Sample File</h3>
              <p className="text-sm text-ink-soft">
                Use our template to format your product data. Columns: Product Name, Category, Retail Price, Wholesale Price, Stock.
              </p>
              <Button
                variant="secondary"
                size="tap"
                className="flex items-center gap-2 border bg-white"
                onClick={handleDownloadSample}
                loading={downloading}
              >
                <Download className="h-4 w-4" /> Download Template
              </Button>
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-ink text-base">2. Select CSV or Excel File</h3>
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-6 bg-surface hover:bg-slate-50 cursor-pointer transition-colors">
                <Upload className="h-8 w-8 text-primary-600 mb-2" />
                <span className="text-base font-bold text-ink text-center">
                  {file ? file.name : "Click to select file"}
                </span>
                <span className="text-sm text-ink-soft mt-1">
                  Supports .csv, .xlsx, or .xls
                </span>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={uploading}
                />
              </label>
            </div>
          </>
        ) : (
          /* Photos Tab Content */
          <>
            <div className="rounded-xl border border-border bg-slate-50 p-4 space-y-3">
              <h3 className="font-bold text-ink text-base">1. How to name and zip your photos</h3>
              <p className="text-sm text-ink-soft leading-relaxed">
                Name your photo files exactly after the product name (e.g. <code className="font-mono bg-white px-1 py-0.5 rounded border border-border text-primary-700">Areca Palm.jpg</code> or <code className="font-mono bg-white px-1 py-0.5 rounded border border-border text-primary-700">Rose Plant.png</code>).
              </p>
              <p className="text-sm text-ink-soft leading-relaxed">
                Add them into a <code className="font-mono bg-white px-1 py-0.5 rounded border border-border text-primary-700">.zip</code> archive. Do not nest them in multiple folders. Matches are case-insensitive and ignore spaces. Supports JPEG, PNG, and WebP formats up to 5MB per photo.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-ink text-base">2. Select ZIP Archive</h3>
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-6 bg-surface hover:bg-slate-50 cursor-pointer transition-colors">
                <Upload className="h-8 w-8 text-primary-600 mb-2" />
                <span className="text-base font-bold text-ink text-center">
                  {file ? file.name : "Click to select ZIP archive"}
                </span>
                <span className="text-sm text-ink-soft mt-1">
                  Supports .zip (Max 50MB)
                </span>
                <input
                  type="file"
                  accept=".zip"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={uploading}
                />
              </label>
            </div>
          </>
        )}
      </div>
    </BottomSheet>
  );
}
