// Cliente Supabase: criação preguiçosa para não lançar na importação do módulo
// (evita tela branca) e para permitir import estático de App sem quebrar React Fast Refresh.
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

let client: SupabaseClient<Database> | null = null;

function getClient(): SupabaseClient<Database> {
  if (client) return client;
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) {
    throw new Error(
      "Configuração Supabase ausente: defina VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no .env"
    );
  }
  client = createClient<Database>(url, key, {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
  return client;
}

/**
 * Instância com a mesma API de `SupabaseClient`, criada no primeiro acesso.
 * Não chama `createClient` na importação deste ficheiro.
 */
export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop, _receiver) {
    const c = getClient();
    const value = Reflect.get(c, prop, c) as unknown;
    if (typeof value === "function") {
      return value.bind(c);
    }
    return value;
  },
});
