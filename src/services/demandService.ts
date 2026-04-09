import { supabase } from "@/integrations/supabase/client";
import type { DemandRow, DeliverableRow, DemandStatus } from "@/types/demands";
import type { PhaseKey, PhaseLabelColumn } from "@/lib/demandPhases";

/**
 * Garante rótulos de etapa mesmo quando o BD ainda não tem as colunas phase_*_label
 * (migração não aplicada): o select explícito quebrava o PostgREST com "column does not exist".
 */
function normalizeDemandRow(row: DemandRow): DemandRow {
  return {
    ...row,
    phase_producao_label: row.phase_producao_label ?? "",
    phase_gravacao_label: row.phase_gravacao_label ?? "",
    phase_mix_master_label: row.phase_mix_master_label ?? "",
    phase_step_4: row.phase_step_4 ?? false,
    phase_step_4_label: row.phase_step_4_label ?? "",
    phase_step_5: row.phase_step_5 ?? false,
    phase_step_5_label: row.phase_step_5_label ?? "",
  };
}

const deliverableColumns =
  "id,demand_id,storage_path,file_name,comments,uploaded_by,created_at,updated_at";

export async function listDemands(): Promise<DemandRow[]> {
  const { data, error } = await supabase.from("demands").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => normalizeDemandRow(row as DemandRow));
}

export async function listDeliverables(): Promise<DeliverableRow[]> {
  const { data, error } = await supabase.from("demand_deliverables").select(deliverableColumns);
  if (error) throw error;
  return (data ?? []) as DeliverableRow[];
}

export async function updateDemandStatus(id: string, status: DemandStatus): Promise<void> {
  const { error } = await supabase.from("demands").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function updateDemandPhase(id: string, phase: PhaseKey, checked: boolean): Promise<void> {
  const { error } = await supabase.from("demands").update({ [phase]: checked }).eq("id", id);
  if (error) throw error;
}

const PHASE_LABEL_MAX = 120;

export async function updateDemandPhaseLabel(id: string, labelColumn: PhaseLabelColumn, value: string): Promise<void> {
  const trimmed = value.trim().slice(0, PHASE_LABEL_MAX);
  const { error } = await supabase.from("demands").update({ [labelColumn]: trimmed }).eq("id", id);
  if (error) throw error;
}

export async function deleteDemand(id: string): Promise<void> {
  const { error } = await supabase.from("demands").delete().eq("id", id);
  if (error) throw error;
}
