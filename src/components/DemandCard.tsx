import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Clock, Loader2, CheckCircle2, Play, Flag, Trash2, RotateCcw, AlertTriangle } from "lucide-react";
import { NotesChecklistToggle } from "@/components/ui/notes-checklist-toggle";
import DemandDeliverySection from "@/components/DemandDeliverySection";
import { PhaseLabelInput } from "@/components/dashboard/PhaseLabelInput";
import type { DemandRow, DeliverableRow } from "@/types/demands";
import type { AppRole } from "@/hooks/useAuth";
import { isDueSoon, isOverdue } from "@/lib/demands";
import {
  PHASE_STEPS,
  phaseCheckedFromDemand,
  phaseLabelFromDemand,
  type PhaseKey,
  type UpdatePhaseLabelPayload,
} from "@/lib/demandPhases";

interface DemandCardProps {
  demand: DemandRow;
  role: AppRole | null;
  deliverable?: DeliverableRow | null;
  userId?: string;
  onUpdateStatus?: (id: string, newStatus: string) => void;
  onUpdatePhase?: (params: { id: string; phase: PhaseKey; checked: boolean }) => void;
  onUpdatePhaseLabel?: (params: UpdatePhaseLabelPayload) => void;
  updatingPhase?: boolean;
  updatingPhaseLabel?: boolean;
  onRefresh?: () => void;
  updating?: boolean;
  canEditOrDelete?: boolean;
  onDelete?: (id: string) => void;
  deleting?: boolean;
  /** Abre o painel com todos os detalhes (somente leitura até usar Editar lá dentro). */
  onViewDemand?: (demand: DemandRow) => void;
}

function isInteractiveDemandClickTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el?.closest) return false;
  return !!el.closest("button, a, input, textarea, select, [role='checkbox'], label");
}

const statusConfig: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  aguardando: {
    label: "Aguardando",
    icon: <Clock className="h-3.5 w-3.5" />,
    className: "bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))] border-transparent",
  },
  em_producao: {
    label: "Em Produção",
    icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
    className: "bg-primary text-primary-foreground border-transparent",
  },
  concluido: {
    label: "Concluído",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    className: "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] border-transparent",
  },
};

