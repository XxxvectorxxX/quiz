"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { ArrowLeft, Trophy, Target, Flame, BookOpen, TrendingUp, Calendar } from "lucide-react"
import Link from "next/link"

export default function PerfilPage() {
  const [profile, setProfile] = useState<any>(null)
  const [progress, setProgress] = useState<any>(null)
  const [recentSessions, setRecentSessions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth/login")
        return
      }

      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single()

      const { data: progressData } = await supabase.from("user_progress").select("*").eq("user_id", user.id).single()

      const { data: sessionsData } = await supabase
        .from("quiz_sessions")
        .select("*")
        .eq("user_id", user.id)
        .eq("completed", true)
        .order("completed_at", { ascending: false })
        .limit(10)

      setProfile(profileData)
      setProgress(progressData)
      setRecentSessions(sessionsData || [])
    } catch (error) {
      console.error("[v0] Error loading profile:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <p>Carregando...</p>
      </div>
    )
  }

  const ageCategoryLabels: Record<string, string> = {
    criancas: "Crianças",
    adolescentes: "Adolescentes",
    jovens: "Jovens",
    adultos: "Adultos",
    casais: "Casais",
  }

  const accuracy = progress?.total_questions_answered
    ? ((progress.correct_answers / progress.total_questions_answered) * 100).toFixed(1)
    : "0"

  return (
    <div className="min-h-svh bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <header className="border-b bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/quiz">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Link>
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl">{profile?.full_name || "Usuário"}</CardTitle>
                <p className="text-muted-foreground">{profile?.email}</p>
                <Badge className="mt-2">{ageCategoryLabels[profile?.age_category]}</Badge>
              </div>
              <Button variant="destructive" onClick={handleSignOut}>
                Sair
              </Button>
            </div>
          </CardHeader>
        </Card>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-blue-100">
                  <Target className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold">{progress?.current_level || 1}</p>
                  <p className="text-sm text-muted-foreground">Nível Atual</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-green-100">
                  <Trophy className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold">{accuracy}%</p>
                  <p className="text-sm text-muted-foreground">Precisão</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-orange-100">
                  <Flame className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold">{progress?.current_streak || 0}</p>
                  <p className="text-sm text-muted-foreground">Dias Seguidos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-purple-100">
                  <BookOpen className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold">{progress?.total_questions_answered || 0}</p>
                  <p className="text-sm text-muted-foreground">Perguntas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-green-100">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold">{progress?.correct_answers || 0}</p>
                  <p className="text-sm text-muted-foreground">Acertos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-yellow-100">
                  <Calendar className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold">{progress?.longest_streak || 0}</p>
                  <p className="text-sm text-muted-foreground">Melhor Seq.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Histórico Recente</CardTitle>
          </CardHeader>
          <CardContent>
            {recentSessions.length > 0 ? (
              <div className="space-y-3">
                {recentSessions.map((session: any) => {
                  const answersArray = Array.isArray(session.answers) ? session.answers : []
                  const totalQuestions = answersArray.length || session.questions?.length || 1
                  const percentage = totalQuestions > 0 ? Math.round((session.score / totalQuestions) * 100) : 0

                  return (
                    <div key={session.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium">
                          {session.score}/{totalQuestions} corretas
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(session.completed_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <Badge variant={percentage >= 70 ? "default" : "secondary"}>{percentage}%</Badge>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-center py-8 text-muted-foreground">Nenhum quiz completado ainda</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
