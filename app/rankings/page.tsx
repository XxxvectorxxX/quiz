import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, Medal, Award, ArrowLeft, Crown, Flame } from "lucide-react"
import Link from "next/link"

export default async function RankingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect("/auth/login")
  }

  // Get top players by level
  const { data: topPlayers } = await supabase
    .from("user_progress")
    .select(
      `
      *,
      profiles (id, full_name, age_category)
    `,
    )
    .order("current_level", { ascending: false })
    .order("correct_answers", { ascending: false })
    .limit(50)

  // Get top players by accuracy
  const playersWithAccuracy =
    topPlayers?.map((p: any) => ({
      ...p,
      accuracy: p.total_questions_answered > 0 ? (p.correct_answers / p.total_questions_answered) * 100 : 0,
    })) || []

  const topByAccuracy = [...playersWithAccuracy]
    .filter((p) => p.total_questions_answered >= 10)
    .sort((a, b) => b.accuracy - a.accuracy)
    .slice(0, 50)

  // Get top by streak
  const topByStreak = [...playersWithAccuracy].sort((a, b) => b.current_streak - a.current_streak).slice(0, 50)

  // Get top teams
  const { data: topTeams } = await supabase
    .from("team_rankings")
    .select(
      `
      *,
      teams (id, name, color, competition_mode)
    `,
    )
    .order("total_points", { ascending: false })
    .limit(50)

  // Get current user stats
  const { data: currentUserProgress } = await supabase.from("user_progress").select("*").eq("user_id", user.id).single()

  const currentUserRank =
    topPlayers?.findIndex((p: any) => p.profiles?.id === user.id) !== -1
      ? (topPlayers?.findIndex((p: any) => p.profiles?.id === user.id) ?? -1) + 1
      : null

  const ageCategoryLabels: Record<string, string> = {
    criancas: "Crianças",
    adolescentes: "Adolescentes",
    jovens: "Jovens",
    adultos: "Adultos",
    casais: "Casais",
  }

  const getMedalIcon = (position: number) => {
    if (position === 1) return <Crown className="h-5 w-5 text-yellow-500" />
    if (position === 2) return <Medal className="h-5 w-5 text-slate-400" />
    if (position === 3) return <Award className="h-5 w-5 text-amber-700" />
    return null
  }

  return (
    <div className="min-h-svh bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <header className="border-b bg-white/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/quiz">
            <h1 className="text-2xl font-bold text-blue-600">Quiz Bíblico</h1>
          </Link>
          <Button variant="outline" size="sm" asChild>
            <Link href="/quiz">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Link>
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Trophy className="h-8 w-8 text-yellow-600" />
          <div>
            <h2 className="text-3xl font-bold">Rankings Globais</h2>
            <p className="text-muted-foreground">Veja os melhores jogadores e equipes</p>
          </div>
        </div>

        {/* Current User Stats */}
        {currentUserProgress && (
          <Card className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{currentUserRank ? `#${currentUserRank}` : "N/A"}</p>
                  <p className="text-sm text-muted-foreground">Sua Posição</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{currentUserProgress.current_level}</p>
                  <p className="text-sm text-muted-foreground">Nível</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{currentUserProgress.correct_answers}</p>
                  <p className="text-sm text-muted-foreground">Acertos</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{currentUserProgress.current_streak}</p>
                  <p className="text-sm text-muted-foreground">Sequência</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="nivel" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="nivel">Por Nível</TabsTrigger>
            <TabsTrigger value="precisao">Por Precisão</TabsTrigger>
            <TabsTrigger value="sequencia">Por Sequência</TabsTrigger>
            <TabsTrigger value="equipes">Equipes</TabsTrigger>
          </TabsList>

          <TabsContent value="nivel" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Top 50 - Por Nível</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topPlayers?.map((player: any, index: number) => (
                    <div
                      key={player.user_id}
                      className={`flex items-center justify-between p-4 rounded-lg ${
                        player.profiles?.id === user.id ? "bg-blue-100 border-2 border-blue-300" : "bg-muted"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-8">
                          {getMedalIcon(index + 1) || (
                            <span className="font-bold text-muted-foreground">{index + 1}</span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{player.profiles?.full_name || "Usuário"}</p>
                          <p className="text-sm text-muted-foreground">
                            {ageCategoryLabels[player.profiles?.age_category]}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary" className="text-lg font-bold">
                          Nível {player.current_level}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">{player.correct_answers} acertos</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="precisao" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Top 50 - Por Precisão</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topByAccuracy.map((player: any, index: number) => (
                    <div
                      key={player.user_id}
                      className={`flex items-center justify-between p-4 rounded-lg ${
                        player.profiles?.id === user.id ? "bg-blue-100 border-2 border-blue-300" : "bg-muted"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-8">
                          {getMedalIcon(index + 1) || (
                            <span className="font-bold text-muted-foreground">{index + 1}</span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{player.profiles?.full_name || "Usuário"}</p>
                          <p className="text-sm text-muted-foreground">
                            {player.total_questions_answered} perguntas respondidas
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary" className="text-lg font-bold">
                          {player.accuracy.toFixed(1)}%
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">Precisão</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sequencia" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Top 50 - Por Sequência</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topByStreak.map((player: any, index: number) => (
                    <div
                      key={player.user_id}
                      className={`flex items-center justify-between p-4 rounded-lg ${
                        player.profiles?.id === user.id ? "bg-blue-100 border-2 border-blue-300" : "bg-muted"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-8">
                          {getMedalIcon(index + 1) || (
                            <span className="font-bold text-muted-foreground">{index + 1}</span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{player.profiles?.full_name || "Usuário"}</p>
                          <p className="text-sm text-muted-foreground">Maior sequência: {player.longest_streak}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <Flame className="h-5 w-5 text-orange-600" />
                          <Badge variant="secondary" className="text-lg font-bold">
                            {player.current_streak}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Dias seguidos</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="equipes" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Top 50 - Equipes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topTeams?.map((teamRanking: any, index: number) => {
                    const team = teamRanking.teams
                    if (!team) return null

                    return (
                      <div key={team.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center justify-center w-8">
                            {getMedalIcon(index + 1) || (
                              <span className="font-bold text-muted-foreground">{index + 1}</span>
                            )}
                          </div>
                          <div className="h-10 w-10 rounded-full" style={{ backgroundColor: team.color }} />
                          <div>
                            <p className="font-medium">{team.name}</p>
                            <p className="text-sm text-muted-foreground">{team.competition_mode.toUpperCase()}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary" className="text-lg font-bold">
                            {teamRanking.total_points} pts
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {teamRanking.total_wins} vitórias em {teamRanking.total_matches} partidas
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
