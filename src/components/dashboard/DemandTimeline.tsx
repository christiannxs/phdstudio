import { useMemo } from "react";
import { format, parseISO, addWeeks, startOfWeek, isBefore, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BarChart2 } from "lucide-react";
import { DemandTooltip } from "@/components/dashboard/DemandTooltip";
import type { DemandRow } from "@/types/demands";

const ROW_HEIGHT = 40;
const TIMELINE_WEEKS = 6;

const statusLabel: Record<string, string> = {
  aguardando: "Aguardando",
  em_producao: "Em produção",
  concluido: "Concluído",
};

interface DemandTimelineProps {
  demands: DemandRow[];
  isLoading?: boolean;
  onViewDemand?: (demand: DemandRow) => void;
  title?: string;
  description?: string;
  /** Quando true, agrupa por produtor: uma linha por produtor, barras = períodos ocupados. */
  groupByProducer?: boolean;
}

/** Demandas com due_at, ordenadas por data de início (ou término). */
function getTimelineDemands(demands: DemandRow[]): DemandRow[] {
  return demands
    .filter((d) => d.due_at)
    .map((d) => {
      const start = d.start_at ? parseISO(d.start_at) : parseISO(d.due_at!);
      const end = parseISO(d.due_at!);
      return { demand: d, start: start.getTime(), end: end.getTime() };
    })
    .filter(({ start, end }) => start <= end)
    .sort((a, b) => a.start - b.start)
    .map(({ demand }) => demand);
}

/** Agrupa demandas por produtor para vista "ocupação por produtor". */
function getDemandsByProducer(demands: DemandRow[]): { producerName: string; demands: DemandRow[] }[] {
  const byProducer = new Map<string, DemandRow[]>();
  for (const d of demands) {
    const name = d.producer_name ?? "Sem produtor";
    if (!byProducer.has(name)) byProducer.set(name, []);
    byProducer.get(name)!.push(d);
  }
  return Array.from(byProducer.entries())
    .map(([producerName, list]) => ({ producerName, demands: getTimelineDemands(list) }))
    .filter(({ demands }) => demands.length > 0)
    .sort((a, b) => a.producerName.localeCompare(b.producerName));
}

