import { useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { NotesChecklistToggle } from "@/components/ui/notes-checklist-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Clock,
  Loader2,
  CheckCircle2,
  Trash2,
  Play,
  Flag,
  RotateCcw,
  AlertTriangle,
  Paperclip,
  MoreHorizontal,
  Eye,
} from "lucide-react";
import type { DemandRow, DeliverableRow } from "@/types/demands";
import type { AppRole } from "@/hooks/useAuth";
import { isDueSoon, isOverdue } from "@/lib/demands";
import { cn } from "@/lib/utils";
import {
  PHASE_STEPS,
  phaseCheckedFromDemand,
  phaseLabelFromDemand,
  type PhaseKey,
  type UpdatePhaseLabelPayload,
} from "@/lib/demandPhases";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import DemandDeliverySection from "@/components/DemandDeliverySection";
import { PhaseLabelInput } from "@/components/dashboard/PhaseLabelInput";

const statusUi: Record<string, { label: string; icon: ReactNode; className: string }> = {
  aguardando: {
    label: "Aguardando",
    icon: <Clock className="h-3 w-3" />,
    className: "bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))] border-transparent",
  },
  em_producao: {
    label: "Em produção",
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
    className: "bg-primary text-primary-foreground border-transparent",
  },
  concluido: {
    label: "Concluído",
    icon: <CheckCircle2 className="h-3 w-3" />,
    className: "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] border-transparent",
  },
};

export interface DemandListItemProps {
  demand: DemandRow;
  role: AppRole | null;
  deliverable?: DeliverableRow | null;
  userId?: string;
  onUpdateStatus?: (id: string, newStatus: string) => void;
  onUpdatePhase?: (params: { id: string; phase: PhaseKey; checked: boolean }) => void;
  onUpdatePhaseLabel?: (params: UpdatePhaseLabelPayload) => void;
  updatingPhase?: boolean;
  updatingPhaseLabel?: boolean;
  updating?: boolean;
  canEditOrDelete?: boolean;
  onDelete?: (id: string) => void;
  deleting?: boolean;
  onViewDemand?: (demand: DemandRow) => void;
  onRefresh?: () => void;
  /** Quando o grupo já é por status, não repetir badge na linha. */
  omitStatusBadge?: boolean;
  /** Quando o grupo já é por produtor, omitir coluna de produtor na linha. */
  omitProducerColumn?: boolean;
}

