"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Timer, Users, Trophy, Zap, CheckCircle, XCircle, Eye, ArrowRight, Crown } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"

interface Team {
  id: string
  name: string
  color: string
}

interface Match {
  id: string
  status: string
  team1_id: string
  team2_id: string
  team1_score: number
  team2_score: number
  time_per_question: number
  current_question_index: number
  questions: string[]
  question_started_at: string
  team1: Team
  team2: Team
  winner: Team | null
  tournaments: {
    id: string
    name: string
    competition_mode: string
  }
}

interface Question {
  id: string
  text: string
  options: string[]
  bibleReference: string
}

interface Answer {
  team_id: string
  is_correct: boolean
  response_time: number
}

export default function PartidaTorneioPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [match, setMatch] = useState<Match | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [timeLeft, setTimeLeft] = useState(30)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [hasAnswered, setHasAnswered] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [roundWinner, setRoundWinner] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [userTeamId, setUserTeamId] = useState<string | null>(null)
  const [spectatorCount, setSpectatorCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [questionNumber, setQuestionNumber] = useState(1)
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [correctAnswer, setCorrectAnswer] = useState<string | null>(null)
  const [team1Score, setTeam1Score] = useState(0)
  const [team2Score, setTeam2Score] = useState(0)
  const [eliminatedTeam, setEliminatedTeam] = useState<string | null>(null)
  const [matchEnded, setMatchEnded] = useState(false)

  const fetchMatchData = useCallback(async () => {
    try {
      const response = await fetch(`/api/torneio/live?matchId=${params.matchId}`)
      const data = await response.json()

      if (data.match) {
        setMatch(data.match)
        setCurrentQuestion(data.currentQuestion)
        setAnswers(data.answers || [])
        setSpectatorCount(data.spectatorCount)
        setQuestionNumber((data.currentQuestionIndex || 0) + 1)
        setTotalQuestions(data.totalQuestions)
        setTeam1Score(data.match.team1_score || 0)
        setTeam2Score(data.match.team2_score || 0)

        if (data.match.status === "completed") {
          setMatchEnded(true)
        }

        // Reset time if new question
        if (data.match.question_started_at) {
          const elapsed = Math.floor((Date.now() - new Date(data.match.question_started_at).getTime()) / 1000)
          const remaining = Math.max(0, (data.match.time_per_question || 30) - elapsed)
          setTimeLeft(remaining)
        }
      }
    } catch (error) {
      console.error("[v0] Error fetching match data:", error)
    }
  }, [params.matchId])

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single()
        setIsAdmin(profile?.is_admin || false)

        // Check if user is part of either team
        const { data: teamMemberships } = await supabase.from("team_members").select("team_id").eq("user_id", user.id)

        if (teamMemberships) {
          const teamIds = teamMemberships.map((tm) => tm.team_id)
          // Will be set after match loads
          setUserTeamId(teamIds[0] || null)
        }
      }

      await fetchMatchData()

      // Add as spectator
      await fetch("/api/torneio/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId: params.matchId }),
      })

      setIsLoading(false)
    }

    init()

    // Poll for updates
    const interval = setInterval(fetchMatchData, 2000)

    return () => {
      clearInterval(interval)
      // Remove spectator
      fetch(`/api/torneio/live?matchId=${params.matchId}`, { method: "DELETE" })
    }
  }, [params.matchId, fetchMatchData, supabase])

  // Timer countdown
  useEffect(() => {
    if (match?.status !== "in_progress" || showResult || timeLeft <= 0) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          handleTimeUp()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [match?.status, showResult, timeLeft])

  const handleTimeUp = async () => {
    setShowResult(true)

    // Determine round result based on answers
    const team1Answer = answers.find((a) => a.team_id === match?.team1_id)
    const team2Answer = answers.find((a) => a.team_id === match?.team2_id)

    if (team1Answer?.is_correct && !team2Answer?.is_correct) {
      setRoundWinner(match?.team1_id || null)
      setEliminatedTeam(match?.team2_id || null)
    } else if (team2Answer?.is_correct && !team1Answer?.is_correct) {
      setRoundWinner(match?.team2_id || null)
      setEliminatedTeam(match?.team1_id || null)
    } else if (team1Answer?.is_correct && team2Answer?.is_correct) {
      // Both correct - faster wins
      if (team1Answer.response_time < team2Answer.response_time) {
        setRoundWinner(match?.team1_id || null)
        setEliminatedTeam(match?.team2_id || null)
      } else {
        setRoundWinner(match?.team2_id || null)
        setEliminatedTeam(match?.team1_id || null)
      }
    } else {
      // Neither answered correctly or in time - both eliminated
      setRoundWinner(null)
      setEliminatedTeam("both")
    }
  }

  const handleAnswerSelect = async (answer: string) => {
    if (hasAnswered || !userTeamId || !match || !currentQuestion) return

    const myTeamInMatch = userTeamId === match.team1_id || userTeamId === match.team2_id
    if (!myTeamInMatch) return

    setSelectedAnswer(answer)
    setHasAnswered(true)

    const responseTime = (match.time_per_question || 30) - timeLeft

    try {
      const response = await fetch("/api/torneio/partida", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: match.id,
          teamId: userTeamId,
          questionId: currentQuestion.id,
          answer,
          responseTime,
        }),
      })

      const data = await response.json()
      if (data.correctAnswer) {
        setCorrectAnswer(data.correctAnswer)
      }
    } catch (error) {
      console.error("[v0] Error submitting answer:", error)
    }
  }

  const handleNextQuestion = async () => {
    if (!isAdmin) return

    try {
      const response = await fetch("/api/torneio/partida", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: match?.id,
          action: "next_question",
        }),
      })

      const data = await response.json()
      if (data.matchEnded) {
        // Determine final winner
        handleEndMatch()
      } else {
        // Reset for next question
        setShowResult(false)
        setSelectedAnswer(null)
        setHasAnswered(false)
        setRoundWinner(null)
        setEliminatedTeam(null)
        setCorrectAnswer(null)
        setTimeLeft(match?.time_per_question || 30)
        await fetchMatchData()
      }
    } catch (error) {
      console.error("[v0] Error advancing question:", error)
    }
  }

  const handleEndMatch = async () => {
    if (!isAdmin || !match) return

    // Determine winner based on scores
    let winnerId = null
    if (team1Score > team2Score) {
      winnerId = match.team1_id
    } else if (team2Score > team1Score) {
      winnerId = match.team2_id
    } else {
      // Tie - use last round winner
      winnerId = roundWinner
    }

    try {
      await fetch("/api/torneio/partida", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: match.id,
          action: "end_match",
          winnerId,
          team1Score,
          team2Score,
        }),
      })

      setMatchEnded(true)
      await fetchMatchData()
    } catch (error) {
      console.error("[v0] Error ending match:", error)
    }
  }

  const handleStartMatch = async () => {
    if (!isAdmin) return

    try {
      await fetch("/api/torneio/partida", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: params.matchId,
          timePerQuestion: 30,
        }),
      })

      await fetchMatchData()
    } catch (error) {
      console.error("[v0] Error starting match:", error)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-svh bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin h-12 w-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p>Carregando partida...</p>
        </div>
      </div>
    )
  }

  if (!match) {
    return (
      <div className="min-h-svh bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Card className="max-w-md bg-slate-800 border-slate-700">
          <CardContent className="pt-6 text-center">
            <p className="text-white mb-4">Partida não encontrada</p>
            <Button asChild>
              <Link href={`/torneios/${params.id}`}>Voltar ao Torneio</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isParticipant = userTeamId === match.team1_id || userTeamId === match.team2_id

  return (
    <div className="min-h-svh bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-white">{match.tournaments?.name}</h1>
            <p className="text-sm text-slate-400">Partida {questionNumber} de {totalQuestions}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-slate-400">
              <Eye className="h-4 w-4" />
              <span className="text-sm">{spectatorCount} assistindo</span>
            </div>
            <Button variant="outline" size="sm" asChild className="border-slate-600 text-slate-300">
              <Link href={`/torneios/${params.id}`}>Voltar</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Scoreboard */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {/* Team 1 */}
          <Card
            className={`border-2 transition-all ${
              eliminatedTeam === match.team1_id || eliminatedTeam === "both"
                ? "border-red-500 bg-red-900/20"
                : roundWinner === match.team1_id
                  ? "border-green-500 bg-green-900/20"
                  : "border-slate-600 bg-slate-800/50"
            }`}
          >
            <CardContent className="p-4 text-center">
              <div
                className="h-16 w-16 rounded-full mx-auto mb-2 flex items-center justify-center"
                style={{ backgroundColor: match.team1?.color }}
              >
                <span className="text-2xl font-bold text-white">{team1Score}</span>
              </div>
              <h3 className="font-bold text-white text-lg">{match.team1?.name}</h3>
              {eliminatedTeam === match.team1_id && (
                <Badge variant="destructive" className="mt-2">
                  Eliminado
                </Badge>
              )}
              {roundWinner === match.team1_id && (
                <Badge className="mt-2 bg-green-600">Vencedor da Rodada</Badge>
              )}
            </CardContent>
          </Card>

          {/* VS / Timer */}
          <Card className="border-slate-600 bg-slate-800/50 flex flex-col items-center justify-center">
            <CardContent className="p-4 text-center">
              {match.status === "in_progress" && !showResult ? (
                <>
                  <div className="relative">
                    <div
                      className={`text-5xl font-bold ${
                        timeLeft <= 5 ? "text-red-500 animate-pulse" : "text-white"
                      }`}
                    >
                      {timeLeft}
                    </div>
                    <Timer className="h-6 w-6 text-slate-400 mx-auto mt-1" />
                  </div>
                  <Progress
                    value={(timeLeft / (match.time_per_question || 30)) * 100}
                    className={`mt-3 h-2 ${timeLeft <= 5 ? "[&>div]:bg-red-500" : "[&>div]:bg-purple-500"}`}
                  />
                </>
              ) : (
                <div className="text-4xl font-bold text-white">VS</div>
              )}
            </CardContent>
          </Card>

          {/* Team 2 */}
          <Card
            className={`border-2 transition-all ${
              eliminatedTeam === match.team2_id || eliminatedTeam === "both"
                ? "border-red-500 bg-red-900/20"
                : roundWinner === match.team2_id
                  ? "border-green-500 bg-green-900/20"
                  : "border-slate-600 bg-slate-800/50"
            }`}
          >
            <CardContent className="p-4 text-center">
              <div
                className="h-16 w-16 rounded-full mx-auto mb-2 flex items-center justify-center"
                style={{ backgroundColor: match.team2?.color }}
              >
                <span className="text-2xl font-bold text-white">{team2Score}</span>
              </div>
              <h3 className="font-bold text-white text-lg">{match.team2?.name}</h3>
              {eliminatedTeam === match.team2_id && (
                <Badge variant="destructive" className="mt-2">
                  Eliminado
                </Badge>
              )}
              {roundWinner === match.team2_id && (
                <Badge className="mt-2 bg-green-600">Vencedor da Rodada</Badge>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Match Status */}
        {match.status === "pending" && (
          <Card className="border-slate-600 bg-slate-800/50 mb-6">
            <CardContent className="py-12 text-center">
              <Trophy className="h-16 w-16 text-purple-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Partida Aguardando Inicio</h2>
              <p className="text-slate-400 mb-6">
                A partida comecara quando o administrador iniciar
              </p>
              {isAdmin && (
                <Button onClick={handleStartMatch} size="lg" className="bg-purple-600 hover:bg-purple-700">
                  <Zap className="h-5 w-5 mr-2" />
                  Iniciar Partida
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Match Ended */}
        {matchEnded && (
          <Card className="border-2 border-yellow-500 bg-gradient-to-br from-yellow-900/30 to-orange-900/30 mb-6">
            <CardContent className="py-12 text-center">
              <Crown className="h-20 w-20 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-white mb-2">Partida Finalizada!</h2>
              {match.winner ? (
                <>
                  <p className="text-xl text-yellow-400 mb-2">Vencedor</p>
                  <div
                    className="inline-flex items-center gap-3 px-6 py-3 rounded-full"
                    style={{ backgroundColor: match.winner.color }}
                  >
                    <span className="text-2xl font-bold text-white">{match.winner.name}</span>
                  </div>
                </>
              ) : (
                <p className="text-xl text-slate-400">Empate</p>
              )}
              <div className="mt-6 flex justify-center gap-4">
                <Button asChild variant="outline" className="border-slate-600">
                  <Link href={`/torneios/${params.id}`}>Ver Chaveamento</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Question Card */}
        {match.status === "in_progress" && currentQuestion && !matchEnded && (
          <Card className="border-slate-600 bg-slate-800/50 mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Pergunta {questionNumber}</CardTitle>
                <Badge variant="outline" className="border-slate-500 text-slate-300">
                  {currentQuestion.bibleReference}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xl text-white mb-6 leading-relaxed">{currentQuestion.text}</p>

              {isParticipant && !showResult ? (
                <div className="grid gap-3">
                  {currentQuestion.options.map((option, index) => {
                    const isSelected = selectedAnswer === option

                    return (
                      <button
                        key={index}
                        onClick={() => handleAnswerSelect(option)}
                        disabled={hasAnswered}
                        className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                          isSelected
                            ? "border-purple-500 bg-purple-900/50"
                            : "border-slate-600 bg-slate-700/50 hover:border-purple-400"
                        } ${hasAnswered ? "cursor-not-allowed opacity-75" : "cursor-pointer"}`}
                      >
                        <span className="text-white font-medium">
                          {String.fromCharCode(65 + index)}. {option}
                        </span>
                      </button>
                    )
                  })}
                </div>
              ) : showResult ? (
                <div className="space-y-4">
                  {currentQuestion.options.map((option, index) => {
                    const isCorrect = option === correctAnswer
                    const isSelected = selectedAnswer === option

                    return (
                      <div
                        key={index}
                        className={`p-4 rounded-lg border-2 flex items-center justify-between ${
                          isCorrect
                            ? "border-green-500 bg-green-900/30"
                            : isSelected && !isCorrect
                              ? "border-red-500 bg-red-900/30"
                              : "border-slate-600 bg-slate-700/50"
                        }`}
                      >
                        <span className="text-white font-medium">
                          {String.fromCharCode(65 + index)}. {option}
                        </span>
                        {isCorrect && <CheckCircle className="h-6 w-6 text-green-500" />}
                        {isSelected && !isCorrect && <XCircle className="h-6 w-6 text-red-500" />}
                      </div>
                    )
                  })}

                  {/* Round Result */}
                  <div className="mt-6 p-4 rounded-lg bg-slate-700/50 border border-slate-600">
                    <h4 className="text-lg font-bold text-white mb-2">Resultado da Rodada</h4>
                    {eliminatedTeam === "both" ? (
                      <p className="text-red-400">
                        Nenhuma equipe respondeu corretamente. Ambas eliminadas desta rodada.
                      </p>
                    ) : eliminatedTeam ? (
                      <p className="text-slate-300">
                        <span className="text-green-400 font-bold">
                          {roundWinner === match.team1_id ? match.team1?.name : match.team2?.name}
                        </span>{" "}
                        venceu a rodada!{" "}
                        <span className="text-red-400">
                          {eliminatedTeam === match.team1_id ? match.team1?.name : match.team2?.name}
                        </span>{" "}
                        foi eliminado.
                      </p>
                    ) : (
                      <p className="text-slate-400">Aguardando resultado...</p>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="flex gap-4 mt-6">
                      <Button onClick={handleNextQuestion} className="flex-1 bg-purple-600 hover:bg-purple-700">
                        <ArrowRight className="h-5 w-5 mr-2" />
                        Proxima Pergunta
                      </Button>
                      <Button onClick={handleEndMatch} variant="outline" className="border-slate-600">
                        Finalizar Partida
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Eye className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-400">Voce esta assistindo esta partida</p>
                  <p className="text-sm text-slate-500 mt-2">
                    Aguarde os participantes responderem...
                  </p>
                </div>
              )}

              {hasAnswered && !showResult && (
                <div className="mt-6 text-center">
                  <Badge className="bg-green-600 text-white px-4 py-2">
                    <CheckCircle className="h-4 w-4 mr-2 inline" />
                    Resposta Enviada! Aguardando resultado...
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Spectator Info */}
        <Card className="border-slate-600 bg-slate-800/50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-400">
                <Users className="h-5 w-5" />
                <span>{spectatorCount} pessoas assistindo</span>
              </div>
              {!isParticipant && (
                <Badge variant="outline" className="border-slate-500 text-slate-300">
                  <Eye className="h-3 w-3 mr-1" />
                  Modo Espectador
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
