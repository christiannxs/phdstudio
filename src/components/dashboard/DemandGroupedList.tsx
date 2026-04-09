import DemandListItem from "@/components/dashboard/DemandListItem";
import type { DemandGroup, DemandOrganization } from "@/lib/demandGrouping";
import type { DeliverableRow } from "@/types/demands";
import type { AppRole } from "@/hooks/useAuth";
import type { UseMutationResult } from "@tanstack/react-query";
import type { PhaseKey, UpdatePhaseLabelPayload } from "@/lib/demandPhases";
import { cn } from "@/lib/utils";
import { Clock, Loader2, CheckCircle2, User, CalendarClock, CalendarDays, CalendarX2 } from "lucide-react";

const accentHeader: Record<DemandGroup["accent"], string> = {
  warning: "border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/8",
  primary: "border-primary/30 bg-primary/8",
  success: "border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/8",
  muted: "border-border/60 bg-muted/30",
  destructive: "border-destructive/30 bg-destructive/8",
};

function GroupIcon({ group }: { group: DemandGroup }) {
  if (group.statusKey === "aguardando") return <Clock className="h-4 w-4 shrink-0 opacity-80" />;
  if (group.statusKey === "em_producao") return <Loader2 className="h-4 w-4 shrink-0 animate-spin opacity-80" />;
  if (group.statusKey === "concluido") return <CheckCircle2 className="h-4 w-4 shrink-0 opacity-80" />;
  if (group.id.startsWith("producer-")) return <User className="h-4 w-4 shrink-0 opacity-80" />;
  if (group.id === "deadline-overdue") return <CalendarX2 className="h-4 w-4 shrink-0 opacity-80" />;
  if (group.id === "deadline-upcoming") return <CalendarClock className="h-4 w-4 shrink-0 opacity-80" />;
  if (group.id === "deadline-future") return <CalendarDays className="h-4 w-4 shrink-0 opacity-80" />;
  return <Clock className="h-4 w-4 shrink-0 opacity-80" />;
}

interface DemandGroupedListProps {
  groups: DemandGroup[];
  organization: DemandOrganization;
  deliverableByDemandId: Map<string, DeliverableRow>;
  role: AppRole | null;
  userId: string;
  updatingId: string | null;
  onUpdateStatus: (id: string, newStatus: string) => void;
  onRefresh: () => void;
  canEditOrDelete: boolean;
  onDelete: (id: string) => void;
  updatePhaseMutation: UseMutationResult<
    void,
    Error,
    { id: string; phase: PhaseKey; checked: boolean },
    unknown
  >;
  updatePhaseLabelMutation: UseMutationResult<void, Error, UpdatePhaseLabelPayload, unknown>;
  deleteDemandMutation: UseMutationResult<void, Error, string, unknown>;
  onViewDemand?: (d: import("@/types/demands").DemandRow) => void;
  ariaLabelledBy?: string;
}

export default function DemandGroupedList({
  groups,
  organization,
  deliverableByDemandId,
  role,
  userId,
  updatingId,
  onUpdateStatus,
  onRefresh,
  canEditOrDelete,
  onDelete,
  updatePhaseMutation,
  updatePhaseLabelMutation,
  deleteDemandMutation,
  onViewDemand,
  ariaLabelledBy,
}: DemandGroupedListProps) {
  const omitStatusBadge = organization === "status";
  const omitProducerColumn = organization === "producer";

  return (
    <div className="space-y-8" aria-labelledby={ariaLabelledBy}>
      {groups.map((group) => (
        <section key={group.id} aria-label={group.label} className="space-y-0 overflow-hidden rounded-xl border border-border/60 bg-muted/5">
          <div
            className={cn(
              "flex items-center justify-between gap-3 border-b border-border/50 px-3 py-2.5 backdrop-blur-sm sm:px-4",
              accentHeader[group.accent],
            )}
          >
            <h4 className="flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground">
              <GroupIcon group={group} />
              <span className="truncate">{group.label}</span>
            </h4>
            <span className="shrink-0 rounded-full bg-background/70 px-2.5 py-0.5 text-xs tabular-nums text-muted-foreground">
              {group.items.length}
            </span>
          </div>

          {group.items.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">Nenhuma demanda neste grupo.</p>
          ) : (
            <>
              <div
                className={cn(
                  "hidden px-3 pb-1.5 pt-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:grid sm:gap-x-3 sm:px-4",
                  omitProducerColumn
                    ? "sm:grid-cols-[minmax(0,1fr)_5.5rem_2rem_minmax(8rem,auto)]"
                    : "sm:grid-cols-[minmax(0,1fr)_5.5rem_minmax(0,7rem)_2rem_minmax(8rem,auto)]",
                )}
                aria-hidden
              >
                <span>Demanda</span>
                <span className="text-right">Prazo</span>
                {!omitProducerColumn && <span className="truncate">Produtor</span>}
                <span className="text-center"> </span>
                <span className="pr-1 text-right">Ações</span>
              </div>
              <ul className="divide-y divide-border/50">
                {group.items.map((d) => (
                  <li key={d.id} className="list-none">
                    <DemandListItem
                      demand={d}
                      role={role}
                      deliverable={deliverableByDemandId.get(d.id) ?? null}
                      userId={userId}
                      onRefresh={onRefresh}
                      onUpdateStatus={onUpdateStatus}
                      onUpdatePhase={updatePhaseMutation.mutate}
                      onUpdatePhaseLabel={updatePhaseLabelMutation.mutate}
                      updatingPhase={updatePhaseMutation.isPending && updatePhaseMutation.variables?.id === d.id}
                      updatingPhaseLabel={updatePhaseLabelMutation.isPending && updatePhaseLabelMutation.variables?.id === d.id}
                      updating={updatingId === d.id}
                      canEditOrDelete={canEditOrDelete}
                      onDelete={canEditOrDelete ? onDelete : undefined}
                      deleting={deleteDemandMutation.isPending}
                      onViewDemand={onViewDemand}
                      omitStatusBadge={omitStatusBadge}
                      omitProducerColumn={omitProducerColumn}
                    />
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      ))}
    </div>
  );
}
