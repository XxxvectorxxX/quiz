"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { CheckCircle, XCircle, Loader2, Sparkles } from "lucide-react"

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
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [useAI, setUseAI] = useState(false)
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

      let questionsData: Question[] = []

      if (aiMode) {
        console.log("[v0] Generating AI questions...")
        const response = await fetch("/api/gerar-perguntas-dinamicas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })

        if (!response.ok) throw new Error("Failed to generate AI questions")

        const data = await response.json()
        questionsData = data.questions
      } else {
        const { data, error } = await supabase
          .from("questions")
          .select("*")
          .eq("difficulty_level", profileData.age_category)
          .limit(10)

        if (error) throw error
        questionsData = data || []
      }

      const shuffled = questionsData.sort(() => Math.random() - 0.5)
      setQuestions(shuffled)

      const { data: session } = await supabase
        .from("quiz_sessions")
        .insert({
          user_id: user.id,
          competition_mode: "individual",
          questions: shuffled.map((q) => q.id),
        })
        .select()
        .single()

      setSessionId(session?.id)
    } catch (error) {
      console.error("[v0] Error loading quiz:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAnswerSelect = (answer: string) => {
    if (showResult) return
    setSelectedAnswer(answer)
  }

  const handleSubmitAnswer = () => {
    if (!selectedAnswer) return

    const currentQuestion = questions[currentQuestionIndex]
    const isCorrect = selectedAnswer === currentQuestion.correct_answer

    const newAnswer: Answer = {
      question_id: currentQuestion.id,
      selected_answer: selectedAnswer,
      correct_answer: currentQuestion.correct_answer,
      is_correct: isCorrect,
    }

    setAnswers([...answers, newAnswer])
    setShowResult(true)
  }

  const handleNextQuestion = async () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
      setSelectedAnswer(null)
      setShowResult(false)
    } else {
      await finishQuiz()
    }
  }

  const finishQuiz = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const score = answers.filter((a) => a.is_correct).length
      const totalQuestions = questions.length

      await supabase
        .from("quiz_sessions")
        .update({
          answers: answers,
          score: score,
          completed: true,
          completed_at: new Date().toISOString(),
        })
        .eq("id", sessionId)

      const { data: progress } = await supabase.from("user_progress").select("*").eq("user_id", user.id).single()

      if (progress) {
        const newCorrectAnswers = progress.correct_answers + score
        const newTotalQuestions = progress.total_questions_answered + totalQuestions
        const accuracyRate = (newCorrectAnswers / newTotalQuestions) * 100

        let newLevel = progress.current_level
        if (accuracyRate >= 80 && newTotalQuestions >= newLevel * 10) {
          newLevel = Math.floor(newTotalQuestions / 10) + 1
        }

        const today = new Date().toISOString().split("T")[0]
        const lastQuizDate = progress.last_quiz_date
        let newStreak = progress.current_streak

        if (lastQuizDate) {
          const lastDate = new Date(lastQuizDate)
          const todayDate = new Date(today)
          const diffTime = Math.abs(todayDate.getTime() - lastDate.getTime())
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

          if (diffDays === 1) {
            newStreak = progress.current_streak + 1
          } else if (diffDays > 1) {
            newStreak = 1
          }
        } else {
          newStreak = 1
        }

        await supabase
          .from("user_progress")
          .update({
            current_level: newLevel,
            total_questions_answered: newTotalQuestions,
            correct_answers: newCorrectAnswers,
            current_streak: newStreak,
            longest_streak: Math.max(newStreak, progress.longest_streak),
            last_quiz_date: today,
            weekly_progress: progress.weekly_progress + 1,
          })
          .eq("user_id", user.id)
      }

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

  if (questions.length === 0) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <Card>
          <CardHeader>
            <CardTitle>Sem perguntas disponíveis</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">Não há perguntas disponíveis para o seu nível no momento.</p>
            <Button onClick={() => router.push("/quiz")}>Voltar</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const currentQuestion = questions[currentQuestionIndex]
  const allAnswers = [currentQuestion.correct_answer, ...currentQuestion.wrong_answers].sort(() => Math.random() - 0.5)
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100

  return (
    <div className="min-h-svh bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {useAI && (
          <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <p className="text-sm text-purple-900 font-medium">Perguntas geradas por IA adaptadas ao seu nível</p>
          </div>
        )}

        <div className="mb-8">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">
              Pergunta {currentQuestionIndex + 1} de {questions.length}
            </span>
            <span className="font-medium text-blue-600">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
          </div>
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

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => router.push("/quiz")}>
            Sair
          </Button>
          {!showResult ? (
            <Button onClick={handleSubmitAnswer} disabled={!selectedAnswer} size="lg">
              Confirmar Resposta
            </Button>
          ) : (
            <Button onClick={handleNextQuestion} size="lg">
              {currentQuestionIndex < questions.length - 1 ? "Próxima Pergunta" : "Ver Resultado"}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
