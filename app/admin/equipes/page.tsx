import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default async function EquipesAdminPage() {
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

  const { data: teams } = await supabase
    .from("teams")
    .select(
      `
      *,
      profiles!teams_leader_id_fkey (full_name),
      team_rankings (total_points, total_wins, total_matches)
    `,
    )
    .order("created_at", { ascending: false })

  return (
    <div className="min-h-svh bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <header className="border-b bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Link>
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold mb-6">Gerenciar Equipes</h2>

        <Card>
          <CardHeader>
            <CardTitle>Todas as Equipes ({teams?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {teams?.map((team: any) => {
                const ranking = team.team_rankings?.[0]

                return (
                  <div key={team.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full" style={{ backgroundColor: team.color }} />
                      <div>
                        <p className="font-medium">{team.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Líder: {team.profiles?.full_name || "Desconhecido"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="outline">{team.competition_mode.toUpperCase()}</Badge>
                      {ranking && (
                        <div className="text-right text-xs text-muted-foreground">
                          <p>
                            {ranking.total_points} pts • {ranking.total_wins} vitórias
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
