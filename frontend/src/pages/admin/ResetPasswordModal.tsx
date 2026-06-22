import { useEffect, useState } from "react";
import { resetOwnerPassword, type ShopRow } from "@/api/admin";
import { friendlyError } from "@/api/client";
import { Modal } from "@/components/admin/Modal";
import { Button } from "@/components/Button";
import { CredentialDisplay } from "@/components/admin/CredentialDisplay";
import { generatePassword } from "@/lib/password";

interface ResetPasswordModalProps {
  shop: ShopRow | null;
  onClose: () => void;
}

/** Sets a new password for a shop's owner and reveals it once. */
export function ResetPasswordModal({ shop, onClose }: ResetPasswordModalProps) {
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!shop) return;
    setPassword(generatePassword());
    setSubmitting(false);
    setError(null);
    setDone(false);
  }, [shop]);

  async function handleReset() {
    if (!shop || password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await resetOwnerPassword(shop.id, password);
      setDone(true);
    } catch (err) {
      setError(friendlyError(err, "Couldn't reset the password. Please try again."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={shop !== null}
      onClose={onClose}
      title={done ? "Password reset" : "Reset owner password"}
      dismissible={!submitting}
      footer={
        done ? (
          <Button variant="primary" size="action" onClick={onClose}>
            Done
          </Button>
        ) : (
          <div className="flex gap-3">
            <Button variant="ghost" size="action" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" size="action" loading={submitting} loadingLabel="Resetting…" onClick={handleReset}>
              Reset password
            </Button>
          </div>
        )
      }
    >
      {!shop ? null : done ? (
        <CredentialDisplay
          title={`New login for ${shop.name}:`}
          email={shop.owner_email ?? ""}
          password={password}
        />
      ) : (
        <div className="space-y-4">
          {error && (
            <p className="rounded-control bg-danger-soft px-3 py-2 text-base font-semibold text-danger" role="alert">
              {error}
            </p>
          )}
          <p className="text-base text-ink-soft">
            Set a new password for <span className="font-semibold text-ink">{shop.owner_email}</span> ({shop.name}). The
            current password will stop working immediately.
          </p>
          <div>
            <label className="mb-1 block text-sm font-semibold text-ink">New password</label>
            <div className="flex gap-2">
              <input
                className="h-11 w-full rounded-control border-2 border-border bg-white px-3 font-mono text-base text-ink focus:border-primary-600 focus:outline-none focus:ring-4 focus:ring-primary-600/20"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setPassword(generatePassword())}
                className="shrink-0 rounded-control border border-border-strong px-3 text-sm font-semibold text-ink hover:bg-surface-muted"
              >
                Generate
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
