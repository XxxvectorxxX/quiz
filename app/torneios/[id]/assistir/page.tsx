"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trophy, Users, Eye, Play, Crown, ChevronRight, Timer, Zap } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"

interface Team {
  id: string
  name: string
  color: string
}

interface Match {
  id: string
  round_number: number
  match_number: number
  status: string
  team1_id: string | null
  team2_id: string | null
  winner_team_id: string | null
  team1_score: number
  team2_score: number
  team1: Team | null
  team2: Team | null
  winner: Team | null
}

interface Tournament {
  id: string
  name: string
  status: string
  competition_mode: string
  max_teams: number
  winner: Team | null
}

export default function AssistirTorneioPage() {
  const params = useParams()
  const supabase = createClient()

  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [participants, setParticipants] = useState<any[]>([])
  const [spectatorCount, setSpectatorCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [liveMatch, setLiveMatch] = useState<Match | null>(null)

  const fetchData = useCallback(async () => {
    try {
      // Get tournament
      const { data: tournamentData } = await supabase
        .from("tournaments")
        .select(
          `
          *,
          winner:teams!tournaments_winner_team_id_fkey (
            id,
            name,
            color
          )
        `
        )
        .eq("id", params.id)
        .single()

      if (tournamentData) {
        setTournament(tournamentData)
      }

      // Get matches
      const { data: matchesData } = await supabase
        .from("tournament_matches")
        .select(
          `
          *,
          team1:teams!tournament_matches_team1_id_fkey (
            id,
            name,
            color
          ),
          team2:teams!tournament_matches_team2_id_fkey (
            id,
            name,
            color
          ),
          winner:teams!tournament_matches_winner_team_id_fkey (
            id,
            name,
            color
          )
        `
        )
        .eq("tournament_id", params.id)
        .order("round_number")
        .order("match_number")

      if (matchesData) {
        setMatches(matchesData)
        // Find live match
        const live = matchesData.find((m) => m.status === "in_progress")
        setLiveMatch(live || null)
      }

      // Get participants
      const { data: participantsData } = await supabase
        .from("tournament_participants")
        .select(
          `
          *,
          teams (
            id,
            name,
            color
          )
        `
        )
        .eq("tournament_id", params.id)
        .order("seed")

      if (participantsData) {
        setParticipants(participantsData)
      }

      // Get spectator count
      const { count } = await supabase
        .from("tournament_spectators")
        .select("*", { count: "exact", head: true })
        .eq("tournament_id", params.id)

      setSpectatorCount(count || 0)
    } catch (error) {
      console.error("[v0] Error fetching tournament data:", error)
    } finally {
      setIsLoading(false)
    }
  }, [params.id, supabase])

  useEffect(() => {
    fetchData()

    // Register as spectator
    const registerSpectator = async () => {
      await supabase.from("tournament_spectators").upsert({
        tournament_id: params.id as string,
        session_id: crypto.randomUUID(),
        joined_at: new Date().toISOString(),
      })
    }
    registerSpectator()

    // Poll for updates
    const interval = setInterval(fetchData, 5000)

    return () => clearInterval(interval)
  }, [params.id, fetchData, supabase])

  // Group matches by round
  const matchesByRound: Record<number, Match[]> = {}
  matches.forEach((match) => {
    if (!matchesByRound[match.round_number]) {
      matchesByRound[match.round_number] = []
    }
    matchesByRound[match.round_number].push(match)
  })

  const totalRounds = matches.length > 0 ? Math.max(...matches.map((m) => m.round_number)) : 0

  const getRoundName = (round: number) => {
    if (round === totalRounds) return "Final"
    if (round === totalRounds - 1) return "Semifinal"
    if (round === totalRounds - 2) return "Quartas de Final"
    if (round === totalRounds - 3) return "Oitavas de Final"
    return `Rodada ${round}`
  }

  if (isLoading) {
    return (
      <div className="min-h-svh bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin h-12 w-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p>Carregando torneio...</p>
        </div>
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="min-h-svh bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Card className="max-w-md bg-slate-800 border-slate-700">
          <CardContent className="pt-6 text-center">
            <p className="text-white mb-4">Torneio nao encontrado</p>
            <Button asChild>
              <Link href="/torneios">Ver Torneios</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-svh bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">{tournament.name}</h1>
            <div className="flex items-center gap-4 mt-1">
              <Badge
                variant={tournament.status === "completed" ? "outline" : "default"}
                className={
                  tournament.status === "in_progress"
                    ? "bg-green-600 animate-pulse"
                    : ""
                }
              >
                {tournament.status === "registration" && "Inscricoes Abertas"}
                {tournament.status === "in_progress" && "AO VIVO"}
                {tournament.status === "completed" && "Finalizado"}
              </Badge>
              <span className="text-sm text-slate-400">
                Modo: {tournament.competition_mode.toUpperCase()}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-slate-400">
              <Eye className="h-4 w-4" />
              <span className="text-sm">{spectatorCount} assistindo</span>
            </div>
            <Button variant="outline" size="sm" asChild className="border-slate-600 text-slate-300">
              <Link href="/torneios">Ver Todos</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Live Match Alert */}
        {liveMatch && (
          <Card className="mb-6 border-2 border-green-500 bg-gradient-to-r from-green-900/30 to-emerald-900/30">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse" />
                    <div className="absolute inset-0 h-3 w-3 bg-red-500 rounded-full animate-ping" />
                  </div>
                  <div>
                    <p className="text-white font-bold">Partida Ao Vivo!</p>
                    <p className="text-sm text-slate-300">
                      {liveMatch.team1?.name || "TBD"} vs {liveMatch.team2?.name || "TBD"}
                    </p>
                  </div>
                </div>
                <Button asChild className="bg-green-600 hover:bg-green-700">
                  <Link href={`/torneios/${params.id}/partida/${liveMatch.id}`}>
                    <Play className="h-4 w-4 mr-2" />
                    Assistir Agora
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Champion Banner */}
        {tournament.status === "completed" && tournament.winner && (
          <Card className="mb-6 border-2 border-yellow-500 bg-gradient-to-br from-yellow-900/30 to-orange-900/30">
            <CardContent className="py-8 text-center">
              <Crown className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-white mb-2">Campeao do Torneio!</h2>
              <div
                className="inline-flex items-center gap-3 px-8 py-4 rounded-full mt-2"
                style={{ backgroundColor: tournament.winner.color }}
              >
                <Trophy className="h-8 w-8 text-white" />
                <span className="text-2xl font-bold text-white">{tournament.winner.name}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bracket View */}
        {matches.length > 0 && (
          <Card className="mb-6 border-slate-700 bg-slate-800/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Trophy className="h-5 w-5 text-purple-500" />
                Chaveamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto pb-4">
                <div className="flex gap-6 min-w-max">
                  {Object.entries(matchesByRound)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([round, roundMatches], roundIndex) => (
                      <div key={round} className="flex flex-col">
                        {/* Round Header */}
                        <div className="text-center mb-4">
                          <Badge
                            variant={Number(round) === totalRounds ? "default" : "outline"}
                            className={`px-4 py-1 ${
                              Number(round) === totalRounds
                                ? "bg-purple-600"
                                : "border-slate-500 text-slate-300"
                            }`}
                          >
                            {getRoundName(Number(round))}
                          </Badge>
                        </div>

                        {/* Matches */}
                        <div className="flex flex-col justify-around flex-1 gap-4">
                          {roundMatches.map((match) => (
                            <div key={match.id} className="flex items-center">
                              <Card
                                className={`w-56 transition-all ${
                                  match.status === "in_progress"
                                    ? "border-green-500 bg-green-900/20 animate-pulse"
                                    : match.status === "completed"
                                      ? "border-slate-600 bg-slate-700/50"
                                      : "border-slate-600 bg-slate-800/50"
                                }`}
                              >
                                <CardContent className="p-3">
                                  {/* Status Badge */}
                                  {match.status === "in_progress" && (
                                    <div className="flex items-center justify-center gap-2 mb-2">
                                      <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                                      <span className="text-xs text-green-400 font-bold">AO VIVO</span>
                                    </div>
                                  )}

                                  {/* Team 1 */}
                                  <div
                                    className={`flex items-center justify-between p-2 rounded mb-2 ${
                                      match.winner_team_id === match.team1_id
                                        ? "bg-green-900/50 border border-green-500"
                                        : "bg-slate-700/50"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <div
                                        className="h-6 w-6 rounded-full"
                                        style={{ backgroundColor: match.team1?.color || "#555" }}
                                      />
                                      <span className="text-sm font-medium text-white truncate max-w-[100px]">
                                        {match.team1?.name || "A definir"}
                                      </span>
                                    </div>
                                    {match.status === "completed" && (
                                      <span className="text-sm font-bold text-white">
                                        {match.team1_score}
                                      </span>
                                    )}
                                  </div>

                                  {/* VS */}
                                  <div className="text-center text-xs text-slate-500 my-1">vs</div>

                                  {/* Team 2 */}
                                  <div
                                    className={`flex items-center justify-between p-2 rounded ${
                                      match.winner_team_id === match.team2_id
                                        ? "bg-green-900/50 border border-green-500"
                                        : "bg-slate-700/50"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <div
                                        className="h-6 w-6 rounded-full"
                                        style={{ backgroundColor: match.team2?.color || "#555" }}
                                      />
                                      <span className="text-sm font-medium text-white truncate max-w-[100px]">
                                        {match.team2?.name || "A definir"}
                                      </span>
                                    </div>
                                    {match.status === "completed" && (
                                      <span className="text-sm font-bold text-white">
                                        {match.team2_score}
                                      </span>
                                    )}
                                  </div>

                                  {/* Watch Button */}
                                  {match.status === "in_progress" && (
                                    <Button
                                      size="sm"
                                      className="w-full mt-3 bg-green-600 hover:bg-green-700"
                                      asChild
                                    >
                                      <Link href={`/torneios/${params.id}/partida/${match.id}`}>
                                        <Eye className="h-3 w-3 mr-1" />
                                        Assistir
                                      </Link>
                                    </Button>
                                  )}
                                </CardContent>
                              </Card>

                              {/* Connector */}
                              {roundIndex < Object.keys(matchesByRound).length - 1 && (
                                <ChevronRight className="h-5 w-5 text-slate-600 mx-2" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Participants */}
        <Card className="border-slate-700 bg-slate-800/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-500" />
              Equipes Participantes ({participants.length}/{tournament.max_teams})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {participants.length === 0 ? (
              <p className="text-slate-400 text-center py-4">Nenhuma equipe inscrita ainda</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {participants.map((participant: any, index: number) => {
                  const isChampion = tournament.winner?.id === participant.teams.id
                  const isEliminated =
                    tournament.status !== "registration" &&
                    matches.some(
                      (m) =>
                        m.status === "completed" &&
                        (m.team1_id === participant.teams.id || m.team2_id === participant.teams.id) &&
                        m.winner_team_id !== participant.teams.id
                    )

                  return (
                    <div
                      key={participant.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${
                        isChampion
                          ? "border-yellow-500 bg-yellow-900/20"
                          : isEliminated
                            ? "border-red-800/50 bg-red-900/10 opacity-50"
                            : "border-slate-600 bg-slate-700/30"
                      }`}
                    >
                      <div
                        className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: participant.teams.color }}
                      >
                        {isChampion ? (
                          <Crown className="h-5 w-5" />
                        ) : (
                          index + 1
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-white">{participant.teams.name}</p>
                        <p className="text-xs text-slate-400">
                          {isChampion
                            ? "Campeao"
                            : isEliminated
                              ? "Eliminado"
                              : `Seed #${participant.seed}`}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* No bracket message */}
        {matches.length === 0 && tournament.status === "registration" && (
          <Card className="mt-6 border-slate-700 bg-slate-800/50">
            <CardContent className="py-12 text-center">
              <Trophy className="h-12 w-12 text-slate-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Aguardando inicio do torneio</h3>
              <p className="text-sm text-slate-400">
                O chaveamento sera exibido quando o administrador iniciar o torneio
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
