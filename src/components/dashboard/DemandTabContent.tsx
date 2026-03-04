import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogOut, LayoutDashboard, UserPlus, AlertTriangle, FileBarChart, CalendarDays, CalendarRange, AlertCircle } from "lucide-react";
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
              Timeline calendário
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-2">
              <CalendarDays className="h-4 w-4" />
              Calendário
            </TabsTrigger>
          </TabsList>
          <TabsContent value="timeline-calendar" className="mt-3">
            <DemandCalendarTimeline
              demands={demandsForCalendar}
              isLoading={demandsLoading}
              onViewDemand={onViewDemand}
              title="Timeline em forma de calendário"
              description="Cada barra = período ocupado (início → término). Conectado à lista de demandas: as que já existem e as que forem criadas aparecem aqui."
            />
          </TabsContent>
          <TabsContent value="calendar" className="mt-3">
            <ProducerAvailabilityCalendar
              userId={userId}
              demands={demandsForCalendar}
              isLoading={demandsLoading}
              onEditDemand={setEditingDemand}
              onAddDemandWithDate={onOpenCreateDialog ? (date) => onOpenCreateDialog(date) : undefined}
              title="Quando estou ocupado"
              description="Cada faixa = período em que você está ocupado (do início ao término da entrega). Clique em um dia para ver os períodos que atravessam esse dia."
            />
          </TabsContent>
        </Tabs>
      </div>
    ) : role === "ceo" || role === "atendente" || role === "admin" ? (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm font-medium text-muted-foreground">Produtor</label>
            <Select value={calendarProducer} onValueChange={setCalendarProducer}>
              <SelectTrigger className="w-[200px]">
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
                Timeline calendário
              </TabsTrigger>
              <TabsTrigger value="calendar" className="gap-2">
                <CalendarDays className="h-4 w-4" />
                Calendário
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        {availabilityView === "timeline-calendar" ? (
          <DemandCalendarTimeline
            demands={demandsForCalendar}
            isLoading={demandsLoading}
            onViewDemand={onViewDemand}
            title="Timeline em forma de calendário"
            description="Cada barra = período ocupado (início → término). Conectado à lista de demandas: as que já existem e as que forem criadas aparecem aqui."
            groupByProducer={calendarProducer === "all"}
          />
        ) : (
          <ProducerAvailabilityCalendar
            userId=""
            demands={demandsForCalendar}
            isLoading={demandsLoading}
            onEditDemand={setEditingDemand}
            title="Quando cada produtor está ocupado"
            description="Cada faixa = período em que o produtor está ocupado (do início ao término da entrega). Clique em um dia para ver os períodos que atravessam esse dia."
            showProducerFilter
          />
        )}
      </div>
    ) : null;

  const demandsContent = (
    <div className="space-y-8">
      <header className="space-y-1">
        <h2 className="text-xl font-bold tracking-tight text-foreground">Demandas</h2>
        <p className="text-sm text-muted-foreground">
          Acompanhe e gerencie as solicitações por status, produtor e período.
        </p>
      </header>

      {availabilitySection && (
        <section className="rounded-xl border border-border bg-card/50 p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Ocupação</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Cada demanda com data de início e término deixa o produtor ocupado nesse período até a entrega.
          </p>
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
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Resumo por status</h3>
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

      <section className="space-y-4">
        {demandsError ? (
          <div
            role="alert"
            className="flex flex-col items-center justify-center py-16 px-4 rounded-xl border border-destructive/40 bg-destructive/5 gap-4 text-center"
          >
            <AlertCircle className="h-12 w-12 text-destructive shrink-0" />
            <div>
              <p className="font-medium text-foreground">Falha ao carregar demandas</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                {demandsErrorDetail instanceof Error ? demandsErrorDetail.message : "Verifique sua conexão e tente novamente."}
              </p>
            </div>
            {onRetryDemands && (
              <Button variant="outline" onClick={onRetryDemands}>
                Tentar novamente
              </Button>
            )}
          </div>
        ) : demandsLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="animate-spin h-10 w-10 border-2 border-primary border-t-transparent rounded-full" />
            <p className="text-sm text-muted-foreground">Carregando demandas...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/30 flex flex-col items-center justify-center py-16 px-4 text-center">
            <LayoutDashboard className="h-12 w-12 text-muted-foreground/60 mb-3" />
            <p className="font-medium text-foreground">Nenhuma demanda encontrada</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Ajuste os filtros ou crie uma nova demanda para começar.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Lista de demandas
              </h3>
              <span className="text-xs text-muted-foreground tabular-nums">
                {filtered.length} {filtered.length === 1 ? "item" : "itens"}
              </span>
            </div>
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
            />
          </>
        )}
      </section>
    </div>
  );

  const showUserManagement = role === "admin";
  const showTabs = role === "admin" || role === "ceo" || role === "atendente" || role === "produtor";

  if (!showTabs) {
    return (
      <>
        <header className="border-b border-primary/20 bg-accent sticky top-0 z-10">
          <div className="mx-auto max-w-6xl flex flex-wrap items-center justify-between gap-2 px-3 py-2 sm:px-4 sm:py-3">
            <div className="flex items-center gap-2 min-w-0">
              <img src="/minha-logo.png" alt="Logo" className="h-8 sm:h-9 w-auto object-contain shrink-0" />
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-black leading-none text-accent-foreground tracking-tight truncate">
                  <span className="text-primary">DEMANDAS</span>
                </h1>
                <p className="text-xs text-muted-foreground truncate">{roleLabel} · {displayName}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="min-h-[44px] touch-manipulation shrink-0 text-accent-foreground hover:text-primary" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-1" /> Sair
            </Button>
          </div>
        </header>
        <main className="w-full max-w-[1920px] mx-auto px-4 py-6 space-y-6">
          {demandsContent}
        </main>
      </>
    );
  }

  return (
    <>
      <header className="border-b border-primary/20 bg-accent sticky top-0 z-10">
        <div className="mx-auto max-w-6xl flex flex-wrap items-center justify-between gap-2 px-3 py-2 sm:px-4 sm:py-3">
          <div className="flex items-center gap-2 min-w-0">
            <img src="/minha-logo.png" alt="Logo" className="h-8 sm:h-9 w-auto object-contain shrink-0" />
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-black leading-none text-accent-foreground tracking-tight truncate">
                <span className="text-primary">DEMANDAS</span>
              </h1>
              <p className="text-xs text-muted-foreground truncate">{roleLabel} · {displayName}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="min-h-[44px] touch-manipulation shrink-0 text-accent-foreground hover:text-primary" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-1" /> Sair
          </Button>
        </div>
      </header>

      <main className="w-full max-w-[1920px] mx-auto px-4 py-6 space-y-6">
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
