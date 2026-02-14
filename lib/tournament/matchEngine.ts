// lib/tournament/matchEngine.ts
export type MatchStatus = "pending" | "ready" | "live" | "finished";

export type MatchRow = {
  id: string;
  status: MatchStatus;
  starts_at: string | null;
  ends_at: string | null;
  time_limit_seconds: number | null;
  tournament_time_limit_seconds?: number | null;
  team1_id: string | null;
  team2_id: string | null;
  winner_team_id: string | null;
};

export function getEffectiveTimeLimitSeconds(match: MatchRow) {
  return match.time_limit_seconds ?? match.tournament_time_limit_seconds ?? 30;
}

export function canGoLive(match: MatchRow) {
  return match.status === "ready" && !!match.team1_id && !!match.team2_id;
}

export function isTimedOut(match: MatchRow, now = new Date()) {
  if (!match.ends_at) return false;
  return now.getTime() > new Date(match.ends_at).getTime();
}

export function needsSuddenDeath(match: MatchRow, now = new Date()) {
  return match.status === "live" && !match.winner_team_id && isTimedOut(match, now);
}
