import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import type { UserProfile } from "../types";

interface AuthState {
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  userTeamId: string | null;
  login: (email: string, password: string) => Promise<string | null>;
  register: (data: RegisterData) => Promise<string | null>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  login: string;
  role?: "admin" | "user";
  team_id?: string | null;
}

const AuthCtx = createContext<AuthState>({
  session: null,
  profile: null,
  loading: true,
  isAdmin: false,
  userTeamId: null,
  login: async () => null,
  register: async () => null,
  logout: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthCtx);

async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*, team:teams(*)")
    .eq("id", userId)
    .single();
  if (error || !data) return null;
  return data as unknown as UserProfile;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    const p = await fetchProfile(userId);
    setProfile(p);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) {
        loadProfile(s.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user) {
        loadProfile(s.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return error ? error.message : null;
  }, []);

  const register = useCallback(async (d: RegisterData) => {
    const { error } = await supabase.auth.signUp({
      email: d.email,
      password: d.password,
      options: {
        data: {
          first_name: d.first_name,
          last_name: d.last_name,
          login: d.login,
          role: d.role ?? "user",
          team_id: d.team_id ?? null,
        },
      },
    });
    return error ? error.message : null;
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user) await loadProfile(session.user.id);
  }, [session, loadProfile]);

  return (
    <AuthCtx.Provider
      value={{
        session,
        profile,
        loading,
        isAdmin: profile?.role === "admin",
        userTeamId: profile?.team_id ?? null,
        login,
        register,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}
