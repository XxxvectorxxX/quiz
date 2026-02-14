import { redirect } from "next/navigation"
import Link from "next/link"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Plus, UserPlus, Trash2 } from "lucide-react"

export const dynamic = "force-dynamic"

async function assertAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase.from("profiles").select("id,is_admin").eq("id", user.id).single()
  if (!profile?.is_admin) redirect("/quiz")

  return { supabase, user }
}

async function createTeamAction(formData: FormData) {
  "use server"
  const { supabase } = await assertAdmin()

  const name = String(formData.get("name") || "").trim()
  const color = String(formData.get("color") || "#7c3aed").trim()
  const leaderId = String(formData.get("leader_id") || "").trim() // opcional

  if (!name) return

  // se você quiser que admin defina o leader, mande leader_id
  // se não mandar, o default no banco pode preencher (auth.uid())
  const payload: any = { name, color }
  if (leaderId) payload.leader_id = leaderId

  await supabase.from("teams").insert(payload)

  revalidatePath("/admin/equipes")
}

async function addMemberAction(formData: FormData) {
  "use server"
  const { supabase } = await assertAdmin()

  const teamId = String(formData.get("team_id") || "")
  const userId = String(formData.get("user_id") || "").trim()
  const role = String(formData.get("role") || "member").trim()

  if (!teamId || !userId) return

  await supabase.from("team_members").insert({
    team_id: teamId,
    user_id: userId,
    role,
  })

  revalidatePath("/admin/equipes")
}

async function removeMemberAction(formData: FormData) {
  "use server"
  const { supabase } = await assertAdmin()

  const teamId = String(formData.get("team_id") || "")
  const userId = String(formData.get("user_id") || "")

  if (!teamId || !userId) return

  await supabase.from("team_members").delete().eq("team_id", teamId).eq("user_id", userId)

  revalidatePath("/admin/equipes")
}

export default async function EquipesAdminPage() {
  const { supabase } = await assertAdmin()

  const { data: teams, error } = await supabase
    .from("teams")
    .select(
      `
      *,
      profiles!teams_leader_id_fkey (id, full_name),
      team_rankings (total_points, total_wins, total_matches),
      team_members (
        user_id,
        role,
        profiles:profiles!team_members_user_id_fkey (id, full_name)
      )
    `,
    )
    .order("created_at", { ascending: false })

  if (error) {
    return (
      <div className="min-h-svh bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Erro ao carregar equipes</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs overflow-auto border rounded bg-white p-3">{JSON.stringify(error, null, 2)}</pre>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-svh bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <header className="border-b bg-white/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Link>
          </Button>
          <h2 className="text-xl font-bold">Gerenciar Equipes</h2>
          <div />
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Criar equipe */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Criar equipe
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createTeamAction} className="grid gap-3 md:grid-cols-4">
              <div className="md:col-span-2">
                <label className="text-sm font-medium">Nome</label>
                <Input name="name" placeholder="Nome da equipe" />
              </div>
              <div>
                <label className="text-sm font-medium">Cor</label>
                <Input name="color" placeholder="#7c3aed" defaultValue="#7c3aed" />
              </div>
              <div>
                <label className="text-sm font-medium">Leader ID (opcional)</label>
                <Input name="leader_id" placeholder="UUID do usuário" />
              </div>

              <div className="md:col-span-4 flex justify-end">
                <Button type="submit">Criar</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Lista */}
        <Card>
          <CardHeader>
            <CardTitle>Todas as Equipes ({teams?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {teams?.map((team: any) => {
                const ranking = team.team_rankings?.[0]
                const members = team.team_members ?? []

                return (
                  <div key={team.id} className="p-4 bg-white rounded-lg border">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full border" style={{ backgroundColor: team.color ?? "#999" }} />
                        <div>
                          <p className="font-semibold">{team.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Líder: {team.profiles?.full_name || "Desconhecido"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{String(team.competition_mode || "—").toUpperCase()}</Badge>
                        {ranking ? (
                          <div className="text-right text-xs text-muted-foreground">
                            <p>
                              {ranking.total_points} pts • {ranking.total_wins} vitórias
                            </p>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {/* Membros */}
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-lg border bg-muted/30 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium">Membros ({members.length})</p>
                        </div>

                        {members.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Nenhum membro adicionado ainda.</p>
                        ) : (
                          <div className="space-y-2">
                            {members.map((m: any) => (
                              <div key={m.user_id} className="flex items-center justify-between bg-white rounded border p-2">
                                <div>
                                  <p className="text-sm font-medium">{m.profiles?.full_name ?? m.user_id}</p>
                                  <p className="text-xs text-muted-foreground">{m.role}</p>
                                </div>

                                <form action={removeMemberAction}>
                                  <input type="hidden" name="team_id" value={team.id} />
                                  <input type="hidden" name="user_id" value={m.user_id} />
                                  <Button type="submit" size="sm" variant="destructive">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </form>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Adicionar membro */}
                      <div className="rounded-lg border bg-muted/30 p-3">
                        <p className="font-medium mb-2 flex items-center gap-2">
                          <UserPlus className="h-4 w-4" />
                          Adicionar membro
                        </p>

                        <form action={addMemberAction} className="space-y-2">
                          <input type="hidden" name="team_id" value={team.id} />

                          <div>
                            <label className="text-sm font-medium">User ID</label>
                            <Input name="user_id" placeholder="UUID do usuário" />
                          </div>

                          <div>
                            <label className="text-sm font-medium">Role</label>
                            <select name="role" className="h-10 w-full rounded-md border bg-white px-3 text-sm" defaultValue="member">
                              <option value="member">member</option>
                              <option value="co_leader">co_leader</option>
                            </select>
                          </div>

                          <div className="flex justify-end">
                            <Button type="submit" variant="outline">
                              Adicionar
                            </Button>
                          </div>
                        </form>
                      </div>
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
