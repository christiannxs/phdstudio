import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProducerAvailabilityForView, type AvailabilityForViewRow } from "@/hooks/useProducerAvailability";
import { timeShort } from "@/lib/utils";
import { CalendarCheck } from "lucide-react";

export default function ProducerAvailabilityView() {
  const { data: rows = [], isLoading } = useProducerAvailabilityForView(true);
  const [selectedProducer, setSelectedProducer] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  const byProducer = useMemo(() => {
    const map = new Map<string, AvailabilityForViewRow[]>();
    for (const r of rows) {
      const list = map.get(r.producer_name) ?? [];
      list.push(r);
      map.set(r.producer_name, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.date.localeCompare(b.date) || a.slot_start.localeCompare(b.slot_start));
    }
    return map;
  }, [rows]);

  const producers = useMemo(() => Array.from(byProducer.keys()).sort((a, b) => a.localeCompare(b)), [byProducer]);
  const selectedRows = useMemo(
    () => (selectedProducer ? byProducer.get(selectedProducer) ?? [] : rows),
    [selectedProducer, byProducer, rows]
  );

  const byDate = useMemo(() => {
    const map = new Map<string, AvailabilityForViewRow[]>();
    for (const r of selectedRows) {
      const list = map.get(r.date) ?? [];
      list.push(r);
      map.set(r.date, list);
    }
    return map;
  }, [selectedRows]);

  const markedDates = useMemo(
    () => [...new Set(selectedRows.map((r) => r.date))].map((d) => new Date(d)),
    [selectedRows]
  );

  const firstProducer = producers[0];
  const currentProducer = selectedProducer || (firstProducer ?? "");

  const slotsForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    const key = format(selectedDate, "yyyy-MM-dd");
    return byDate.get(key) ?? [];
  }, [selectedDate, byDate]);

  return (
    <Card className="border border-border/70 shadow-sm rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarCheck className="h-5 w-5" />
          Agenda dos produtores
        </CardTitle>
        <CardDescription>
          Veja em quais dias cada produtor já tem términos agendados para evitar conflitos ao criar novas demandas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {producers.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Produtor</label>
            <Select
              value={currentProducer}
              onValueChange={(v) => setSelectedProducer(v)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Selecione o produtor" />
              </SelectTrigger>
              <SelectContent>
                {producers.map((name) => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : selectedRows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            {rows.length === 0
              ? "Nenhum produtor cadastrou disponibilidade ainda."
              : currentProducer
                ? "Este produtor ainda não cadastrou horários de disponibilidade."
                : "Selecione um produtor para ver os horários."}
          </p>
        ) : (
          <div className="space-y-3">
            <h4 className="font-medium">
              {currentProducer ? `Horários – ${currentProducer}` : "Horários"}
            </h4>
            <div className="flex w-full flex-col items-center gap-3 rounded-xl bg-muted/40 px-4 py-4 shadow-inner">
              <Calendar
                className="w-full max-w-none rounded-xl border bg-background shadow-sm"
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                locale={ptBR}
                modifiers={{ busy: markedDates }}
                modifiersClassNames={{
                  busy:
                    "bg-destructive text-destructive-foreground font-semibold rounded-full border border-destructive",
                }}
              />
              <div className="mt-1 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-destructive" />
                  <span>Dia ocupado</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full border border-muted-foreground/60" />
                  <span>Dia sem disponibilidade</span>
                </div>
              </div>
              <div className="w-full rounded-lg border bg-card px-3 py-2 text-xs sm:text-sm text-muted-foreground">
                {selectedDate ? (
                  slotsForSelectedDate.length > 0 ? (
                    <div className="space-y-1.5">
                      <p className="font-medium text-foreground">
                        {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {slotsForSelectedDate.map((s, i) => (
                          <span
                            key={`${s.date}-${s.slot_start}-${i}`}
                            className="rounded-full bg-muted px-2 py-0.5 text-xs"
                          >
                            {timeShort(s.slot_start)} – {timeShort(s.slot_end)}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p>Este dia não possui horários cadastrados para este produtor.</p>
                  )
                ) : (
                  <p>Clique em um dia destacado para ver os horários disponíveis.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
