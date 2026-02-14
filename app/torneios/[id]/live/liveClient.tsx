"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Tournament = { id: string; name: string; status: string; question_time_seconds: number };
type Match = any;

export default function LiveClient({
  tournament,
  initialMatches,
  teams,
}: {
  tournament: Tournament | null;
  initialMatches: Match[];
  teams: any[];
}) {
  const supabase = React.useMemo(() => createClient(), []);
  const [matches, setMatches] = React.useState<Match[]>(initialMatches);

  const teamName = (id: string | null) =>
    (teams.find((x) => (x.teams?.id ?? x.team_id) === id)?.teams?.name as string) ?? (id ? id.slice(0, 8) : "BYE");

  React.useEffect(() => {
    if (!tournament?.id) return;

    const ch = supabase
      .channel(`tournament:${tournament.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tournament_matches", filter: `tournament_id=eq.${tournament.id}` },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            setMatches((prev) => prev.map((m) => (m.id === payload.new.id ? payload.new : m)));
          }
          if (payload.eventType === "INSERT") {
            setMatches((prev) => [...prev, payload.new].sort((a, b) => a.round - b.round || a.match_index - b.match_index));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase, tournament?.id]);

  const live = matches.find((m) => m.status === "live") ?? matches.find((m) => m.status === "ready") ?? null;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">{tournament?.name ?? "Torneio"}</h1>
        <div className="text-sm text-muted-foreground">Status: {tournament?.status ?? "—"}</div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Duelo atual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!live ? (
            <div className="text-sm text-muted-foreground">Nenhum duelo ao vivo/ready.</div>
          ) : (
            <>
              <div className="text-sm">
                Round {live.round} • Match {live.match_index}
              </div>
              <div className="text-lg font-semibold">
                {teamName(live.team1_id)} vs {teamName(live.team2_id)}
              </div>
              {live.question_text && <div className="rounded border p-3 text-sm">{live.question_text}</div>}
              <Timer endsAt={live.ends_at} />
              {live.winner_team_id && (
                <div className="text-sm">
                  Vencedor: <b>{teamName(live.winner_team_id)}</b>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bracket</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {groupByRound(matches).map(([round, ms]) => (
            <div key={round} className="space-y-2">
              <div className="text-sm font-medium">Round {round}</div>
              {ms.map((m) => (
                <div key={m.id} className="rounded border p-2 text-sm">
                  <div className="flex items-center justify-between">
                    <div>{teamName(m.team1_id)} vs {teamName(m.team2_id)}</div>
                    <div className="text-xs text-muted-foreground">{m.status}</div>
                  </div>
                  {m.winner_team_id && (
                    <div className="mt-1 text-xs">
                      Winner: <b>{teamName(m.winner_team_id)}</b>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function groupByRound(matches: Match[]) {
  const m = new Map<number, Match[]>();
  for (const x of matches) m.set(x.round, [...(m.get(x.round) ?? []), x]);
  return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([r, ms]) => [r, ms.sort((a, b) => a.match_index - b.match_index)] as const);
}

function Timer({ endsAt }: { endsAt: string | null }) {
  const [left, setLeft] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!endsAt) {
      setLeft(null);
      return;
    }
    const tick = () => {
      const diff = new Date(endsAt).getTime() - Date.now();
      setLeft(Math.max(0, Math.floor(diff / 1000)));
    };
    tick();
    const t = setInterval(tick, 250);
    return () => clearInterval(t);
  }, [endsAt]);

  if (left === null) return null;
  return <div className="text-sm text-muted-foreground">Tempo: {left}s</div>;
}
