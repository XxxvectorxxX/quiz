-- Schema para torneio 1v1 em tempo real - velocidade de resposta
-- Execute no Supabase SQL Editor

-- Adicionar coluna question_time_seconds em tournaments (se não existir)
ALTER TABLE public.tournaments
ADD COLUMN IF NOT EXISTS question_time_seconds integer DEFAULT 15;

-- Adicionar colunas para partida em andamento em tournament_matches
ALTER TABLE public.tournament_matches
ADD COLUMN IF NOT EXISTS current_question_id uuid REFERENCES public.questions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS question_started_at timestamptz,
ADD COLUMN IF NOT EXISTS first_responder_team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS next_match_id uuid REFERENCES public.tournament_matches(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS next_match_slot text CHECK (next_match_slot IN ('team1', 'team2'));

-- Tabela de respostas da partida (timestamp server-side)
CREATE TABLE IF NOT EXISTS public.tournament_match_responses (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id uuid NOT NULL REFERENCES public.tournament_matches(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  selected_answer text NOT NULL,
  is_correct boolean NOT NULL,
  responded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(match_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_match_responses_match ON public.tournament_match_responses(match_id);

-- Habilitar Realtime: no Supabase Dashboard > Database > Replication, adicione
-- tournament_matches e tournaments à publicação supabase_realtime

-- Nota: Para avanço automático do vencedor, o RPC generate_tournament_bracket deve
-- preencher next_match_id e next_match_slot em cada partida ao criar o chaveamento.

-- RLS para tournament_match_responses
ALTER TABLE public.tournament_match_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view match responses" ON public.tournament_match_responses;
CREATE POLICY "Anyone can view match responses"
  ON public.tournament_match_responses FOR SELECT
  USING (true);

-- Apenas participantes da partida podem inserir (via API server-side)
DROP POLICY IF EXISTS "Service can insert match responses" ON public.tournament_match_responses;
CREATE POLICY "Service can insert match responses"
  ON public.tournament_match_responses FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
