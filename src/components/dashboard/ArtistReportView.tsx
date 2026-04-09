import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ARTISTS } from "@/lib/artists";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { DemandRow, DeliverableRow } from "@/types/demands";
import type { AppRole } from "@/hooks/useAuth";
import type { UseMutationResult } from "@tanstack/react-query";
import type { PhaseKey, UpdatePhaseLabelPayload } from "@/lib/demandPhases";
import { FileBarChart } from "lucide-react";

const statusLabels: Record<string, string> = {
  aguardando: "Aguardando",
  em_producao: "Em produção",
  concluido: "Concluído",
};

const statusClass: Record<string, string> = {
  aguardando: "bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))] border-transparent",
  em_producao: "bg-primary text-primary-foreground border-transparent",
  concluido: "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] border-transparent",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface ArtistReportViewProps {
  demands: DemandRow[];
  deliverables: DeliverableRow[];
  role: AppRole | null;
  userId: string;
  updatingId: string | null;
  onUpdateStatus: (id: string, newStatus: string) => void;
  onRefresh: () => void;
  canEditOrDelete: boolean;
  onViewDemand?: (demand: DemandRow) => void;
  onDelete: (id: string) => void;
  updateStatusMutation: UseMutationResult<void, Error, { id: string; status: "aguardando" | "em_producao" | "concluido" }, unknown>;
  updatePhaseMutation: UseMutationResult<void, Error, { id: string; phase: PhaseKey; checked: boolean }, unknown>;
  updatePhaseLabelMutation: UseMutationResult<void, Error, UpdatePhaseLabelPayload, unknown>;
  deleteDemandMutation: UseMutationResult<void, Error, string, unknown>;
}

export default function ArtistReportView({
  demands,
  deliverables,
  role,
  onViewDemand,
  updatePhaseMutation: _updatePhaseMutation,
  updatePhaseLabelMutation: _updatePhaseLabelMutation,
}: ArtistReportViewProps) {
  const [selectedArtist, setSelectedArtist] = useState<string>("all");

  const filteredDemands =
    selectedArtist === "all"
      ? demands
      : demands.filter((d) => (d.artist_name ?? "").trim() === selectedArtist);

  const sortedDemands = [...filteredDemands].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const statusCounts = {
    aguardando: filteredDemands.filter((d) => d.status === "aguardando").length,
    em_producao: filteredDemands.filter((d) => d.status === "em_producao").length,
    concluido: filteredDemands.filter((d) => d.status === "concluido").length,
  };

  const latestDeliverableByDemand = new Map<string, DeliverableRow>();
  for (const deliverable of deliverables) {
    const current = latestDeliverableByDemand.get(deliverable.demand_id);
    if (!current || new Date(deliverable.updated_at).getTime() > new Date(current.updated_at).getTime()) {
      latestDeliverableByDemand.set(deliverable.demand_id, deliverable);
    }
  }

  const getPhaseSummary = (demand: DemandRow) => {
    const phases = [
      { checked: demand.phase_producao, label: demand.phase_producao_label },
      { checked: demand.phase_gravacao, label: demand.phase_gravacao_label },
      { checked: demand.phase_mix_master, label: demand.phase_mix_master_label },
      { checked: demand.phase_step_4, label: demand.phase_step_4_label },
      { checked: demand.phase_step_5, label: demand.phase_step_5_label },
    ];

    const completed = phases.filter((phase) => phase.checked).length;
    const pending = phases
      .filter((phase) => !phase.checked)
      .map((phase) => phase.label)
      .filter(Boolean);

    return {
      completed,
      total: phases.length,
      pending,
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <FileBarChart className="h-5 w-5 text-muted-foreground shrink-0" />
          <h2 className="text-lg font-semibold">
            {role === "produtor" ? "Suas demandas por artista" : "Relatório de demandas"}
          </h2>
        </div>
        <Select value={selectedArtist} onValueChange={setSelectedArtist}>
          <SelectTrigger className="w-full sm:w-[280px] min-h-[44px] sm:min-h-0">
            <SelectValue placeholder="Filtrar por artista (opcional)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os artistas</SelectItem>
            {ARTISTS.map((name) => (
              <SelectItem key={name} value={name}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredDemands.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border bg-card px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Aguardando</p>
            <p className="text-xl font-semibold">{statusCounts.aguardando}</p>
          </div>
          <div className="rounded-lg border bg-card px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Em produção</p>
            <p className="text-xl font-semibold">{statusCounts.em_producao}</p>
          </div>
          <div className="rounded-lg border bg-card px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Concluídas</p>
            <p className="text-xl font-semibold">{statusCounts.concluido}</p>
          </div>
        </div>
      )}

      {filteredDemands.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center rounded-lg border bg-muted/30">
          {selectedArtist === "all"
            ? "Nenhuma demanda encontrada."
            : <>Nenhuma demanda encontrada para o artista &quot;{selectedArtist}&quot;.</>}
        </p>
      ) : (
        <div className="rounded-lg border bg-card">
          <p className="text-sm text-muted-foreground px-4 pt-4">
            <strong>{filteredDemands.length}</strong>{" "}
            {filteredDemands.length === 1 ? "demanda" : "demandas"}{" "}
            {selectedArtist === "all" ? "no total." : <>para <strong>{selectedArtist}</strong>.</>}
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Artista</TableHead>
                <TableHead>Demanda</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Produtor</TableHead>
                <TableHead>Solicitante</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="whitespace-nowrap">Período</TableHead>
                <TableHead className="whitespace-nowrap">Fases</TableHead>
                <TableHead>Último entregável</TableHead>
                <TableHead className="whitespace-nowrap">Criada em</TableHead>
                <TableHead className="whitespace-nowrap">Atualizada em</TableHead>
                <TableHead className="whitespace-nowrap">Prazo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedDemands.map((d) => {
                const phaseSummary = getPhaseSummary(d);
                const latestDeliverable = latestDeliverableByDemand.get(d.id);

                return (
                  <TableRow
                    key={d.id}
                    className={onViewDemand ? "cursor-pointer hover:bg-muted/50" : undefined}
                    onClick={() => onViewDemand?.(d)}
                  >
                    <TableCell className="font-medium">{d.artist_name ?? "—"}</TableCell>
                    <TableCell>{d.name}</TableCell>
                    <TableCell className="max-w-[280px] text-muted-foreground">
                      {d.description?.trim() ? d.description : "—"}
                    </TableCell>
                    <TableCell>{d.producer_name}</TableCell>
                    <TableCell className="text-muted-foreground">{d.solicitante_name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={statusClass[d.status] ?? ""}>
                        {statusLabels[d.status] ?? d.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      <div className="space-y-0.5">
                        <p>Início: {formatDateTime(d.start_at)}</p>
                        <p>Fim: {formatDateTime(d.due_at)}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <div className="space-y-0.5">
                        <p>{phaseSummary.completed}/{phaseSummary.total} concluídas</p>
                        <p className="text-xs">
                          Pendentes: {phaseSummary.pending.length > 0 ? phaseSummary.pending.join(", ") : "nenhuma"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {latestDeliverable ? (
                        <div className="space-y-0.5">
                          <p>{latestDeliverable.file_name ?? "Arquivo sem nome"}</p>
                          <p className="text-xs">
                            Atualizado em {formatDateTime(latestDeliverable.updated_at)}
                          </p>
                          <p className="text-xs">
                            {latestDeliverable.comments?.trim() ? latestDeliverable.comments : "Sem observações"}
                          </p>
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">{formatDate(d.created_at)}</TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">{formatDateTime(d.updated_at)}</TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">{formatDateTime(d.due_at)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
