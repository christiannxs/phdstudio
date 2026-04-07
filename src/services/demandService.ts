import { supabase } from "@/integrations/supabase/client";
import type { DemandRow, DeliverableRow, DemandStatus } from "@/types/demands";

const demandColumns =
  "id,name,description,artist_name,solicitante_name,producer_name,status,phase_producao,phase_gravacao,phase_mix_master,start_at,due_at,created_by,created_at,updated_at";

const deliverableColumns =
  "id,demand_id,storage_path,file_name,comments,uploaded_by,created_at,updated_at";

export async function listDemands(): Promise<DemandRow[]> {
  const { data, error } = await supabase
    .from("demands")
    .select(demandColumns)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as DemandRow[];
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

export async function updateDemandPhase(
  id: string,
  phase: "phase_producao" | "phase_gravacao" | "phase_mix_master",
  checked: boolean
): Promise<void> {
  const { error } = await supabase.from("demands").update({ [phase]: checked }).eq("id", id);
  if (error) throw error;
}

export async function deleteDemand(id: string): Promise<void> {
  const { error } = await supabase.from("demands").delete().eq("id", id);
  if (error) throw error;
}
