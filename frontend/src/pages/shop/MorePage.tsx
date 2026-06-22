import { useNavigate } from "react-router-dom";
import { useAuth } from "@/store/auth";
import { Placeholder } from "./Placeholder";
import { Button } from "@/components/Button";

export function MorePage() {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const navigate = useNavigate();

  return (
    <Placeholder
      title="More"
      blurb="Shop settings — GST toggle, receipt options, and account details — will live here. Coming in a later prompt."
    >
      <div className="mt-6 border-t border-border pt-5">
        <p className="text-base text-ink-soft">
          Signed in as <span className="font-semibold text-ink">{user?.email}</span>
        </p>
        <div className="mt-4">
          <Button
            variant="secondary"
            size="action"
            onClick={() => {
              logout();
              navigate("/login", { replace: true });
            }}
          >
            Log out
          </Button>
        </div>
      </div>
    </Placeholder>
  );
}
