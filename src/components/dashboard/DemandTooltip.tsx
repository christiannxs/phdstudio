import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { DemandRow } from "@/types/demands";

const statusLabel: Record<string, string> = {
  aguardando: "Aguardando",
  em_producao: "Em produção",
  concluido: "Concluído",
};

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = parseISO(iso);
  return format(d, "dd/MM/yyyy HH:mm", { locale: ptBR });
}

interface DemandTooltipProps {
  demand: DemandRow;
  children: React.ReactNode;
  /** Se true, mostra "Clique no dia para editar" no tooltip */
  canEdit?: boolean;
  /** Se true (e não canEdit), mostra "Clique para visualizar" */
  viewOnly?: boolean;
  /** Quando preenchido, exibe mensagem de overflow em vez do conteúdo da demanda */
  overflowCount?: number;
  /** Demandas escondidas no overflow (nomes para listar no tooltip) */
  overflowDemandNames?: string[];
}

export function DemandTooltip({
  demand,
  children,
  canEdit = false,
  viewOnly = false,
  overflowCount,
  overflowDemandNames = [],
}: DemandTooltipProps) {
  const isOverflow = overflowCount !== undefined && overflowCount > 0;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs space-y-2 text-left px-3 py-2.5">
        {isOverflow ? (
          <>
            <p className="font-semibold text-foreground text-sm leading-tight">
              +{overflowCount} demandas neste dia
            </p>
            <p className="text-xs text-muted-foreground">
              Clique no dia para ver todas.
            </p>
            {overflowDemandNames.length > 0 && (
              <ul className="text-xs text-muted-foreground list-disc list-inside space-y-0.5 max-h-24 overflow-y-auto">
                {overflowDemandNames.slice(0, 8).map((name, i) => (
                  <li key={i} className="truncate">{name}</li>
                ))}
                {overflowDemandNames.length > 8 && (
                  <li>… e mais {overflowDemandNames.length - 8}</li>
                )}
              </ul>
            )}
          </>
        ) : (
          <>
            <p className="font-semibold text-foreground text-sm leading-tight">{demand.name}</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li><span className="text-foreground/80">Início:</span> {formatDateTime(demand.start_at)}</li>
              <li><span className="text-foreground/80">Fim:</span> {formatDateTime(demand.due_at)}</li>
              <li><span className="text-foreground/80">Responsável:</span> {demand.producer_name}</li>
              {demand.solicitante_name && (
                <li><span className="text-foreground/80">Solicitante:</span> {demand.solicitante_name}</li>
              )}
              <li><span className="text-foreground/80">Status:</span> {statusLabel[demand.status] ?? demand.status}</li>
            </ul>
            {(canEdit || viewOnly) && (
              <p className="text-xs text-muted-foreground pt-1 border-t border-border/50">
                {canEdit ? "Clique no dia para editar." : "Clique para visualizar."}
              </p>
            )}
          </>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