export function DemandTimeline({
  demands,
  isLoading = false,
  onViewDemand,
  title = "Quando os produtores estão ocupados",
  description = "Cada barra = período em que o produtor está ocupado (do início ao término da entrega). Clique na barra para ver os detalhes.",
  groupByProducer = false,
}: DemandTimelineProps) {
  const [rangeStart, rangeEnd] = useMemo(() => {
    const now = new Date();
    const start = startOfWeek(now, { weekStartsOn: 0 });
    const end = addWeeks(start, TIMELINE_WEEKS);
    return [start.getTime(), end.getTime()];
  }, []);

  const timelineDemands = useMemo(() => getTimelineDemands(demands), [demands]);
  const byProducer = useMemo(() => getDemandsByProducer(demands), [demands]);
  const totalMs = rangeEnd - rangeStart;
  const labelColumn = groupByProducer ? "Produtor" : "Demanda";

  const renderBar = (demand: DemandRow) => {
    const startAt = demand.start_at ? parseISO(demand.start_at) : parseISO(demand.due_at!);
    const dueAt = parseISO(demand.due_at!);
    const startMs = Math.max(startAt.getTime(), rangeStart);
    const endMs = Math.min(dueAt.getTime(), rangeEnd);
    const leftPct = totalMs > 0 ? ((startMs - rangeStart) / totalMs) * 100 : 0;
    const widthPct = totalMs > 0 ? ((endMs - startMs) / totalMs) * 100 : 0;
    const isOutOfRange = isBefore(dueAt, new Date(rangeStart)) || isAfter(startAt, new Date(rangeEnd));
    if (isOutOfRange || widthPct <= 0) return null;
    return (
      <DemandTooltip key={demand.id} demand={demand} viewOnly={!!onViewDemand}>
        <button
          type="button"
          disabled={!onViewDemand}
          className="absolute top-1/2 -translate-y-1/2 h-6 rounded-md bg-destructive/25 hover:bg-destructive/40 transition-colors duration-150 flex items-center justify-center overflow-hidden min-w-[4px] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:pointer-events-none disabled:opacity-50"
          style={{
            left: `${leftPct}%`,
            width: `${Math.max(widthPct, 2)}%`,
          }}
          onClick={() => onViewDemand?.(demand)}
        >
          <span className="text-[10px] font-medium text-destructive truncate px-1.5">
            {format(startAt, "dd/MM")} → {format(dueAt, "dd/MM")}
          </span>
        </button>
      </DemandTooltip>
    );
  };

  return (
    <TooltipProvider delayDuration={300}>
      <Card className="border border-border/60 rounded-2xl overflow-hidden bg-card/80 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart2 className="h-5 w-5 text-primary/90" />
            {title}
          </CardTitle>
          <CardDescription className="text-muted-foreground/90">{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border border-border/50 bg-muted/30 overflow-hidden">
            {/* Cabeçalho da timeline: eixo de tempo */}
            <div className="flex border-b border-border/50 bg-muted/50">
              <div className="w-48 shrink-0 px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {labelColumn}
              </div>
              <div className="flex-1 min-w-0 overflow-x-auto">
                <div className="flex text-xs text-muted-foreground border-l border-border/50" style={{ minWidth: 720 }}>
                  {Array.from({ length: TIMELINE_WEEKS + 1 }).map((_, i) => {
                    const d = addWeeks(new Date(rangeStart), i);
                    return (
                      <div
                        key={i}
                        className="shrink-0 px-2 py-2 border-r border-border/40 text-center"
                        style={{ width: 120 }}
                      >
                        {format(d, "d MMM", { locale: ptBR })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Linhas: por produtor (uma linha por produtor, várias barras) ou por demanda (uma linha por demanda) */}
            <div className="max-h-[420px] overflow-y-auto">
              {groupByProducer ? (
                byProducer.length === 0 ? (
                  <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                    Nenhum produtor com período ocupado definido.
                  </div>
                ) : (
                  byProducer.map(({ producerName, demands: producerDemands }) => (
                    <div
                      key={producerName}
                      className="flex items-stretch border-b border-border/40 last:border-b-0 hover:bg-muted/20 transition-colors"
                      style={{ minHeight: ROW_HEIGHT }}
                    >
                      <div className="w-48 shrink-0 flex items-center gap-2 px-3 py-2 border-r border-border/50">
                        <span className="font-medium text-foreground truncate text-sm" title={producerName}>
                          {producerName}
                        </span>
                        <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {producerDemands.length} {producerDemands.length === 1 ? "período" : "períodos"}
                        </span>
                      </div>
                      <div className="flex-1 relative min-w-0 overflow-hidden" style={{ minWidth: 720 }}>
                        <div className="absolute inset-0 flex">
                          {Array.from({ length: TIMELINE_WEEKS }).map((_, i) => (
                            <div
                              key={i}
                              className="shrink-0 border-r border-border/40"
                              style={{ width: 120 }}
                            />
                          ))}
                        </div>
                        {producerDemands.map((d) => renderBar(d))}
                      </div>
                    </div>
                  ))
                )
              ) : timelineDemands.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                  Nenhuma demanda com período definido.
                </div>
              ) : (
                timelineDemands.map((demand) => (
                  <div
                    key={demand.id}
                    className="flex items-stretch border-b border-border/40 last:border-b-0 hover:bg-muted/20 transition-colors"
                    style={{ minHeight: ROW_HEIGHT }}
                  >
                    <div className="w-48 shrink-0 flex items-center gap-2 px-3 py-2 border-r border-border/50">
                      <span className="font-medium text-foreground truncate text-sm" title={demand.name}>
                        {demand.name}
                      </span>
                      <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {statusLabel[demand.status] ?? demand.status}
                      </span>
                    </div>
                    <div className="flex-1 relative min-w-0 overflow-hidden" style={{ minWidth: 720 }}>
                      <div className="absolute inset-0 flex">
                        {Array.from({ length: TIMELINE_WEEKS }).map((_, i) => (
                          <div
                            key={i}
                            className="shrink-0 border-r border-border/40"
                            style={{ width: 120 }}
                          />
                        ))}
                      </div>
                      {renderBar(demand)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Período exibido: {format(new Date(rangeStart), "d MMM", { locale: ptBR })} até{" "}
            {format(new Date(rangeEnd), "d MMM yyyy", { locale: ptBR })}. Cada barra = produtor ocupado do início ao término. Clique na barra para ver os detalhes.
          </p>
        </CardContent>
        {isLoading && (
          <div className="flex justify-center py-2">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
      </Card>
    </TooltipProvider>
  );
}
