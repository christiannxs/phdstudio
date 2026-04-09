import { useMemo, useState, useCallback } from "react";
import { format, parseISO, startOfDay, endOfDay, addDays, addWeeks, startOfWeek, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { CalendarRange, ChevronLeft, ChevronRight, List } from "lucide-react";
import { DemandTooltip } from "@/components/dashboard/DemandTooltip";
import type { DemandRow } from "@/types/demands";

const DAY_COLUMN_MIN = 40;
const LABEL_WIDTH = 168;
const BAR_H = 26;
const LANE_GAP = 5;
const ROW_PAD_Y = 10;

/** Gera os dias exibidos (a partir do domingo da semana de rangeStart). */
function getDaysInRange(rangeStart: Date, numWeeks: number): Date[] {
  const start = startOfWeek(rangeStart, { weekStartsOn: 0 });
  const days: Date[] = [];
  for (let i = 0; i < numWeeks * 7; i++) {
    days.push(addDays(start, i));
  }
  return days;
}

type IntervalItem = { demand: DemandRow; start: number; end: number };

function toSortedIntervals(demands: DemandRow[]): IntervalItem[] {
  return demands
    .filter((d) => d.due_at)
    .map((d) => {
      const start = d.start_at ? parseISO(d.start_at) : parseISO(d.due_at!);
      const end = parseISO(d.due_at!);
      return { demand: d, start: start.getTime(), end: end.getTime() };
    })
    .filter(({ start, end }) => start <= end)
    .sort((a, b) => a.start - b.start || a.end - b.end);
}

/** Atribui faixas empilhadas para períodos que se sobrepõem (greedy por ordem de início). */
function assignLanes(intervals: IntervalItem[]): Map<string, number> {
  const laneLastEnd: number[] = [];
  const map = new Map<string, number>();
  for (const item of intervals) {
    let lane = -1;
    for (let i = 0; i < laneLastEnd.length; i++) {
      if (item.start >= laneLastEnd[i]) {
        lane = i;
        break;
      }
    }
    if (lane === -1) {
      lane = laneLastEnd.length;
      laneLastEnd.push(item.end);
    } else {
      laneLastEnd[lane] = item.end;
    }
    map.set(item.demand.id, lane);
  }
  return map;
}

function laneCountFromMap(laneMap: Map<string, number>): number {
  if (laneMap.size === 0) return 0;
  return Math.max(...laneMap.values()) + 1;
}

function rowInnerHeight(lanes: number): number {
  if (lanes <= 0) return ROW_PAD_Y * 2 + BAR_H;
  return ROW_PAD_Y * 2 + lanes * BAR_H + Math.max(0, lanes - 1) * LANE_GAP;
}

function getDemandsByProducer(demands: DemandRow[]): { producerName: string; demands: DemandRow[] }[] {
  const byProducer = new Map<string, DemandRow[]>();
  for (const d of demands) {
    const name = d.producer_name ?? "Sem produtor";
    if (!byProducer.has(name)) byProducer.set(name, []);
    byProducer.get(name)!.push(d);
  }
  return Array.from(byProducer.entries())
    .map(([producerName, list]) => ({ producerName, demands: list }))
    .filter(({ demands: ds }) => ds.some((d) => d.due_at))
    .sort((a, b) => a.producerName.localeCompare(b.producerName));
}

function getDayIndex(days: Date[], date: Date): number {
  const d = startOfDay(date);
  return days.findIndex((day) => isSameDay(day, d));
}

export interface DemandCalendarTimelineProps {
  demands: DemandRow[];
  isLoading?: boolean;
  /** Abre o painel de detalhes; edição só pelo botão dentro do painel. */
  onViewDemand?: (demand: DemandRow) => void;
  title?: string;
  description?: string;
  groupByProducer?: boolean;
  weeks?: number;
}

export function DemandCalendarTimeline({
  demands,
  isLoading = false,
  onViewDemand,
  title = "Linha do tempo",
  description = "Período de cada demanda (início → entrega). Barras sobrepostas são empilhadas automaticamente.",
  groupByProducer = false,
  weeks = 4,
}: DemandCalendarTimelineProps) {
  const [rangeStart, setRangeStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
  const today = useMemo(() => startOfDay(new Date()), []);

  const days = useMemo(() => getDaysInRange(rangeStart, weeks), [rangeStart, weeks]);
  const byProducer = useMemo(() => getDemandsByProducer(demands), [demands]);

  const allIntervals = useMemo(() => toSortedIntervals(demands), [demands]);
  const singleLaneMap = useMemo(() => assignLanes(allIntervals), [allIntervals]);
  const singleLanes = laneCountFromMap(singleLaneMap);

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

  /** Mesmo recorte do gráfico: só demandas cujo período cruza os dias visíveis (navegação por semanas). */
  const summaryList = useMemo(() => {
    if (days.length === 0) return [];
    const visibleStart = startOfDay(days[0]).getTime();
    const visibleEnd = endOfDay(days[days.length - 1]).getTime();
    return allIntervals
      .filter(({ start, end }) => start <= visibleEnd && end >= visibleStart)
      .map(({ demand: d, start, end }) => ({
        name: d.name,
        start: new Date(start),
        end: new Date(end),
        id: d.id,
      }));
  }, [allIntervals, days]);

  const renderBar = (demand: DemandRow, lane: number) => {
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
    const top = ROW_PAD_Y + lane * (BAR_H + LANE_GAP);
    const showLabel = widthPct >= 12;

    return (
      <DemandTooltip key={demand.id} demand={demand} viewOnly={!!onViewDemand}>
        <button
          type="button"
          disabled={!onViewDemand}
          className="group absolute flex items-center overflow-hidden rounded-md border border-primary/35 bg-primary/20 px-1.5 text-left shadow-sm transition-colors hover:border-primary/50 hover:bg-primary/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-60"
          style={{
            left: `${leftPct}%`,
            width: `${widthPct}%`,
            top,
            height: BAR_H,
            minWidth: 4,
          }}
          onClick={() => onViewDemand?.(demand)}
        >
          {showLabel && (
            <span className="block min-w-0 truncate text-[11px] font-medium leading-tight text-foreground/95">
              {demand.name}
            </span>
          )}
          <span className="sr-only">
            {demand.name} — {format(startAt, "dd/MM")} a {format(dueAt, "dd/MM")}
          </span>
        </button>
      </DemandTooltip>
    );
  };

  const gridBackground = (keyPrefix: string) =>
    days.map((day, i) => {
      const isTodayCol = isSameDay(day, today);
      const isWeekStart = i % 7 === 0;
      const weekend = day.getDay() === 0 || day.getDay() === 6;
      return (
        <div
          key={`${keyPrefix}-${i}`}
          className={`pointer-events-none absolute top-0 bottom-0 border-border/30 ${isWeekStart && i > 0 ? "border-l" : ""} ${weekend ? "bg-muted/25" : ""} ${isTodayCol ? "bg-primary/[0.06]" : ""}`}
          style={{ left: `${(i / days.length) * 100}%`, width: `${100 / days.length}%` }}
        />
      );
    });

  const emptyMessage = groupByProducer
    ? "Nenhum produtor com demandas neste intervalo."
    : "Nenhuma demanda com início e entrega neste intervalo.";

  const hasData = groupByProducer ? byProducer.length > 0 : allIntervals.length > 0;

  const minChartWidth = LABEL_WIDTH + days.length * DAY_COLUMN_MIN;

  return (
    <TooltipProvider delayDuration={280}>
      <Card className="overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-sm">
        <CardHeader className="space-y-3 border-b border-border/40 pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                <CalendarRange className="h-5 w-5 shrink-0 text-primary/90" aria-hidden />
                {title}
              </CardTitle>
              <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-1 sm:shrink-0">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={goPrev}
                aria-label="Semana anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[150px] px-2 text-center text-sm font-medium tabular-nums text-foreground">
                {rangeLabel}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={goNext}
                aria-label="Próxima semana"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button type="button" variant="secondary" size="sm" className="h-9" onClick={goToday}>
                Ir para hoje
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-5">
          <div className="overflow-x-auto rounded-xl border border-border/50 bg-muted/15 [-ms-overflow-style:none] [scrollbar-width:thin]">
            <div className="min-w-max" style={{ minWidth: minChartWidth }}>
              {/* Cabeçalho dos dias */}
              <div className="flex border-b border-border/40 bg-muted/30">
                <div
                  className="sticky left-0 z-10 flex shrink-0 items-end border-r border-border/40 bg-muted/30 px-3 pb-2 pt-3"
                  style={{ width: LABEL_WIDTH }}
                >
                  <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {groupByProducer ? "Produtor" : "Visão"}
                  </span>
                </div>
                <div className="flex min-w-0 flex-1">
                  {days.map((day, i) => {
                    const isToday = isSameDay(day, today);
                    const isWeekStart = i % 7 === 0;
                    return (
                      <div
                        key={i}
                        className={`flex shrink-0 flex-col items-center justify-center gap-0.5 border-border/25 py-2 text-center ${isWeekStart && i > 0 ? "border-l border-border/50" : ""} ${isToday ? "bg-primary/[0.08]" : ""}`}
                        style={{ minWidth: DAY_COLUMN_MIN, flex: 1 }}
                        title={format(day, "EEEE, d 'de' MMMM", { locale: ptBR })}
                      >
                        <span className="text-[10px] font-medium uppercase leading-none text-muted-foreground">
                          {format(day, "EEE", { locale: ptBR })}
                        </span>
                        <span className={`text-sm font-semibold tabular-nums ${isToday ? "text-primary" : "text-foreground"}`}>
                          {format(day, "d")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {!hasData ? (
                <div className="flex min-h-[120px] items-center justify-center px-4 py-10 text-sm text-muted-foreground">
                  {emptyMessage}
                </div>
              ) : groupByProducer ? (
                byProducer.map(({ producerName, demands: producerDemands }) => {
                  const intervals = toSortedIntervals(producerDemands);
                  const laneMap = assignLanes(intervals);
                  const lanes = laneCountFromMap(laneMap);
                  const h = rowInnerHeight(lanes);
                  return (
                    <div
                      key={producerName}
                      className="flex border-b border-border/30 last:border-b-0 hover:bg-muted/20"
                    >
                      <div
                        className="sticky left-0 z-10 flex shrink-0 items-center border-r border-border/40 bg-card/95 px-3 backdrop-blur-sm"
                        style={{ width: LABEL_WIDTH, minHeight: h }}
                      >
                        <span className="line-clamp-2 text-sm font-medium text-foreground" title={producerName}>
                          {producerName}
                        </span>
                      </div>
                      <div className="relative min-w-0 flex-1" style={{ minHeight: h }}>
                        {gridBackground(`p-${producerName}`)}
                        {intervals.map(({ demand }) => renderBar(demand, laneMap.get(demand.id) ?? 0))}
                      </div>
                    </div>
                  );
                })
              ) : (
                (() => {
                  const h = rowInnerHeight(singleLanes);
                  return (
                    <div className="flex border-border/30 hover:bg-muted/10">
                      <div
                        className="sticky left-0 z-10 flex shrink-0 items-center border-r border-border/40 bg-card/95 px-3 backdrop-blur-sm"
                        style={{ width: LABEL_WIDTH, minHeight: h }}
                      >
                        <span className="text-sm font-medium text-foreground">Demandas no período</span>
                      </div>
                      <div className="relative min-w-0 flex-1" style={{ minHeight: h }}>
                        {gridBackground("single")}
                        {allIntervals.map(({ demand }) => renderBar(demand, singleLaneMap.get(demand.id) ?? 0))}
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-4 rounded-sm border border-primary/35 bg-primary/20" aria-hidden />
              Período da demanda
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2 rounded-sm bg-primary/40" aria-hidden />
              Hoje
            </span>
            <span>Fins de semana levemente marcados.</span>
          </div>

          {summaryList.length > 0 && (
            <details className="group rounded-lg border border-border/40 bg-muted/20">
              <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-sm font-medium text-foreground marker:content-none [&::-webkit-details-marker]:hidden">
                <List className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                Lista rápida — período visível ({summaryList.length})
                <span className="ml-auto text-xs font-normal text-muted-foreground group-open:hidden">Abrir</span>
                <span className="ml-auto hidden text-xs font-normal text-muted-foreground group-open:inline">Fechar</span>
              </summary>
              <div className="border-t border-border/40 px-3 py-3">
                <ul className="grid max-h-[min(240px,40vh)] grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
                  {summaryList.map((item) => (
                    <li
                      key={item.id}
                      className="flex min-w-0 items-baseline justify-between gap-2 rounded-md bg-background/60 px-2.5 py-1.5 text-xs"
                    >
                      <span className="min-w-0 truncate font-medium text-foreground" title={item.name}>
                        {item.name}
                      </span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {format(item.start, "dd/MM")} → {format(item.end, "dd/MM")}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </details>
          )}

          <p className="text-xs text-muted-foreground">
            {onViewDemand
              ? "Clique numa barra para ver os detalhes. Quem puder editar verá a opção no painel."
              : null}
          </p>

          {isLoading && (
            <div className="flex justify-center py-1" role="status" aria-live="polite">
              <span className="sr-only">Carregando</span>
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
