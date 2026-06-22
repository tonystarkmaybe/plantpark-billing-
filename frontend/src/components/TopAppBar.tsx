import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/store/auth";
import { LogOut } from "lucide-react";
import { LeafMark } from "./LeafMark";

/**
 * Simple top app bar: shop name on the left, an account/logout affordance on the
 * right. Logout asks for a quick confirm so an accidental tap doesn't end the
 * session mid-day.
 */
export function TopAppBar() {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);

  const shopName = user?.shop_name || "My Shop";

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface-muted/80 backdrop-blur-lg
                       pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-16 max-w-screen-sm items-center justify-between px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-primary-50">
            <LeafMark className="h-5 w-5 text-primary-600" />
          </span>
          <span className="truncate text-lg font-bold tracking-tight text-ink">{shopName}</span>
        </div>

        {confirming ? (
          <div className="flex items-center gap-2">
            <button
              onClick={handleLogout}
              className="btn-tap btn-primary px-4 text-base"
            >
              Log out
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="btn-tap btn-ghost px-3 text-base"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            className="flex h-tap items-center gap-2 rounded-control px-3 text-base font-semibold
                       text-ink-soft hover:bg-surface-muted hover:text-ink"
            aria-label="Account and logout"
          >
            <LogOut className="h-6 w-6" />
            <span>Logout</span>
          </button>
        )}
      </div>
    </header>
  );
}
