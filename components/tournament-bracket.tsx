"use client"

import { Trophy, Crown, Play, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

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
  team1_score: number
  team2_score: number
  winner_team_id: string | null
  team1: Team | null
  team2: Team | null
  winner: Team | null
}

interface TournamentBracketProps {
  matches: Match[]
  tournamentId: string
  isAdmin: boolean
  status: string
}

export function TournamentBracket({ matches, tournamentId, isAdmin, status }: TournamentBracketProps) {
  if (!matches || matches.length === 0) {
    return (
      <div className="text-center py-12">
        <Trophy className="h-16 w-16 mx-auto text-purple-300 mb-4" />
        <p className="text-lg text-muted-foreground">Aguardando inicio do torneio...</p>
      </div>
    )
  }

  // Group matches by round
  const matchesByRound: Record<number, Match[]> = {}
  matches.forEach((match) => {
    if (!matchesByRound[match.round_number]) {
      matchesByRound[match.round_number] = []
    }
    matchesByRound[match.round_number].push(match)
  })

  const rounds = Object.keys(matchesByRound)
    .map(Number)
    .sort((a, b) => a - b)
  const totalRounds = rounds.length

  const getRoundName = (round: number) => {
    const fromEnd = totalRounds - round + 1
    if (fromEnd === 1) return "Final"
    if (fromEnd === 2) return "Semifinal"
    if (fromEnd === 3) return "Quartas"
    if (fromEnd === 4) return "Oitavas"
    return `Rodada ${round}`
  }

  // Find champion
  const finalMatch = matches.find((m) => m.round_number === totalRounds && m.status === "completed")
  const champion = finalMatch?.winner

  return (
    <div className="space-y-8">
      {/* Champion Banner */}
      {champion && (
        <div className="bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-500 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-center gap-4">
            <Crown className="h-12 w-12 text-yellow-900" />
            <div className="text-center">
              <p className="text-yellow-900 font-medium text-sm uppercase tracking-wider">Campeao</p>
              <h2 className="text-3xl font-black text-yellow-900">{champion.name}</h2>
            </div>
            <Crown className="h-12 w-12 text-yellow-900" />
          </div>
        </div>
      )}

      {/* Bracket Visualization */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {rounds.map((round) => {
            const roundMatches = matchesByRound[round] || []
            const roundName = getRoundName(round)
            const isFinal = round === totalRounds

            return (
              <div key={round} className="flex flex-col">
                {/* Round Header */}
                <div
                  className={`text-center mb-4 px-4 py-2 rounded-full font-bold ${isFinal
                    ? "bg-gradient-to-r from-yellow-400 to-orange-400 text-yellow-900"
                    : "bg-purple-100 text-purple-700"
                    }`}
                >
                  {roundName}
                </div>

                {/* Matches */}
                <div
                  className="flex flex-col justify-around flex-1 gap-4"
                  style={{ minHeight: `${roundMatches.length * 180}px` }}
                >
                  {roundMatches.map((match) => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      tournamentId={tournamentId}
                      isAdmin={isAdmin}
                      isFinal={isFinal}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 justify-center text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-500" />
          <span>Vencedor</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-400" />
          <span>Eliminado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-blue-500 animate-pulse" />
          <span>Em Jogo</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gray-300" />
          <span>Aguardando</span>
        </div>
      </div>
    </div>
  )
}

interface MatchCardProps {
  match: Match
  tournamentId: string
  isAdmin: boolean
  isFinal: boolean
}

function MatchCard({ match, tournamentId, isAdmin, isFinal }: MatchCardProps) {
  const isInProgress = match.status === "in_progress"
  const isCompleted = match.status === "completed"
  const isPending = match.status === "pending"

  return (
    <div
      className={`w-64 rounded-xl border-2 shadow-lg overflow-hidden transition-all ${isFinal ? "border-yellow-400 bg-gradient-to-br from-yellow-50 to-orange-50" : "border-purple-200 bg-white"
        } ${isInProgress ? "ring-2 ring-blue-500 ring-offset-2" : ""}`}
    >
      {/* Match Header */}
      <div
        className={`px-3 py-2 text-xs font-semibold flex justify-between items-center ${isInProgress
          ? "bg-blue-500 text-white"
          : isCompleted
            ? "bg-green-500 text-white"
            : "bg-gray-100 text-gray-600"
          }`}
      >
        <span>Partida {match.match_number}</span>
        {isInProgress && <span className="animate-pulse">AO VIVO</span>}
        {isCompleted && <span>Finalizada</span>}
        {isPending && <span>Aguardando</span>}
      </div>

      {/* Teams */}
      <div className="p-3 space-y-2">
        {/* Team 1 */}
        <TeamSlot
          team={match.team1}
          score={isCompleted ? match.team1_score : null}
          isWinner={match.winner_team_id === match.team1_id}
          isLoser={isCompleted && match.winner_team_id !== match.team1_id && match.team1_id !== null}
        />

        <div className="text-center text-xs text-muted-foreground font-bold">VS</div>

        {/* Team 2 */}
        <TeamSlot
          team={match.team2}
          score={isCompleted ? match.team2_score : null}
          isWinner={match.winner_team_id === match.team2_id}
          isLoser={isCompleted && match.winner_team_id !== match.team2_id && match.team2_id !== null}
        />
      </div>

      {/* Actions */}
      <div className="px-3 pb-3">
        {isPending && match.team1_id && match.team2_id && isAdmin && (
          <Button size="sm" className="w-full bg-purple-600 hover:bg-purple-700" asChild>
            <Link href={`/torneios/${tournamentId}/partida/${match.id}`}>
              <Play className="h-3 w-3 mr-1" />
              Iniciar
            </Link>
          </Button>
        )}
        {isInProgress && (
          <Button size="sm" className="w-full bg-green-600 hover:bg-green-700" asChild>
            <Link href={`/torneios/${tournamentId}/partida/${match.id}`}>
              <Eye className="h-3 w-3 mr-1" />
              Assistir
            </Link>
          </Button>
        )}
      </div>
    </div>
  )
}

interface TeamSlotProps {
  team: Team | null
  score: number | null
  isWinner: boolean
  isLoser: boolean
}

function TeamSlot({ team, score, isWinner, isLoser }: TeamSlotProps) {
  if (!team) {
    return (
      <div className="flex items-center justify-between p-2 rounded-lg bg-gray-100 border-2 border-dashed border-gray-300">
        <span className="text-sm text-gray-400 italic">A definir</span>
      </div>
    )
  }

  return (
    <div
      className={`flex items-center justify-between p-2 rounded-lg border-2 transition-all ${isWinner
        ? "bg-green-100 border-green-500 shadow-md"
        : isLoser
          ? "bg-red-50 border-red-300 opacity-60"
          : "bg-gray-50 border-gray-200"
        }`}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow"
          style={{ backgroundColor: team.color }}
        >
          {team.name.charAt(0).toUpperCase()}
        </div>
        <span className={`text-sm font-medium ${isWinner ? "text-green-800" : isLoser ? "text-red-600" : ""}`}>
          {team.name}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {score !== null && (
          <span className={`text-lg font-bold ${isWinner ? "text-green-600" : "text-gray-500"}`}>{score}</span>
        )}
        {isWinner && <Trophy className="h-4 w-4 text-yellow-500" />}
      </div>
    </div>
  )
}

