-- Libera acesso completo para todos os usuários autenticados:
-- SELECT em todas as demandas, UPDATE em qualquer demanda, download de arquivos.

-- 1. Todos os autenticados podem ver todas as demandas
DROP POLICY IF EXISTS "Produtor can view own demands" ON public.demands;
CREATE POLICY "All authenticated can view all demands" ON public.demands
FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

-- 2. Todos os autenticados podem atualizar qualquer demanda
CREATE POLICY "All authenticated can update any demand" ON public.demands
FOR UPDATE TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 3. Todos os autenticados podem criar demandas
CREATE POLICY "All authenticated can create demands" ON public.demands
FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- 4. can_manage_deliverable libera para qualquer autenticado
CREATE OR REPLACE FUNCTION public.can_manage_deliverable_for_demand(_demand_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL;
$$;

-- 5. Todos os autenticados podem baixar arquivos do bucket demand-files
CREATE POLICY "Allow download for all authenticated demand-files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'demand-files'
  AND auth.uid() IS NOT NULL
);
