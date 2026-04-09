import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { DemandStatus } from "@/types/demands";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";
import { handleApiError } from "@/lib/errors";
import type { PhaseKey, UpdatePhaseLabelPayload } from "@/lib/demandPhases";
import {
  listDemands,
  listDeliverables,
  updateDemandStatus,
  updateDemandPhase,
  updateDemandPhaseLabel,
  deleteDemand,
} from "@/services/demandService";

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

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: DemandStatus }) => {
      await updateDemandStatus(id, status);
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
      phase: PhaseKey;
      checked: boolean;
    }) => {
      await updateDemandPhase(id, phase, checked);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.demands.all }),
    onError: (e) => handleApiError(e, "Erro ao atualizar fase."),
  });

  const updatePhaseLabelMutation = useMutation({
    mutationFn: async ({ id, labelColumn, value }: UpdatePhaseLabelPayload) => {
      await updateDemandPhaseLabel(id, labelColumn, value);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.demands.all }),
    onError: (e) => handleApiError(e, "Erro ao salvar nome da etapa."),
  });

  const deleteDemandMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteDemand(id);
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
    updatePhaseLabelMutation,
    deleteDemandMutation,
  };
}
