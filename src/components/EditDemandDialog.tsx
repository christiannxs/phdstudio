import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NotesChecklistToggle } from "@/components/ui/notes-checklist-toggle";
import { PhaseLabelInput } from "@/components/dashboard/PhaseLabelInput";
import { useProducers } from "@/hooks/useProducers";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DemandDateRangeCalendar } from "@/components/DemandDateRangeCalendar";
import { ARTISTS } from "@/lib/artists";
import type { DemandRow } from "@/types/demands";
import { PHASE_STEPS, type PhaseKey, type PhaseLabelColumn } from "@/lib/demandPhases";

export type DemandForEdit = DemandRow;

interface Props {
  demand: DemandRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
  /** Quando true, exibe somente leitura (visualizar), sem botão salvar. */
  readOnly?: boolean;
  /** No modo leitura: usuário pode passar para edição (equipe ou produtor responsável). */
  canEditFromView?: boolean;
  onRequestEdit?: () => void;
}

export default function EditDemandDialog({
  demand,
  open,
  onOpenChange,
  onUpdated,
  readOnly = false,
  canEditFromView = false,
  onRequestEdit,
}: Props) {
  const { role, user, displayName } = useAuth();
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
  const [phaseChecked, setPhaseChecked] = useState<Record<PhaseKey, boolean>>({
    phase_producao: false,
    phase_gravacao: false,
    phase_mix_master: false,
    phase_step_4: false,
    phase_step_5: false,
  });
  const [phaseLabels, setPhaseLabels] = useState<Record<PhaseLabelColumn, string>>({
    phase_producao_label: "",
    phase_gravacao_label: "",
    phase_mix_master_label: "",
    phase_step_4_label: "",
    phase_step_5_label: "",
  });

  const isoToDateAndTime = (iso: string | null) => {
    if (!iso) return { date: "", time: "" };
    const date = new Date(iso);
    if (isNaN(date.getTime())) return { date: "", time: "" };
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
      const isStaff =
        role === "atendente" || role === "ceo" || role === "admin";
      const isCreator = Boolean(user?.id && demand.created_by && user.id === demand.created_by);
      const isAssignedProducer =
        role === "produtor" &&
        displayName != null &&
        demand.producer_name?.trim().toLowerCase() === displayName.trim().toLowerCase();
      setCanEditDatesAndDetails(isCreator || isStaff || isAssignedProducer);
      setPhaseChecked({
        phase_producao: demand.phase_producao,
        phase_gravacao: demand.phase_gravacao,
        phase_mix_master: demand.phase_mix_master,
        phase_step_4: demand.phase_step_4,
        phase_step_5: demand.phase_step_5,
      });
      setPhaseLabels({
        phase_producao_label: demand.phase_producao_label ?? "",
        phase_gravacao_label: demand.phase_gravacao_label ?? "",
        phase_mix_master_label: demand.phase_mix_master_label ?? "",
        phase_step_4_label: demand.phase_step_4_label ?? "",
        phase_step_5_label: demand.phase_step_5_label ?? "",
      });
    }
  }, [demand, user?.id, role, displayName]);

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
      const isProducer = role === "produtor";
      const persistPhases = isProducer && status === "em_producao";
      const phasePayload = persistPhases
        ? {
            phase_producao: phaseChecked.phase_producao,
            phase_gravacao: phaseChecked.phase_gravacao,
            phase_mix_master: phaseChecked.phase_mix_master,
            phase_step_4: phaseChecked.phase_step_4,
            phase_step_5: phaseChecked.phase_step_5,
            phase_producao_label: phaseLabels.phase_producao_label.trim(),
            phase_gravacao_label: phaseLabels.phase_gravacao_label.trim(),
            phase_mix_master_label: phaseLabels.phase_mix_master_label.trim(),
            phase_step_4_label: phaseLabels.phase_step_4_label.trim(),
            phase_step_5_label: phaseLabels.phase_step_5_label.trim(),
          }
        : {};

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
          ...phasePayload,
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
        toast.error(
          "Sem permissão para salvar. Confirme se você é o criador, integrante da equipe ou o produtor responsável por esta demanda."
        );
      }
    }
    setSubmitting(false);
  };

  const detailsLocked = readOnly || !canEditDatesAndDetails;

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
              <Select value={artist} onValueChange={setArtist} disabled={detailsLocked}>
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
                disabled={detailsLocked}
                readOnly={detailsLocked}
                className={detailsLocked ? "bg-muted/50" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-demand-desc">Descrição</Label>
              <Textarea
                id="edit-demand-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalhes sobre a demanda..."
                disabled={detailsLocked}
                readOnly={detailsLocked}
                className={detailsLocked ? "bg-muted/50" : ""}
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
                        disabled={detailsLocked}
                        readOnly={detailsLocked}
                        className={detailsLocked ? "bg-muted/50" : ""}
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
                        disabled={detailsLocked}
                        readOnly={detailsLocked}
                        className={detailsLocked ? "bg-muted/50" : ""}
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
                        disabled={detailsLocked}
                        readOnly={detailsLocked}
                        className={detailsLocked ? "bg-muted/50" : ""}
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
                        disabled={detailsLocked}
                        readOnly={detailsLocked}
                        className={detailsLocked ? "bg-muted/50" : ""}
                      />
                    </div>
                  </div>
                </div>
                {(startDate || dueDate) && (
                  <DemandDateRangeCalendar startDate={startDate} dueDate={dueDate} />
                )}
              </CardContent>
            </Card>
            <div className="space-y-2">
              <Label>Produtor</Label>
              <Select
                value={producer}
                onValueChange={setProducer}
                required
                disabled={producers.length === 0 || readOnly || role === "produtor"}
              >
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
            {status === "em_producao" && (
              <Card className="border-border/60 bg-muted/30">
                <CardHeader className="pb-3 pt-4 px-4">
                  <CardTitle className="text-sm font-medium">Etapas (checklist)</CardTitle>
                  <p className="text-xs text-muted-foreground font-normal">
                    {readOnly || role !== "produtor"
                      ? "Visível em produção. O produtor pode marcar etapas e nomear cada uma."
                      : "Marque as etapas concluídas e ajuste os nomes. Tudo será salvo ao clicar em Salvar alterações."}
                  </p>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-2">
                  <div className="flex flex-col gap-2.5">
                    {PHASE_STEPS.map(({ key, labelColumn }, index) => {
                      const checked = phaseChecked[key];
                      const rawLabel = phaseLabels[labelColumn] ?? "";
                      const stepName = rawLabel.trim() || `Etapa ${index + 1}`;
                      const isProducer = role === "produtor";
                      const canEditPhases = !readOnly && isProducer;
                      return (
                        <div key={key} className="flex items-center gap-2.5">
                          <NotesChecklistToggle
                            checked={checked}
                            disabled={!canEditPhases || submitting}
                            onCheckedChange={(c) =>
                              setPhaseChecked((prev) => ({ ...prev, [key]: c }))
                            }
                            aria-label={checked ? `Desmarcar ${stepName}` : `Marcar ${stepName} como concluída`}
                          />
                          {canEditPhases ? (
                            <PhaseLabelInput
                              demandId={`${demand.id}-${key}`}
                              value={rawLabel}
                              disabled={false}
                              saving={submitting}
                              onCommit={(v) =>
                                setPhaseLabels((prev) => ({ ...prev, [labelColumn]: v }))
                              }
                              className="min-w-0 flex-1 border border-input rounded-md bg-background px-2 py-1.5 text-sm focus-visible:ring-2 focus-visible:ring-ring"
                            />
                          ) : (
                            <span className="min-w-0 flex-1 text-sm text-foreground/90">
                              {rawLabel.trim() || "—"}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
            {readOnly ? (
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>
                  Fechar
                </Button>
                {canEditFromView && onRequestEdit && (
                  <Button type="button" className="w-full sm:w-auto" onClick={onRequestEdit}>
                    Editar demanda
                  </Button>
                )}
              </div>
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
