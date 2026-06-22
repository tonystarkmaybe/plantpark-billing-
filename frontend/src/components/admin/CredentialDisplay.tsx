import { CopyField } from "./CopyField";

interface CredentialDisplayProps {
  title?: string;
  shopName?: string;
  email: string;
  password: string;
}

/**
 * Shows login credentials exactly once after creating a shop or resetting a
 * password. The password is never retrievable again (it's hashed server-side),
 * so this is the moment to copy and hand it to the owner.
 */
export function CredentialDisplay({ title, shopName, email, password }: CredentialDisplayProps) {
  return (
    <div className="space-y-4">
      {title && <p className="text-base font-semibold text-ink">{title}</p>}

      <div className="rounded-control border-2 border-warning/40 bg-warning-soft px-4 py-3 text-base font-semibold text-warning">
        Save these now — the password is shown only once and cannot be retrieved later.
      </div>

      {shopName && (
        <div>
          <div className="text-sm font-semibold text-ink-soft">Shop</div>
          <div className="mt-1 text-lg font-bold text-ink">{shopName}</div>
        </div>
      )}
      <CopyField label="Login email" value={email} />
      <CopyField label="Password" value={password} mono />
    </div>
  );
}
