import { useMemo, useState, useCallback } from "react";
import { format, startOfDay, isSameDay, parseISO, isBefore, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { DayContentProps } from "react-day-picker";
import { Day as DayPickerDay } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CalendarDays, Pencil, Play, Plus, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useDemands } from "@/hooks/useDemands";
import { demandsToDaysMap, getDemandTracks, type DemandsByDayMap } from "@/lib/demandsCalendar";
import { DemandBarList } from "@/components/dashboard/DemandBar";
import type { DemandRow } from "@/types/demands";

interface Props {
  userId: string;
  /** Demandas a exibir (opcional; se não passado, usa useDemands()) */
  demands?: DemandRow[];
  isLoading?: boolean;
  onEditDemand?: (demand: DemandRow) => void;
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
  onEditDemand,
  onAddDemandWithDate,
  title = "Quando estou ocupado",
  description = "Cada faixa = período em que você está ocupado (do início ao término da entrega). Clique em um dia para ver os períodos que atravessam esse dia.",
  showProducerFilter = false,
}: Props) {
  const { displayName } = useAuth();
  const { demands: demandsFromHook, isLoading: hookLoading } = useDemands();
  const demands = demandsProp !== undefined && demandsProp.length > 0 ? demandsProp : demandsFromHook;
  const loading = isLoading || hookLoading;
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

  const demandsByDay = useMemo((): DemandsByDayMap => {
    const list = demands.filter((d) => d.due_at);
    return demandsToDaysMap(list);
  }, [demands]);

  const demandTracks = useMemo(() => getDemandTracks(demandsByDay), [demandsByDay]);

  const DayContent = useCallback(
    (props: DayContentProps) => {
      const key = format(props.date, "yyyy-MM-dd");
      const segments = demandsByDay[key] ?? [];
      const hasDemands = segments.length > 0;
      return (
        <div className="flex flex-col items-stretch h-full w-full gap-1 px-0.5 pt-1 pb-0 overflow-hidden">
          <span className="relative text-[13px] font-medium text-center leading-none text-foreground/90 shrink-0">
            {props.date.getDate()}
            {hasDemands && (
              <span
                className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-destructive/80"
                aria-hidden
              />
            )}
          </span>
          {/* pointer-events-none: cliques passam para o botão do dia (evita selecionar o dia de baixo); overflow-y-hidden + -mx como acima */}
          <div className="pointer-events-none flex flex-col w-full flex-1 min-h-0 overflow-y-hidden overflow-x-visible justify-end -mx-0.5">
            <DemandBarList
              segments={segments}
              demandTracks={demandTracks}
              compact
              canEdit={!!onEditDemand}
            />
          </div>
        </div>
      );
    },
    [demandsByDay, demandTracks, onEditDemand],
  );

  const DayWithAria = useCallback(
    (props: React.ComponentProps<typeof DayPickerDay>) => {
      const key = format(props.date, "yyyy-MM-dd");
      const count = (demandsByDay[key] ?? []).length;
      const dateLabel = format(props.date, "d 'de' MMMM", { locale: ptBR });
      const ariaLabel =
        count > 0 ? `${dateLabel}, ocupado com ${count} período${count !== 1 ? "s" : ""} de entrega` : `${dateLabel}, livre`;
      return <DayPickerDay {...props} aria-label={ariaLabel} />;
    },
    [demandsByDay],
  );

  /** Demandas que atravessam o dia selecionado (produtor ocupado nesse dia do início ao término). */
  const demandsOnSelectedDay = useMemo((): DemandRow[] => {
    if (!selectedDate) return [];
    const dayStart = startOfDay(selectedDate);
    return demands
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
  }, [demands, selectedDate]);

  return (
    <TooltipProvider delayDuration={300}>
      <Card className="border border-border/60 rounded-2xl overflow-hidden bg-card/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarDays className="h-5 w-5 text-primary/90" />
            {title}
          </CardTitle>
          <CardDescription className="text-muted-foreground/90">{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <div className="flex w-full flex-col items-center gap-4 rounded-xl bg-muted/30 px-4 py-5 border border-border/50">
              <div className="flex flex-wrap items-center justify-center gap-2 w-full mb-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={goToToday}
                >
                  Hoje
                </Button>
              </div>
              <Calendar
                className="demand-calendar w-full max-w-none rounded-xl border-0 bg-transparent p-0 [&_button]:h-auto [&_button]:min-h-[4.5rem] [&_button]:py-1.5 [&_button]:px-0 [&_button]:items-start [&_button]:rounded-lg [&_button]:transition-all [&_button]:duration-200 [&_button]:hover:bg-muted/40 [&_td]:px-0.5"
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
                    "!bg-destructive/10 !text-foreground hover:!bg-destructive/15 focus:!bg-destructive/10 ring-1 ring-destructive/30",
                  day_today: "!bg-muted/50 font-semibold",
                }}
              />
              <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-2">
                  <Play className="h-3 w-3 text-destructive shrink-0" aria-hidden />
                  <Square className="h-2.5 w-2.5 text-destructive shrink-0" aria-hidden />
                  <span className="h-1.5 w-8 rounded-sm bg-destructive/30" />
                  <span>faixa = período ocupado (início → término da entrega)</span>
                </span>
              </div>
            <div className="w-full rounded-xl border border-border/50 bg-card/50 px-4 py-3 text-sm space-y-3">
              {selectedDate ? (
                <>
                  <p className="font-medium text-foreground capitalize">
                    {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
                  </p>
                  {onAddDemandWithDate && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full gap-2 rounded-lg"
                      onClick={() => onAddDemandWithDate(selectedDate)}
                    >
                      <Plus className="h-4 w-4" />
                      Nova demanda com término neste dia
                    </Button>
                  )}
                  {demandsOnSelectedDay.length > 0 ? (
                    <>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                        Neste dia você está ocupado com
                      </p>
                      <ul className="space-y-1.5">
                        {demandsOnSelectedDay.map((d) => {
                          const start = d.start_at ? parseISO(d.start_at) : parseISO(d.due_at!);
                          const end = parseISO(d.due_at!);
                          const periodLabel = `${format(start, "dd/MM")} → ${format(end, "dd/MM")}`;
                          return (
                            <li key={d.id}>
                              {onEditDemand ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="w-full justify-start gap-2 h-auto py-2 px-3 rounded-lg bg-muted/40 hover:bg-muted/70 text-left font-normal transition-colors border border-transparent hover:border-border/50"
                                  onClick={() => onEditDemand(d)}
                                >
                                  <Pencil className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                  <span className="font-medium text-foreground truncate flex-1">{d.name}</span>
                                  <span className="text-[11px] text-muted-foreground shrink-0 tabular-nums" title="Ocupado neste período">
                                    {periodLabel}
                                  </span>
                                  <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs shrink-0">
                                    {statusLabel[d.status] ?? d.status}
                                  </span>
                                </Button>
                              ) : (
                                <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 border border-transparent">
                                  <span className="font-medium text-foreground truncate">{d.name}</span>
                                  <span className="text-[11px] text-muted-foreground tabular-nums">{periodLabel}</span>
                                  <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs">
                                    {statusLabel[d.status] ?? d.status}
                                  </span>
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </>
                  ) : (
                    <p className="text-muted-foreground text-sm">Neste dia você está livre (nenhum período de entrega).</p>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground text-sm">Clique em um dia para ver se você está ocupado ou livre.</p>
              )}
            </div>
          </div>
        </div>
        {loading && (
          <div className="flex justify-center py-2">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
      </CardContent>
    </Card>
    </TooltipProvider>
  );
}
