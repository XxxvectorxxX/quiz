import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BookOpen, Trophy, Target, Flame, Sparkles } from "lucide-react"
import Link from "next/link"

export default async function QuizPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
  const { data: progress } = await supabase.from("user_progress").select("*").eq("user_id", user.id).single()

  if (!profile) {
    redirect("/auth/login")
  }

  const ageCategoryLabels: Record<string, string> = {
    criancas: "Crianças",
    adolescentes: "Adolescentes",
    jovens: "Jovens",
    adultos: "Adultos",
    casais: "Casais",
  }

  return (
    <div className="min-h-svh bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <header className="border-b bg-white/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/quiz">
            <h1 className="text-2xl font-bold text-blue-600">Quiz Bíblico</h1>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Olá, {profile.full_name || "Usuário"}</span>
            <Button variant="outline" size="sm" asChild>
              <Link href="/perfil">Perfil</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center gap-2">
                <div className="p-2 rounded-full bg-blue-100">
                  <Target className="h-5 w-5 text-blue-600" />
                </div>
                <p className="text-2xl font-bold">{progress?.current_level || 1}</p>
                <p className="text-xs text-muted-foreground">Nível</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center gap-2">
                <div className="p-2 rounded-full bg-green-100">
                  <Trophy className="h-5 w-5 text-green-600" />
                </div>
                <p className="text-2xl font-bold">{progress?.correct_answers || 0}</p>
                <p className="text-xs text-muted-foreground">Acertos</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center gap-2">
                <div className="p-2 rounded-full bg-orange-100">
                  <Flame className="h-5 w-5 text-orange-600" />
                </div>
                <p className="text-2xl font-bold">{progress?.current_streak || 0}</p>
                <p className="text-xs text-muted-foreground">Sequência</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center gap-2">
                <div className="p-2 rounded-full bg-purple-100">
                  <BookOpen className="h-5 w-5 text-purple-600" />
                </div>
                <p className="text-2xl font-bold">{progress?.total_questions_answered || 0}</p>
                <p className="text-xs text-muted-foreground">Perguntas</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="border-2 border-blue-200 hover:border-blue-400 transition-colors">
            <CardHeader>
              <CardTitle className="text-xl">Quiz Clássico</CardTitle>
              <CardDescription>
                Nível: {ageCategoryLabels[profile.age_category]} - Perguntas do banco de dados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button size="lg" className="w-full" asChild>
                <Link href="/quiz/jogar">Começar Quiz</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-2 border-purple-200 hover:border-purple-400 transition-colors bg-gradient-to-br from-purple-50 to-blue-50">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                <CardTitle className="text-xl">Quiz com IA</CardTitle>
              </div>
              <CardDescription>Perguntas geradas por IA adaptadas ao seu desempenho</CardDescription>
            </CardHeader>
            <CardContent>
              <Button size="lg" className="w-full bg-purple-600 hover:bg-purple-700" asChild>
                <Link href="/quiz/jogar?ai=true">Jogar com IA</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-200 hover:border-green-400 transition-colors">
            <CardHeader>
              <CardTitle className="text-xl">Competições</CardTitle>
              <CardDescription>Desafie outros jogadores em equipes ou 1v1</CardDescription>
            </CardHeader>
            <CardContent>
              <Button size="lg" variant="outline" className="w-full bg-transparent" asChild>
                <Link href="/competicoes">Ver Competições</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Weekly Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Meta Semanal</CardTitle>
            <CardDescription>Complete {progress?.weekly_goal || 5} quizzes esta semana</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progresso</span>
                <span className="font-medium">
                  {progress?.weekly_progress || 0} / {progress?.weekly_goal || 5}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all"
                  style={{
                    width: `${Math.min(((progress?.weekly_progress || 0) / (progress?.weekly_goal || 5)) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
