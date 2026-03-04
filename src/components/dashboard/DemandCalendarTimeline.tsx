import { useMemo, useState, useCallback } from "react";
import { format, parseISO, startOfDay, addDays, addWeeks, startOfWeek, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DemandTooltip } from "@/components/dashboard/DemandTooltip";
import type { DemandRow } from "@/types/demands";

const ROW_HEIGHT = 40;
const DAY_COLUMN_MIN_WIDTH = 36;
const LABEL_WIDTH = 200;

/** Gera a lista de dias exibidos no calendário (sempre começa no domingo da semana do rangeStart). */
function getDaysInRange(rangeStart: Date, numWeeks: number): Date[] {
  const start = startOfWeek(rangeStart, { weekStartsOn: 0 });
  const days: Date[] = [];
  for (let i = 0; i < numWeeks * 7; i++) {
    days.push(addDays(start, i));
  }
  return days;
}

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

/** Retorna índice do dia na lista (0-based) ou -1 se fora do range. */
function getDayIndex(days: Date[], date: Date): number {
  const d = startOfDay(date);
  const i = days.findIndex((day) => isSameDay(day, d));
  return i;
}

export interface DemandCalendarTimelineProps {
  demands: DemandRow[];
  isLoading?: boolean;
  /** Clique na barra: abre visualização somente leitura (se passado). */
  onViewDemand?: (demand: DemandRow) => void;
  /** Clique na barra: abre edição (usado quando onViewDemand não é passado). */
  onEditDemand?: (demand: DemandRow) => void;
  title?: string;
  description?: string;
  /** Quando true, agrupa por produtor (uma linha por produtor, várias barras). */
  groupByProducer?: boolean;
  /** Número de semanas exibidas (default 4). */
  weeks?: number;
}

