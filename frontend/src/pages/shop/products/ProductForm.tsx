import { useEffect, useState } from "react";
import type { Product } from "@/api/types";
import {
  createProduct,
  updateProduct,
  retireProduct,
  reactivateProduct,
  uploadProductImage,
  deleteProductImage,
  type ProductWritePayload,
} from "@/api/products";
import { friendlyError } from "@/api/client";
import { BottomSheet } from "@/components/BottomSheet";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ImagePicker } from "./ImagePicker";
import { downscaleImage } from "@/lib/image";
import { fromPaise, toPaise } from "@/lib/money";

interface ProductFormProps {
  open: boolean;
  /** null → create mode; a product → edit mode. */
  product: Product | null;
  /** Existing categories for quick-pick chips. */
  categories: string[];
  onClose: () => void;
  /** Called after a successful save/retire so the parent can refresh + confirm. */
  onSaved: (message: string) => void;
}

interface FieldErrors {
  name?: string;
  retail?: string;
  wholesale?: string;
}

export function ProductForm({ open, product, categories, onClose, onSaved }: ProductFormProps) {
  const isEdit = product !== null;

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [retail, setRetail] = useState("");
  const [wholesale, setWholesale] = useState("");

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [removeExisting, setRemoveExisting] = useState(false);
  const [imgError, setImgError] = useState<string | null>(null);

  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmRetire, setConfirmRetire] = useState(false);

  // (Re)seed the form whenever a different product (or create) opens the sheet.
  useEffect(() => {
    if (!open) return;
    setName(product?.name ?? "");
    setCategory(product?.category ?? "");
    setRetail(product ? product.retail_price : "");
    setWholesale(product?.last_wholesale_price ?? "");
    setImageFile(null);
    setRemoveExisting(false);
    setImgError(null);
    setErrors({});
    setSaveError(null);
  }, [open, product]);

  const existingUrl = removeExisting ? null : product?.photo_url ?? null;

  function validate(): FieldErrors {
    const e: FieldErrors = {};
    if (!name.trim()) e.name = "Please enter a name.";
    if (!retail.trim()) e.retail = "Please enter a retail price.";
    else if (toPaise(retail) < 0) e.retail = "Price can't be negative.";
    if (wholesale.trim() && toPaise(wholesale) < 0) e.wholesale = "Price can't be negative.";
    return e;
  }

  async function applyImage(productId: string): Promise<string | null> {
    // Returns a warning message if the image step failed (product itself is saved).
    try {
      if (imageFile) {
        const file = await downscaleImage(imageFile);
        await uploadProductImage(productId, file);
      } else if (removeExisting && product?.photo_url) {
        await deleteProductImage(productId);
      }
      return null;
    } catch {
      return "Product saved, but the photo didn't upload. Open it again to add the photo.";
    }
  }

  async function handleSave() {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setSaving(true);
    setSaveError(null);

    const payload: ProductWritePayload = {
      name: name.trim(),
      category: category.trim() || null,
      retail_price: fromPaise(toPaise(retail)),
      last_wholesale_price: wholesale.trim() ? fromPaise(toPaise(wholesale)) : null,
    };

    try {
      const saved = isEdit
        ? await updateProduct(product!.id, payload)
        : await createProduct(payload);

      const imgWarning = await applyImage(saved.id);
      onSaved(imgWarning ?? (isEdit ? "Product updated." : "Product added."));
    } catch (err) {
      setSaveError(friendlyError(err, "Couldn't save the product. Please try again."));
    } finally {
      setSaving(false);
    }
  }

  async function handleRetire() {
    setConfirmRetire(false);
    setSaving(true);
    setSaveError(null);
    try {
      await retireProduct(product!.id);
      onSaved("Product hidden from billing. You can bring it back anytime.");
    } catch (err) {
      setSaveError(friendlyError(err, "Couldn't hide the product. Please try again."));
      setSaving(false);
    }
  }

  async function handleReactivate() {
    setSaving(true);
    setSaveError(null);
    try {
      await reactivateProduct(product!.id);
      onSaved("Product is back on the billing screen.");
    } catch (err) {
      setSaveError(friendlyError(err, "Couldn't restore the product. Please try again."));
      setSaving(false);
    }
  }

  return (
    <>
      <BottomSheet
        open={open}
        onClose={onClose}
        title={isEdit ? "Edit product" : "Add product"}
        footer={
          <div className="space-y-3">
            {saveError && (
              <p className="rounded-control bg-danger-soft px-4 py-3 text-base font-semibold text-danger" role="alert">
                {saveError}
              </p>
            )}
            <Button
              variant="primary"
              size="action"
              className="w-full"
              loading={saving}
              loadingLabel="Saving…"
              onClick={handleSave}
            >
              {isEdit ? "Save Product" : "Add Product"}
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Name */}
          <div>
            <label className="field-label" htmlFor="p-name">Name</label>
            <input
              id="p-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Money Plant"
              className={`field ${errors.name ? "field-error" : ""}`}
            />
            {errors.name && <p className="mt-1 text-base font-semibold text-danger">{errors.name}</p>}
          </div>

          {/* Category */}
          <div>
            <label className="field-label" htmlFor="p-category">Category (optional)</label>
            <input
              id="p-category"
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Plants, Pots, Soil, Tools"
              className="field"
            />
            {categories.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {categories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={[
                      "h-10 rounded-full border-2 px-3 text-base font-semibold transition-colors",
                      category === c
                        ? "border-primary-600 bg-primary-600 text-white"
                        : "border-border bg-surface text-ink-soft hover:border-border-strong",
                    ].join(" ")}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Retail price */}
          <div>
            <label className="field-label" htmlFor="p-retail">Retail price</label>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-ink">₹</span>
              <input
                id="p-retail"
                type="text"
                inputMode="decimal"
                value={retail}
                onChange={(e) => setRetail(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="0.00"
                className={`field text-xl font-bold ${errors.retail ? "field-error" : ""}`}
              />
            </div>
            {errors.retail && <p className="mt-1 text-base font-semibold text-danger">{errors.retail}</p>}
          </div>

          {/* Wholesale price */}
          <div>
            <label className="field-label" htmlFor="p-wholesale">Typical wholesale price (optional)</label>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-ink">₹</span>
              <input
                id="p-wholesale"
                type="text"
                inputMode="decimal"
                value={wholesale}
                onChange={(e) => setWholesale(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="0.00"
                className={`field text-xl font-bold ${errors.wholesale ? "field-error" : ""}`}
              />
            </div>
            <p className="mt-1 text-base text-ink-soft">
              Just a starting point — you can change it for each wholesale sale.
            </p>
            {errors.wholesale && <p className="mt-1 text-base font-semibold text-danger">{errors.wholesale}</p>}
          </div>

          {/* Photo */}
          <div>
            <label className="field-label">Photo (optional)</label>
            <ImagePicker
              file={imageFile}
              existingUrl={existingUrl}
              onSelect={(f) => setImageFile(f)}
              onRemove={() => {
                if (imageFile) setImageFile(null);
                else setRemoveExisting(true);
                setImgError(null);
              }}
              onError={setImgError}
            />
            {imgError && <p className="mt-2 text-base font-semibold text-danger">{imgError}</p>}
          </div>

          {/* Retire / Restore (edit only) */}
          {isEdit && (
            <div className="border-t border-border pt-4">
              {product!.is_active ? (
                <button
                  type="button"
                  onClick={() => setConfirmRetire(true)}
                  className="h-tap w-full rounded-control border-2 border-border-strong px-3 text-base font-semibold text-danger hover:bg-danger-soft"
                >
                  Hide / retire this product
                </button>
              ) : (
                <Button variant="secondary" size="action" className="w-full" onClick={handleReactivate}>
                  Restore to billing screen
                </Button>
              )}
            </div>
          )}
        </div>
      </BottomSheet>

      <ConfirmDialog
        open={confirmRetire}
        title="Hide this product?"
        body="It won't show on the billing screen. You can bring it back later from “Show retired”."
        confirmLabel="Hide product"
        cancelLabel="Keep it"
        destructive
        onConfirm={handleRetire}
        onCancel={() => setConfirmRetire(false)}
      />
    </>
  );
}
