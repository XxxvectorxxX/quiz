import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BookOpen, Trophy, Target, Flame, Sparkles, Users, Award, Medal, Church } from "lucide-react"
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
    <div className="min-h-svh kid-friendly-bg">
      <header className="border-b-4 border-purple-300 bg-white/80 backdrop-blur-sm sticky top-0 z-10 shadow-lg">
        <div className="container mx-auto px-4 py-6 flex justify-between items-center">
          <Link href="/quiz" className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-lg">
              <BookOpen className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Quiz Bíblico
            </h1>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-base font-bold text-purple-700 hidden sm:block">
              Olá, {profile.full_name || "Jogador"}! 👋
            </span>
            <Button variant="outline" size="lg" className="border-2 border-purple-400 font-bold bg-transparent" asChild>
              <Link href="/perfil">Meu Perfil</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
          <Card className="kid-card border-4 border-blue-300 bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="pt-8">
              <div className="flex flex-col items-center gap-3">
                <div className="p-3 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg">
                  <Target className="h-8 w-8 text-white" />
                </div>
                <p className="text-4xl font-black text-blue-700">{progress?.current_level || 1}</p>
                <p className="text-sm font-bold text-blue-600">Nível</p>
              </div>
            </CardContent>
          </Card>

          <Card className="kid-card border-4 border-green-300 bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="pt-8">
              <div className="flex flex-col items-center gap-3">
                <div className="p-3 rounded-full bg-gradient-to-br from-green-400 to-green-600 shadow-lg">
                  <Trophy className="h-8 w-8 text-white" />
                </div>
                <p className="text-4xl font-black text-green-700">{progress?.correct_answers || 0}</p>
                <p className="text-sm font-bold text-green-600">Acertos</p>
              </div>
            </CardContent>
          </Card>

          <Card className="kid-card border-4 border-orange-300 bg-gradient-to-br from-orange-50 to-orange-100">
            <CardContent className="pt-8">
              <div className="flex flex-col items-center gap-3">
                <div className="p-3 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg">
                  <Flame className="h-8 w-8 text-white" />
                </div>
                <p className="text-4xl font-black text-orange-700">{progress?.current_streak || 0}</p>
                <p className="text-sm font-bold text-orange-600">Sequência</p>
              </div>
            </CardContent>
          </Card>

          <Card className="kid-card border-4 border-purple-300 bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="pt-8">
              <div className="flex flex-col items-center gap-3">
                <div className="p-3 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 shadow-lg">
                  <BookOpen className="h-8 w-8 text-white" />
                </div>
                <p className="text-4xl font-black text-purple-700">{progress?.total_questions_answered || 0}</p>
                <p className="text-sm font-bold text-purple-600">Perguntas</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-10">
          <Card className="kid-card border-4 border-blue-400 hover:border-blue-600 bg-gradient-to-br from-blue-50 to-white">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-3">
                <div className="p-4 bg-gradient-to-br from-blue-400 to-blue-600 rounded-3xl shadow-lg">
                  <BookOpen className="h-12 w-12 text-white" />
                </div>
              </div>
              <CardTitle className="text-2xl font-black text-blue-700">Quiz Clássico</CardTitle>
              <CardDescription className="text-base font-bold text-blue-600">
                Nível: {ageCategoryLabels[profile.age_category]}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button size="lg" className="w-full kid-button bg-gradient-to-r from-blue-500 to-blue-700" asChild>
                <Link href="/quiz/jogar">Começar Agora! 🎮</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="kid-card border-4 border-purple-400 hover:border-purple-600 bg-gradient-to-br from-purple-50 to-pink-50">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-3">
                <div className="p-4 bg-gradient-to-br from-purple-400 to-pink-600 rounded-3xl shadow-lg animate-pulse">
                  <Sparkles className="h-12 w-12 text-white" />
                </div>
              </div>
              <CardTitle className="text-2xl font-black text-purple-700">Quiz com IA Mágica</CardTitle>
              <CardDescription className="text-base font-bold text-purple-600">
                Perguntas feitas especialmente pra você!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button size="lg" className="w-full kid-button bg-gradient-to-r from-purple-500 to-pink-600" asChild>
                <Link href="/quiz/jogar?ai=true">Jogar com IA! ✨</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="kid-card border-4 border-green-400 hover:border-green-600 bg-gradient-to-br from-green-50 to-white">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-3">
                <div className="p-4 bg-gradient-to-br from-green-400 to-green-600 rounded-3xl shadow-lg">
                  <Users className="h-12 w-12 text-white" />
                </div>
              </div>
              <CardTitle className="text-2xl font-black text-green-700">Competicoes</CardTitle>
              <CardDescription className="text-base font-bold text-green-600">
                Desafie seus amigos em times!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                size="lg"
                variant="outline"
                className="w-full kid-button border-4 border-green-500 text-green-700 hover:bg-green-100 bg-transparent"
                asChild
              >
                <Link href="/competicoes">Ver Times!</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Segunda linha de cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-10">
          <Card className="kid-card border-4 border-yellow-400 hover:border-yellow-600 bg-gradient-to-br from-yellow-50 to-orange-50">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-3">
                <div className="p-4 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-3xl shadow-lg">
                  <Medal className="h-12 w-12 text-white" />
                </div>
              </div>
              <CardTitle className="text-2xl font-black text-yellow-700">Torneios</CardTitle>
              <CardDescription className="text-base font-bold text-yellow-600">
                Participe de torneios com chaveamento!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                size="lg"
                className="w-full kid-button bg-gradient-to-r from-yellow-500 to-orange-500"
                asChild
              >
                <Link href="/torneios">Ver Torneios!</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="kid-card border-4 border-teal-400 hover:border-teal-600 bg-gradient-to-br from-teal-50 to-cyan-50">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-3">
                <div className="p-4 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-3xl shadow-lg">
                  <Church className="h-12 w-12 text-white" />
                </div>
              </div>
              <CardTitle className="text-2xl font-black text-teal-700">Minha Igreja</CardTitle>
              <CardDescription className="text-base font-bold text-teal-600">
                Associe-se a uma igreja ou grupo!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                size="lg"
                className="w-full kid-button bg-gradient-to-r from-teal-500 to-cyan-500"
                asChild
              >
                <Link href="/igrejas">Ver Igrejas!</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="kid-card border-4 border-yellow-400 bg-gradient-to-r from-yellow-50 via-orange-50 to-pink-50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl shadow-lg">
                <Award className="h-8 w-8 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-black text-orange-700">Desafio da Semana!</CardTitle>
                <CardDescription className="text-base font-bold text-orange-600">
                  Complete {progress?.weekly_goal || 5} quizzes para ganhar um troféu!
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-lg font-bold">
                <span className="text-orange-700">Seu progresso:</span>
                <span className="text-orange-600">
                  {progress?.weekly_progress || 0} / {progress?.weekly_goal || 5}
                </span>
              </div>
              <div className="h-6 bg-orange-200 rounded-full overflow-hidden border-2 border-orange-400">
                <div
                  className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-500 shadow-inner"
                  style={{
                    width: `${Math.min(((progress?.weekly_progress || 0) / (progress?.weekly_goal || 5)) * 100, 100)}%`,
                  }}
                />
              </div>
              {progress?.weekly_progress >= progress?.weekly_goal && (
                <p className="text-center text-xl font-black text-green-600 animate-bounce">
                  🎉 Parabéns! Você completou o desafio! 🎉
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

