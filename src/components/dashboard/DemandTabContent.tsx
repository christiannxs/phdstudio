import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { LogOut, LayoutDashboard, UserPlus, AlertTriangle, FileBarChart, CalendarDays, CalendarRange, AlertCircle, Plus } from "lucide-react";
import UserManagement from "@/components/UserManagement";
import ProducerAvailabilityCalendar from "@/components/ProducerAvailabilityCalendar";
import { DemandCalendarTimeline } from "@/components/dashboard/DemandCalendarTimeline";
import DemandStatsCards from "@/components/dashboard/DemandStatsCards";
import DemandFilters from "@/components/dashboard/DemandFilters";
import DemandKanban from "@/components/dashboard/DemandKanban";
import ArtistReportView from "@/components/dashboard/ArtistReportView";
import type { DemandRow, DeliverableRow } from "@/types/demands";
import type { AppRole } from "@/hooks/useAuth";
import type { UseMutationResult } from "@tanstack/react-query";

export interface DemandTabContentProps {
  role: AppRole | null;
  displayName: string | null;
  userId: string;
  signOut: () => Promise<void>;
  demands: DemandRow[];
  deliverables: DeliverableRow[];
  demandsForReport: DemandRow[];
  demandsLoading: boolean;
  demandsError?: boolean;
  demandsErrorDetail?: Error | null;
  onRetryDemands?: () => void;
  filtered: DemandRow[];
  counts: { aguardando: number; em_producao: number; concluido: number };
  dueSoonCount: number;
  filterStatus: string;
  setFilterStatus: (s: string) => void;
  filterProducer: string;
  setFilterProducer: (s: string) => void;
  dateFilter: string;
  setDateFilter: (s: string) => void;
  producers: string[];
  canEditOrDelete: boolean;
  updatingId: string | null;
  editingDemand: DemandRow | null;
  setEditingDemand: (d: DemandRow | null) => void;
  /** Clique na barra da timeline abre visualização (somente leitura). */
  onViewDemand?: (d: DemandRow) => void;
  refetch: () => void;
  updateStatusMutation: UseMutationResult<void, Error, { id: string; status: "aguardando" | "em_producao" | "concluido" }, unknown>;
  updatePhaseMutation: UseMutationResult<void, Error, { id: string; phase: "phase_producao" | "phase_gravacao" | "phase_mix_master"; checked: boolean }, unknown>;
  deleteDemandMutation: UseMutationResult<void, Error, string, unknown>;
  handleStatusCardClick: (status: string) => void;
  handleUpdateStatus: (id: string, newStatus: string) => Promise<void>;
  roleLabel: string;
  onOpenCreateDialog?: (initialDueDate?: Date | null) => void;
}

