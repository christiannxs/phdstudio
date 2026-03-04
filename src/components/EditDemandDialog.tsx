import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProducers } from "@/hooks/useProducers";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DemandDateRangeCalendar } from "@/components/DemandDateRangeCalendar";
import { ARTISTS } from "@/lib/artists";
import { toast as sonnerToast } from "sonner";

export interface DemandForEdit {
  id: string;
  artist_name: string | null;
  name: string;
  description: string | null;
  producer_name: string;
  status: string;
  start_at: string | null;
  due_at: string | null;
  created_by?: string | null;
}

interface Props {
  demand: DemandForEdit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
  /** Quando true, exibe somente leitura (visualizar), sem botão salvar. */
  readOnly?: boolean;
}

export default function EditDemandDialog({ demand, open, onOpenChange, onUpdated, readOnly = false }: Props) {
  const { role, user } = useAuth();
  const { data: producers = [] } = useProducers(role);
  const [artist, setArtist] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [producer, setProducer] = useState("");
  const [status, setStatus] = useState<string>("aguardando");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [canEditDatesAndDetails, setCanEditDatesAndDetails] = useState(true);

  const isoToDateAndTime = (iso: string | null) => {
    if (!iso) return { date: "", time: "" };
    return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
  };

  useEffect(() => {
    if (demand) {
      setArtist(demand.artist_name ?? "");
      setName(demand.name);
      setDescription(demand.description ?? "");
      setProducer(demand.producer_name);
      setStatus(demand.status);
      const start = isoToDateAndTime(demand.start_at ?? null);
      const due = isoToDateAndTime(demand.due_at ?? null);
      setStartDate(start.date);
      setStartTime(start.time);
      setDueDate(due.date);
      setDueTime(due.time);
      setCanEditDatesAndDetails(user?.id === demand.created_by);
    }
  }, [demand, user?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!demand) return;
    if (canEditDatesAndDetails) {
      if (!startDate?.trim() || !startTime?.trim()) {
        toast.error("Informe a data e o horário de início.");
        return;
      }
      if (!dueDate?.trim() || !dueTime?.trim()) {
        toast.error("Informe a data e o horário de término.");
        return;
      }
      if (new Date(`${startDate}T${startTime}`) > new Date(`${dueDate}T${dueTime}`)) {
        toast.error("A data/hora de início deve ser anterior à data/hora de término.");
        return;
      }
    }
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("demands")
        .update({
          artist_name: canEditDatesAndDetails ? (artist?.trim() || null) : demand.artist_name,
          name: canEditDatesAndDetails ? name : demand.name,
          description: canEditDatesAndDetails ? (description || null) : demand.description,
          producer_name: canEditDatesAndDetails ? producer : demand.producer_name,
          status: status as "aguardando" | "em_producao" | "concluido",
          start_at: canEditDatesAndDetails ? new Date(`${startDate}T${startTime}`).toISOString() : demand.start_at ?? null,
          due_at: canEditDatesAndDetails ? new Date(`${dueDate}T${dueTime}`).toISOString() : demand.due_at,
        })
        .eq("id", demand.id);
      if (error) throw error;
      toast.success("Demanda atualizada!");
      onOpenChange(false);
      onUpdated();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error("Erro ao atualizar: " + msg);
      // Ajuda a diferenciar erro de permissão (quando não é o criador)
      if (msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("policy")) {
        sonnerToast.error("Apenas quem criou a demanda pode alterar o término e os detalhes. Peça ao criador para ajustar.");
      }
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] flex flex-col overflow-hidden gap-0 p-0">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-2">
          <DialogTitle>{readOnly ? "Visualizar demanda" : "Editar Demanda"}</DialogTitle>
        </DialogHeader>
        {demand && (
          <div className="overflow-y-auto flex-1 min-h-0 px-6 pb-6">
          <form onSubmit={handleSubmit} className="space-y-4 pr-1">
            <div className="space-y-2">
              <Label>Artista</Label>
              <Select value={artist} onValueChange={setArtist} disabled={readOnly}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o artista" />
                </SelectTrigger>
                <SelectContent>
                  {ARTISTS.map((n) => (
                    <SelectItem key={n} value={n}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-demand-name">Nome da Demanda</Label>
              <Input
                id="edit-demand-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Ex: Beat Trap para artista X"
                disabled={readOnly}
                readOnly={readOnly}
                className={readOnly ? "bg-muted/50" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-demand-desc">Descrição</Label>
              <Textarea
                id="edit-demand-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalhes sobre a demanda..."
                disabled={readOnly}
                readOnly={readOnly}
                className={readOnly ? "bg-muted/50" : ""}
              />
            </div>
            <Card className="border-muted bg-muted/30">
              <CardHeader className="pb-3 pt-4 px-4">
                <CardTitle className="text-sm font-medium">Datas e horários</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-4">
                <div className="space-y-2">
                  <Label>Início</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-demand-start-date" className="text-muted-foreground font-normal">Data</Label>
                      <Input
                        id="edit-demand-start-date"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        required={canEditDatesAndDetails}
                        disabled={readOnly}
                        readOnly={readOnly}
                        className={readOnly ? "bg-muted/50" : ""}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-demand-start-time" className="text-muted-foreground font-normal">Horário</Label>
                      <Input
                        id="edit-demand-start-time"
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        required={canEditDatesAndDetails}
                        disabled={readOnly}
                        readOnly={readOnly}
                        className={readOnly ? "bg-muted/50" : ""}
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Término</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-demand-due-date" className="text-muted-foreground font-normal">Data</Label>
                      <Input
                        id="edit-demand-due-date"
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        required={canEditDatesAndDetails}
                        disabled={readOnly}
                        readOnly={readOnly}
                        className={readOnly ? "bg-muted/50" : ""}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-demand-due-time" className="text-muted-foreground font-normal">Horário</Label>
                      <Input
                        id="edit-demand-due-time"
                        type="time"
                        value={dueTime}
                        onChange={(e) => setDueTime(e.target.value)}
                        required={canEditDatesAndDetails}
                        disabled={readOnly}
                        readOnly={readOnly}
                        className={readOnly ? "bg-muted/50" : ""}
                      />
                    </div>
                  </div>
                </div>
                {!readOnly && <DemandDateRangeCalendar startDate={startDate} dueDate={dueDate} />}
              </CardContent>
            </Card>
            <div className="space-y-2">
              <Label>Produtor</Label>
              <Select value={producer} onValueChange={setProducer} required disabled={producers.length === 0 || readOnly}>
                <SelectTrigger>
                  <SelectValue placeholder={producers.length === 0 ? "Nenhum produtor cadastrado" : "Selecione o produtor"} />
                </SelectTrigger>
                <SelectContent>
                  {producers.map((n) => (
                    <SelectItem key={n} value={n}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus} disabled={readOnly}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aguardando">Aguardando</SelectItem>
                  <SelectItem value="em_producao">Em Produção</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {readOnly ? (
              <Button type="button" variant="secondary" className="w-full" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
            ) : (
              <Button type="submit" className="w-full" disabled={submitting || !producer || producers.length === 0}>
                {submitting ? "Salvando..." : "Salvar alterações"}
              </Button>
            )}
          </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
