import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trophy, CheckCircle, XCircle, Target } from "lucide-react"
import Link from "next/link"

interface PageProps {
  params: Promise<{ sessionId: string }>
}

export default async function ResultadoPage({ params }: PageProps) {
  const { sessionId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect("/auth/login")
  }

  // Get session data
  const { data: session } = await supabase.from("quiz_sessions").select("*").eq("id", sessionId).single()

  if (!session || session.user_id !== user.id) {
    redirect("/quiz")
  }

  const score = session.score || 0
  const totalQuestions = session.questions.length
  const percentage = Math.round((score / totalQuestions) * 100)

  const getPerformanceMessage = (percentage: number) => {
    if (percentage >= 90) return { title: "Excelente!", message: "Você domina a Palavra!", color: "text-green-600" }
    if (percentage >= 70) return { title: "Muito Bom!", message: "Continue estudando!", color: "text-blue-600" }
    if (percentage >= 50) return { title: "Bom trabalho!", message: "Pratique mais!", color: "text-yellow-600" }
    return { title: "Continue tentando!", message: "A prática leva à perfeição!", color: "text-orange-600" }
  }

  const performance = getPerformanceMessage(percentage)

  return (
    <div className="min-h-svh bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="mb-6">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <Trophy className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className={`text-3xl ${performance.color}`}>{performance.title}</CardTitle>
            <p className="text-muted-foreground">{performance.message}</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Score Display */}
              <div className="text-center p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                <p className="text-5xl font-bold text-blue-600 mb-2">
                  {score}/{totalQuestions}
                </p>
                <p className="text-lg text-muted-foreground">Pontuação: {percentage}%</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-card rounded-lg border">
                  <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{score}</p>
                  <p className="text-xs text-muted-foreground">Corretas</p>
                </div>
                <div className="text-center p-4 bg-card rounded-lg border">
                  <XCircle className="h-6 w-6 text-destructive mx-auto mb-2" />
                  <p className="text-2xl font-bold">{totalQuestions - score}</p>
                  <p className="text-xs text-muted-foreground">Erradas</p>
                </div>
                <div className="text-center p-4 bg-card rounded-lg border">
                  <Target className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{percentage}%</p>
                  <p className="text-xs text-muted-foreground">Aproveit.</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                <Button size="lg" className="w-full" asChild>
                  <Link href="/quiz/jogar">Jogar Novamente</Link>
                </Button>
                <Button size="lg" variant="outline" className="w-full bg-transparent" asChild>
                  <Link href="/quiz">Voltar ao Menu</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