function formatDueShort(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export default function DemandListItem({
  demand,
  role,
  deliverable = null,
  userId = "",
  onRefresh,
  updating,
  onUpdateStatus,
  onUpdatePhase,
  onUpdatePhaseLabel,
  updatingPhase = false,
  updatingPhaseLabel = false,
  canEditOrDelete = false,
  onDelete,
  deleting = false,
  onViewDemand,
  omitStatusBadge = false,
  omitProducerColumn = false,
}: DemandListItemProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const cfg = statusUi[demand.status] ?? statusUi.aguardando;
  const dueSoon = isDueSoon(demand.due_at, demand.status);
  const overdue = isOverdue(demand.due_at, demand.status);
  const isProducer = role === "produtor";
  const showPhases = demand.status === "em_producao";

  const handleRowActivate = () => {
    onViewDemand?.(demand);
  };

  const hasMenu = Boolean(onViewDemand) || (canEditOrDelete && Boolean(onDelete));

  const alertLabel = overdue ? "Demanda atrasada" : dueSoon ? "Prazo próximo" : undefined;

  const rowGrid = omitProducerColumn
    ? "sm:grid-cols-[minmax(0,1fr)_5.5rem_2rem_minmax(8rem,auto)]"
    : "sm:grid-cols-[minmax(0,1fr)_5.5rem_minmax(0,7rem)_2rem_minmax(8rem,auto)]";

  const mainColSpan = omitProducerColumn ? "sm:col-span-3 sm:grid sm:grid-cols-subgrid" : "sm:col-span-4 sm:grid sm:grid-cols-subgrid";

  const timeClass = cn(
    "text-sm tabular-nums sm:text-right",
    overdue && "font-semibold text-[hsl(var(--warning))]",
    dueSoon && !overdue && "font-medium text-[hsl(var(--warning))]/90",
    !dueSoon && !overdue && "text-muted-foreground",
  );

  return (
    <div className="bg-card/30">
      <div
        className={cn(
          "grid grid-cols-1 gap-y-2 border-b border-border/40 px-2 py-3 last:border-b-0 sm:items-center sm:gap-x-3 sm:px-3 sm:py-2.5",
          rowGrid,
          (dueSoon || overdue) && "bg-[hsl(var(--warning))]/[0.04]",
        )}
      >
        <button
          type="button"
          onClick={handleRowActivate}
          className={cn(
            "flex min-w-0 flex-col gap-2 rounded-md px-1 py-1 text-left -mx-1 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:mx-0 sm:items-center sm:gap-x-3",
            mainColSpan,
          )}
          aria-label={onViewDemand ? `Ver detalhes da demanda ${demand.name}` : demand.name}
        >
          <span className="min-w-0">
            {!omitStatusBadge && (
              <Badge className={cn("mb-1.5 inline-flex text-[10px] px-1.5 py-0", cfg.className)}>
                <span className="flex items-center gap-1">
                  {cfg.icon}
                  {cfg.label}
                </span>
              </Badge>
            )}
            {demand.artist_name && (
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground line-clamp-1">{demand.artist_name}</p>
            )}
            <p className="text-sm font-semibold leading-snug text-foreground line-clamp-2 sm:line-clamp-1">{demand.name}</p>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground sm:hidden">
              {!omitProducerColumn && <span className="truncate font-medium text-foreground/90">{demand.producer_name}</span>}
              {demand.due_at ? (
                <time
                  dateTime={demand.due_at}
                  className={cn(
                    "tabular-nums",
                    overdue && "font-medium text-[hsl(var(--warning))]",
                    dueSoon && !overdue && "font-medium text-[hsl(var(--warning))]/90",
                  )}
                >
                  {formatDueShort(demand.due_at)}
                </time>
              ) : (
                <span>Sem prazo</span>
              )}
              {(dueSoon || overdue) && (
                <span className="inline-flex items-center text-[hsl(var(--warning))]" title={alertLabel} aria-label={alertLabel}>
                  <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                </span>
              )}
            </p>
          </span>

          {demand.due_at ? (
            <time dateTime={demand.due_at} className={cn("hidden sm:block", timeClass)}>
              {formatDueShort(demand.due_at)}
            </time>
          ) : (
            <span className="hidden text-right text-sm text-muted-foreground/70 sm:block">—</span>
          )}
          {!omitProducerColumn && (
            <span className="hidden truncate text-xs text-muted-foreground sm:block" title={demand.producer_name}>
              {demand.producer_name}
            </span>
          )}
          <span className="hidden justify-center sm:flex">
            {(dueSoon || overdue) && (
              <span className="text-[hsl(var(--warning))]" title={alertLabel} aria-label={alertLabel}>
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
              </span>
            )}
          </span>
        </button>

        <div
          className={cn(
            "flex flex-wrap items-center justify-end gap-1",
            omitProducerColumn ? "sm:col-start-4" : "sm:col-start-5",
          )}
        >
          {showPhases && (
            <div className="mr-auto flex w-full flex-col gap-1 sm:mr-0 sm:min-w-[200px] sm:max-w-[min(100%,340px)]">
              {PHASE_STEPS.map(({ key, labelColumn }, index) => {
                const checked = phaseCheckedFromDemand(demand, key);
                const labelText = phaseLabelFromDemand(demand, key);
                const stepName = labelText.trim() || `Etapa ${index + 1}`;
                return (
                  <div key={key} className="flex items-center gap-2">
                    <NotesChecklistToggle
                      checked={checked}
                      disabled={!isProducer || updatingPhase}
                      onCheckedChange={(c) => isProducer && onUpdatePhase?.({ id: demand.id, phase: key, checked: c })}
                      aria-label={checked ? `Desmarcar ${stepName}` : `Marcar ${stepName} como concluída`}
                    />
                    {isProducer ? (
                      <PhaseLabelInput
                        demandId={demand.id}
                        value={labelText}
                        disabled={false}
                        saving={updatingPhaseLabel}
                        onCommit={(v) => onUpdatePhaseLabel?.({ id: demand.id, labelColumn, value: v })}
                      />
                    ) : (
                      <span className="min-w-0 flex-1 truncate text-[11px] text-foreground/90">{labelText || "—"}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {isProducer && demand.status === "aguardando" && (
            <Button size="sm" className="h-8 text-xs" onClick={() => onUpdateStatus?.(demand.id, "em_producao")} disabled={updating}>
              <Play className="mr-1 h-3 w-3" /> Iniciar
            </Button>
          )}
          {isProducer && demand.status === "em_producao" && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 border-[hsl(var(--success))] text-xs text-[hsl(var(--success))]"
              onClick={() => onUpdateStatus?.(demand.id, "concluido")}
              disabled={updating}
            >
              <Flag className="mr-1 h-3 w-3" /> Finalizar
            </Button>
          )}
          {demand.status === "concluido" && (
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => onUpdateStatus?.(demand.id, "em_producao")} disabled={updating}>
              <RotateCcw className="mr-1 h-3 w-3" /> Reabrir
            </Button>
          )}
          {hasMenu && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 touch-manipulation" aria-label="Mais opções">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {onViewDemand && (
                  <DropdownMenuItem
                    onClick={() => {
                      onViewDemand(demand);
                    }}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Ver detalhes
                  </DropdownMenuItem>
                )}
                {canEditOrDelete && onDelete && onViewDemand && <DropdownMenuSeparator />}
                {canEditOrDelete && onDelete && (
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onSelect={(e) => {
                      e.preventDefault();
                      setDeleteOpen(true);
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Apagar
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar demanda?</AlertDialogTitle>
            <AlertDialogDescription>
              A demanda &quot;{demand.name}&quot; será removida. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete?.(demand.id);
                setDeleteOpen(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
            >
              {deleting ? "Apagando..." : "Apagar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {onRefresh && (demand.status === "em_producao" || demand.status === "concluido") && (
        <div className="border-t border-border/40 px-2 pb-2 pt-1 sm:px-3">
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="h-8 w-full justify-start gap-2 text-xs text-muted-foreground hover:text-foreground">
                <Paperclip className="h-3.5 w-3.5" />
                Entrega e arquivos
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <DemandDeliverySection demandId={demand.id} role={role} deliverable={deliverable} userId={userId} onRefresh={onRefresh} />
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}
      {role !== "produtor" && demand.status === "concluido" && onRefresh && (
        <div className="border-t border-border/40 px-2 pb-2 pt-1 sm:px-3">
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="h-8 w-full justify-start gap-2 text-xs text-muted-foreground hover:text-foreground">
                <Paperclip className="h-3.5 w-3.5" />
                Ver entrega
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <DemandDeliverySection demandId={demand.id} role={role} deliverable={deliverable} userId={userId} onRefresh={onRefresh} />
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}
    </div>
  );
}
