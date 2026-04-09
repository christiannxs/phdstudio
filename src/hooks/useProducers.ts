import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/hooks/useAuth";
import { queryKeys } from "@/lib/query-keys";

function normalizeProducerNames(names: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(
      names
        .map((name) => (typeof name === "string" ? name.trim() : ""))
        .filter((name) => name.length > 0),
    ),
  ).sort((a, b) => a.localeCompare(b));
}

/**
 * Lista de produtores: tenta RPC get_producers; se falhar (ex.: migration não aplicada),
 * admin pode buscar direto de user_roles + profiles.
 */
export async function fetchProducers(role: AppRole | null): Promise<string[]> {
  const { data, error } = await supabase.rpc("get_producers");
  if (!error && data != null) {
    return normalizeProducerNames(data.map((r: { display_name: string | null }) => r.display_name));
  }
  // Fallback: admin lê direto das tabelas (user_roles + profiles)
  if (role === "admin") {
    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "produtor");
    if (rolesError || !roles?.length) return [];
    const userIds = roles.map((r) => r.user_id);
    const { data: profiles, error: profError } = await supabase
      .from("profiles")
      .select("display_name")
      .in("user_id", userIds);
    if (profError || !profiles?.length) return [];
    return normalizeProducerNames(profiles.map((p) => p.display_name));
  }
  return [];
}

export function useProducers(role: AppRole | null) {
  return useQuery({
    queryKey: queryKeys.producers.all(role),
    queryFn: () => fetchProducers(role),
    enabled: role != null,
  });
}
