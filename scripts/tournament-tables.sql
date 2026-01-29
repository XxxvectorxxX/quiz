-- =============================================
-- TOURNAMENT SYSTEM - COMPLETE SCHEMA
-- =============================================

-- 1. CREATE BASE TOURNAMENTS TABLE
CREATE TABLE IF NOT EXISTS tournaments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'registration', 'in_progress', 'completed', 'cancelled')),
  max_teams INTEGER DEFAULT 16,
  questions_per_match INTEGER DEFAULT 5,
  time_per_question INTEGER DEFAULT 30,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CREATE TOURNAMENT PARTICIPANTS TABLE
CREATE TABLE IF NOT EXISTS tournament_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  seed INTEGER,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tournament_id, team_id)
);

-- 3. CREATE TOURNAMENT MATCHES TABLE
CREATE TABLE IF NOT EXISTS tournament_matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL DEFAULT 1,
  match_number INTEGER NOT NULL DEFAULT 1,
  team1_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  team2_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  winner_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  team1_score INTEGER DEFAULT 0,
  team2_score INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  questions UUID[] DEFAULT '{}',
  current_question_index INTEGER DEFAULT 0,
  time_per_question INTEGER DEFAULT 30,
  question_started_at TIMESTAMPTZ,
  next_match_id UUID REFERENCES tournament_matches(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CREATE TOURNAMENT MATCH ANSWERS TABLE
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

-- 5. CREATE TOURNAMENT SPECTATORS TABLE
CREATE TABLE IF NOT EXISTS tournament_spectators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  match_id UUID REFERENCES tournament_matches(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  session_id TEXT,
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. CREATE INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_created_by ON tournaments(created_by);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_tournament_id ON tournament_participants(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_team_id ON tournament_participants(team_id);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_tournament_id ON tournament_matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_status ON tournament_matches(status);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_round ON tournament_matches(tournament_id, round_number);
CREATE INDEX IF NOT EXISTS idx_tournament_match_answers_match_id ON tournament_match_answers(match_id);
CREATE INDEX IF NOT EXISTS idx_tournament_match_answers_team_id ON tournament_match_answers(team_id);
CREATE INDEX IF NOT EXISTS idx_tournament_spectators_tournament_id ON tournament_spectators(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_spectators_match_id ON tournament_spectators(match_id);

-- 7. ENABLE ROW LEVEL SECURITY
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_match_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_spectators ENABLE ROW LEVEL SECURITY;

-- 8. RLS POLICIES FOR TOURNAMENTS
CREATE POLICY "Anyone can view tournaments" ON tournaments
  FOR SELECT USING (true);

CREATE POLICY "Admins can create tournaments" ON tournaments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can update tournaments" ON tournaments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can delete tournaments" ON tournaments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- 9. RLS POLICIES FOR TOURNAMENT PARTICIPANTS
CREATE POLICY "Anyone can view tournament participants" ON tournament_participants
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage participants" ON tournament_participants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Team leaders can register teams" ON tournament_participants
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams
      WHERE id = team_id AND leader_id = auth.uid()
    )
  );

-- 10. RLS POLICIES FOR TOURNAMENT MATCHES
CREATE POLICY "Anyone can view tournament matches" ON tournament_matches
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage matches" ON tournament_matches
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- 11. RLS POLICIES FOR TOURNAMENT MATCH ANSWERS
CREATE POLICY "Anyone can view match answers" ON tournament_match_answers
  FOR SELECT USING (true);

CREATE POLICY "Team members can insert answers" ON tournament_match_answers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.team_id = tournament_match_answers.team_id 
      AND team_members.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = tournament_match_answers.team_id
      AND teams.leader_id = auth.uid()
    )
  );

-- 12. RLS POLICIES FOR TOURNAMENT SPECTATORS
CREATE POLICY "Anyone can view spectators" ON tournament_spectators
  FOR SELECT USING (true);

CREATE POLICY "Anyone can join as spectator" ON tournament_spectators
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can leave spectator" ON tournament_spectators
  FOR DELETE USING (user_id = auth.uid() OR user_id IS NULL);

-- 13. FUNCTION TO GENERATE TOURNAMENT BRACKET
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
  SELECT array_agg(team_id ORDER BY seed NULLS LAST, registered_at) INTO participant_ids
  FROM tournament_participants
  WHERE tournament_id = tournament_uuid;
  
  num_participants := array_length(participant_ids, 1);
  
  IF num_participants IS NULL OR num_participants < 2 THEN
    RAISE EXCEPTION 'Need at least 2 participants to generate bracket';
  END IF;
  
  -- Calculate number of rounds needed (log base 2, rounded up)
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
      status,
      time_per_question
    )
    VALUES (
      tournament_uuid,
      1,
      match_num,
      CASE WHEN team_index <= num_participants THEN participant_ids[team_index] ELSE NULL END,
      CASE WHEN team_index + 1 <= num_participants THEN participant_ids[team_index + 1] ELSE NULL END,
      'pending',
      (SELECT time_per_question FROM tournaments WHERE id = tournament_uuid)
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
        status,
        time_per_question
      )
      VALUES (
        tournament_uuid,
        current_round,
        match_num,
        'pending',
        (SELECT time_per_question FROM tournaments WHERE id = tournament_uuid)
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
      status = 'completed',
      completed_at = NOW()
    WHERE id = participants_record.id;
    
    -- Advance to next match if exists
    IF participants_record.next_match_id IS NOT NULL THEN
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

-- 14. FUNCTION TO ADVANCE WINNER TO NEXT MATCH
CREATE OR REPLACE FUNCTION advance_match_winner(match_uuid UUID, winner_uuid UUID)
RETURNS void AS $$
DECLARE
  next_match UUID;
BEGIN
  -- Get the next match ID
  SELECT next_match_id INTO next_match
  FROM tournament_matches
  WHERE id = match_uuid;
  
  -- Update current match with winner
  UPDATE tournament_matches
  SET 
    winner_team_id = winner_uuid,
    status = 'completed',
    completed_at = NOW()
  WHERE id = match_uuid;
  
  -- Advance winner to next match if exists
  IF next_match IS NOT NULL THEN
    IF (SELECT team1_id FROM tournament_matches WHERE id = next_match) IS NULL THEN
      UPDATE tournament_matches
      SET team1_id = winner_uuid
      WHERE id = next_match;
    ELSE
      UPDATE tournament_matches
      SET team2_id = winner_uuid
      WHERE id = next_match;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 15. FUNCTION TO START A MATCH
CREATE OR REPLACE FUNCTION start_tournament_match(match_uuid UUID, question_ids UUID[])
RETURNS void AS $$
BEGIN
  UPDATE tournament_matches
  SET 
    status = 'in_progress',
    started_at = NOW(),
    questions = question_ids,
    current_question_index = 0,
    question_started_at = NOW()
  WHERE id = match_uuid;
END;
$$ LANGUAGE plpgsql;
