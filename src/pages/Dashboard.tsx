import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProducers } from "@/hooks/useProducers";
import { useDemands } from "@/hooks/useDemands";
import EditDemandDialog from "@/components/EditDemandDialog";
import CreateDemandDialog from "@/components/CreateDemandDialog";
import DemandTabContent from "@/components/dashboard/DemandTabContent";
import { handleApiError } from "@/lib/errors";
import { toast } from "sonner";
import type { DemandRow } from "@/types/demands";
import { getPeriodStart, countDueSoon } from "@/lib/demands";

export default function Dashboard() {
  const { user, loading: authLoading, role, displayName, signOut } = useAuth();
  const { data: producers = [] } = useProducers(role);
  const {
    demands,
    deliverables,
    isLoading: demandsLoading,
    isError: demandsError,
    error: demandsErrorDetail,
    refetch,
    updateStatusMutation,
    updatePhaseMutation,
    updatePhaseLabelMutation,
    deleteDemandMutation,
  } = useDemands();

  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingDemand, setEditingDemand] = useState<DemandRow | null>(null);
  const [viewingDemand, setViewingDemand] = useState<DemandRow | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createInitialDueDate, setCreateInitialDueDate] = useState<Date | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterProducer, setFilterProducer] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");

  const canEditOrDelete = true;
  const canEditFromView = true;

  if (authLoading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  if (!user) return <Navigate to="/auth" replace />;

  const periodStart = getPeriodStart(dateFilter);

  const matchesProducerAndPeriod = (d: DemandRow) => {
    if (filterProducer !== "all" && d.producer_name !== filterProducer) return false;
    if (periodStart) {
      // Mostra a demanda se ela estava ativa no período: termina após o início do período
      const activityDate = d.due_at ?? d.start_at ?? d.created_at;
      if (new Date(activityDate) < periodStart) return false;
    }
    return true;
  };

  const isProdutor = role === "produtor" && displayName != null;
  const visibleDemands = isProdutor
    ? demands.filter((d) => d.producer_name === displayName || d.created_by === user.id)
    : demands;

  /** Demandas não concluídas (a lista principal nunca mistura concluídas). */
  const filteredActive = visibleDemands.filter((d) => {
    if (!matchesProducerAndPeriod(d)) return false;
    if (d.status === "concluido") return false;
    if (filterStatus !== "all" && filterStatus !== "concluido" && d.status !== filterStatus) return false;
    return true;
  });

  /** Só concluídas; mesmos filtros de produtor/período (status do filtro “Concluído” foi removido do dropdown). */
  const filteredCompleted = visibleDemands.filter((d) => d.status === "concluido" && matchesProducerAndPeriod(d));

  const dueSoonCount = countDueSoon(visibleDemands);
  const demandsForReport = visibleDemands;

  const counts = {
    aguardando: visibleDemands.filter((d) => d.status === "aguardando").length,
    em_producao: visibleDemands.filter((d) => d.status === "em_producao").length,
    concluido: visibleDemands.filter((d) => d.status === "concluido").length,
  };

  const roleLabel =
    role === "atendente"
      ? "Atendente"
      : role === "produtor"
        ? "Produtor"
        : role === "admin"
          ? "Desenvolvedor"
          : role === "ceo"
            ? "CEO"
            : role === "financeiro"
              ? "Financeiro"
              : "Sem perfil";

  const handleStatusCardClick = (status: string) => {
    setFilterStatus((prev) => (prev === status ? "all" : status));
  };

  const openCreateDialog = (initialDueDate?: Date | null) => {
    setCreateInitialDueDate(initialDueDate ?? null);
    setCreateDialogOpen(true);
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    try {
      await updateStatusMutation.mutateAsync({
        id,
        status: newStatus as "aguardando" | "em_producao" | "concluido",
      });
      toast.success("Status atualizado!");
    } catch (e) {
      handleApiError(e, "Erro ao atualizar status");
    }
    setUpdatingId(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <DemandTabContent
        role={role}
        displayName={displayName}
        userId={user.id}
        signOut={signOut}
        demands={visibleDemands}
        deliverables={deliverables}
        demandsForReport={demandsForReport}
        demandsLoading={demandsLoading}
        demandsError={demandsError}
        demandsErrorDetail={demandsErrorDetail}
        onRetryDemands={refetch}
        filteredActive={filteredActive}
        filteredCompleted={filteredCompleted}
        counts={counts}
        dueSoonCount={dueSoonCount}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        filterProducer={filterProducer}
        setFilterProducer={setFilterProducer}
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        producers={producers}
        canEditOrDelete={canEditOrDelete}
        updatingId={updatingId}
        onViewDemand={setViewingDemand}
        refetch={refetch}
        updateStatusMutation={updateStatusMutation}
        updatePhaseMutation={updatePhaseMutation}
        updatePhaseLabelMutation={updatePhaseLabelMutation}
        deleteDemandMutation={deleteDemandMutation}
        handleStatusCardClick={handleStatusCardClick}
        handleUpdateStatus={handleUpdateStatus}
        roleLabel={roleLabel}
        onOpenCreateDialog={openCreateDialog}
      />
      <CreateDemandDialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) setCreateInitialDueDate(null);
        }}
        initialDueDate={createInitialDueDate}
        onCreated={() => { refetch(); setCreateDialogOpen(false); setCreateInitialDueDate(null); }}
      />
      <EditDemandDialog
        demand={editingDemand ?? viewingDemand}
        open={!!editingDemand || !!viewingDemand}
        onOpenChange={(open) => {
          if (!open) {
            setEditingDemand(null);
            setViewingDemand(null);
          }
        }}
        onUpdated={() => { refetch(); setEditingDemand(null); setViewingDemand(null); }}
        readOnly={!!viewingDemand && !editingDemand}
        canEditFromView={canEditFromView}
        onRequestEdit={() => {
          if (viewingDemand) {
            setEditingDemand(viewingDemand);
            setViewingDemand(null);
          }
        }}
      />
    </div>
  );
}
