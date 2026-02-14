"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { CheckCircle, XCircle, Loader2, Sparkles, Flame } from "lucide-react"

interface Question {
  id: string
  question_text: string
  correct_answer: string
  wrong_answers: string[]
  bible_reference: string
  topic: string
}

interface Answer {
  question_id: string
  selected_answer: string
  correct_answer: string
  is_correct: boolean
}

export default function JogarQuizPage() {
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [questionsAnswered, setQuestionsAnswered] = useState(0)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [useAI, setUseAI] = useState(false)
  const [currentStreak, setCurrentStreak] = useState(0)
  const [isLoadingNext, setIsLoadingNext] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadQuiz()
  }, [])

  const loadQuiz = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth/login")
        return
      }

      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single()
      setProfile(profileData)

      if (!profileData) return

      const urlParams = new URLSearchParams(window.location.search)
      const aiMode = urlParams.get("ai") === "true"
      setUseAI(aiMode)

      const { data: session } = await supabase
        .from("quiz_sessions")
        .insert({
          user_id: user.id,
          competition_mode: "individual",
          questions: [],
        })
        .select()
        .single()

      setSessionId(session?.id)

      // Load first question
      await loadNextQuestion(session?.id, aiMode)
    } catch (error) {
      console.error("[v0] Error loading quiz:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadNextQuestion = async (sid: string, aiMode: boolean) => {
    setIsLoadingNext(true)
    try {
      const response = await fetch("/api/proxima-pergunta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sid, useAI: aiMode }),
      })

      const data = await response.json()
      if (data.success && data.question) {
        setCurrentQuestion(data.question)
      }
    } catch (error) {
      console.error("[v0] Error loading next question:", error)
    } finally {
      setIsLoadingNext(false)
    }
  }

  const handleAnswerSelect = (answer: string) => {
    if (showResult) return
    setSelectedAnswer(answer)
  }

  const handleSubmitAnswer = async () => {
    if (!selectedAnswer || !currentQuestion) return

    const isCorrect = selectedAnswer === currentQuestion.correct_answer

    const newAnswer: Answer = {
      question_id: currentQuestion.id,
      selected_answer: selectedAnswer,
      correct_answer: currentQuestion.correct_answer,
      is_correct: isCorrect,
    }

    setAnswers([...answers, newAnswer])
    setShowResult(true)

    if (isCorrect) {
      setCurrentStreak(currentStreak + 1)
    } else {
      setCurrentStreak(0)
    }

    if (!useAI && currentQuestion.id) {
      await supabase.from("answered_questions").insert({
        user_id: profile.id,
        question_id: currentQuestion.id,
      })
    }

    // Update progress immediately
    await updateProgress(isCorrect)
  }

  const updateProgress = async (isCorrect: boolean) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: progress } = await supabase.from("user_progress").select("*").eq("user_id", user.id).single()

      if (progress) {
        const newCorrectAnswers = progress.correct_answers + (isCorrect ? 1 : 0)
        const newTotalQuestions = progress.total_questions_answered + 1
        const accuracyRate = (newCorrectAnswers / newTotalQuestions) * 100

        let newLevel = progress.current_level
        if (accuracyRate >= 85 && newTotalQuestions >= newLevel * 8) {
          newLevel++
        }

        await supabase
          .from("user_progress")
          .update({
            current_level: newLevel,
            total_questions_answered: newTotalQuestions,
            correct_answers: newCorrectAnswers,
            weekly_progress: progress.weekly_progress + 1,
          })
          .eq("user_id", user.id)
      }

      // Update session
      await supabase
        .from("quiz_sessions")
        .update({
          answers: [...answers, { question_id: currentQuestion?.id, is_correct: isCorrect }],
          score: answers.filter((a) => a.is_correct).length + (isCorrect ? 1 : 0),
        })
        .eq("id", sessionId)
    } catch (error) {
      console.error("[v0] Error updating progress:", error)
    }
  }

  const handleNextQuestion = async () => {
    setQuestionsAnswered(questionsAnswered + 1)
    setSelectedAnswer(null)
    setShowResult(false)
    setCurrentQuestion(null)
    await loadNextQuestion(sessionId!, useAI)
  }

  const handleFinishQuiz = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const score = answers.filter((a) => a.is_correct).length

      await supabase
        .from("quiz_sessions")
        .update({
          completed: true,
          completed_at: new Date().toISOString(),
          score,
        })
        .eq("id", sessionId)

      router.push(`/quiz/resultado/${sessionId}`)
    } catch (error) {
      console.error("[v0] Error finishing quiz:", error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-muted-foreground">{useAI ? "Gerando perguntas com IA..." : "Carregando perguntas..."}</p>
        </div>
      </div>
    )
  }

  if (!currentQuestion && !isLoadingNext) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <Card>
          <CardHeader>
            <CardTitle>Erro ao carregar pergunta</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">Não foi possível carregar a próxima pergunta.</p>
            <Button onClick={() => router.push("/quiz")}>Voltar</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoadingNext || !currentQuestion) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-muted-foreground">Carregando próxima pergunta...</p>
        </div>
      </div>
    )
  }

  const allAnswers = [currentQuestion.correct_answer, ...currentQuestion.wrong_answers].sort(() => Math.random() - 0.5)

  return (
    <div className="min-h-svh bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {useAI && (
          <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <p className="text-sm text-purple-900 font-medium">Perguntas geradas por IA com dificuldade progressiva</p>
          </div>
        )}

        <div className="mb-8 grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-blue-600">{questionsAnswered}</p>
              <p className="text-xs text-muted-foreground">Respondidas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-green-600">{answers.filter((a) => a.is_correct).length}</p>
              <p className="text-xs text-muted-foreground">Corretas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                <p className="text-2xl font-bold text-orange-600">{currentStreak}</p>
              </div>
              <p className="text-xs text-muted-foreground">Sequência</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl leading-relaxed">{currentQuestion.question_text}</CardTitle>
            <p className="text-sm text-muted-foreground">{currentQuestion.bible_reference}</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {allAnswers.map((answer, index) => {
                const isSelected = selectedAnswer === answer
                const isCorrect = answer === currentQuestion.correct_answer
                const showCorrect = showResult && isCorrect
                const showWrong = showResult && isSelected && !isCorrect

                return (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(answer)}
                    disabled={showResult}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      showCorrect
                        ? "border-green-500 bg-green-50"
                        : showWrong
                          ? "border-destructive bg-red-50"
                          : isSelected
                            ? "border-blue-500 bg-blue-50"
                            : "border-border hover:border-blue-300 bg-card"
                    } ${showResult ? "cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{answer}</span>
                      {showCorrect && <CheckCircle className="h-5 w-5 text-green-600" />}
                      {showWrong && <XCircle className="h-5 w-5 text-destructive" />}
                    </div>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between gap-4">
          <Button variant="outline" onClick={handleFinishQuiz}>
            Finalizar Quiz
          </Button>
          {!showResult ? (
            <Button onClick={handleSubmitAnswer} disabled={!selectedAnswer} size="lg">
              Confirmar Resposta
            </Button>
          ) : (
            <Button onClick={handleNextQuestion} size="lg">
              Próxima Pergunta
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
