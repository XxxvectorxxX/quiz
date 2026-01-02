import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, Plus, Trophy, Swords } from "lucide-react"
import Link from "next/link"

export default async function CompeticoesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect("/auth/login")
  }

  const { data: competitionsConfig } = await supabase
    .from("system_config")
    .select("config_value")
    .eq("config_key", "competitions_enabled")
    .single()

  const competitionsEnabled = competitionsConfig?.config_value === "true" || competitionsConfig?.config_value === true

  if (!competitionsEnabled) {
    return (
      <div className="min-h-svh bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Competições Desabilitadas</CardTitle>
            <CardDescription>O sistema de competições está temporariamente desabilitado.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/quiz">Voltar ao Quiz</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  // Get user's teams
  const { data: userTeams } = await supabase
    .from("team_members")
    .select(
      `
      *,
      teams (
        id,
        name,
        color,
        competition_mode,
        leader_id,
        created_at
      )
    `,
    )
    .eq("user_id", user.id)

  // Get teams where user is leader
  const { data: leaderTeams } = await supabase.from("teams").select("*").eq("leader_id", user.id)

  if (!profile) {
    redirect("/auth/login")
  }

  const competitionModes = [
    { mode: "individual", label: "Individual", description: "Teste seus conhecimentos sozinho", icon: Users },
    { mode: "1v1", label: "1 vs 1", description: "Duelo direto entre dois jogadores", icon: Swords },
    { mode: "2v2", label: "2 vs 2", description: "Duplas competindo entre si", icon: Users },
    { mode: "3v3", label: "3 vs 3", description: "Trios em batalha bíblica", icon: Users },
    { mode: "4v4", label: "4 vs 4", description: "Quartetos disputando conhecimento", icon: Users },
    { mode: "5v5", label: "5 vs 5", description: "Grandes equipes competindo", icon: Users },
  ]

  return (
    <div className="min-h-svh bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <header className="border-b bg-white/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/quiz">
            <h1 className="text-2xl font-bold text-blue-600">Quiz Bíblico</h1>
          </Link>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" asChild>
              <Link href="/quiz">Voltar</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-bold text-foreground mb-2">Competições</h2>
            <p className="text-muted-foreground">Desafie outros jogadores em equipes</p>
          </div>
          <Button asChild>
            <Link href="/competicoes/criar-equipe">
              <Plus className="h-4 w-4 mr-2" />
              Criar Equipe
            </Link>
          </Button>
        </div>

        {/* Minhas Equipes */}
        {(userTeams && userTeams.length > 0) || (leaderTeams && leaderTeams.length > 0) ? (
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4">Minhas Equipes</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userTeams?.map((membership: any) => {
                const team = membership.teams
                const isLeader = team.leader_id === user.id

                return (
                  <Card key={team.id} className="border-2 hover:border-blue-300 transition-colors">
                    <CardHeader>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="h-12 w-12 rounded-full" style={{ backgroundColor: team.color }} />
                        <div className="flex-1">
                          <CardTitle className="text-lg">{team.name}</CardTitle>
                          <CardDescription className="text-xs">
                            {team.competition_mode.toUpperCase()} {isLeader && "• Líder"}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Button className="w-full" size="sm" asChild>
                        <Link href={`/competicoes/equipe/${team.id}`}>Ver Equipe</Link>
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        ) : null}

        {/* Modos de Competição */}
        <div>
          <h3 className="text-xl font-semibold mb-4">Modos de Competição</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {competitionModes.map((mode) => {
              const Icon = mode.icon
              return (
                <Card key={mode.mode} className="hover:border-blue-300 transition-colors">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-3 rounded-full bg-blue-100">
                        <Icon className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{mode.label}</CardTitle>
                        <CardDescription className="text-xs">{mode.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Rankings */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-600" />
                <CardTitle>Rankings Globais</CardTitle>
              </div>
              <CardDescription>Veja as melhores equipes e jogadores</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full bg-transparent" asChild>
                <Link href="/rankings">Ver Rankings</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
