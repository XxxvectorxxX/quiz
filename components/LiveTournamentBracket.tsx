"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { TournamentBracket } from "@/components/tournament-bracket"
import { Loader2 } from "lucide-react"

interface LiveTournamentBracketProps {
  tournamentId: string
  initialMatches: any[]
  status: string
}

export function LiveTournamentBracket({
  tournamentId,
  initialMatches,
  status,
}: LiveTournamentBracketProps) {
  const [matches, setMatches] = useState(initialMatches)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel(`tournament:${tournamentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tournament_matches",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        (payload) => {
          setLoading(true)
          loadMatches()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tournamentId])

  async function loadMatches() {
    const { data } = await supabase
      .from("tournament_matches")
      .select(
        `
        *,
        team1:teams!tournament_matches_team1_id_fkey (id, name, color),
        team2:teams!tournament_matches_team2_id_fkey (id, name, color),
        winner:teams!tournament_matches_winner_team_id_fkey (id, name, color)
      `
      )
      .eq("tournament_id", tournamentId)
      .order("round_number")
      .order("match_number")

    setMatches(data || [])
    setLoading(false)
  }

  return (
    <div className="relative">
      {loading && (
        <div className="absolute top-2 right-2 z-20 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Atualizando...
        </div>
      )}
      <TournamentBracket
        matches={matches}
        tournamentId={tournamentId}
        isAdmin={false}
        status={status}
      />
    </div>
  )
}
