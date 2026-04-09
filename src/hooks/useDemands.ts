import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { DemandStatus } from "@/types/demands";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";
import { handleApiError } from "@/lib/errors";
import type { PhaseKey, UpdatePhaseLabelPayload } from "@/lib/demandPhases";
import { supabase } from "@/integrations/supabase/client";
import {
  listDemands,
  listDeliverables,
  updateDemandStatus,
  updateDemandPhase,
  updateDemandPhaseLabel,
  deleteDemand,
} from "@/services/demandService";
import type { DemandRow } from "@/types/demands";

type DemandsSnapshot = { previousDemands: DemandRow[] };

export function useDemands() {
  const queryClient = useQueryClient();

  const demandsQuery = useQuery({
    queryKey: queryKeys.demands.all,
    queryFn: listDemands,
  });
  const deliverablesQuery = useQuery({
    queryKey: queryKeys.deliverables.all,
    queryFn: listDeliverables,
  });

  useEffect(() => {
    const channel = supabase
      .channel("demands-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "demands" }, () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.demands.all });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "demand_deliverables" }, () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.deliverables.all });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: DemandStatus }) => {
      await updateDemandStatus(id, status);
    },
    onMutate: async ({ id, status }): Promise<DemandsSnapshot> => {
      await queryClient.cancelQueries({ queryKey: queryKeys.demands.all });
      const previousDemands = queryClient.getQueryData<DemandRow[]>(queryKeys.demands.all) ?? [];
      queryClient.setQueryData<DemandRow[]>(queryKeys.demands.all, (old = []) =>
        old.map((d) => (d.id === id ? { ...d, status } : d)),
      );
      return { previousDemands };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.demands.all }),
    onError: (e, _vars, ctx) => {
      if (ctx?.previousDemands) {
        queryClient.setQueryData(queryKeys.demands.all, ctx.previousDemands);
      }
      handleApiError(e, "Erro ao atualizar status.");
    },
  });

  const updatePhaseMutation = useMutation({
    mutationFn: async ({
      id,
      phase,
      checked,
    }: {
      id: string;
      phase: PhaseKey;
      checked: boolean;
    }) => {
      await updateDemandPhase(id, phase, checked);
    },
    onMutate: async ({ id, phase, checked }): Promise<DemandsSnapshot> => {
      await queryClient.cancelQueries({ queryKey: queryKeys.demands.all });
      const previousDemands = queryClient.getQueryData<DemandRow[]>(queryKeys.demands.all) ?? [];
      queryClient.setQueryData<DemandRow[]>(queryKeys.demands.all, (old = []) =>
        old.map((d) => (d.id === id ? { ...d, [phase]: checked } : d)),
      );
      return { previousDemands };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.demands.all }),
    onError: (e, _vars, ctx) => {
      if (ctx?.previousDemands) {
        queryClient.setQueryData(queryKeys.demands.all, ctx.previousDemands);
      }
      handleApiError(e, "Erro ao atualizar fase.");
    },
  });

  const updatePhaseLabelMutation = useMutation({
    mutationFn: async ({ id, labelColumn, value }: UpdatePhaseLabelPayload) => {
      await updateDemandPhaseLabel(id, labelColumn, value);
    },
    onMutate: async ({ id, labelColumn, value }): Promise<DemandsSnapshot> => {
      await queryClient.cancelQueries({ queryKey: queryKeys.demands.all });
      const previousDemands = queryClient.getQueryData<DemandRow[]>(queryKeys.demands.all) ?? [];
      const nextValue = value.trim().slice(0, 120);
      queryClient.setQueryData<DemandRow[]>(queryKeys.demands.all, (old = []) =>
        old.map((d) => (d.id === id ? { ...d, [labelColumn]: nextValue } : d)),
      );
      return { previousDemands };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.demands.all }),
    onError: (e, _vars, ctx) => {
      if (ctx?.previousDemands) {
        queryClient.setQueryData(queryKeys.demands.all, ctx.previousDemands);
      }
      handleApiError(e, "Erro ao salvar nome da etapa.");
    },
  });

  const deleteDemandMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteDemand(id);
    },
    onMutate: async (id): Promise<DemandsSnapshot> => {
      await queryClient.cancelQueries({ queryKey: queryKeys.demands.all });
      const previousDemands = queryClient.getQueryData<DemandRow[]>(queryKeys.demands.all) ?? [];
      queryClient.setQueryData<DemandRow[]>(queryKeys.demands.all, (old = []) => old.filter((d) => d.id !== id));
      return { previousDemands };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.demands.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.deliverables.all });
      toast.success("Demanda apagada.");
    },
    onError: (e, _vars, ctx) => {
      if (ctx?.previousDemands) {
        queryClient.setQueryData(queryKeys.demands.all, ctx.previousDemands);
      }
      handleApiError(e, "Erro ao apagar demanda.");
    },
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
    updatePhaseLabelMutation,
    deleteDemandMutation,
  };
}
