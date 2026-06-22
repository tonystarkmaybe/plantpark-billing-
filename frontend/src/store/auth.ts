import { create } from "zustand";
import { api, configureApiAuth, friendlyError } from "@/api/client";
import type { LoginResponse, User } from "@/api/types";

const TOKEN_KEY = "plantora.token";

/**
 * Token persistence tradeoff:
 * We store the JWT in localStorage so a refresh/relaunch keeps the user logged
 * in — these are personal, single-user shop devices used all day, and the
 * backend token is intentionally long-lived. localStorage is readable by any JS
 * on the origin (XSS risk), which we accept here for UX; we mitigate by keeping
 * the API surface small and sanitizing rendered content. Revisit if the app
 * ever serves untrusted third-party scripts.
 */
function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
function writeToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable (private mode) — session stays in-memory only */
  }
}

interface AuthState {
  token: string | null;
  user: User | null;
  /** True until the initial /auth/me hydration completes. */
  initializing: boolean;
  isAuthenticated: () => boolean;
  /** Logs in, persists token, hydrates the user. Throws a friendly message on failure. */
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  /** Called once on app load: if a token exists, hydrate the user via /auth/me. */
  init: () => Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => ({
  token: readToken(),
  user: null,
  initializing: true,

  isAuthenticated: () => Boolean(get().token && get().user),

  login: async (email, password) => {
    try {
      const { data } = await api.post<LoginResponse>("/auth/login", { email, password });
      writeToken(data.access_token);
      set({ token: data.access_token });
      const me = await api.get<User>("/auth/me");
      set({ user: me.data });
      return me.data;
    } catch (error) {
      // Roll back any partial token on failure.
      writeToken(null);
      set({ token: null, user: null });
      throw new Error(friendlyError(error, "Email or password is incorrect."));
    }
  },

  logout: () => {
    writeToken(null);
    set({ token: null, user: null });
  },

  init: async () => {
    const token = get().token;
    if (!token) {
      set({ initializing: false });
      return;
    }
    try {
      const me = await api.get<User>("/auth/me");
      set({ user: me.data, initializing: false });
    } catch {
      // Token invalid/expired — clear and fall back to login.
      writeToken(null);
      set({ token: null, user: null, initializing: false });
    }
  },
}));

// Wire the Axios client to the store (token source + 401 handler).
configureApiAuth({
  getToken: () => useAuth.getState().token,
  onUnauthorized: () => {
    // Clear session; ProtectedRoute will redirect to /login on next render.
    useAuth.getState().logout();
  },
});
