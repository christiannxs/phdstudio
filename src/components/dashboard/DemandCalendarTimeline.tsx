import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { format, parseISO, startOfDay, endOfDay, addDays, addWeeks, startOfWeek, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { CalendarRange, ChevronLeft, ChevronRight, List } from "lucide-react";
import { DemandTooltip } from "@/components/dashboard/DemandTooltip";
import type { DemandRow } from "@/types/demands";

const DAY_COLUMN_MIN = 40;
const LABEL_WIDTH = 180;
const BAR_H = 28;
const LANE_GAP = 4;
const ROW_PAD_Y = 10;

const STATUS_STYLES: Record<string, { bar: string; dot: string; label: string }> = {
  aguardando:  { bar: "border-amber-500/50 bg-amber-500/20 hover:bg-amber-500/30",   dot: "bg-amber-400",   label: "Aguardando" },
  em_producao: { bar: "border-blue-500/50  bg-blue-500/20  hover:bg-blue-500/30",    dot: "bg-blue-400",    label: "Em produção" },
  concluido:   { bar: "border-emerald-500/50 bg-emerald-500/20 hover:bg-emerald-500/30", dot: "bg-emerald-400", label: "Concluído" },
};

function statusStyle(status: string) {
  return STATUS_STYLES[status] ?? STATUS_STYLES["aguardando"];
}

function getDaysInRange(rangeStart: Date, numWeeks: number): Date[] {
  const start = startOfWeek(rangeStart, { weekStartsOn: 1 });
  const days: Date[] = [];
  for (let i = 0; i < numWeeks * 7; i++) days.push(addDays(start, i));
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

function assignLanes(intervals: IntervalItem[]): Map<string, number> {
  const laneLastEnd: number[] = [];
  const map = new Map<string, number>();
  for (const item of intervals) {
    let lane = -1;
    for (let i = 0; i < laneLastEnd.length; i++) {
      if (item.start >= laneLastEnd[i]) { lane = i; break; }
    }
    if (lane === -1) { lane = laneLastEnd.length; laneLastEnd.push(item.end); }
    else laneLastEnd[lane] = item.end;
    map.set(item.demand.id, lane);
  }
  return map;
}

function laneCount(laneMap: Map<string, number>): number {
  if (laneMap.size === 0) return 0;
  return Math.max(...laneMap.values()) + 1;
}

function rowHeight(lanes: number): number {
  if (lanes <= 0) return ROW_PAD_Y * 2 + BAR_H;
  return ROW_PAD_Y * 2 + lanes * BAR_H + Math.max(0, lanes - 1) * LANE_GAP;
}

function groupByProducerFn(demands: DemandRow[]) {
  const map = new Map<string, DemandRow[]>();
  for (const d of demands) {
    const name = d.producer_name ?? "Sem produtor";
    if (!map.has(name)) map.set(name, []);
    map.get(name)!.push(d);
  }
  return Array.from(map.entries())
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
  description = "Cada barra representa o período de uma demanda (início → entrega). Clique para ver detalhes.",
  groupByProducer = false,
  weeks = 1,
}: DemandCalendarTimelineProps) {
  const [rangeStart, setRangeStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const today = useMemo(() => startOfDay(new Date()), []);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const update = () => setContainerWidth(node.clientWidth);
    update();
    const obs = new ResizeObserver(update);
    obs.observe(node);
    return () => obs.disconnect();
  }, []);

  const days = useMemo(() => getDaysInRange(rangeStart, weeks), [rangeStart, weeks]);
  const byProducer = useMemo(() => groupByProducerFn(demands), [demands]);
  const allIntervals = useMemo(() => toSortedIntervals(demands), [demands]);
  const singleLaneMap = useMemo(() => assignLanes(allIntervals), [allIntervals]);

  const goPrev = useCallback(() => setRangeStart((p) => addWeeks(p, -1)), []);
  const goNext = useCallback(() => setRangeStart((p) => addWeeks(p, 1)), []);
  const goToday = useCallback(() => setRangeStart(startOfWeek(new Date(), { weekStartsOn: 1 })), []);

  const rangeLabel = useMemo(() => {
    const end = days[days.length - 1];
    const sameMonth = days[0].getMonth() === end.getMonth();
    if (sameMonth) {
      return `${format(days[0], "d", { locale: ptBR })} – ${format(end, "d 'de' MMMM yyyy", { locale: ptBR })}`;
    }
    return `${format(days[0], "d MMM", { locale: ptBR })} – ${format(end, "d MMM yyyy", { locale: ptBR })}`;
  }, [days]);

  const visibleIntervals = useMemo(() => {
    if (days.length === 0) return [];
    const vStart = startOfDay(days[0]).getTime();
    const vEnd = endOfDay(days[days.length - 1]).getTime();
    return allIntervals.filter(({ start, end }) => start <= vEnd && end >= vStart);
  }, [allIntervals, days]);

  const summaryList = useMemo(() =>
    visibleIntervals.map(({ demand: d, start, end }) => ({
      id: d.id, name: d.name, producer: d.producer_name,
      status: d.status, start: new Date(start), end: new Date(end),
    })),
    [visibleIntervals]
  );

  // Colunas preenchem o espaço disponível sem limite máximo
  const dayColumnWidth = useMemo(() => {
    if (!containerWidth) return DAY_COLUMN_MIN;
    const avail = containerWidth - LABEL_WIDTH;
    const ideal = Math.floor(avail / Math.max(days.length, 1));
    return Math.max(DAY_COLUMN_MIN, ideal);
  }, [containerWidth, days.length]);

  const chartBaseWidth = LABEL_WIDTH + days.length * dayColumnWidth;
  const chartWidth = containerWidth ? Math.max(chartBaseWidth, containerWidth) : chartBaseWidth;
  const hasOverflow = containerWidth ? chartBaseWidth > containerWidth : true;

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
    const showLabel = widthPct >= 10;
    const st = statusStyle(demand.status);

    return (
      <DemandTooltip key={demand.id} demand={demand} viewOnly={!!onViewDemand}>
        <button
          type="button"
          disabled={!onViewDemand}
          className={`group absolute flex items-center gap-1.5 overflow-hidden rounded-md border px-2 text-left shadow-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 ${st.bar}`}
          style={{ left: `${leftPct}%`, width: `${widthPct}%`, top, height: BAR_H, minWidth: 6 }}
          onClick={() => onViewDemand?.(demand)}
        >
          {showLabel && (
            <>
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${st.dot}`} aria-hidden />
              <span className="min-w-0 truncate text-[11px] font-medium leading-none text-foreground/90">
                {demand.name}
              </span>
            </>
          )}
          <span className="sr-only">
            {demand.name} — {format(startAt, "dd/MM")} a {format(dueAt, "dd/MM")} — {st.label}
          </span>
        </button>
      </DemandTooltip>
    );
  };

  const gridCols = (keyPrefix: string) =>
    days.map((day, i) => {
      const isToday = isSameDay(day, today);
      const isWeekStart = i % 7 === 0;
      const isWeekend = day.getDay() === 0 || day.getDay() === 6;
      return (
        <div
          key={`${keyPrefix}-${i}`}
          className={[
            "pointer-events-none absolute bottom-0 top-0",
            isWeekStart && i > 0 ? "border-l border-border/30" : "",
            isWeekend ? "bg-muted/20" : "",
            isToday ? "bg-primary/[0.07]" : "",
          ].join(" ")}
          style={{ left: `${(i / days.length) * 100}%`, width: `${100 / days.length}%` }}
        />
      );
    });

  const hasData = groupByProducer ? byProducer.length > 0 : allIntervals.length > 0;

  return (
    <TooltipProvider delayDuration={200}>
      <Card className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
        {/* Cabeçalho */}
        <CardHeader className="border-b border-border/40 pb-4 pt-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-0.5">
              <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight">
                <CalendarRange className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                {title}
                {summaryList.length > 0 && (
                  <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    {summaryList.length}
                  </span>
                )}
              </CardTitle>
              <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
            </div>

            {/* Navegação */}
            <div className="flex shrink-0 items-center gap-1">
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={goPrev} aria-label="Período anterior">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[140px] text-center text-sm font-semibold capitalize tabular-nums text-foreground">
                {rangeLabel}
              </span>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={goNext} aria-label="Próximo período">
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button type="button" variant="outline" size="sm" className="ml-1 h-8 text-xs" onClick={goToday}>
                Hoje
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 p-0 pb-5">
          {/* Grade */}
          <div
            ref={scrollRef}
            className={`${hasOverflow ? "overflow-x-auto" : "overflow-x-hidden"} overflow-y-hidden [-ms-overflow-style:none] [scrollbar-width:thin]`}
          >
            <div style={{ minWidth: chartWidth }}>

              {/* Cabeçalho dos dias */}
              <div className="flex border-b border-border/40 bg-muted/20">
                <div
                  className="sticky left-0 z-10 shrink-0 border-r border-border/40 bg-muted/20 px-3 py-2.5"
                  style={{ width: LABEL_WIDTH }}
                >
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {groupByProducer ? "Produtor" : "Período"}
                  </span>
                </div>
                <div className="flex flex-1">
                  {days.map((day, i) => {
                    const isToday = isSameDay(day, today);
                    const isWeekStart = i % 7 === 0;
                    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                    return (
                      <div
                        key={i}
                        className={[
                          "flex shrink-0 flex-col items-center justify-center gap-0.5 py-2",
                          isWeekStart && i > 0 ? "border-l border-border/30" : "",
                          isWeekend ? "bg-muted/15" : "",
                          isToday ? "bg-primary/10" : "",
                        ].join(" ")}
                        style={{ minWidth: dayColumnWidth, width: dayColumnWidth }}
                        title={format(day, "EEEE, d 'de' MMMM", { locale: ptBR })}
                      >
                        <span className={`text-[9px] font-bold uppercase leading-none ${isWeekend ? "text-muted-foreground/60" : "text-muted-foreground"}`}>
                          {format(day, "EEE", { locale: ptBR })}
                        </span>
                        <span className={`text-xs font-bold tabular-nums ${isToday ? "flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground" : isWeekend ? "text-muted-foreground/70" : "text-foreground"}`}>
                          {format(day, "d")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Corpo */}
              {!hasData ? (
                <div className="flex min-h-[100px] items-center justify-center gap-2 px-4 py-10 text-sm text-muted-foreground">
                  <CalendarRange className="h-4 w-4 shrink-0" />
                  {groupByProducer
                    ? "Nenhum produtor com demandas neste período."
                    : "Nenhuma demanda com datas definidas neste período."}
                </div>
              ) : groupByProducer ? (
                byProducer.map(({ producerName, demands: pd }, rowIdx) => {
                  const intervals = toSortedIntervals(pd);
                  const laneMap = assignLanes(intervals);
                  const lanes = laneCount(laneMap);
                  const h = rowHeight(lanes);
                  const visibleCount = intervals.filter(({ start, end }) => {
                    const vStart = startOfDay(days[0]).getTime();
                    const vEnd = endOfDay(days[days.length - 1]).getTime();
                    return start <= vEnd && end >= vStart;
                  }).length;

                  return (
                    <div key={producerName} className={`flex border-b border-border/20 last:border-b-0 ${rowIdx % 2 === 1 ? "bg-muted/[0.04]" : ""}`}>
                      {/* Label do produtor */}
                      <div
                        className="sticky left-0 z-10 flex shrink-0 flex-col justify-center gap-0.5 border-r border-border/40 bg-card/95 px-3 backdrop-blur-sm"
                        style={{ width: LABEL_WIDTH, minHeight: h }}
                      >
                        <span className="line-clamp-2 text-sm font-semibold leading-snug text-foreground" title={producerName}>
                          {producerName}
                        </span>
                        {visibleCount > 0 && (
                          <span className="text-[10px] font-medium text-muted-foreground">
                            {visibleCount} demanda{visibleCount !== 1 ? "s" : ""} no período
                          </span>
                        )}
                      </div>
                      {/* Barras */}
                      <div className="relative min-w-0 flex-1" style={{ minHeight: h }}>
                        {gridCols(`p-${producerName}`)}
                        {intervals.map(({ demand }) => renderBar(demand, laneMap.get(demand.id) ?? 0))}
                      </div>
                    </div>
                  );
                })
              ) : (
                (() => {
                  const h = rowHeight(laneCount(singleLaneMap));
                  return (
                    <div className="flex">
                      <div
                        className="sticky left-0 z-10 flex shrink-0 flex-col justify-center gap-0.5 border-r border-border/40 bg-card/95 px-3 backdrop-blur-sm"
                        style={{ width: LABEL_WIDTH, minHeight: h }}
                      >
                        <span className="text-sm font-semibold text-foreground">Todas as demandas</span>
                        {summaryList.length > 0 && (
                          <span className="text-[10px] text-muted-foreground">
                            {summaryList.length} no período
                          </span>
                        )}
                      </div>
                      <div className="relative min-w-0 flex-1" style={{ minHeight: h }}>
                        {gridCols("single")}
                        {allIntervals.map(({ demand }) => renderBar(demand, singleLaneMap.get(demand.id) ?? 0))}
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          </div>

          {/* Legenda */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-5 text-xs text-muted-foreground">
            {Object.entries(STATUS_STYLES).map(([, { dot, label }], i) => (
              <span key={i} className="inline-flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden />
                {label}
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3.5 w-px bg-primary" aria-hidden />
              Hoje
            </span>
            <span className="text-muted-foreground/60">Fins de semana em destaque leve</span>
          </div>

          {/* Lista rápida */}
          {summaryList.length > 0 && (
            <details className="group mx-5 rounded-xl border border-border/40 bg-muted/20">
              <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium text-foreground marker:content-none [&::-webkit-details-marker]:hidden">
                <List className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                Lista do período ({summaryList.length})
                <span className="ml-auto text-xs font-normal text-muted-foreground group-open:hidden">Expandir</span>
                <span className="ml-auto hidden text-xs font-normal text-muted-foreground group-open:inline">Fechar</span>
              </summary>
              <div className="border-t border-border/30 px-4 py-3">
                <ul className="grid max-h-[min(260px,40vh)] grid-cols-1 gap-1.5 overflow-y-auto sm:grid-cols-2">
                  {summaryList.map((item) => {
                    const st = statusStyle(item.status);
                    return (
                      <li key={item.id} className="flex min-w-0 items-center gap-2 rounded-lg bg-background/60 px-3 py-2">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${st.dot}`} aria-hidden />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-foreground">{item.name}</p>
                          {item.producer && (
                            <p className="truncate text-[10px] text-muted-foreground">{item.producer}</p>
                          )}
                        </div>
                        <span className="shrink-0 tabular-nums text-[10px] text-muted-foreground">
                          {format(item.start, "dd/MM")} → {format(item.end, "dd/MM")}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </details>
          )}

          {onViewDemand && (
            <p className="px-5 text-xs text-muted-foreground">
              Toque numa barra para ver os detalhes e editar.
            </p>
          )}

          {isLoading && (
            <div className="flex justify-center py-1" role="status" aria-live="polite">
              <span className="sr-only">Carregando</span>
              <div className="mx-5 h-1 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full w-1/3 animate-pulse rounded-full bg-primary/40" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
