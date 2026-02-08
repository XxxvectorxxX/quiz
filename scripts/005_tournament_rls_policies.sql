-- Políticas RLS para permitir que todos vejam torneios
-- Execute este script no SQL Editor do Supabase se os torneios não aparecem para usuários comuns

-- Garantir que RLS está habilitado nas tabelas de torneio
ALTER TABLE IF EXISTS public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tournament_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tournament_matches ENABLE ROW LEVEL SECURITY;

-- ============================================
-- TOURNAMENTS - Leitura pública
-- ============================================

-- Remover política existente se houver uma que restringe (ajuste o nome se necessário)
DROP POLICY IF EXISTS "Anyone can view tournaments" ON public.tournaments;

-- Qualquer pessoa pode visualizar torneios (logado ou não)
CREATE POLICY "Anyone can view tournaments"
  ON public.tournaments FOR SELECT
  USING (true);

-- Apenas admins podem criar torneios
DROP POLICY IF EXISTS "Admins can create tournaments" ON public.tournaments;
CREATE POLICY "Admins can create tournaments"
  ON public.tournaments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Apenas admins podem atualizar torneios
DROP POLICY IF EXISTS "Admins can update tournaments" ON public.tournaments;
CREATE POLICY "Admins can update tournaments"
  ON public.tournaments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Apenas admins podem excluir torneios
DROP POLICY IF EXISTS "Admins can delete tournaments" ON public.tournaments;
CREATE POLICY "Admins can delete tournaments"
  ON public.tournaments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- ============================================
-- TOURNAMENT_PARTICIPANTS - Leitura pública
-- ============================================

DROP POLICY IF EXISTS "Anyone can view tournament participants" ON public.tournament_participants;
CREATE POLICY "Anyone can view tournament participants"
  ON public.tournament_participants FOR SELECT
  USING (true);

-- Usuários logados podem se inscrever (como líder de equipe)
DROP POLICY IF EXISTS "Authenticated can join tournament" ON public.tournament_participants;
CREATE POLICY "Authenticated can join tournament"
  ON public.tournament_participants FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Apenas admins podem excluir participantes
DROP POLICY IF EXISTS "Admins can delete participants" ON public.tournament_participants;
CREATE POLICY "Admins can delete participants"
  ON public.tournament_participants FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- ============================================
-- TOURNAMENT_MATCHES - Leitura pública
-- ============================================

DROP POLICY IF EXISTS "Anyone can view tournament matches" ON public.tournament_matches;
CREATE POLICY "Anyone can view tournament matches"
  ON public.tournament_matches FOR SELECT
  USING (true);

-- Apenas via RPC (generate_tournament_bracket) ou admins
DROP POLICY IF EXISTS "Admins can manage matches" ON public.tournament_matches;
CREATE POLICY "Admins can manage matches"
  ON public.tournament_matches FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );
