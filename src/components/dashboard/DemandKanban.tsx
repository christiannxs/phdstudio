import { useMemo } from "react";
import DemandCard from "@/components/DemandCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { DemandRow, DeliverableRow } from "@/types/demands";
import type { AppRole } from "@/hooks/useAuth";
import type { UseMutationResult } from "@tanstack/react-query";
import { Clock, Loader2, CheckCircle2, User, CalendarClock, CalendarDays, CalendarX2 } from "lucide-react";

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

type KanbanOrganization = "status" | "producer" | "deadline";

interface KanbanColumn {
  id: string;
  label: string;
  icon: React.ReactNode;
  accentClass: string;
  items: DemandRow[];
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
  onEdit: (demand: DemandRow) => void;
  onDelete: (id: string) => void;
  updateStatusMutation: UseMutationResult<void, Error, { id: string; status: "aguardando" | "em_producao" | "concluido" }, unknown>;
  updatePhaseMutation: UseMutationResult<void, Error, { id: string; phase: "phase_producao" | "phase_gravacao" | "phase_mix_master"; checked: boolean }, unknown>;
  deleteDemandMutation: UseMutationResult<void, Error, string, unknown>;
  organization: KanbanOrganization;
  /** ID do título visível (ex.: heading da lista) para `aria-labelledby`. */
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
  onEdit,
  onDelete,
  updateStatusMutation,
  updatePhaseMutation,
  deleteDemandMutation,
  organization,
  ariaLabelledBy,
}: DemandKanbanProps) {
  const columns = useMemo<KanbanColumn[]>(() => {
    if (organization === "status") {
      const byStatus = {
        aguardando: filtered.filter((d) => d.status === "aguardando"),
        em_producao: filtered.filter((d) => d.status === "em_producao"),
        concluido: filtered.filter((d) => d.status === "concluido"),
      };

      return KANBAN_COLUMNS.map((col) => ({
        ...col,
        items: byStatus[col.id],
      }));
    }

    if (organization === "producer") {
      const map = new Map<string, DemandRow[]>();
      for (const demand of filtered) {
        const key = demand.producer_name?.trim() || "Sem produtor";
        const current = map.get(key) ?? [];
        current.push(demand);
        map.set(key, current);
      }

      return Array.from(map.entries())
        .sort(([a], [b]) => a.localeCompare(b, "pt-BR"))
        .map(([producer, items]) => ({
          id: `producer-${producer}`,
          label: producer,
          icon: <User className="h-4 w-4" />,
          accentClass: "border-border/70 bg-muted/20",
          items: items.sort((a, b) => {
            const aDue = a.due_at ? new Date(a.due_at).getTime() : Number.POSITIVE_INFINITY;
            const bDue = b.due_at ? new Date(b.due_at).getTime() : Number.POSITIVE_INFINITY;
            return aDue - bDue;
          }),
        }));
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysFromNow = startOfToday + 7 * 24 * 60 * 60 * 1000;

    const overdue: DemandRow[] = [];
    const upcoming: DemandRow[] = [];
    const future: DemandRow[] = [];
    const withoutDate: DemandRow[] = [];

    for (const demand of filtered) {
      if (!demand.due_at) {
        withoutDate.push(demand);
        continue;
      }

      const dueTime = new Date(demand.due_at).getTime();
      if (Number.isNaN(dueTime)) {
        withoutDate.push(demand);
      } else if (dueTime < startOfToday) {
        overdue.push(demand);
      } else if (dueTime <= sevenDaysFromNow) {
        upcoming.push(demand);
      } else {
        future.push(demand);
      }
    }

    const sortByDueDate = (a: DemandRow, b: DemandRow) =>
      (a.due_at ? new Date(a.due_at).getTime() : Number.POSITIVE_INFINITY) -
      (b.due_at ? new Date(b.due_at).getTime() : Number.POSITIVE_INFINITY);

    return [
      {
        id: "deadline-overdue",
        label: "Atrasadas",
        icon: <CalendarX2 className="h-4 w-4" />,
        accentClass: "border-destructive/40 bg-destructive/5",
        items: overdue.sort(sortByDueDate),
      },
      {
        id: "deadline-upcoming",
        label: "Próximos 7 dias",
        icon: <CalendarClock className="h-4 w-4" />,
        accentClass: "border-[hsl(var(--warning))]/40 bg-[hsl(var(--warning))]/5",
        items: upcoming.sort(sortByDueDate),
      },
      {
        id: "deadline-future",
        label: "Futuras",
        icon: <CalendarDays className="h-4 w-4" />,
        accentClass: "border-primary/40 bg-primary/5",
        items: future.sort(sortByDueDate),
      },
      {
        id: "deadline-without-date",
        label: "Sem data",
        icon: <Clock className="h-4 w-4" />,
        accentClass: "border-border/70 bg-muted/20",
        items: withoutDate,
      },
    ];
  }, [filtered, organization]);

  const deliverableByDemandId = useMemo(() => {
    const map = new Map<string, DeliverableRow>();
    for (const d of deliverables) map.set(d.demand_id, d);
    return map;
  }, [deliverables]);

  return (
    <div
      className="-mx-1 w-full min-w-0 overflow-x-auto px-1 pb-2"
      role="region"
      aria-labelledby={ariaLabelledBy}
      aria-label={ariaLabelledBy ? undefined : "Colunas de demandas"}
    >
      <div
        className="grid w-full items-stretch gap-4 sm:gap-5"
        style={{ gridTemplateColumns: `repeat(${Math.max(columns.length, 1)}, minmax(280px, 1fr))` }}
      >
        {columns.map((col) => {
          const items = col.items;
          return (
            <div
              key={col.id}
              className={cn(
                "flex h-[min(680px,calc(100dvh-9rem))] min-h-[280px] min-w-0 flex-col overflow-hidden rounded-xl border",
                col.accentClass,
              )}
            >
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/50 px-4 py-3">
                <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground">
                  <span className="shrink-0">{col.icon}</span>
                  <span className="truncate">{col.label}</span>
                </span>
                <span className="shrink-0 rounded-full bg-background/60 px-2.5 py-1 text-xs tabular-nums text-muted-foreground">
                  {items.length}
                </span>
              </div>
              <ScrollArea className="min-h-0 flex-1">
                <div className="space-y-2 p-2">
                  {items.length === 0 ? (
                    <p className="px-1 py-6 text-center text-pretty text-xs text-muted-foreground">
                      Nenhuma demanda nesta coluna.
                    </p>
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