export default function DemandCard({
  demand,
  role,
  deliverable = null,
  userId = "",
  onUpdateStatus,
  onUpdatePhase,
  onUpdatePhaseLabel,
  updatingPhase = false,
  updatingPhaseLabel = false,
  onRefresh,
  updating,
  canEditOrDelete = false,
  onDelete,
  deleting = false,
  onViewDemand,
}: DemandCardProps) {
  const config = statusConfig[demand.status] ?? statusConfig.aguardando;
  const dueSoon = isDueSoon(demand.due_at, demand.status);
  const overdue = isOverdue(demand.due_at, demand.status);
  const isProducer = role === "produtor";
  const showPhaseChecklist = demand.status === "em_producao";

  return (
    <Card
      title={onViewDemand ? "Clique para ver detalhes" : undefined}
      className={`rounded-lg border-border transition-shadow hover:shadow-md overflow-hidden min-w-0 ${dueSoon || overdue ? "border-[hsl(var(--warning))]/50" : ""} ${onViewDemand ? "cursor-pointer" : ""}`}
      onClick={
        onViewDemand
          ? (e) => {
              if (isInteractiveDemandClickTarget(e.target)) return;
              onViewDemand(demand);
            }
          : undefined
      }
    >
      <CardHeader className="p-3 pb-1 space-y-2">
        {/* Linha 1: artista + título + status + ações */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {demand.artist_name && (
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide break-words line-clamp-1">{demand.artist_name}</p>
            )}
            <CardTitle className="text-sm leading-snug line-clamp-3 break-words mt-0.5">{demand.name}</CardTitle>
          </div>
          <div className="flex items-center gap-1 shrink-0 flex-shrink-0">
            <Badge className={`${config.className} whitespace-nowrap text-[10px] px-1.5 py-0 shrink-0`}>
              <span className="flex items-center gap-1">
                {config.icon}
                {config.label}
              </span>
            </Badge>
            {canEditOrDelete && onDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive hover:text-destructive touch-manipulation" disabled={deleting} title="Apagar">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Apagar demanda?</AlertDialogTitle>
                    <AlertDialogDescription>
                      A demanda &quot;{demand.name}&quot; será removida. Entregas vinculadas também serão removidas. Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDelete(demand.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={deleting}>
                      {deleting ? "Apagando..." : "Apagar"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-2">
        {demand.description && (
          <p className="text-xs text-muted-foreground line-clamp-3 break-words">{demand.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-muted-foreground">
          {demand.solicitante_name && (
            <span>Solicitante: <strong className="text-foreground">{demand.solicitante_name}</strong></span>
          )}
          <span>Produtor: <strong className="text-foreground">{demand.producer_name}</strong></span>
          <span>Criada: {new Date(demand.created_at).toLocaleDateString("pt-BR")}</span>
          {demand.due_at && (
            <span>Prazo: <strong className="text-foreground">{new Date(demand.due_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</strong></span>
          )}
          {(dueSoon || overdue) && (
            <span className="inline-flex items-center gap-1 rounded bg-[hsl(var(--warning))]/20 px-1.5 py-0.5 text-[hsl(var(--warning))] font-medium">
              <AlertTriangle className="h-3 w-3" />
              {overdue ? "Atrasada" : "Prazo próximo"}
            </span>
          )}
        </div>
        {showPhaseChecklist && (
          <div className="rounded-md border border-border/60 bg-muted/30 p-2 space-y-2">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Etapas</p>
            <div className="flex flex-col gap-2">
              {PHASE_STEPS.map(({ key, labelColumn }, index) => {
                const checked = phaseCheckedFromDemand(demand, key);
                const labelText = phaseLabelFromDemand(demand, key);
                const stepName = labelText.trim() || `Etapa ${index + 1}`;
                return (
                  <div key={key} className="flex items-center gap-2.5">
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
                        className="min-w-0 flex-1 border-0 border-b border-transparent bg-transparent px-0.5 py-0.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus-visible:border-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-70"
                      />
                    ) : (
                      <span className="min-w-0 flex-1 truncate text-sm text-foreground/90">{labelText || "—"}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {role === "produtor" && (
          <div className="flex gap-1.5">
            {demand.status === "aguardando" && (
              <Button size="sm" className="h-7 text-xs" onClick={() => onUpdateStatus?.(demand.id, "em_producao")} disabled={updating}>
                <Play className="h-3 w-3 mr-1" /> Iniciar
              </Button>
            )}
            {demand.status === "em_producao" && (
              <Button size="sm" variant="outline" className="h-7 text-xs border-[hsl(var(--success))] text-[hsl(var(--success))]" onClick={() => onUpdateStatus?.(demand.id, "concluido")} disabled={updating}>
                <Flag className="h-3 w-3 mr-1" /> Finalizar
              </Button>
            )}
          </div>
        )}
        {(role === "admin" || role === "atendente" || role === "ceo") && demand.status === "concluido" && (
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onUpdateStatus?.(demand.id, "em_producao")} disabled={updating}>
            <RotateCcw className="h-3 w-3 mr-1" /> Voltar para alteração
          </Button>
        )}
        {/* Produtor: mostra aba de comentário e upload ao iniciar (em_producao) ou quando concluído */}
        {role === "produtor" && (demand.status === "em_producao" || demand.status === "concluido") && onRefresh && (
          <DemandDeliverySection
            demandId={demand.id}
            role={role}
            deliverable={deliverable}
            userId={userId}
            onRefresh={onRefresh}
          />
        )}
        {/* Outros perfis: só mostram entrega quando concluído */}
        {role !== "produtor" && demand.status === "concluido" && onRefresh && (
          <DemandDeliverySection
            demandId={demand.id}
            role={role}
            deliverable={deliverable}
            userId={userId}
            onRefresh={onRefresh}
          />
        )}
      </CardContent>
    </Card>
  );
}
