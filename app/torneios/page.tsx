import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trophy, Plus, Users, Calendar } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

export default async function TorneiosPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (!profile) {
    redirect("/auth/login")
  }

  // Get all tournaments
  const { data: tournaments } = await supabase
    .from("tournaments")
    .select(
      `
      *,
      tournament_participants (count),
      winner:teams!tournaments_winner_team_id_fkey (
        id,
        name,
        color
      )
    `,
    )
    .order("created_at", { ascending: false })

  const isAdmin = profile.is_admin

  const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    registration: { label: "Inscrições Abertas", variant: "default" },
    in_progress: { label: "Em Andamento", variant: "secondary" },
    completed: { label: "Finalizado", variant: "outline" },
  }

  return (
    <div className="min-h-svh bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <header className="border-b bg-white/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/quiz">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Quiz Bíblico
            </h1>
          </Link>
          <div className="flex items-center gap-4">
            {isAdmin && (
              <Button asChild>
                <Link href="/torneios/criar">
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Torneio
                </Link>
              </Button>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link href="/competicoes">Voltar</Link>
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
            <p className="text-muted-foreground">Competições em formato de chaveamento</p>
          </div>
        </div>

        {!tournaments || tournaments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum torneio disponível</h3>
              <p className="text-sm text-muted-foreground mb-4">Os torneios aparecerão aqui quando criados</p>
              {isAdmin && (
                <Button asChild>
                  <Link href="/torneios/criar">
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Primeiro Torneio
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tournaments.map((tournament: any) => {
              const participantCount = tournament.tournament_participants?.[0]?.count || 0
              const statusInfo = statusMap[tournament.status]

              return (
                <Card key={tournament.id} className="border-2 hover:border-purple-300 transition-colors">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-1">{tournament.name}</CardTitle>
                        <CardDescription className="flex items-center gap-2 text-xs">
                          <Users className="h-3 w-3" />
                          {participantCount}/{tournament.max_teams} equipes
                        </CardDescription>
                      </div>
                      <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      Modo: {tournament.competition_mode.toUpperCase()}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {tournament.status === "completed" && tournament.winner ? (
                      <div className="mb-4 p-3 rounded-lg bg-gradient-to-br from-yellow-100 to-orange-100 border-2 border-yellow-400">
                        <div className="flex items-center gap-2">
                          <Trophy className="h-5 w-5 text-yellow-600" />
                          <div>
                            <p className="text-xs font-medium text-yellow-800">Campeão</p>
                            <p className="text-sm font-bold text-yellow-900">{tournament.winner.name}</p>
                          </div>
                        </div>
                      </div>
                    ) : null}
                    <Button className="w-full" size="sm" asChild>
                      <Link href={`/torneios/${tournament.id}`}>Ver Chaveamento</Link>
                    </Button>
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
