import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "dispatcer" | "ridic";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  /** Role platné pro zobrazení – při více rolích jen aktivní role. */
  roles: AppRole[];
  /** Všechny skutečné role uživatele. */
  availableRoles: AppRole[];
  activeRole: AppRole | null;
  setActiveRole: (role: AppRole) => void;
  needsRoleChoice: boolean;
  loading: boolean;
  hasRole: (role: AppRole) => boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const storageKey = (uid: string) => `activeRole:${uid}`;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [availableRoles, setAvailableRoles] = useState<AppRole[]>([]);
  const [activeRole, setActiveRoleState] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRoles = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const list = data ? data.map((r) => r.role as AppRole) : [];
    setAvailableRoles(list);
    const stored = window.localStorage.getItem(storageKey(userId)) as AppRole | null;
    if (list.length === 1) setActiveRoleState(list[0]);
    else if (stored && list.includes(stored)) setActiveRoleState(stored);
    else setActiveRoleState(null);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        if (session?.user) {
          setTimeout(async () => {
            await fetchRoles(session.user.id);
            setLoading(false);
          }, 0);
        } else {
          setAvailableRoles([]);
          setActiveRoleState(null);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        await fetchRoles(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const setActiveRole = (role: AppRole) => {
    if (!availableRoles.includes(role)) return;
    if (session?.user) window.localStorage.setItem(storageKey(session.user.id), role);
    setActiveRoleState(role);
  };

  const needsRoleChoice = availableRoles.length > 1 && !activeRole;
  const roles: AppRole[] =
    availableRoles.length > 1 ? (activeRole ? [activeRole] : []) : availableRoles;

  const hasRole = (role: AppRole) => roles.includes(role);
  const isAdmin = hasRole("admin");

  const signOut = async () => {
    if (session?.user) window.localStorage.removeItem(storageKey(session.user.id));
    await supabase.auth.signOut();
    setSession(null);
    setAvailableRoles([]);
    setActiveRoleState(null);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        roles,
        availableRoles,
        activeRole,
        setActiveRole,
        needsRoleChoice,
        loading,
        hasRole,
        isAdmin,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
