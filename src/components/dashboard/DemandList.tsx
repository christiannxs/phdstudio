import DemandCard from "@/components/DemandCard";
import type { DemandRow, DeliverableRow } from "@/types/demands";
import type { AppRole } from "@/hooks/useAuth";
import type { UseMutationResult } from "@tanstack/react-query";
import type { PhaseKey, UpdatePhaseLabelPayload } from "@/lib/demandPhases";

interface DemandListProps {
  filtered: DemandRow[];
  deliverables: DeliverableRow[];
  role: AppRole | null;
  userId: string;
  updatingId: string | null;
  onUpdateStatus: (id: string, newStatus: string) => void;
  onRefresh: () => void;
  canEditOrDelete: boolean;
  onDelete: (id: string) => void;
  onViewDemand?: (demand: DemandRow) => void;
  updatePhaseMutation: UseMutationResult<
    void,
    Error,
    { id: string; phase: PhaseKey; checked: boolean },
    unknown
  >;
  updatePhaseLabelMutation: UseMutationResult<void, Error, UpdatePhaseLabelPayload, unknown>;
  deleteDemandMutation: UseMutationResult<void, Error, string, unknown>;
}

export default function DemandList({
  filtered,
  deliverables,
  role,
  userId,
  updatingId,
  onUpdateStatus,
  onRefresh,
  canEditOrDelete,
  onDelete,
  onViewDemand,
  updatePhaseMutation,
  updatePhaseLabelMutation,
  deleteDemandMutation,
}: DemandListProps) {
  const deliverableByDemandId = new Map(deliverables.map((d) => [d.demand_id, d]));

  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:max-w-6xl lg:grid-cols-2 xl:grid-cols-2"
      role="list"
    >
      {filtered.map((d) => (
        <DemandCard
          key={d.id}
          demand={d}
          role={role}
          deliverable={deliverableByDemandId.get(d.id) ?? null}
          userId={userId}
          onUpdateStatus={onUpdateStatus}
          onUpdatePhase={updatePhaseMutation.mutate}
          onUpdatePhaseLabel={updatePhaseLabelMutation.mutate}
          updatingPhase={updatePhaseMutation.isPending && updatePhaseMutation.variables?.id === d.id}
          updatingPhaseLabel={updatePhaseLabelMutation.isPending && updatePhaseLabelMutation.variables?.id === d.id}
          onRefresh={onRefresh}
          updating={updatingId === d.id}
          canEditOrDelete={canEditOrDelete}
          onDelete={canEditOrDelete ? onDelete : undefined}
          onViewDemand={onViewDemand}
          deleting={deleteDemandMutation.isPending}
        />
      ))}
    </div>
  );
}
