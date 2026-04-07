import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { queryKeys } from "@/lib/query-keys";

export type ProducerAvailabilityRow = Database["public"]["Tables"]["producer_availability"]["Row"];

export async function fetchMyAvailability(userId: string): Promise<ProducerAvailabilityRow[]> {
  const { data, error } = await supabase
    .from("producer_availability")
    .select("id,user_id,date,slot_start,slot_end,created_at")
    .eq("user_id", userId)
    .order("date", { ascending: true })
    .order("slot_start", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export function useMyAvailability(userId: string | undefined) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.producerAvailability.all(userId),
    queryFn: () => fetchMyAvailability(userId!),
    enabled: !!userId,
  });

  const insertMutation = useMutation({
    mutationFn: async (row: {
      user_id: string;
      date: string;
      slot_start: string;
      slot_end: string;
    }) => {
      const { error } = await supabase.from("producer_availability").insert(row);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.producerAvailability.all(userId) }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("producer_availability").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.producerAvailability.all(userId) }),
  });

  return {
    ...query,
    insertSlot: insertMutation.mutateAsync,
    deleteSlot: deleteMutation.mutateAsync,
    isInserting: insertMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export type AvailabilityForViewRow = {
  producer_name: string;
  date: string;
  slot_start: string;
  slot_end: string;
};

export async function fetchProducerAvailabilityForView(): Promise<AvailabilityForViewRow[]> {
  const { data, error } = await supabase.rpc("get_producer_availability_for_view");
  if (error) throw error;
  return (data ?? []) as AvailabilityForViewRow[];
}

export function useProducerAvailabilityForView(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.producerAvailability.view,
    queryFn: fetchProducerAvailabilityForView,
    enabled,
  });
}
