"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Timer, Trophy, XCircle, Loader2, Users, ArrowLeft, Play, Eye } from "lucide-react"
import Link from "next/link"

interface Question {
  id: string
  question_text: string
  options: string[]
  correct_answer: string
}

interface Team {
  id: string
  name: string
  color: string
}

type Result = "win" | "eliminated" | "tie" | "waiting_opponent" | null

export default function PartidaPage() {
  const params = useParams()
  const router = useRouter()
  const tournamentId = params.id as string
  const matchId = params.matchId as string
  const supabase = createClient()

  const [match, setMatch] = useState<any>(null)
  const [question, setQuestion] = useState<Question | null>(null)
  const [myTeamId, setMyTeamId] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState(15)
  const [answered, setAnswered] = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState("")
  const [result, setResult] = useState<Result>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [firstResponder, setFirstResponder] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [startingMatch, setStartingMatch] = useState(false)

  useEffect(() => {
    loadMatch()
  }, [matchId, tournamentId])

  useEffect(() => {
    const channel = supabase
      .channel(`match:${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tournament_matches",
          filter: `id=eq.${matchId}`,
        },
        () => loadMatch()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [matchId])

  useEffect(() => {
    if (!match || match.status !== "in_progress" || answered) return

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [match?.status, answered])

  async function loadMatch() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push(`/auth/login?redirect=/torneios/${tournamentId}/partida/${matchId}`)
      return
    }

    const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single()
    setIsAdmin(profile?.is_admin ?? false)

    const { data: matchData } = await supabase
      .from("tournament_matches")
      .select(`
        *,
        team1:teams!tournament_matches_team1_id_fkey(id, name, color, leader_id),
        team2:teams!tournament_matches_team2_id_fkey(id, name, color, leader_id),
        winner:teams!tournament_matches_winner_team_id_fkey(id, name),
        tournament:tournaments(question_time_seconds)
      `)
      .eq("id", matchId)
      .single()

    if (!matchData) {
      setLoading(false)
      return
    }

    setMatch(matchData)

    const team1 = matchData.team1 as any
    const team2 = matchData.team2 as any
    const myTeam = team1?.leader_id === user.id ? team1 : team2?.leader_id === user.id ? team2 : null
    setMyTeamId(myTeam?.id ?? null)

    const questionTimeSeconds = (matchData.tournament as any)?.question_time_seconds ?? 15
    setTimeLeft(questionTimeSeconds)

    if (matchData.status === "in_progress" && matchData.current_question_id) {
      const { data: q } = await supabase
        .from("questions")
        .select("id, question_text, correct_answer, wrong_answers")
        .eq("id", matchData.current_question_id)
        .single()

      if (q) {
        const options = [q.correct_answer, ...(q.wrong_answers || [])].sort(() => Math.random() - 0.5)
        setQuestion({
          id: q.id,
          question_text: q.question_text,
          options,
          correct_answer: q.correct_answer,
        })
      }
    }

    if (matchData.status === "completed") {
      const winner = matchData.winner as any
      const winnerId = winner?.id
      if (winnerId === myTeam.id) setResult("win")
      else if (winnerId) setResult("eliminated")
      else setResult("tie")
      setFirstResponder(matchData.first_responder_team_id)
    }

    setLoading(false)
  }

  async function handleStartMatch() {
    setStartingMatch(true)
    try {
      const res = await fetch("/api/torneios/match/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        const q = data.question
        setQuestion({
          id: q.id,
          question_text: q.question_text,
          options: q.options,
          correct_answer: q.correct_answer,
        })
        loadMatch()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setStartingMatch(false)
    }
  }

  async function handleSubmit() {
    if (!selectedAnswer.trim() || !myTeamId || submitting || answered) return

    setSubmitting(true)

    try {
      const res = await fetch("/api/torneios/match/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId,
          teamId: myTeamId,
          selectedAnswer: selectedAnswer.trim(),
        }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setAnswered(true)
        setFirstResponder(myTeamId)

        if (data.matchCompleted) {
          if (data.winnerTeamId === myTeamId) setResult("win")
          else if (data.winnerTeamId) setResult("eliminated")
          else setResult("tie")
          loadMatch()
        } else {
          setResult("waiting_opponent")
        }
      } else {
        setAnswered(true)
        if (data.status === "completed") loadMatch()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || !match) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        <Loader2 className="h-12 w-12 animate-spin text-purple-600" />
      </div>
    )
  }

  const team1 = match.team1 as Team
  const team2 = match.team2 as Team
  const opponent = myTeamId ? (myTeamId === team1?.id ? team2 : team1) : null

  return (
    <div className="min-h-svh bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/torneios/${tournamentId}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Link>
          </Button>
          <span className="text-sm font-medium text-muted-foreground">
            Partida {match.match_number} • {match.round_number}ª rodada
          </span>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Adversário ou Confronto */}
        <Card className="mb-6 border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              {myTeamId ? "Seu adversário" : "Confronto"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {myTeamId && opponent ? (
              <div
                className="flex items-center gap-3 p-4 rounded-xl"
                style={{ backgroundColor: opponent.color ? `${opponent.color}20` : "#f3f4f6" }}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl"
                  style={{ backgroundColor: opponent.color ?? "#6b7280" }}
                >
                  {opponent.name?.charAt(0) ?? "?"}
                </div>
                <span className="text-xl font-bold">{opponent.name ?? "A definir"}</span>
              </div>
            ) : (
              <div className="flex items-center justify-around gap-4 p-4">
                <div className="flex items-center gap-2">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: team1?.color ?? "#6b7280" }}
                  >
                    {team1?.name?.charAt(0) ?? "?"}
                  </div>
                  <span className="font-medium">{team1?.name ?? "A definir"}</span>
                </div>
                <span className="text-muted-foreground font-bold">VS</span>
                <div className="flex items-center gap-2">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: team2?.color ?? "#6b7280" }}
                  >
                    {team2?.name?.charAt(0) ?? "?"}
                  </div>
                  <span className="font-medium">{team2?.name ?? "A definir"}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pergunta e Timer */}
        {match.status === "in_progress" && question && !result && (
          <Card className="mb-6 border-2 border-purple-200">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Pergunta</CardTitle>
                <div className="flex items-center gap-2">
                  <Timer className={`h-6 w-6 ${timeLeft <= 5 ? "text-red-500 animate-pulse" : "text-purple-600"}`} />
                  <span className={`text-2xl font-bold ${timeLeft <= 5 ? "text-red-600" : ""}`}>{timeLeft}s</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-lg font-medium">{question.question_text}</p>

              {!myTeamId ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Eye className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Você está assistindo esta partida</p>
                </div>
              ) : !answered ? (
                <div className="space-y-3">
                  {question.options.map((opt) => (
                    <Button
                      key={opt}
                      variant={selectedAnswer === opt ? "default" : "outline"}
                      className="w-full h-auto py-4 text-left justify-start"
                      onClick={() => setSelectedAnswer(opt)}
                      disabled={submitting}
                    >
                      {opt}
                    </Button>
                  ))}
                  <Button
                    className="w-full"
                    disabled={!selectedAnswer.trim() || submitting || timeLeft === 0}
                    onClick={handleSubmit}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      "Responder"
                    )}
                  </Button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">Resposta enviada. Aguardando resultado...</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Resultado */}
        {result && (
          <Card className={`border-2 ${result === "win" ? "border-green-500 bg-green-50" : result === "eliminated" ? "border-red-500 bg-red-50" : "border-yellow-500 bg-yellow-50"}`}>
            <CardContent className="py-12 text-center space-y-4">
              {result === "win" && (
                <>
                  <Trophy className="h-16 w-16 mx-auto text-green-600" />
                  <h2 className="text-2xl font-bold text-green-800">Vitória!</h2>
                  <p className="text-green-700">Você avançou para a próxima rodada!</p>
                </>
              )}
              {result === "eliminated" && (
                <>
                  <XCircle className="h-16 w-16 mx-auto text-red-600" />
                  <h2 className="text-2xl font-bold text-red-800">Eliminado</h2>
                  <p className="text-red-700">O adversário respondeu corretamente primeiro.</p>
                </>
              )}
              {result === "tie" && (
                <>
                  <XCircle className="h-16 w-16 mx-auto text-yellow-600" />
                  <h2 className="text-2xl font-bold text-yellow-800">Empate – ambos eliminados</h2>
                </>
              )}
              {result === "waiting_opponent" && (
                <p className="text-muted-foreground">Você errou. Aguardando resposta do adversário...</p>
              )}
              {firstResponder && (
                <p className="text-sm text-muted-foreground">
                  Primeiro a responder: {firstResponder === myTeamId ? "Você" : opponent?.name}
                </p>
              )}
              <Button asChild>
                <Link href={`/torneios/${tournamentId}`}>Ver torneio</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {match.status === "pending" && !question && (
          <Card>
            <CardContent className="py-12 text-center space-y-4">
              {isAdmin ? (
                <>
                  <p className="text-muted-foreground">Clique para iniciar a partida e exibir a pergunta aos jogadores.</p>
                  <Button onClick={handleStartMatch} disabled={startingMatch}>
                    {startingMatch ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                    Iniciar Partida
                  </Button>
                </>
              ) : (
                <>
                  <Loader2 className="h-12 w-12 animate-spin mx-auto text-purple-600 mb-4" />
                  <p className="text-muted-foreground">Aguardando o admin iniciar a partida...</p>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
