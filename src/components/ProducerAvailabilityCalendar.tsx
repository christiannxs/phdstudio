import { useMemo, useState, useCallback } from "react";
import { format, startOfDay, isSameDay, parseISO, isBefore, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { DayContentProps } from "react-day-picker";
import { Day as DayPickerDay } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CalendarDays, Clock3, Eye, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDemands } from "@/hooks/useDemands";
import { demandsToDaysMap, type DemandsByDayMap } from "@/lib/demandsCalendar";
import type { DemandRow } from "@/types/demands";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  userId: string;
  /** Demandas a exibir (opcional; se não passado, usa useDemands()) */
  demands?: DemandRow[];
  isLoading?: boolean;
  onViewDemand?: (demand: DemandRow) => void;
  onAddDemandWithDate?: (date: Date) => void;
  /** Título do card (ex: "Meu calendário de términos" ou "Calendário de demandas") */
  title?: string;
  /** Descrição do card */
  description?: string;
  /** Se true, mostra seletor de produtor (para admin/ceo/atendente) */
  showProducerFilter?: boolean;
}

const statusLabel: Record<string, string> = {
  aguardando: "Aguardando",
  em_producao: "Em produção",
  concluido: "Concluído",
};

export default function ProducerAvailabilityCalendar({
  userId,
  demands: demandsProp,
  isLoading = false,
  onViewDemand,
  onAddDemandWithDate,
  title = "Calendário de ocupação",
  description =
    "Do início ao término da entrega você fica alocado. O número no dia indica quantas demandas atravessam aquela data. Toque num dia para ver o detalhe.",
  showProducerFilter = false,
}: Props) {
  const { demands: demandsFromHook, isLoading: hookLoading } = useDemands();
  const demands = demandsProp !== undefined && demandsProp.length > 0 ? demandsProp : demandsFromHook;
  const loading = isLoading || hookLoading;
  const [selectedProducer, setSelectedProducer] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [month, setMonth] = useState<Date>(() => new Date());

  const handleSelectDate = useCallback((date: Date | undefined) => {
    if (!date) {
      setSelectedDate(undefined);
      return;
    }
    setSelectedDate((prev) =>
      prev && isSameDay(prev, date) ? undefined : date
    );
  }, []);

  const goToToday = useCallback(() => {
    const today = startOfDay(new Date());
    setMonth(today);
    setSelectedDate(today);
  }, []);

  const producerOptions = useMemo(() => {
    const names = [...new Set(demands.map((d) => d.producer_name).filter(Boolean))];
    return names.sort((a, b) => a.localeCompare(b));
  }, [demands]);

  const visibleDemands = useMemo(() => {
    if (!showProducerFilter || selectedProducer === "all") return demands;
    return demands.filter((d) => d.producer_name === selectedProducer);
  }, [demands, selectedProducer, showProducerFilter]);

  const demandsByDay = useMemo((): DemandsByDayMap => {
    const list = visibleDemands.filter((d) => d.due_at);
    return demandsToDaysMap(list);
  }, [visibleDemands]);

  const DayContent = useCallback(
    (props: DayContentProps) => {
      const key = format(props.date, "yyyy-MM-dd");
      const segments = demandsByDay[key] ?? [];
      const count = segments.length;
      return (
        <div className="relative flex h-full w-full items-start justify-center pt-1">
          <span className="text-[13px] font-medium leading-none text-foreground/90">
            {props.date.getDate()}
          </span>
          {count > 0 && (
            <span
              className="absolute bottom-1 right-1 min-w-4 rounded-full bg-destructive px-1 text-[10px] font-semibold leading-4 text-destructive-foreground"
              aria-hidden
            >
              {count}
            </span>
          )}
        </div>
      );
    },
    [demandsByDay],
  );

  const DayWithAria = useCallback(
    (props: React.ComponentProps<typeof DayPickerDay>) => {
      const key = format(props.date, "yyyy-MM-dd");
      const count = (demandsByDay[key] ?? []).length;
      const dateLabel = format(props.date, "d 'de' MMMM", { locale: ptBR });
      const ariaLabel =
        count > 0
          ? `${dateLabel}, ${count} demanda${count !== 1 ? "s" : ""} alocada${count !== 1 ? "s" : ""} neste período`
          : `${dateLabel}, sem demandas neste período`;
      return <DayPickerDay {...props} aria-label={ariaLabel} />;
    },
    [demandsByDay],
  );

  /** Demandas que atravessam o dia selecionado (produtor ocupado nesse dia do início ao término). */
  const demandsOnSelectedDay = useMemo((): DemandRow[] => {
    if (!selectedDate) return [];
    const dayStart = startOfDay(selectedDate);
    return visibleDemands
      .filter((d) => {
        if (!d.due_at) return false;
        const start = d.start_at ? parseISO(d.start_at) : parseISO(d.due_at);
        const end = parseISO(d.due_at);
        const startDay = startOfDay(start);
        const endDay = startOfDay(end);
        return !isAfter(dayStart, endDay) && !isBefore(dayStart, startDay);
      })
      .sort((a, b) => {
        const aStart = a.start_at ? parseISO(a.start_at) : parseISO(a.due_at!);
        const bStart = b.start_at ? parseISO(b.start_at) : parseISO(b.due_at!);
        return aStart.getTime() - bStart.getTime();
      });
  }, [visibleDemands, selectedDate]);

  const monthSummary = useMemo(() => {
    const currentMonth = month.getMonth();
    const currentYear = month.getFullYear();
    const dayKeys = Object.keys(demandsByDay);
    const keysInMonth = dayKeys.filter((key) => {
      const day = new Date(`${key}T00:00:00`);
      return day.getMonth() === currentMonth && day.getFullYear() === currentYear;
    });
    const totalPeriodsInMonth = keysInMonth.reduce((acc, key) => acc + (demandsByDay[key]?.length ?? 0), 0);
    return {
      occupiedDays: keysInMonth.length,
      totalPeriodsInMonth,
    };
  }, [month, demandsByDay]);

  const selectedSummary = useMemo(() => {
    if (!selectedDate) return { total: 0, active: 0, done: 0, pending: 0 };
    const total = demandsOnSelectedDay.length;
    const active = demandsOnSelectedDay.filter((d) => d.status === "em_producao").length;
    const done = demandsOnSelectedDay.filter((d) => d.status === "concluido").length;
    const pending = demandsOnSelectedDay.filter((d) => d.status === "aguardando").length;
    return { total, active, done, pending };
  }, [demandsOnSelectedDay, selectedDate]);

  const canCreateFromDate = Boolean(onAddDemandWithDate && userId);

  return (
    <TooltipProvider delayDuration={300}>
      <Card className="border border-border/60 rounded-2xl overflow-hidden bg-card/80 shadow-sm">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <CalendarDays className="h-5 w-5 shrink-0 text-primary/90" aria-hidden />
            {title}
          </CardTitle>
          <CardDescription className="text-sm leading-relaxed text-muted-foreground">{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {showProducerFilter && (
            <div className="space-y-2">
              <label htmlFor="occupation-producer" className="text-sm font-medium text-foreground">
                Produtor
              </label>
              <Select value={selectedProducer} onValueChange={setSelectedProducer}>
                <SelectTrigger id="occupation-producer" className="w-full sm:max-w-sm">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os produtores</SelectItem>
                  {producerOptions.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-stretch">
            <section className="flex flex-col rounded-xl border border-border/50 bg-muted/20 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-medium text-foreground">Mês</h4>
                <Button type="button" variant="outline" size="sm" className="h-8 px-3 text-xs" onClick={goToToday}>
                  Ir para hoje
                </Button>
              </div>
              <Calendar
                className="w-full max-w-none rounded-xl border bg-background p-2 [&_button]:h-10 [&_button]:w-10 [&_button]:rounded-lg [&_button]:transition-colors [&_button]:duration-150 [&_button]:hover:bg-muted/50"
                mode="single"
                selected={selectedDate}
                onSelect={handleSelectDate}
                month={month}
                onMonthChange={setMonth}
                locale={ptBR}
                disabled={(date) => date < startOfDay(new Date())}
                components={{ DayContent, Day: DayWithAria }}
                classNames={{
                  day_selected:
                    "!bg-destructive/15 !text-foreground hover:!bg-destructive/20 focus:!bg-destructive/15 ring-1 ring-destructive/35",
                  day_today: "!bg-muted/50 font-semibold",
                }}
              />
              <p className="mt-3 text-xs text-muted-foreground">
                Número no canto do dia = quantas demandas atravessam aquela data (entre início e entrega).
              </p>
              <div className="mt-3 grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="rounded-lg border border-border/40 bg-card/60 px-3 py-2.5">
                  <p className="text-xs text-muted-foreground">Dias com alocação</p>
                  <p className="text-lg font-semibold tabular-nums text-foreground">{monthSummary.occupiedDays}</p>
                </div>
                <div className="rounded-lg border border-border/40 bg-card/60 px-3 py-2.5">
                  <p className="text-xs text-muted-foreground">Marcadores no mês</p>
                  <p className="text-lg font-semibold tabular-nums text-foreground">{monthSummary.totalPeriodsInMonth}</p>
                </div>
              </div>
            </section>

            <section className="flex flex-col rounded-xl border border-border/50 bg-card/60 p-4 text-sm shadow-sm">
              {selectedDate ? (
                <div className="flex min-h-0 flex-1 flex-col gap-4">
                  <div className="space-y-0.5 border-b border-border/40 pb-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Dia selecionado</p>
                    <p className="text-base font-semibold capitalize text-foreground">
                      {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-border/40 bg-muted/25 px-3 py-2">
                      <p className="text-xs text-muted-foreground">Demandas no dia</p>
                      <p className="text-lg font-semibold tabular-nums">{selectedSummary.total}</p>
                    </div>
                    <div className="rounded-lg border border-border/40 bg-muted/25 px-3 py-2">
                      <p className="text-xs text-muted-foreground">Em produção</p>
                      <p className="text-lg font-semibold tabular-nums">{selectedSummary.active}</p>
                    </div>
                    <div className="rounded-lg border border-border/40 bg-muted/25 px-3 py-2">
                      <p className="text-xs text-muted-foreground">Aguardando</p>
                      <p className="text-lg font-semibold tabular-nums">{selectedSummary.pending}</p>
                    </div>
                    <div className="rounded-lg border border-border/40 bg-muted/25 px-3 py-2">
                      <p className="text-xs text-muted-foreground">Concluídas</p>
                      <p className="text-lg font-semibold tabular-nums">{selectedSummary.done}</p>
                    </div>
                  </div>

                  {canCreateFromDate && onAddDemandWithDate && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 w-full gap-2 rounded-lg"
                      onClick={() => onAddDemandWithDate(selectedDate)}
                    >
                      <Plus className="h-4 w-4 shrink-0" aria-hidden />
                      Criar demanda com entrega neste dia
                    </Button>
                  )}

                  {demandsOnSelectedDay.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Demandas que passam por este dia</p>
                      <ul className="max-h-[min(320px,50vh)] space-y-2 overflow-y-auto pr-0.5">
                        {demandsOnSelectedDay.map((d) => {
                        const start = d.start_at ? parseISO(d.start_at) : parseISO(d.due_at!);
                        const end = parseISO(d.due_at!);
                        const periodLabel = `${format(start, "dd/MM")} \u2192 ${format(end, "dd/MM")}`;
                        const content = (
                          <div className="w-full rounded-lg border border-border/40 bg-muted/20 px-3 py-2.5 text-left">
                            <div className="flex items-center gap-2">
                              <Clock3 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                              <span className="text-xs text-muted-foreground tabular-nums">
                                Período: {periodLabel}
                              </span>
                            </div>
                            <p className="mt-1.5 truncate font-medium text-foreground">{d.name}</p>
                            <span className="mt-1.5 inline-flex rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                              {statusLabel[d.status] ?? d.status}
                            </span>
                          </div>
                        );
                          return (
                            <li key={d.id}>
                              {onViewDemand ? (
                                <button
                                  type="button"
                                  className="w-full rounded-lg text-left transition hover:opacity-95"
                                  onClick={() => onViewDemand(d)}
                                >
                                  <div className="flex items-start gap-2">
                                    <Eye className="mt-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                                    {content}
                                  </div>
                                </button>
                              ) : (
                                content
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-border/50 bg-muted/15 px-3 py-6 text-center text-sm text-muted-foreground">
                      Nenhuma demanda aloca este dia.
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex min-h-[220px] flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-border/50 bg-muted/10 px-4 text-center">
                  <p className="text-sm font-medium text-foreground">Escolha um dia</p>
                  <p className="mt-1 max-w-[240px] text-xs leading-relaxed text-muted-foreground">
                    Toque numa data no calendário para ver resumo e lista de demandas.
                  </p>
                </div>
              )}
            </section>
          </div>

          {loading && (
            <div className="flex justify-center py-2" role="status" aria-live="polite">
              <span className="sr-only">Carregando</span>
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}
        </CardContent>
    </Card>
    </TooltipProvider>
  );
}
