// app/torneios/[id]/match/[matchId]/page.tsx
import { notFound } from "next/navigation";
import MatchClient from "./matchClient";
import { createClient } from "@/lib/supabase/server";

export default async function MatchPage({
  params,
}: {
  params: Promise<{ id: string; matchId: string }>;
}) {
  const { id: tournamentId, matchId } = await params;
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    // pode renderizar uma tela pedindo login (mantive simples)
    return (
      <div className="mx-auto max-w-xl p-6">
        <h1 className="text-xl font-semibold">Faça login para jogar</h1>
      </div>
    );
  }

  const { data: match } = await supabase
    .from("tournament_matches")
    .select("*, tournaments:tournaments(id,question_time_seconds)")
    .eq("id", matchId)
    .eq("tournament_id", tournamentId)
    .single();

  if (!match) return notFound();

  // validação de participação via RLS (select permitido, mas submit via RPC checa)
  const { data: myTeams } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", auth.user.id);

  return <MatchClient meId={auth.user.id} match={match} myTeamIds={(myTeams ?? []).map((x) => x.team_id)} />;
}
