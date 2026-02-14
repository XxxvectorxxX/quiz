import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Trophy, Plus, Users, Eye } from "lucide-react"
import Link from "next/link"
import { revalidatePath } from "next/cache"
import { DeleteTournamentButton } from "@/components/DeleteTournamentButton"

// Evita cache e ajuda a lista atualizar sempre
export const dynamic = "force-dynamic"

async function deleteTournamentAction(tournamentId: string) {
  "use server"
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single()
  if (!profile?.is_admin) return

  // Se no seu schema a tabela correta for tournament_teams, apague ela também
  // (mantive tournament_participants se você realmente tiver essa tabela; caso não tenha, troque para tournament_teams)
  await supabase.from("tournament_matches").delete().eq("tournament_id", tournamentId)
  await supabase.from("tournament_teams").delete().eq("tournament_id", tournamentId)
  await supabase.from("tournaments").delete().eq("id", tournamentId)

  revalidatePath("/admin/torneios")
  revalidatePath("/torneios")
}

// Server Component - DO NOT add 'use client'
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

  const { data: tournaments, error } = await supabase
    .from("tournaments")
    .select(
      `
      *,
      tournament_teams(count),
      winner:teams!tournaments_winner_team_id_fkey (
        id,
        name,
        color
      )
    `,
    )
    .order("created_at", { ascending: false })

  const statusMap: Record<string, { label: string; color: string }> = {
    draft: { label: "Rascunho", color: "bg-yellow-100 text-yellow-800" },
    registration: { label: "Inscricoes Abertas", color: "bg-green-100 text-green-800" },
    in_progress: { label: "Em Andamento", color: "bg-blue-100 text-blue-800" },
    completed: { label: "Finalizado", color: "bg-gray-100 text-gray-800" },
  }

  // Se der erro no select (RLS, join, schema, etc), mostra erro na tela
  if (error) {
    return (
      <div className="min-h-svh bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        <header className="border-b bg-white/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Link href="/admin">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
              </Link>
              <h1 className="text-2xl font-bold">Gerenciar Torneios</h1>
            </div>
            <Button asChild>
              <Link href="/torneios/criar">
                <Plus className="h-4 w-4 mr-2" />
                Criar Torneio
              </Link>
            </Button>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-purple-600" />
                Erro ao carregar torneios
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                O Supabase retornou erro ao buscar torneios (pode ser RLS/policies ou o join).
              </p>
              <pre className="mt-4 p-3 bg-white rounded border text-xs overflow-auto">
                {JSON.stringify(error, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-svh bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <header className="border-b bg-white/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Gerenciar Torneios</h1>
          </div>
          <Button asChild>
            <Link href="/torneios/criar">
              <Plus className="h-4 w-4 mr-2" />
              Criar Torneio
            </Link>
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-4 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-purple-600" />
                Todos os Torneios ({tournaments?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!tournaments || tournaments.length === 0 ? (
                <div className="text-center py-8">
                  <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhum torneio criado ainda</p>
                  <Button asChild className="mt-4">
                    <Link href="/torneios/criar">Criar Primeiro Torneio</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {tournaments.map((tournament: any) => {
                    const participantCount = tournament.tournament_teams?.[0]?.count ?? 0

                    const statusInfo =
                      statusMap[tournament.status] ??
                      ({
                        label: tournament.status ?? "Desconhecido",
                        color: "bg-gray-100 text-gray-800",
                      } as const)

                    return (
                      <div
                        key={tournament.id}
                        className="flex items-center justify-between p-4 bg-white rounded-lg border shadow-sm"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-purple-100 rounded-full">
                            <Trophy className="h-5 w-5 text-purple-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{tournament.name}</h3>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {participantCount}/{tournament.max_teams ?? "-"} equipes
                              </span>
                              <span>Modo: {tournament.competition_mode ?? tournament.mode ?? "-"}</span>
                              {tournament.invite_code ? (
                                <span>
                                  Codigo:{" "}
                                  <code className="bg-gray-100 px-2 py-0.5 rounded">{tournament.invite_code}</code>
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <Badge className={statusInfo.color}>{statusInfo.label}</Badge>

                          {tournament.winner?.name ? (
                            <Badge variant="outline" className="bg-yellow-50 border-yellow-400">
                              Campeao: {tournament.winner.name}
                            </Badge>
                          ) : null}

                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/torneios/${tournament.id}`}>
                              <Eye className="h-4 w-4 mr-1" />
                              Ver
                            </Link>
                          </Button>

                          <DeleteTournamentButton
                            tournamentId={tournament.id}
                            tournamentName={tournament.name}
                            deleteAction={deleteTournamentAction}
                          />
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
    </div>
  )
}
