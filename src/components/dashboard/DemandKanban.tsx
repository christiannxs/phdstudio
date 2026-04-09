import { useMemo } from "react";
import DemandCard from "@/components/DemandCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { groupDemands, type DemandGroup, type DemandOrganization } from "@/lib/demandGrouping";
import type { DemandRow, DeliverableRow } from "@/types/demands";
import type { AppRole } from "@/hooks/useAuth";
import type { UseMutationResult } from "@tanstack/react-query";
import type { PhaseKey, UpdatePhaseLabelPayload } from "@/lib/demandPhases";
import { Clock, Loader2, CheckCircle2, User, CalendarClock, CalendarDays, CalendarX2 } from "lucide-react";

const accentColumn: Record<DemandGroup["accent"], string> = {
  warning: "border-[hsl(var(--warning))]/40 bg-[hsl(var(--warning))]/5",
  primary: "border-primary/40 bg-primary/5",
  success: "border-[hsl(var(--success))]/40 bg-[hsl(var(--success))]/5",
  muted: "border-border/70 bg-muted/20",
  destructive: "border-destructive/40 bg-destructive/5",
};

function ColumnIcon({ group }: { group: DemandGroup }) {
  if (group.statusKey === "aguardando") return <Clock className="h-4 w-4" />;
  if (group.statusKey === "em_producao") return <Loader2 className="h-4 w-4 animate-spin" />;
  if (group.statusKey === "concluido") return <CheckCircle2 className="h-4 w-4" />;
  if (group.id.startsWith("producer-")) return <User className="h-4 w-4" />;
  if (group.id === "deadline-overdue") return <CalendarX2 className="h-4 w-4" />;
  if (group.id === "deadline-upcoming") return <CalendarClock className="h-4 w-4" />;
  if (group.id === "deadline-future") return <CalendarDays className="h-4 w-4" />;
  return <Clock className="h-4 w-4" />;
}

interface DemandKanbanProps {
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
  organization: DemandOrganization;
  ariaLabelledBy?: string;
}

export default function DemandKanban({
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
  organization,
  ariaLabelledBy,
}: DemandKanbanProps) {
  const columns = useMemo(() => groupDemands(filtered, organization), [filtered, organization]);

  const deliverableByDemandId = useMemo(() => {
    const map = new Map<string, DeliverableRow>();
    for (const d of deliverables) map.set(d.demand_id, d);
    return map;
  }, [deliverables]);

  return (
    <div
      className="w-full min-w-0"
      role="region"
      aria-labelledby={ariaLabelledBy}
      aria-label={ariaLabelledBy ? undefined : "Colunas de demandas"}
    >
      <div className="grid w-full gap-4 sm:gap-5 [grid-template-columns:repeat(auto-fill,minmax(min(100%,280px),1fr))]">
        {columns.map((col) => (
          <div
            key={col.id}
            className={cn(
              "flex max-h-[min(72dvh,720px)] min-h-[min(400px,50dvh)] flex-col overflow-hidden rounded-xl border",
              accentColumn[col.accent],
            )}
          >
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/50 px-3 py-2.5 sm:px-4 sm:py-3">
              <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground">
                <span className="shrink-0 text-muted-foreground">
                  <ColumnIcon group={col} />
                </span>
                <span className="truncate">{col.label}</span>
              </span>
              <span className="shrink-0 rounded-full bg-background/60 px-2.5 py-1 text-xs tabular-nums text-muted-foreground">
                {col.items.length}
              </span>
            </div>
            <ScrollArea className="min-h-0 flex-1">
              <div className="space-y-2 p-2 sm:p-2.5">
                {col.items.length === 0 ? (
                  <p className="px-1 py-8 text-center text-pretty text-xs text-muted-foreground sm:py-10">
                    Nenhuma demanda nesta coluna.
                  </p>
                ) : (
                  col.items.map((d) => (
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
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        ))}
      </div>
    </div>
  );
}
