import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/store/auth";
import { Button } from "@/components/Button";
import { Spinner } from "@/components/Spinner";
import { TextInput } from "@/components/TextInput";
import { BottomSheet } from "@/components/BottomSheet";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { generatePassword } from "@/lib/password";
import {
  listSalespeople,
  createSalesperson,
  updateSalespersonStatus,
  resetSalespersonPassword,
  deleteSalesperson,
  type Salesperson,
} from "@/api/shop_users";
import { friendlyError } from "@/api/client";
import { UserPlus, Key, UserCheck, UserX, AlertCircle, Trash2 } from "lucide-react";

export function MorePage() {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const navigate = useNavigate();

  const [salespeople, setSalespeople] = useState<Salesperson[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal/Sheet states
  const [createOpen, setCreateOpen] = useState(false);
  const [resetUser, setResetUser] = useState<Salesperson | null>(null);
  const [toggleUser, setToggleUser] = useState<Salesperson | null>(null);
  const [deleteUser, setDeleteUser] = useState<Salesperson | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const isOwner = user?.role === "shop_owner";

  const load = useCallback(async () => {
    if (!isOwner) return;
    setLoading(true);
    setError(null);
    try {
      setSalespeople(await listSalespeople());
    } catch (e) {
      setError(friendlyError(e, "Couldn't load staff accounts."));
    } finally {
      setLoading(false);
    }
  }, [isOwner]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleToggleStatus() {
    if (!toggleUser) return;
    setBusyId(toggleUser.id);
    const nextActive = !toggleUser.is_active;
    try {
      await updateSalespersonStatus(toggleUser.id, nextActive);
      await load();
      setToggleUser(null);
    } catch (e) {
      alert(friendlyError(e, "Could not update status."));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeleteSalesperson() {
    if (!deleteUser) return;
    setBusyId(deleteUser.id);
    try {
      await deleteSalesperson(deleteUser.id);
      await load();
      setDeleteUser(null);
    } catch (e) {
      alert(friendlyError(e, "Could not delete staff account."));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="rounded-2xl border border-border bg-white p-5 shadow-sm space-y-4">
        <div>
          <h2 className="text-xl font-bold text-ink">Nursery Profile</h2>
          <p className="text-sm text-ink-soft mt-1">Details of your active login session.</p>
        </div>
        <div className="border-t border-border pt-4 space-y-2">
          <div className="flex justify-between text-base">
            <span className="text-ink-soft">Login Email:</span>
            <span className="font-semibold text-ink">{user?.email}</span>
          </div>
          <div className="flex justify-between text-base">
            <span className="text-ink-soft">Account Role:</span>
            <span className="font-semibold capitalize text-primary-700 bg-primary-50 px-2.5 py-0.5 rounded-full text-sm">
              {user?.role === "shop_owner" ? "Nursery Owner" : "Salesperson"}
            </span>
          </div>
        </div>
        <div className="pt-2">
          <Button
            variant="secondary"
            className="w-full text-base border-2"
            onClick={() => {
              logout();
              navigate("/login", { replace: true });
            }}
          >
            Log out
          </Button>
        </div>
      </div>

      {/* Salesperson Management (Owner Only) */}
      {isOwner && (
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-ink">Manage Salespersons</h2>
              <p className="text-sm text-ink-soft mt-1">Staff accounts that can run the billing counter.</p>
            </div>
            <Button
              variant="primary"
              size="tap"
              className="flex items-center gap-1.5 rounded-xl px-4 py-2 font-bold"
              onClick={() => setCreateOpen(true)}
            >
              <UserPlus className="h-4.5 w-4.5" />
              Add Staff
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner className="h-8 w-8 text-primary-600" />
            </div>
          ) : error ? (
            <div className="py-6 text-center text-danger font-semibold space-y-2">
              <p>{error}</p>
              <Button variant="secondary" size="tap" onClick={load}>Try again</Button>
            </div>
          ) : salespeople.length === 0 ? (
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-6 text-center text-ink-soft">
              <p className="font-semibold text-base">No staff accounts created yet.</p>
              <p className="text-sm mt-0.5">Salespeople will be listed here once added.</p>
            </div>
          ) : (
            <div className="divide-y divide-border border-t border-border mt-3">
              {salespeople.map((sp) => (
                <div key={sp.id} className="py-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink truncate text-base">{sp.email}</p>
                    <span
                      className={`inline-flex items-center gap-1 mt-1 text-xs font-bold ${
                        sp.is_active ? "text-emerald-700 bg-emerald-50" : "text-slate-500 bg-slate-100"
                      } px-2 py-0.5 rounded-full`}
                    >
                      {sp.is_active ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
                      {sp.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={busyId === sp.id}
                      onClick={() => setResetUser(sp)}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-white
                                 text-ink hover:bg-surface-muted active:scale-95 disabled:opacity-50"
                      title="Reset password"
                    >
                      <Key className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={busyId === sp.id}
                      onClick={() => setDeleteUser(sp)}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-200 bg-red-50
                                 text-red-500 hover:bg-red-100 active:scale-95 disabled:opacity-50"
                      title="Delete salesperson"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={busyId === sp.id}
                      onClick={() => setToggleUser(sp)}
                      className={`flex h-10 px-3 items-center justify-center rounded-xl border text-sm font-bold active:scale-95 disabled:opacity-50 ${
                        sp.is_active
                          ? "border-red-200 bg-red-50 text-red-500 hover:bg-red-100"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      }`}
                    >
                      {sp.is_active ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Staff Sheet */}
      <CreateSalespersonSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={load}
      />

      {/* Reset Password Sheet */}
      <ResetSalespersonPasswordSheet
        user={resetUser}
        onClose={() => setResetUser(null)}
      />

      {/* Deactivate/Activate Confirmation */}
      <ConfirmDialog
        open={toggleUser !== null}
        title={toggleUser?.is_active ? "Deactivate Salesperson?" : "Activate Salesperson?"}
        body={
          toggleUser?.is_active
            ? `Deactivating ${toggleUser.email} will block them from making sales or logging in.`
            : `Activating ${toggleUser?.email} will restore their login access.`
        }
        confirmLabel={toggleUser?.is_active ? "Deactivate" : "Activate"}
        cancelLabel="Cancel"
        destructive={toggleUser?.is_active}
        onConfirm={handleToggleStatus}
        onCancel={() => setToggleUser(null)}
      />

      {/* Delete Salesperson Confirmation */}
      <ConfirmDialog
        open={deleteUser !== null}
        title="Delete Salesperson?"
        body={`Are you sure you want to permanently delete the salesperson account ${deleteUser?.email}? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onConfirm={handleDeleteSalesperson}
        onCancel={() => setDeleteUser(null)}
      />
    </div>
  );
}

/* Sub-components for Sheets */

function CreateSalespersonSheet({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ email: string; pass: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    setEmail("");
    setPassword(generatePassword());
    setError(null);
    setDone(null);
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || password.length < 8) return;

    setLoading(true);
    setError(null);

    try {
      await createSalesperson({
        email: email.trim(),
        password: password,
      });
      setDone({ email: email.trim(), pass: password });
      onCreated();
    } catch (err) {
      setError(friendlyError(err, "Couldn't add salesperson account."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={done ? "Staff Account Created" : "Add Salesperson Staff"}
      footer={
        done ? (
          <Button variant="primary" size="action" className="w-full" onClick={onClose}>
            Done
          </Button>
        ) : (
          <Button
            variant="primary"
            size="action"
            className="w-full"
            disabled={!email.trim() || password.length < 8 || loading}
            loading={loading}
            onClick={handleSubmit}
          >
            Create Staff Account
          </Button>
        )
      }
    >
      {done ? (
        <div className="space-y-4">
          <p className="text-base font-semibold text-ink-soft">
            Provide these login credentials to your salesperson staff:
          </p>
          <div className="rounded-2xl border border-border bg-slate-50 p-4 space-y-2.5 font-mono select-all">
            <div>
              <span className="text-xs text-ink-soft block font-sans">Login Email:</span>
              <span className="font-semibold text-ink text-base">{done.email}</span>
            </div>
            <div>
              <span className="text-xs text-ink-soft block font-sans">Password:</span>
              <span className="font-semibold text-ink text-base">{done.pass}</span>
            </div>
          </div>
          <p className="text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            Write this password down now! It won't be shown again for security reasons.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="rounded-control bg-danger-soft px-4 py-3 text-base font-semibold text-danger">
              {error}
            </p>
          )}

          <TextInput
            label="Staff Login Email"
            placeholder="e.g. staff@nursery.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required
            autoComplete="off"
          />

          <TextInput
            label="Account Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required
            autoComplete="off"
            trailing={
              <button
                type="button"
                onClick={() => setPassword(generatePassword())}
                className="h-10 border rounded-lg px-2.5 bg-white text-sm font-semibold text-ink hover:bg-slate-50"
              >
                Generate
              </button>
            }
          />
        </form>
      )}
    </BottomSheet>
  );
}

function ResetSalespersonPasswordSheet({
  user,
  onClose,
}: {
  user: Salesperson | null;
  onClose: () => void;
}) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ email: string; pass: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    setPassword(generatePassword());
    setError(null);
    setDone(null);
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || password.length < 8) return;

    setLoading(true);
    setError(null);

    try {
      await resetSalespersonPassword(user.id, password);
      setDone({ email: user.email, pass: password });
    } catch (err) {
      setError(friendlyError(err, "Couldn't reset staff password."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <BottomSheet
      open={user !== null}
      onClose={onClose}
      title={done ? "Password Reset Successfully" : "Reset Staff Password"}
      footer={
        done ? (
          <Button variant="primary" size="action" className="w-full" onClick={onClose}>
            Done
          </Button>
        ) : (
          <Button
            variant="primary"
            size="action"
            className="w-full"
            disabled={password.length < 8 || loading}
            loading={loading}
            onClick={handleSubmit}
          >
            Update Password
          </Button>
        )
      }
    >
      {done ? (
        <div className="space-y-4">
          <p className="text-base font-semibold text-ink-soft">
            New password for account <span className="font-semibold text-ink">{done.email}</span>:
          </p>
          <div className="rounded-2xl border border-border bg-slate-50 p-4 font-mono select-all text-center">
            <span className="font-bold text-ink text-xl">{done.pass}</span>
          </div>
          <p className="text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            Write this new password down now! It won't be shown again.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="rounded-control bg-danger-soft px-4 py-3 text-base font-semibold text-danger">
              {error}
            </p>
          )}

          <p className="text-base text-ink-soft">
            Reset password for staff account: <span className="font-semibold text-ink">{user?.email}</span>
          </p>

          <TextInput
            label="New Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required
            autoComplete="off"
            trailing={
              <button
                type="button"
                onClick={() => setPassword(generatePassword())}
                className="h-10 border rounded-lg px-2.5 bg-white text-sm font-semibold text-ink hover:bg-slate-50"
              >
                Generate
              </button>
            }
          />
        </form>
      )}
    </BottomSheet>
  );
}
