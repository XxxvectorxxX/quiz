"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trophy, ArrowRight, ChevronRight } from "lucide-react"

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
  next_match_id: string | null
}

interface BracketManagerProps {
  matches: Match[]
  tournamentId: string
  isAdmin?: boolean
  onMatchClick?: (match: Match) => void
}

export function BracketManager({ matches, tournamentId, isAdmin = false, onMatchClick }: BracketManagerProps) {
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null)

  // Group matches by round
  const matchesByRound: Record<number, Match[]> = {}
  matches.forEach((match) => {
    if (!matchesByRound[match.round_number]) {
      matchesByRound[match.round_number] = []
    }
    matchesByRound[match.round_number].push(match)
  })

  const totalRounds = Math.max(...Object.keys(matchesByRound).map(Number))

  const getRoundName = (round: number) => {
    if (round === totalRounds) return "Final"
    if (round === totalRounds - 1) return "Semifinal"
    if (round === totalRounds - 2) return "Quartas"
    if (round === totalRounds - 3) return "Oitavas"
    return `Rodada ${round}`
  }

  const handleMatchClick = (match: Match) => {
    setSelectedMatch(match.id)
    if (onMatchClick) {
      onMatchClick(match)
    }
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-max">
        {Object.entries(matchesByRound)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([round, roundMatches], roundIndex) => (
            <div key={round} className="flex flex-col">
              {/* Round Header */}
              <div className="text-center mb-4">
                <Badge
                  variant={Number(round) === totalRounds ? "default" : "outline"}
                  className="px-4 py-1"
                >
                  {getRoundName(Number(round))}
                </Badge>
              </div>

              {/* Matches */}
              <div
                className="flex flex-col justify-around flex-1 gap-4"
                style={{
                  minHeight: `${roundMatches.length * 140}px`,
                }}
              >
                {roundMatches.map((match, matchIndex) => (
                  <div key={match.id} className="flex items-center">
                    <Card
                      className={`w-52 cursor-pointer transition-all hover:shadow-lg ${
                        selectedMatch === match.id ? "ring-2 ring-purple-500" : ""
                      } ${
                        match.status === "completed"
                          ? "border-green-300 bg-green-50/50"
                          : match.status === "in_progress"
                            ? "border-yellow-300 bg-yellow-50/50 animate-pulse"
                            : "border-slate-200"
                      }`}
                      onClick={() => handleMatchClick(match)}
                    >
                      <CardContent className="p-3">
                        {/* Team 1 */}
                        <div
                          className={`flex items-center justify-between p-2 rounded mb-2 ${
                            match.winner_team_id === match.team1_id
                              ? "bg-green-100 border border-green-400"
                              : "bg-slate-100"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="h-6 w-6 rounded-full"
                              style={{ backgroundColor: match.team1?.color || "#ddd" }}
                            />
                            <span className="text-sm font-medium truncate max-w-[100px]">
                              {match.team1?.name || "TBD"}
                            </span>
                          </div>
                          {match.status === "completed" && (
                            <span className="text-sm font-bold">{match.team1_score}</span>
                          )}
                          {match.winner_team_id === match.team1_id && (
                            <Trophy className="h-4 w-4 text-green-600" />
                          )}
                        </div>

                        {/* VS */}
                        <div className="text-center text-xs text-muted-foreground my-1">vs</div>

                        {/* Team 2 */}
                        <div
                          className={`flex items-center justify-between p-2 rounded ${
                            match.winner_team_id === match.team2_id
                              ? "bg-green-100 border border-green-400"
                              : "bg-slate-100"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="h-6 w-6 rounded-full"
                              style={{ backgroundColor: match.team2?.color || "#ddd" }}
                            />
                            <span className="text-sm font-medium truncate max-w-[100px]">
                              {match.team2?.name || "TBD"}
                            </span>
                          </div>
                          {match.status === "completed" && (
                            <span className="text-sm font-bold">{match.team2_score}</span>
                          )}
                          {match.winner_team_id === match.team2_id && (
                            <Trophy className="h-4 w-4 text-green-600" />
                          )}
                        </div>

                        {/* Status */}
                        <div className="mt-2 text-center">
                          <Badge
                            variant={
                              match.status === "completed"
                                ? "outline"
                                : match.status === "in_progress"
                                  ? "secondary"
                                  : "default"
                            }
                            className="text-xs"
                          >
                            {match.status === "pending" && "Aguardando"}
                            {match.status === "in_progress" && "Ao Vivo"}
                            {match.status === "completed" && "Finalizada"}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Connector to next round */}
                    {roundIndex < Object.keys(matchesByRound).length - 1 && (
                      <div className="flex items-center px-2">
                        <ChevronRight className="h-5 w-5 text-slate-400" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

        {/* Champion */}
        {matches.some((m) => m.round_number === totalRounds && m.status === "completed") && (
          <div className="flex flex-col items-center justify-center">
            <Badge variant="default" className="px-4 py-1 mb-4 bg-yellow-500">
              Campeao
            </Badge>
            <Card className="w-52 border-2 border-yellow-400 bg-gradient-to-br from-yellow-50 to-orange-50">
              <CardContent className="p-4 text-center">
                {(() => {
                  const finalMatch = matches.find(
                    (m) => m.round_number === totalRounds && m.status === "completed"
                  )
                  const champion = finalMatch?.winner
                  return champion ? (
                    <>
                      <div
                        className="h-16 w-16 rounded-full mx-auto mb-3 flex items-center justify-center"
                        style={{ backgroundColor: champion.color }}
                      >
                        <Trophy className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="font-bold text-lg">{champion.name}</h3>
                    </>
                  ) : null
                })()}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
