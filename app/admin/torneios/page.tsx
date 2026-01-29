import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trophy, Users, Plus, Settings, Play, Eye } from "lucide-react"
import Link from "next/link"

export default async function AdminTorneiosPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (!profile?.is_admin) {
    redirect("/quiz")
  }

  // Get all tournaments
  const { data: tournaments } = await supabase
    .from("tournaments")
    .select(
      `
      *,
      tournament_participants (count),
      tournament_matches (count),
      winner:teams!tournaments_winner_team_id_fkey (
        id,
        name,
        color
      )
    `
    )
    .order("created_at", { ascending: false })

  const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    registration: { label: "Inscricoes", variant: "default" },
    in_progress: { label: "Em Andamento", variant: "secondary" },
    completed: { label: "Finalizado", variant: "outline" },
  }

  return (
    <div className="min-h-svh bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <header className="border-b bg-white/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-900">Gerenciar Torneios</h1>
          <div className="flex items-center gap-4">
            <Button asChild>
              <Link href="/torneios/criar">
                <Plus className="h-4 w-4 mr-2" />
                Criar Torneio
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin">Voltar</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
            <Trophy className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-foreground">Torneios</h2>
            <p className="text-muted-foreground">Gerencie todos os torneios e chaveamentos</p>
          </div>
        </div>

        {!tournaments || tournaments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum torneio criado</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Crie seu primeiro torneio para comecar
              </p>
              <Button asChild>
                <Link href="/torneios/criar">
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Torneio
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {tournaments.map((tournament: any) => {
              const participantCount = tournament.tournament_participants?.[0]?.count || 0
              const matchCount = tournament.tournament_matches?.[0]?.count || 0
              const statusInfo = statusMap[tournament.status]

              return (
                <Card key={tournament.id} className="border-2 hover:border-purple-300 transition-colors">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-1">{tournament.name}</CardTitle>
                        <CardDescription className="flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {participantCount}/{tournament.max_teams} equipes
                          </span>
                          <span>Modo: {tournament.competition_mode.toUpperCase()}</span>
                          <span>{matchCount} partidas</span>
                        </CardDescription>
                      </div>
                      <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <Button asChild size="sm">
                        <Link href={`/admin/torneios/${tournament.id}`}>
                          <Settings className="h-4 w-4 mr-2" />
                          Gerenciar Chaveamento
                        </Link>
                      </Button>
                      {tournament.status === "in_progress" && (
                        <Button asChild size="sm" variant="secondary">
                          <Link href={`/torneios/${tournament.id}`}>
                            <Play className="h-4 w-4 mr-2" />
                            Ver Partidas
                          </Link>
                        </Button>
                      )}
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/torneios/${tournament.id}/assistir`}>
                          <Eye className="h-4 w-4 mr-2" />
                          Visualizacao Publica
                        </Link>
                      </Button>
                    </div>
                    {tournament.status === "completed" && tournament.winner && (
                      <div className="mt-4 p-3 rounded-lg bg-gradient-to-br from-yellow-100 to-orange-100 border-2 border-yellow-400">
                        <div className="flex items-center gap-2">
                          <Trophy className="h-5 w-5 text-yellow-600" />
                          <div>
                            <p className="text-xs font-medium text-yellow-800">Campeao</p>
                            <p className="text-sm font-bold text-yellow-900">{tournament.winner.name}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
