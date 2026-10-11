import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Navigate, Outlet } from "react-router-dom";

export type AuthUser = {
  id: string;
  email: string;
  display_name: string | null;
};

const DEFAULT_DEMO_USER: AuthUser = {
  id: "demo-user-1",
  email: "alex.sales@clara.ai",
  display_name: "Alex Morgan",
};

export function getStoredToken(): string | null {
  return "demo-static-token";
}

export function clearStoredToken(): void {
  // no-op for demo
}

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Default to authenticated demo user so anyone landing on the site immediately sees the dashboard!
  const [user, setUser] = useState<AuthUser | null>(DEFAULT_DEMO_USER);
  const [token, setToken] = useState<string | null>("demo-static-token");
  const [loading] = useState(false);

  const login = useCallback(async (email: string, _password: string) => {
    const nextUser: AuthUser = {
      id: "demo-user-1",
      email: email || "demo@clara.ai",
      display_name: email.split("@")[0] || "Demo User",
    };
    setUser(nextUser);
    setToken("demo-static-token");
  }, []);

  const signup = useCallback(async (email: string, _password: string, displayName?: string) => {
    const nextUser: AuthUser = {
      id: "demo-user-1",
      email: email || "demo@clara.ai",
      display_name: displayName || "Demo User",
    };
    setUser(nextUser);
    setToken("demo-static-token");
  }, []);

  const logout = useCallback(() => {
    setUser(DEFAULT_DEMO_USER);
    setToken("demo-static-token");
  }, []);

  const value = useMemo(
    () => ({ user, token, loading, login, signup, logout }),
    [user, token, loading, login, signup, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

function AuthGate({ guest }: { guest?: boolean }) {
  if (guest) return <Navigate to="/" replace />;
  return <Outlet />;
}

export function ProtectedRoute() {
  return <AuthGate />;
}

export function GuestRoute() {
  return <AuthGate guest />;
}
