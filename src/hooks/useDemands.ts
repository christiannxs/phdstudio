import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DemandRow, DeliverableRow, DemandStatus } from "@/types/demands";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";
import { handleApiError } from "@/lib/errors";

async function fetchDemands(): Promise<DemandRow[]> {
  const { data, error } = await supabase
    .from("demands")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as DemandRow[];
}

async function fetchDeliverables(): Promise<DeliverableRow[]> {
  const { data, error } = await supabase.from("demand_deliverables").select("*");
  if (error) throw error;
  return (data ?? []) as DeliverableRow[];
}

export function useDemands() {
  const queryClient = useQueryClient();

  const demandsQuery = useQuery({
    queryKey: queryKeys.demands.all,
    queryFn: fetchDemands,
  });
  const deliverablesQuery = useQuery({
    queryKey: queryKeys.deliverables.all,
    queryFn: fetchDeliverables,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: DemandStatus }) => {
      const { error } = await supabase.from("demands").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.demands.all }),
    onError: (e) => handleApiError(e, "Erro ao atualizar status."),
  });

  const updatePhaseMutation = useMutation({
    mutationFn: async ({
      id,
      phase,
      checked,
    }: {
      id: string;
      phase: "phase_producao" | "phase_gravacao" | "phase_mix_master";
      checked: boolean;
    }) => {
      const { error } = await supabase.from("demands").update({ [phase]: checked }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.demands.all }),
    onError: (e) => handleApiError(e, "Erro ao atualizar fase."),
  });

  const deleteDemandMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("demands").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.demands.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.deliverables.all });
      toast.success("Demanda apagada.");
    },
    onError: (e) => handleApiError(e, "Erro ao apagar demanda."),
  });

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.demands.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.deliverables.all });
  };

  const demands = demandsQuery.data ?? [];
  const deliverables = deliverablesQuery.data ?? [];
  const isLoading = demandsQuery.isLoading;
  const isError = demandsQuery.isError || deliverablesQuery.isError;
  const error = demandsQuery.error ?? deliverablesQuery.error;

  return {
    demands,
    deliverables,
    isLoading,
    isError,
    error,
    refetch,
    updateStatusMutation,
    updatePhaseMutation,
    deleteDemandMutation,
  };
}
