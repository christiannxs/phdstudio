-- Onda 2: preparar migração de acoplamento por nome para ID relacional.
-- Mantém compatibilidade: a coluna antiga producer_name continua ativa.
alter table public.demands
add column if not exists producer_user_id uuid;

create index if not exists idx_demands_producer_user_id
  on public.demands (producer_user_id);

comment on column public.demands.producer_user_id is
  'Preparação para migração de producer_name (texto) para referência por user_id.';
