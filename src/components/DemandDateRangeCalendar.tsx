import { useMemo } from "react";
import { startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import type { DateRange } from "react-day-picker";

interface DemandDateRangeCalendarProps {
  startDate: string;
  dueDate: string;
}

/**
 * Calendário que exibe visualmente o período entre a data de início e a data de término.
 * Quando ambas as datas estão preenchidas, o intervalo é destacado no calendário.
 */
export function DemandDateRangeCalendar({ startDate, dueDate }: DemandDateRangeCalendarProps) {
  const range = useMemo((): DateRange | undefined => {
    if (!startDate?.trim()) return undefined;
    const from = startOfDay(new Date(startDate));
    if (isNaN(from.getTime())) return undefined;
    if (!dueDate?.trim()) return { from };
    const to = startOfDay(new Date(dueDate));
    if (isNaN(to.getTime())) return { from };
    if (from > to) return { from };
    return { from, to };
  }, [startDate, dueDate]);

  if (!startDate?.trim()) return null;

  return (
    <div className="rounded-lg border border-border/60 bg-background/50 p-3">
      <p className="mb-2 text-xs font-medium text-muted-foreground">
        Período no calendário
      </p>
      <Calendar
        mode="range"
        selected={range}
        onSelect={() => {}}
        locale={ptBR}
        defaultMonth={range?.from ?? new Date()}
        className="w-full max-w-none rounded-md border-0 demand-date-range-calendar"
        classNames={{
          day_range_start:
            "rounded-full bg-destructive text-destructive-foreground hover:bg-destructive hover:text-destructive-foreground focus:bg-destructive focus:text-destructive-foreground",
          day_range_end:
            "rounded-full bg-destructive text-destructive-foreground hover:bg-destructive hover:text-destructive-foreground focus:bg-destructive focus:text-destructive-foreground",
          day_range_middle:
            "demand-range-middle-day w-full h-full min-w-full min-h-full rounded-none bg-destructive/25 text-foreground hover:bg-destructive/25 focus:bg-destructive/25",
        }}
        disabled={false}
      />
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive" />
          Início → Término
        </span>
      </div>
    </div>
  );
}
