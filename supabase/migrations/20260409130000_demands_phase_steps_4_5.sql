-- Etapas 4 e 5 do checklist de produção (mesmo padrão das três primeiras)
ALTER TABLE public.demands
  ADD COLUMN IF NOT EXISTS phase_step_4 BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS phase_step_4_label TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS phase_step_5 BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS phase_step_5_label TEXT NOT NULL DEFAULT '';

COMMENT ON COLUMN public.demands.phase_step_4 IS 'Etapa 4 do checklist: marcado pelo produtor quando concluído';
COMMENT ON COLUMN public.demands.phase_step_4_label IS 'Nome da etapa 4 (livre, definido pelo produtor)';
COMMENT ON COLUMN public.demands.phase_step_5 IS 'Etapa 5 do checklist: marcado pelo produtor quando concluído';
COMMENT ON COLUMN public.demands.phase_step_5_label IS 'Nome da etapa 5 (livre, definido pelo produtor)';
