-- Restaura permissão de UPDATE em demands para atendente, CEO e admin,
-- para que a edição pelo modal funcione para todos os acessos (não só o criador).
-- A política "Creator can update own demand" permanece; com várias políticas
-- de UPDATE, o RLS usa OR: quem for criador OU atendente OU CEO OU admin pode atualizar.
-- Produtor continua podendo atualizar demandas em que é o produtor (política já existente).

CREATE POLICY "Atendente can update demands" ON public.demands
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'atendente'))
WITH CHECK (public.has_role(auth.uid(), 'atendente'));

CREATE POLICY "CEO can update demands" ON public.demands
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'ceo'))
WITH CHECK (public.has_role(auth.uid(), 'ceo'));

CREATE POLICY "Admin can update demands" ON public.demands
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
