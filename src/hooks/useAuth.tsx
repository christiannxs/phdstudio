import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { Enums } from "@/integrations/supabase/types";

export type AppRole = "atendente" | "produtor" | "ceo" | "admin";

interface AuthContextType {
  user: { id: string } | null;
  role: AppRole | null;
  displayName: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: unknown }>;
  signUpWithRole: (email: string, password: string, displayName: string, role: AppRole) => Promise<{ error: unknown }>;
  createUserAsAdmin: (email: string, password: string, displayName: string, role: AppRole) => Promise<{ error: unknown }>;
  sendPasswordReset: (email: string) => Promise<{ error: unknown }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<AppRole | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);

  const normalizeAuthError = (error: unknown): Error => {
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("failed to fetch") || msg.includes("networkerror")) {
        return new Error(
          "Falha de conexão com o servidor de autenticação. Verifique internet, URL do Supabase e se o projeto está ativo."
        );
      }
      return error;
    }
    return new Error("Erro inesperado de autenticação.");
  };

  const fetchProfile = async (userId: string) => {
    const [profileRes, roleRes] = await Promise.all([
      supabase.from("profiles").select("display_name").eq("user_id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId).limit(1).maybeSingle(),
    ]);
    setDisplayName(profileRes.data?.display_name ?? null);
    setRole((roleRes.data?.role as AppRole) ?? null);
  };

  useEffect(() => {
    const TIMEOUT_MS = 10000;
    const init = async () => {
      try {
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Auth timeout")), TIMEOUT_MS)
        );
        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);
        if (session?.user) {
          setUser({ id: session.user.id });
          await fetchProfile(session.user.id);
        } else {
          setUser(null);
          setRole(null);
          setDisplayName(null);
        }
      } catch (e) {
        console.error("Auth init error:", e);
        setUser(null);
        setRole(null);
        setDisplayName(null);
      } finally {
        setLoading(false);
      }
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser({ id: session.user.id });
        // Evita await aqui: operações síncronas no callback podem fazer chamadas Supabase subsequentes travar
        fetchProfile(session.user.id);
      } else {
        setUser(null);
        setRole(null);
        setDisplayName(null);
      }
      if (event !== "INITIAL_SESSION") setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: normalizeAuthError(error) };
      return { error: null };
    } catch (error) {
      return { error: normalizeAuthError(error) };
    }
  };

  const signUpWithRole = async (email: string, password: string, name: string, roleValue: AppRole) => {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: name } },
    });
    if (authError) return { error: authError };
    const userId = authData.user?.id;
    if (!userId) return { error: new Error("Usuário não criado") };

    await supabase.from("profiles").update({ display_name: name }).eq("user_id", userId);
    await supabase.from("user_roles").delete().eq("user_id", userId);
    await supabase.from("user_roles").insert({ user_id: userId, role: roleValue as Enums["app_role"] });
    return { error: null };
  };

  const createUserAsAdmin = async (email: string, password: string, displayName: string, roleValue: AppRole) => {
    const getValidToken = async (): Promise<string | null> => {
      // Força refresh primeiro para evitar token expirado na chamada à Edge Function
      const { data: { session: refreshed }, error: refreshError } = await supabase.auth.refreshSession();
      if (!refreshError && refreshed?.access_token) return refreshed.access_token;
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) return session.access_token;
      return null;
    };

    const token = await getValidToken();
    if (!token) {
      return { error: new Error("Sessão inválida. Faça login novamente.") };
    }

    const invokeCreateUser = async (accessToken: string) => {
      return supabase.functions.invoke("create-user", {
        body: { email, password, displayName, role: roleValue },
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    };

    try {
      let result = await invokeCreateUser(token);
      let fnError = result.error;

      // Se 401, tenta refresh e uma nova tentativa
      const resp = (fnError as { context?: Response })?.context;
      if (resp?.status === 401) {
        const { data: { session: refreshed }, error: refreshErr } = await supabase.auth.refreshSession();
        if (!refreshErr && refreshed?.access_token) {
          result = await invokeCreateUser(refreshed.access_token);
          fnError = result.error;
        }
      }

      if (fnError) {
        let msg = "Erro ao criar usuário";
        const r = (fnError as { context?: Response })?.context;
        if (r) {
          const status = r.status;
          if (status === 404) msg = "Função create-user não encontrada. Rode: npm run deploy:create-user";
          else if (status === 403) msg = "Apenas administradores podem criar usuários.";
          else if (status === 401) msg = "Sessão inválida. Faça login novamente.";
          if (typeof r.json === "function") {
            try {
              const body = await r.json() as { error?: string; detail?: string };
              if (typeof body?.error === "string") msg = body.error;
              if (status === 401 && typeof body?.detail === "string") msg += ` (${body.detail})`;
            } catch {
              // ignora falha ao parsear JSON
            }
          }
        }
        return { error: new Error(msg) };
      }

      const { data } = result;
      const err = (data as { error?: string })?.error;
      if (err) return { error: new Error(typeof err === "string" ? err : "Erro ao criar usuário") };

      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error("Erro ao chamar o servidor") };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const sendPasswordReset = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });
      if (error) return { error: normalizeAuthError(error) };
      return { error: null };
    } catch (error) {
      return { error: normalizeAuthError(error) };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        displayName,
        loading,
        signIn,
        signUpWithRole,
        createUserAsAdmin,
        sendPasswordReset,
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