export function DemandCalendarTimeline({
  demands,
  isLoading = false,
  onViewDemand,
  onEditDemand,
  title = "Timeline em forma de calendário",
  description = "Cada barra = período ocupado (início → término). Os dados são os mesmos da lista de demandas e atualizam ao criar ou editar.",
  groupByProducer = false,
  weeks = 4,
}: DemandCalendarTimelineProps) {
  const onBarClick = onViewDemand ?? onEditDemand;
  const [rangeStart, setRangeStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
  const today = useMemo(() => startOfDay(new Date()), []);

  const days = useMemo(() => getDaysInRange(rangeStart, weeks), [rangeStart, weeks]);
  const timelineDemands = useMemo(() => getTimelineDemands(demands), [demands]);
  const byProducer = useMemo(() => getDemandsByProducer(demands), [demands]);

  const goPrev = useCallback(() => {
    setRangeStart((prev) => addWeeks(prev, -1));
  }, []);
  const goNext = useCallback(() => {
    setRangeStart((prev) => addWeeks(prev, 1));
  }, []);
  const goToday = useCallback(() => {
    setRangeStart(startOfWeek(new Date(), { weekStartsOn: 0 }));
  }, []);

  const rangeLabel = useMemo(() => {
    const end = days[days.length - 1];
    return `${format(days[0], "d MMM", { locale: ptBR })} – ${format(end, "d MMM yyyy", { locale: ptBR })}`;
  }, [days]);

  const renderBar = (demand: DemandRow) => {
    const startAt = demand.start_at ? parseISO(demand.start_at) : parseISO(demand.due_at!);
    const dueAt = parseISO(demand.due_at!);
    const startIdx = getDayIndex(days, startAt);
    const endIdx = getDayIndex(days, dueAt);
    if (startIdx < 0 && endIdx < 0) return null;
    const first = startIdx < 0 ? 0 : startIdx;
    const last = endIdx < 0 ? days.length - 1 : endIdx;
    if (first > last) return null;
    const leftPct = (first / days.length) * 100;
    const widthPct = ((last - first + 1) / days.length) * 100;

    return (
      <DemandTooltip key={demand.id} demand={demand} canEdit={!!onEditDemand && !onViewDemand} viewOnly={!!onViewDemand}>
        <button
          type="button"
          className="absolute top-2 bottom-2 rounded bg-destructive/30 hover:bg-destructive/50 transition-colors min-w-[4px] focus:outline-none focus:ring-1 focus:ring-destructive/40"
          style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
          onClick={() => onBarClick?.(demand)}
        >
          <span className="sr-only">{demand.name} — {format(startAt, "dd/MM")} a {format(dueAt, "dd/MM")}</span>
        </button>
      </DemandTooltip>
    );
  };

  const emptyMessage = groupByProducer
    ? "Nenhum produtor com período ocupado no intervalo."
    : "Nenhuma demanda com período definido no intervalo.";

  const hasData = groupByProducer ? byProducer.length > 0 : timelineDemands.length > 0;

  const summaryList = useMemo(() => {
    if (timelineDemands.length === 0) return [];
    return timelineDemands.map((d) => {
      const start = d.start_at ? parseISO(d.start_at) : parseISO(d.due_at!);
      const end = parseISO(d.due_at!);
      return { name: d.name, start, end };
    });
  }, [timelineDemands]);

  return (
    <TooltipProvider delayDuration={300}>
      <Card className="border-0 rounded-xl overflow-hidden bg-transparent shadow-none">
        <CardHeader className="pb-2 pt-0 px-0">
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-base font-medium">{title}</CardTitle>
            <div className="flex items-center gap-1">
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={goPrev} aria-label="Anterior">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground tabular-nums min-w-[140px] text-center">{rangeLabel}</span>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={goNext} aria-label="Próximo">
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={goToday}>
                Hoje
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 px-0">
          <div className="overflow-x-auto">
            <div
              className="min-w-max flex flex-col"
              style={{ width: "100%", minWidth: LABEL_WIDTH + days.length * DAY_COLUMN_MIN_WIDTH }}
            >
              {/* Cabeçalho */}
              <div className="flex border-b border-border/40 shrink-0">
                <div className="shrink-0 h-9 flex items-center px-2 text-[11px] text-muted-foreground" style={{ width: LABEL_WIDTH }} />
                <div className="flex flex-1 min-w-0">
                  {days.map((day, i) => {
                    const isToday = isSameDay(day, today);
                    const isWeekStart = i % 7 === 0;
                    return (
                      <div
                        key={i}
                        className={`flex items-center justify-center shrink-0 text-[11px] text-muted-foreground ${isToday ? "text-foreground font-medium" : ""} ${isWeekStart && i > 0 ? "border-l border-destructive/50" : ""}`}
                        style={{ minWidth: DAY_COLUMN_MIN_WIDTH, flex: 1, height: 36 }}
                        title={format(day, "EEEE, d MMM", { locale: ptBR })}
                      >
                        {format(day, "d")}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Linhas */}
              <div>
              {!hasData ? (
                <div className="flex items-center justify-center py-10 text-xs text-muted-foreground" style={{ minHeight: 80 }}>
                  {emptyMessage}
                </div>
              ) : groupByProducer ? (
                byProducer.map(({ producerName, demands: producerDemands }) => (
                  <div key={producerName} className="flex border-b border-border/20 last:border-b-0 hover:bg-muted/10">
                    <div
                      className="shrink-0 flex items-center px-2 border-r border-border/20"
                      style={{ width: LABEL_WIDTH, minHeight: ROW_HEIGHT }}
                    >
                      <span className="text-sm text-foreground truncate" title={producerName}>{producerName}</span>
                    </div>
                    <div className="flex-1 relative min-w-0" style={{ minHeight: ROW_HEIGHT }}>
                      {days.map((_, i) => {
                        const isTodayCol = isSameDay(days[i], today);
                        const isWeekStart = i % 7 === 0;
                        return (
                          <div
                            key={i}
                            className={`absolute top-0 bottom-0 ${isTodayCol ? "bg-foreground/[0.03]" : ""} ${isWeekStart && i > 0 ? "border-l border-destructive/50" : ""}`}
                            style={{ left: `${(i / days.length) * 100}%`, width: `${100 / days.length}%` }}
                          />
                        );
                      })}
                      {producerDemands.map((d) => renderBar(d))}
                    </div>
                  </div>
                ))
              ) : (
                timelineDemands.map((demand) => (
                  <div key={demand.id} className="flex border-b border-border/20 last:border-b-0 hover:bg-muted/10">
                    <div
                      className="shrink-0 flex items-center px-2 border-r border-border/20 min-w-0"
                      style={{ width: LABEL_WIDTH, minHeight: ROW_HEIGHT }}
                    >
                      <span className="text-sm text-foreground truncate" title={demand.name}>{demand.name}</span>
                    </div>
                    <div className="flex-1 relative min-w-0" style={{ minHeight: ROW_HEIGHT }}>
                      {days.map((_, i) => {
                        const isTodayCol = isSameDay(days[i], today);
                        const isWeekStart = i % 7 === 0;
                        return (
                          <div
                            key={i}
                            className={`absolute top-0 bottom-0 ${isTodayCol ? "bg-foreground/[0.03]" : ""} ${isWeekStart && i > 0 ? "border-l border-destructive/50" : ""}`}
                            style={{ left: `${(i / days.length) * 100}%`, width: `${100 / days.length}%` }}
                          />
                        );
                      })}
                      {renderBar(demand)}
                    </div>
                  </div>
                ))
              )}
              </div>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground">
            {onViewDemand ? "Clique na barra para visualizar." : "Barra = período ocupado. Clique para editar."}
          </p>
          {summaryList.length > 0 && (
            <div className="pt-2 mt-2 border-t border-border/20">
              <p className="text-[11px] font-medium text-muted-foreground mb-1.5">
                Resumo — {summaryList.length} {summaryList.length === 1 ? "demanda" : "demandas"} no período
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1 text-xs text-foreground">
                {summaryList.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 min-w-0">
                    <span className="inline-block w-2 h-2 rounded-sm bg-destructive/40 shrink-0" aria-hidden />
                    <span className="truncate min-w-0" title={item.name}>{item.name}</span>
                    <span className="text-muted-foreground tabular-nums shrink-0">
                      {format(item.start, "dd/MM")} → {format(item.end, "dd/MM")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
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
