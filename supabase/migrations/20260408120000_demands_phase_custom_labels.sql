-- Rótulos personalizáveis para cada etapa do checklist (produtor define o nome do processo)
ALTER TABLE public.demands
  ADD COLUMN IF NOT EXISTS phase_producao_label text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS phase_gravacao_label text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS phase_mix_master_label text NOT NULL DEFAULT '';

COMMENT ON COLUMN public.demands.phase_producao_label IS 'Nome da etapa 1 do checklist (livre, definido pelo produtor)';
COMMENT ON COLUMN public.demands.phase_gravacao_label IS 'Nome da etapa 2 do checklist (livre, definido pelo produtor)';
COMMENT ON COLUMN public.demands.phase_mix_master_label IS 'Nome da etapa 3 do checklist (livre, definido pelo produtor)';
