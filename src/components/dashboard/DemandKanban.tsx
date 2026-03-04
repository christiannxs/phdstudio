import { useMemo } from "react";
import DemandCard from "@/components/DemandCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { DemandRow, DeliverableRow } from "@/types/demands";
import type { AppRole } from "@/hooks/useAuth";
import type { UseMutationResult } from "@tanstack/react-query";
import { Clock, Loader2, CheckCircle2 } from "lucide-react";

const KANBAN_COLUMNS: { id: "aguardando" | "em_producao" | "concluido"; label: string; icon: React.ReactNode; accentClass: string }[] = [
  {
    id: "aguardando",
    label: "Aguardando",
    icon: <Clock className="h-4 w-4" />,
    accentClass: "border-[hsl(var(--warning))]/40 bg-[hsl(var(--warning))]/5",
  },
  {
    id: "em_producao",
    label: "Em produção",
    icon: <Loader2 className="h-4 w-4" />,
    accentClass: "border-primary/40 bg-primary/5",
  },
  {
    id: "concluido",
    label: "Concluído",
    icon: <CheckCircle2 className="h-4 w-4" />,
    accentClass: "border-[hsl(var(--success))]/40 bg-[hsl(var(--success))]/5",
  },
];

interface DemandKanbanProps {
  filtered: DemandRow[];
  deliverables: DeliverableRow[];
  role: AppRole | null;
  userId: string;
  updatingId: string | null;
  onUpdateStatus: (id: string, newStatus: string) => void;
  onRefresh: () => void;
  canEditOrDelete: boolean;
  onEdit: (demand: DemandRow) => void;
  onDelete: (id: string) => void;
  updateStatusMutation: UseMutationResult<void, Error, { id: string; status: "aguardando" | "em_producao" | "concluido" }, unknown>;
  updatePhaseMutation: UseMutationResult<void, Error, { id: string; phase: "phase_producao" | "phase_gravacao" | "phase_mix_master"; checked: boolean }, unknown>;
  deleteDemandMutation: UseMutationResult<void, Error, string, unknown>;
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
  onEdit,
  onDelete,
  updateStatusMutation,
  updatePhaseMutation,
  deleteDemandMutation,
}: DemandKanbanProps) {
  const byStatus = {
    aguardando: filtered.filter((d) => d.status === "aguardando"),
    em_producao: filtered.filter((d) => d.status === "em_producao"),
    concluido: filtered.filter((d) => d.status === "concluido"),
  };

  const deliverableByDemandId = useMemo(() => {
    const map = new Map<string, DeliverableRow>();
    for (const d of deliverables) map.set(d.demand_id, d);
    return map;
  }, [deliverables]);

  return (
    <div className="w-full min-w-0 overflow-x-auto pb-2 -mx-1 px-1">
      <div
        className="grid gap-4 sm:gap-5 items-stretch w-full"
        style={{ gridTemplateColumns: "repeat(3, minmax(280px, 1fr))" }}
      >
        {KANBAN_COLUMNS.map((col) => {
          const items = byStatus[col.id];
          return (
            <div
              key={col.id}
              className={`flex min-w-0 min-h-[400px] h-[calc(100vh-240px)] flex-col rounded-xl border overflow-hidden ${col.accentClass}`}
            >
              <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border/50 shrink-0">
                <span className="flex items-center gap-2 font-semibold text-sm text-foreground whitespace-nowrap">
                  {col.icon}
                  {col.label}
                </span>
                <span className="tabular-nums text-xs text-muted-foreground bg-background/60 rounded-full px-2.5 py-1 shrink-0">
                  {items.length}
                </span>
              </div>
              <ScrollArea className="flex-1 min-h-0">
                <div className="p-2 space-y-2">
                  {items.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">Nenhuma demanda</p>
                  ) : (
                    items.map((d) => (
                      <DemandCard
                        key={d.id}
                        demand={d}
                        role={role}
                        deliverable={deliverableByDemandId.get(d.id) ?? null}
                        userId={userId}
                        onUpdateStatus={onUpdateStatus}
                        onUpdatePhase={updatePhaseMutation.mutate}
                        updatingPhase={updatePhaseMutation.isPending && updatePhaseMutation.variables?.id === d.id}
                        onRefresh={onRefresh}
                        updating={updatingId === d.id}
                        canEditOrDelete={canEditOrDelete}
                        onEdit={canEditOrDelete ? onEdit : undefined}
                        onDelete={canEditOrDelete ? onDelete : undefined}
                        deleting={deleteDemandMutation.isPending}
                      />
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          );
        })}
      </div>
    </div>
  );
}
