import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trophy, Users, Ticket, Share2 } from "lucide-react"
import Link from "next/link"

export default async function TorneiosPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from("profiles").select("*").eq("id", user.id).single()
    : { data: null }
  const isLoggedIn = !!user && !!profile
  const isAdmin = profile?.is_admin ?? false

  const { data: tournaments } = await supabase
    .from("tournaments")
    .select(
      `
      id,
      name,
      status,
      competition_mode,
      max_teams,
      invite_code,
      created_at,
      tournament_participants (count),
      winner:teams!tournaments_winner_team_id_fkey (id, name, color)
    `,
    )
    .order("created_at", { ascending: false })

  const statusMap: Record<string, { label: string; color: string }> = {
    registration: { label: "Inscrições Abertas", color: "bg-green-100 text-green-800" },
    in_progress: { label: "Em Andamento", color: "bg-blue-100 text-blue-800" },
    completed: { label: "Finalizado", color: "bg-gray-100 text-gray-800" },
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
          <div className="flex items-center gap-2">
            {!isLoggedIn && (
              <Button size="sm" variant="outline" asChild>
                <Link href="/auth/login">Entrar</Link>
              </Button>
            )}
            {isAdmin && (
              <Button size="sm" asChild>
                <Link href="/admin/torneios">Gerenciar (Admin)</Link>
              </Button>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link href={isLoggedIn ? "/quiz" : "/"}>Voltar</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Trophy className="h-8 w-8 text-purple-600" />
          <div>
            <h2 className="text-3xl font-bold">Torneios</h2>
            <p className="text-muted-foreground">
              Participe de torneios com chaveamento. Use o código de convite na página inicial ou escolha um torneio abaixo.
            </p>
          </div>
        </div>

        <div className="mb-6">
          <Button variant="outline" asChild>
            <Link href="/">
              <Ticket className="h-4 w-4 mr-2" />
              Entrar com código de convite (página inicial)
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-purple-600" />
              Torneios ({tournaments?.length || 0})
            </CardTitle>
            <CardDescription>Clique em Ver para acessar o torneio e inscrever sua equipe</CardDescription>
          </CardHeader>
          <CardContent>
            {!tournaments || tournaments.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum torneio disponível no momento</p>
                <p className="text-sm text-muted-foreground mt-2">Peça o código de convite ao organizador para participar</p>
              </div>
            ) : (
              <div className="space-y-4">
                {tournaments.map((tournament: any) => {
                  const participantCount = tournament.tournament_participants?.[0]?.count ?? 0
                  const statusInfo = statusMap[tournament.status] ?? {
                    label: tournament.status,
                    color: "bg-gray-100 text-gray-800",
                  }
                  return (
                    <div
                      key={tournament.id}
                      className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white rounded-lg border shadow-sm hover:border-purple-300 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-purple-100 rounded-full">
                          <Trophy className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{tournament.name}</h3>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {participantCount}/{tournament.max_teams} equipes
                            </span>
                            <span>Modo: {tournament.competition_mode}</span>
                            {tournament.invite_code && (
                              <span>
                                Código: <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">{tournament.invite_code}</code>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                        {tournament.winner && (
                          <Badge variant="outline" className="bg-yellow-50 border-yellow-400">
                            Campeão: {tournament.winner.name}
                          </Badge>
                        )}
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/torneios/${tournament.id}`}>Ver</Link>
                        </Button>
                        {(tournament.status === "in_progress" || tournament.status === "completed") && (
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/torneios/${tournament.id}/chave`} title="Ver chave (compartilhar)">
                              <Share2 className="h-4 w-4" />
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
