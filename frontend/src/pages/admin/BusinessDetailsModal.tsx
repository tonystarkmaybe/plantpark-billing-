import { useEffect, useState } from "react";
import { updateShop, type ShopRow } from "@/api/admin";
import { friendlyError } from "@/api/client";
import { Modal } from "@/components/admin/Modal";
import { Button } from "@/components/Button";

interface BusinessDetailsModalProps {
  shop: ShopRow | null;
  onClose: () => void;
  onSaved: () => void;
}

export function BusinessDetailsModal({ shop, onClose, onSaved }: BusinessDetailsModalProps) {
  const [businessName, setBusinessName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [businessUpi, setBusinessUpi] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shop) return;
    setBusinessName(shop.business_name || "");
    setBusinessAddress(shop.business_address || "");
    setBusinessPhone(shop.business_phone || "");
    setBusinessEmail(shop.business_email || "");
    setBusinessUpi(shop.business_upi || "");
    setError(null);
    setSubmitting(false);
  }, [shop]);

  async function handleSave() {
    if (!shop) return;
    setSubmitting(true);
    setError(null);
    try {
      await updateShop(shop.id, {
        business_name: businessName.trim() || null,
        business_address: businessAddress.trim() || null,
        business_phone: businessPhone.trim() || null,
        business_email: businessEmail.trim() || null,
        business_upi: businessUpi.trim() || null,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(friendlyError(err, "Couldn't save business details. Please try again."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={shop !== null}
      onClose={onClose}
      title={`Business details for ${shop?.name || "nursery"}`}
      dismissible={!submitting}
      footer={
        <div className="flex gap-3">
          <Button variant="ghost" size="action" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" size="action" loading={submitting} loadingLabel="Saving…" onClick={handleSave}>
            Save Details
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {error && (
          <p className="rounded-control bg-danger-soft px-3 py-2 text-base font-semibold text-danger" role="alert">
            {error}
          </p>
        )}

        <div>
          <label className="mb-1 block text-sm font-semibold text-ink">Business Name</label>
          <input
            className="h-11 w-full rounded-control border-2 border-border bg-white px-3 text-base text-ink focus:border-primary-600 focus:outline-none focus:ring-4 focus:ring-primary-600/20"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder={shop?.name || "Business name"}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-ink">Business Address</label>
          <textarea
            className="w-full rounded-control border-2 border-border bg-white px-3 py-2 text-base text-ink focus:border-primary-600 focus:outline-none focus:ring-4 focus:ring-primary-600/20 min-h-[5rem]"
            value={businessAddress}
            onChange={(e) => setBusinessAddress(e.target.value)}
            placeholder="Nursery address, City, Pin code"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-ink">Mobile Number</label>
          <input
            type="tel"
            className="h-11 w-full rounded-control border-2 border-border bg-white px-3 text-base text-ink focus:border-primary-600 focus:outline-none focus:ring-4 focus:ring-primary-600/20"
            value={businessPhone}
            onChange={(e) => setBusinessPhone(e.target.value)}
            placeholder="10 digit mobile number"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-ink">Email ID</label>
          <input
            type="email"
            className="h-11 w-full rounded-control border-2 border-border bg-white px-3 text-base text-ink focus:border-primary-600 focus:outline-none focus:ring-4 focus:ring-primary-600/20"
            value={businessEmail}
            onChange={(e) => setBusinessEmail(e.target.value)}
            placeholder="contact@nursery.com"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-ink">UPI ID (VPA)</label>
          <input
            className="h-11 w-full rounded-control border-2 border-border bg-white px-3 text-base text-ink focus:border-primary-600 focus:outline-none focus:ring-4 focus:ring-primary-600/20"
            value={businessUpi}
            onChange={(e) => setBusinessUpi(e.target.value)}
            placeholder="merchant@ybl"
          />
        </div>
      </div>
    </Modal>
  );
}