export default function DemandTabContent({
  role,
  displayName,
  userId,
  signOut,
  demands,
  deliverables,
  demandsForReport,
  demandsLoading,
  demandsError,
  demandsErrorDetail,
  onRetryDemands,
  filtered,
  counts,
  dueSoonCount,
  filterStatus,
  setFilterStatus,
  filterProducer,
  setFilterProducer,
  dateFilter,
  setDateFilter,
  producers,
  canEditOrDelete,
  updatingId,
  editingDemand,
  setEditingDemand,
  onViewDemand,
  refetch,
  updateStatusMutation,
  updatePhaseMutation,
  deleteDemandMutation,
  handleStatusCardClick,
  handleUpdateStatus,
  roleLabel,
  onOpenCreateDialog,
}: DemandTabContentProps) {
  const [calendarProducer, setCalendarProducer] = useState<string>("all");
  const [availabilityView, setAvailabilityView] = useState<"calendar" | "timeline-calendar">("timeline-calendar");
  const [organizationMode, setOrganizationMode] = useState<"status" | "producer" | "deadline">("status");

  const demandsForCalendar =
    role === "produtor" && displayName
      ? demands.filter((d) => d.producer_name === displayName)
      : role === "ceo" || role === "atendente" || role === "admin"
        ? calendarProducer === "all"
          ? demands
          : demands.filter((d) => d.producer_name === calendarProducer)
        : [];

  const availabilitySection =
    role === "produtor" && userId ? (
      <div className="space-y-3">
        <Tabs value={availabilityView} onValueChange={(v) => setAvailabilityView(v as "calendar" | "timeline-calendar")}>
          <TabsList className="h-9 flex-wrap">
            <TabsTrigger value="timeline-calendar" className="gap-2">
              <CalendarRange className="h-4 w-4" />
              Linha do tempo
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-2">
              <CalendarDays className="h-4 w-4" />
              Calendário mensal
            </TabsTrigger>
          </TabsList>
          <TabsContent value="timeline-calendar" className="mt-3">
            <DemandCalendarTimeline
              demands={demandsForCalendar}
              isLoading={demandsLoading}
              onViewDemand={onViewDemand}
              title="Linha do tempo"
              description="Cada barra é o período da demanda (início até a entrega). Novas demandas passam a aparecer aqui automaticamente."
            />
          </TabsContent>
          <TabsContent value="calendar" className="mt-3">
            <ProducerAvailabilityCalendar
              userId={userId}
              demands={demandsForCalendar}
              isLoading={demandsLoading}
              onEditDemand={setEditingDemand}
              onAddDemandWithDate={onOpenCreateDialog ? (date) => onOpenCreateDialog(date) : undefined}
              title="Sua ocupação"
              description="Entre o início e o término da entrega você aparece como alocado. O número no dia mostra quantas demandas cruzam aquela data; abra o dia para ver a lista."
            />
          </TabsContent>
        </Tabs>
      </div>
    ) : role === "ceo" || role === "atendente" || role === "admin" ? (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm font-medium text-foreground">Agenda de</label>
            <Select value={calendarProducer} onValueChange={setCalendarProducer}>
              <SelectTrigger className="w-[min(100%,220px)] sm:w-[220px]">
                <SelectValue placeholder="Todos os produtores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os produtores</SelectItem>
                {producers.map((name) => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Tabs value={availabilityView} onValueChange={(v) => setAvailabilityView(v as "calendar" | "timeline-calendar")}>
            <TabsList className="h-9 flex-wrap">
              <TabsTrigger value="timeline-calendar" className="gap-2">
                <CalendarRange className="h-4 w-4" />
                Linha do tempo
              </TabsTrigger>
              <TabsTrigger value="calendar" className="gap-2">
                <CalendarDays className="h-4 w-4" />
                Calendário mensal
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        {availabilityView === "timeline-calendar" ? (
          <DemandCalendarTimeline
            demands={demandsForCalendar}
            isLoading={demandsLoading}
            onViewDemand={onViewDemand}
            title="Linha do tempo"
            description="Cada barra é o período da demanda (início até a entrega). Com “Todos os produtores”, as barras são agrupadas por nome."
            groupByProducer={calendarProducer === "all"}
          />
        ) : (
          <ProducerAvailabilityCalendar
            userId=""
            demands={demandsForCalendar}
            isLoading={demandsLoading}
            onEditDemand={setEditingDemand}
            title="Ocupação por produtor"
            description="Use “Agenda de” acima ou o filtro Produtor no card. O número no dia indica quantas demandas atravessam aquela data; abra o dia para ver detalhes."
            showProducerFilter
          />
        )}
      </div>
    ) : null;

  const canCreateDemand =
    role === "atendente" || role === "admin" || role === "ceo" || role === "produtor";

  const demandsContent = (
    <div className="space-y-8">
      <header className="space-y-1.5">
        <h2 className="text-balance text-xl font-bold tracking-tight text-foreground">Demandas</h2>
        <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
          Acompanhe e gerencie as solicitações por status, produtor e período.
        </p>
      </header>

      {availabilitySection && (
        <section className="rounded-xl border border-border bg-card/50 p-4 sm:p-6">
          <div className="mb-4 space-y-1">
            <h3 className="text-base font-semibold tracking-tight text-foreground">Ocupação e agenda</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Visualize quando há trabalho alocado entre a data de início e a de entrega. A linha do tempo mostra o período inteiro; o calendário destaca os dias e a lista do dia selecionado.
            </p>
          </div>
          {availabilitySection}
        </section>
      )}

      {dueSoonCount > 0 && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-xl border border-[hsl(var(--warning))]/40 bg-[hsl(var(--warning))]/10 px-4 py-3.5 text-sm text-[hsl(var(--warning))]"
        >
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>
            {dueSoonCount} {dueSoonCount === 1 ? "demanda com término" : "demandas com término"} nos próximos 2 dias.
          </span>
        </div>
      )}

      <section className="space-y-3">
        <h3 className="text-balance text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Resumo por status
        </h3>
        <DemandStatsCards
          counts={counts}
          filterStatus={filterStatus}
          onStatusCardClick={handleStatusCardClick}
        />
      </section>

      <section className="space-y-3">
        <DemandFilters
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          filterProducer={filterProducer}
          setFilterProducer={setFilterProducer}
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          producers={producers}
          showFilters={canEditOrDelete}
          showCreateButton={role === "atendente" || role === "admin" || role === "ceo" || role === "produtor"}
          onCreated={refetch}
          onOpenCreateDialog={onOpenCreateDialog}
        />
      </section>

      <section className="space-y-4" aria-label="Lista de demandas">
        {demandsError ? (
          <div
            role="alert"
            className="flex flex-col items-center justify-center gap-4 rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-16 text-center"
          >
            <AlertCircle className="h-12 w-12 shrink-0 text-destructive" aria-hidden />
            <div>
              <p className="font-medium text-foreground">Falha ao carregar demandas</p>
              <p className="mt-1 max-w-md text-pretty text-sm text-muted-foreground">
                {demandsErrorDetail instanceof Error ? demandsErrorDetail.message : "Verifique sua conexão e tente novamente."}
              </p>
            </div>
            {onRetryDemands && (
              <Button variant="outline" className="min-h-11" onClick={onRetryDemands}>
                Tentar novamente
              </Button>
            )}
          </div>
        ) : demandsLoading ? (
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="border-b border-border/60 bg-muted/30 px-4 py-3 sm:px-5">
              <Skeleton className="h-5 w-44" />
            </div>
            <div className="overflow-x-auto p-4 sm:p-5">
              <p className="sr-only">Carregando lista de demandas</p>
              <div
                className="grid min-w-[720px] gap-4 sm:gap-5"
                style={{ gridTemplateColumns: "repeat(3, minmax(240px, 1fr))" }}
                aria-hidden
              >
                {[1, 2, 3].map((col) => (
                  <div key={col} className="flex min-h-[280px] flex-col rounded-lg border border-border/60 bg-muted/20 p-3">
                    <Skeleton className="mb-3 h-7 w-28" />
                    <div className="space-y-2">
                      <Skeleton className="h-28 w-full rounded-lg" />
                      <Skeleton className="h-28 w-full rounded-lg" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-16 text-center">
            <LayoutDashboard className="mb-1 h-12 w-12 text-muted-foreground/60" aria-hidden />
            <div>
              <p className="font-medium text-foreground">Nenhuma demanda encontrada</p>
              <p className="mt-1 max-w-sm text-pretty text-sm text-muted-foreground">
                Ajuste os filtros ou crie uma nova demanda para começar.
              </p>
            </div>
            {canCreateDemand && onOpenCreateDialog && (
              <Button className="min-h-11 gap-2" onClick={() => onOpenCreateDialog()}>
                <Plus className="h-4 w-4" aria-hidden />
                Nova demanda
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="flex flex-col gap-3 border-b border-border/60 bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <h3
                id="demand-list-heading"
                className="text-balance text-sm font-semibold uppercase tracking-wide text-foreground"
              >
                Lista de demandas
              </h3>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <label htmlFor="demand-org-select" className="sr-only">
                  Organizar colunas por
                </label>
                <Select
                  value={organizationMode}
                  onValueChange={(v) => setOrganizationMode(v as "status" | "producer" | "deadline")}
                >
                  <SelectTrigger id="demand-org-select" className="min-h-11 w-full min-w-[min(100%,220px)] sm:w-[220px]">
                    <SelectValue placeholder="Organizar por" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="status">Organizar por status</SelectItem>
                    <SelectItem value="producer">Organizar por produtor</SelectItem>
                    <SelectItem value="deadline">Organizar por prazo</SelectItem>
                  </SelectContent>
                </Select>
                <span className="tabular-nums text-xs text-muted-foreground">
                  {filtered.length} {filtered.length === 1 ? "item" : "itens"}
                </span>
              </div>
            </div>
            <div className="min-w-0 p-3 sm:p-4">
              <DemandKanban
                filtered={filtered}
                deliverables={deliverables}
                role={role}
                userId={userId}
                updatingId={updatingId}
                onUpdateStatus={handleUpdateStatus}
                onRefresh={refetch}
                canEditOrDelete={canEditOrDelete}
                onEdit={setEditingDemand}
                onDelete={(id) => deleteDemandMutation.mutate(id)}
                updateStatusMutation={updateStatusMutation}
                updatePhaseMutation={updatePhaseMutation}
                deleteDemandMutation={deleteDemandMutation}
                organization={organizationMode}
                ariaLabelledBy="demand-list-heading"
              />
            </div>
          </div>
        )}
      </section>
    </div>
  );

  const showUserManagement = role === "admin";
  const showTabs = role === "admin" || role === "ceo" || role === "atendente" || role === "produtor";

  const headerContent = (
    <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <img src="/minha-logo.png" alt="Logo" className="h-8 w-auto shrink-0 object-contain sm:h-9" />
        <div className="min-w-0">
          <h1 className="truncate text-base font-black leading-none tracking-tight text-accent-foreground sm:text-lg">
            <span className="text-primary">DEMANDAS</span>
          </h1>
          <p className="truncate text-xs text-muted-foreground">{roleLabel} · {displayName}</p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="min-h-[44px] shrink-0 touch-manipulation text-accent-foreground hover:text-primary"
        onClick={signOut}
      >
        <LogOut className="mr-1 h-4 w-4" /> Sair
      </Button>
    </div>
  );

  if (!showTabs) {
    return (
      <>
        <header className="sticky top-0 z-10 border-b border-primary/20 bg-accent/95 backdrop-blur">
          {headerContent}
        </header>
        <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6">
          {demandsContent}
        </main>
      </>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-primary/20 bg-accent/95 backdrop-blur">
        {headerContent}
      </header>

      <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <Tabs defaultValue="demandas" className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList className={showUserManagement ? "h-11 flex-wrap" : "h-11"}>
              <TabsTrigger value="demandas" className="gap-2 px-4">
                <LayoutDashboard className="h-4 w-4" />
                Demandas
              </TabsTrigger>
              <TabsTrigger value="relatorio" className="gap-2 px-4">
                <FileBarChart className="h-4 w-4" />
                Relatório
              </TabsTrigger>
              {showUserManagement && (
                <TabsTrigger value="gerenciar-usuarios" className="gap-2 px-4">
                  <UserPlus className="h-4 w-4" />
                  Gerenciar usuários
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          <TabsContent value="demandas" className="space-y-6 mt-0">
            {demandsContent}
          </TabsContent>

          <TabsContent value="relatorio" className="mt-0">
            <ArtistReportView
              demands={demandsForReport}
              deliverables={deliverables}
              role={role}
              userId={userId}
              updatingId={updatingId}
              onUpdateStatus={handleUpdateStatus}
              onRefresh={refetch}
              canEditOrDelete={canEditOrDelete}
              onEdit={setEditingDemand}
              onDelete={(id) => deleteDemandMutation.mutate(id)}
              updateStatusMutation={updateStatusMutation}
              updatePhaseMutation={updatePhaseMutation}
              deleteDemandMutation={deleteDemandMutation}
            />
          </TabsContent>

          {showUserManagement && (
            <TabsContent value="gerenciar-usuarios" className="mt-0">
              <UserManagement expandedByDefault />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </>
  );
}
