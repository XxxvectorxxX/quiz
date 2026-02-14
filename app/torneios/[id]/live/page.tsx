// app/torneios/[id]/live/page.tsx
import { createClient } from "@/lib/supabase/server";
import LiveClient from "./liveClient";

export default async function LivePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // público pode ler via RLS
  const { data: tournament } = await supabase.from("tournaments").select("id,name,status,question_time_seconds").eq("id", id).single();

  const { data: matches } = await supabase
    .from("tournament_matches")
    .select("id,tournament_id,round,match_index,status,team1_id,team2_id,winner_team_id,starts_at,ends_at,question_text")
    .eq("tournament_id", id)
    .order("round", { ascending: true })
    .order("match_index", { ascending: true });

  const { data: teams } = await supabase
    .from("tournament_teams")
    .select("team_id, teams:teams(id,name,color)")
    .eq("tournament_id", id);

  return <LiveClient tournament={tournament} initialMatches={matches ?? []} teams={teams ?? []} />;
}
