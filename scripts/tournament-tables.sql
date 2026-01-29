-- Tournament Match Answers table
CREATE TABLE IF NOT EXISTS tournament_match_answers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES tournament_matches(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  response_time INTEGER NOT NULL DEFAULT 0,
  answered_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(match_id, team_id, question_id)
);

-- Tournament Spectators table
CREATE TABLE IF NOT EXISTS tournament_spectators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  match_id UUID REFERENCES tournament_matches(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  session_id TEXT,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(match_id, user_id),
  UNIQUE(match_id, session_id)
);

-- Add columns to tournament_matches if not exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournament_matches' AND column_name = 'questions') THEN
    ALTER TABLE tournament_matches ADD COLUMN questions UUID[] DEFAULT '{}';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournament_matches' AND column_name = 'current_question_index') THEN
    ALTER TABLE tournament_matches ADD COLUMN current_question_index INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournament_matches' AND column_name = 'time_per_question') THEN
    ALTER TABLE tournament_matches ADD COLUMN time_per_question INTEGER DEFAULT 30;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournament_matches' AND column_name = 'question_started_at') THEN
    ALTER TABLE tournament_matches ADD COLUMN question_started_at TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournament_matches' AND column_name = 'next_match_id') THEN
    ALTER TABLE tournament_matches ADD COLUMN next_match_id UUID REFERENCES tournament_matches(id);
  END IF;
END $$;

-- Create or replace the generate_tournament_bracket function
CREATE OR REPLACE FUNCTION generate_tournament_bracket(tournament_uuid UUID)
RETURNS void AS $$
DECLARE
  participants_record RECORD;
  participant_ids UUID[];
  num_participants INTEGER;
  num_rounds INTEGER;
  current_round INTEGER;
  matches_in_round INTEGER;
  match_num INTEGER;
  team_index INTEGER;
  match_id UUID;
  previous_round_matches UUID[];
  current_round_matches UUID[];
BEGIN
  -- Get all participants ordered by seed
  SELECT array_agg(team_id ORDER BY seed) INTO participant_ids
  FROM tournament_participants
  WHERE tournament_id = tournament_uuid;
  
  num_participants := array_length(participant_ids, 1);
  
  IF num_participants IS NULL OR num_participants < 2 THEN
    RAISE EXCEPTION 'Need at least 2 participants to generate bracket';
  END IF;
  
  -- Calculate number of rounds needed
  num_rounds := CEIL(LOG(2, num_participants));
  
  -- Delete existing matches for this tournament
  DELETE FROM tournament_matches WHERE tournament_id = tournament_uuid;
  
  team_index := 1;
  
  -- Generate first round matches
  matches_in_round := CEIL(num_participants::FLOAT / 2);
  current_round_matches := '{}';
  
  FOR match_num IN 1..matches_in_round LOOP
    INSERT INTO tournament_matches (
      tournament_id,
      round_number,
      match_number,
      team1_id,
      team2_id,
      status
    )
    VALUES (
      tournament_uuid,
      1,
      match_num,
      CASE WHEN team_index <= num_participants THEN participant_ids[team_index] ELSE NULL END,
      CASE WHEN team_index + 1 <= num_participants THEN participant_ids[team_index + 1] ELSE NULL END,
      'pending'
    )
    RETURNING id INTO match_id;
    
    current_round_matches := array_append(current_round_matches, match_id);
    team_index := team_index + 2;
  END LOOP;
  
  -- Generate subsequent rounds
  FOR current_round IN 2..num_rounds LOOP
    previous_round_matches := current_round_matches;
    current_round_matches := '{}';
    matches_in_round := CEIL(array_length(previous_round_matches, 1)::FLOAT / 2);
    
    FOR match_num IN 1..matches_in_round LOOP
      INSERT INTO tournament_matches (
        tournament_id,
        round_number,
        match_number,
        status
      )
      VALUES (
        tournament_uuid,
        current_round,
        match_num,
        'pending'
      )
      RETURNING id INTO match_id;
      
      current_round_matches := array_append(current_round_matches, match_id);
      
      -- Link previous round matches to this one
      IF (match_num * 2 - 1) <= array_length(previous_round_matches, 1) THEN
        UPDATE tournament_matches
        SET next_match_id = match_id
        WHERE id = previous_round_matches[match_num * 2 - 1];
      END IF;
      
      IF (match_num * 2) <= array_length(previous_round_matches, 1) THEN
        UPDATE tournament_matches
        SET next_match_id = match_id
        WHERE id = previous_round_matches[match_num * 2];
      END IF;
    END LOOP;
  END LOOP;
  
  -- Handle byes (teams that automatically advance due to odd numbers)
  -- For first round matches with only one team, auto-advance that team
  FOR participants_record IN 
    SELECT tm.id, tm.team1_id, tm.team2_id, tm.next_match_id
    FROM tournament_matches tm
    WHERE tm.tournament_id = tournament_uuid
    AND tm.round_number = 1
    AND ((tm.team1_id IS NOT NULL AND tm.team2_id IS NULL) OR (tm.team1_id IS NULL AND tm.team2_id IS NOT NULL))
  LOOP
    -- Set winner and advance
    UPDATE tournament_matches
    SET 
      winner_team_id = COALESCE(participants_record.team1_id, participants_record.team2_id),
      status = 'completed'
    WHERE id = participants_record.id;
    
    -- Advance to next match if exists
    IF participants_record.next_match_id IS NOT NULL THEN
      -- Check if team1_id is null in next match
      IF (SELECT team1_id FROM tournament_matches WHERE id = participants_record.next_match_id) IS NULL THEN
        UPDATE tournament_matches
        SET team1_id = COALESCE(participants_record.team1_id, participants_record.team2_id)
        WHERE id = participants_record.next_match_id;
      ELSE
        UPDATE tournament_matches
        SET team2_id = COALESCE(participants_record.team1_id, participants_record.team2_id)
        WHERE id = participants_record.next_match_id;
      END IF;
    END IF;
  END LOOP;
  
END;
$$ LANGUAGE plpgsql;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tournament_match_answers_match_id ON tournament_match_answers(match_id);
CREATE INDEX IF NOT EXISTS idx_tournament_match_answers_team_id ON tournament_match_answers(team_id);
CREATE INDEX IF NOT EXISTS idx_tournament_spectators_tournament_id ON tournament_spectators(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_spectators_match_id ON tournament_spectators(match_id);

-- Enable RLS
ALTER TABLE tournament_match_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_spectators ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tournament_match_answers
CREATE POLICY "Anyone can view match answers" ON tournament_match_answers
  FOR SELECT USING (true);

CREATE POLICY "Team members can insert answers" ON tournament_match_answers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.team_id = tournament_match_answers.team_id 
      AND team_members.user_id = auth.uid()
    )
  );

-- RLS Policies for tournament_spectators
CREATE POLICY "Anyone can view spectators" ON tournament_spectators
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert spectators" ON tournament_spectators
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can delete own spectator record" ON tournament_spectators
  FOR DELETE USING (user_id = auth.uid() OR user_id IS NULL);
