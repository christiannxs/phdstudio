import { useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DemandGroupedList from "@/components/dashboard/DemandGroupedList";
import { groupDemands, type DemandOrganization } from "@/lib/demandGrouping";
import type { DemandRow, DeliverableRow } from "@/types/demands";
import type { AppRole } from "@/hooks/useAuth";
import type { UseMutationResult } from "@tanstack/react-query";
import type { PhaseKey, UpdatePhaseLabelPayload } from "@/lib/demandPhases";

export type DemandListVariant = "active" | "completed";

interface DemandListSectionProps {
  filtered: DemandRow[];
  /** Ajusta título e texto de ajuda (lista ativa vs só concluídas). */
  listVariant?: DemandListVariant;
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
  headingId: string;
}

export default function DemandListSection({
  filtered,
  listVariant = "active",
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
  headingId,
}: DemandListSectionProps) {
  const [organization, setOrganization] = useState<DemandOrganization>("status");
  const isCompletedList = listVariant === "completed";

  const deliverableByDemandId = useMemo(() => {
    const map = new Map<string, DeliverableRow>();
    for (const d of deliverables) map.set(d.demand_id, d);
    return map;
  }, [deliverables]);

  const groups = useMemo(() => groupDemands(filtered, organization), [filtered, organization]);

  return (
    <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
      <div className="flex flex-col gap-4 border-b border-border/60 bg-gradient-to-b from-muted/40 to-muted/10 px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-5">
        <div className="space-y-1">
          <h3 id={headingId} className="text-base font-semibold tracking-tight text-foreground">
            {isCompletedList ? "Demandas concluídas" : "Suas demandas"}
          </h3>
          <p className="text-pretty text-xs text-muted-foreground sm:max-w-lg">
            {isCompletedList
              ? "Histórico de entregas finalizadas. Os mesmos filtros de período e produtor aplicam aqui."
              : "Fila de trabalho: título, tipo, prazo, responsável e alertas em colunas fixas para leitura rápida. Agrupe por status, produtor ou prazo."}
          </p>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          <label htmlFor="demand-org-select" className="sr-only">
            Agrupar por
          </label>
          <Select value={organization} onValueChange={(v) => setOrganization(v as DemandOrganization)}>
            <SelectTrigger id="demand-org-select" className="min-h-10 w-full min-w-[min(100%,200px)] sm:w-[200px]">
              <SelectValue placeholder="Agrupar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="status">Por status</SelectItem>
              <SelectItem value="producer">Por produtor</SelectItem>
              <SelectItem value="deadline">Por prazo</SelectItem>
            </SelectContent>
          </Select>
          <span className="tabular-nums text-xs text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "demanda" : "demandas"}
          </span>
        </div>
      </div>

      <div className="min-w-0 p-3 sm:p-5">
        <DemandGroupedList
          groups={groups}
          organization={organization}
          deliverableByDemandId={deliverableByDemandId}
          role={role}
          userId={userId}
          updatingId={updatingId}
          onUpdateStatus={onUpdateStatus}
          onRefresh={onRefresh}
          canEditOrDelete={canEditOrDelete}
          onDelete={onDelete}
          updatePhaseMutation={updatePhaseMutation}
          updatePhaseLabelMutation={updatePhaseLabelMutation}
          deleteDemandMutation={deleteDemandMutation}
          onViewDemand={onViewDemand}
          ariaLabelledBy={headingId}
        />
      </div>
    </div>
  );
}
