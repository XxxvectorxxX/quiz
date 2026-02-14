"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function MatchClient({
  meId,
  match,
  myTeamIds,
}: {
  meId: string;
  match: any;
  myTeamIds: string[];
}) {
  const supabase = React.useMemo(() => createClient(), []);
  const [m, setM] = React.useState(match);
  const [answer, setAnswer] = React.useState("");
  const [msg, setMsg] = React.useState<string | null>(null);

  const isCompetitor =
    (!!m.team1_id && myTeamIds.includes(m.team1_id)) || (!!m.team2_id && myTeamIds.includes(m.team2_id));

  React.useEffect(() => {
    const ch = supabase
      .channel(`match:${m.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tournament_matches", filter: `id=eq.${m.id}` }, (p) => {
        setM(p.new);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase, m.id]);

  async function submit() {
    setMsg(null);
    if (!isCompetitor) {
      setMsg("Você não é competidor deste duelo.");
      return;
    }
    const myTeam =
      myTeamIds.includes(m.team1_id) ? m.team1_id : myTeamIds.includes(m.team2_id) ? m.team2_id : null;
    if (!myTeam) return;

    const { data, error } = await supabase.rpc("submit_match_answer", {
      p_match_id: m.id,
      p_team_id: myTeam,
      p_user_id: meId,
      p_answer: answer,
    });

    if (error) {
      setMsg(error.message);
      return;
    }
    setMsg(data?.message ?? "Enviado");
    setAnswer("");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Duelo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-muted-foreground">
            Status: {m.status} • Round {m.round} • Match {m.match_index}
          </div>

          {m.question_text && <div className="rounded border p-3 text-sm">{m.question_text}</div>}

          {!isCompetitor ? (
            <div className="text-sm text-muted-foreground">
              Você está assistindo. Apenas competidores podem responder.
            </div>
          ) : (
            <div className="flex gap-2">
              <Input value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Sua resposta..." />
              <Button onClick={submit} disabled={m.status !== "live"}>Enviar</Button>
            </div>
          )}

          {msg && <div className="text-sm">{msg}</div>}
        </CardContent>
      </Card>
    </div>
  );
}
