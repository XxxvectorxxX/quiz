import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"

export default async function CriarTorneioPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (!profile || !profile.is_admin) {
    redirect("/torneios")
  }

  async function createTournament(formData: FormData) {
    "use server"
    const supabase = await createClient()

    const name = formData.get("name") as string
    const competitionMode = formData.get("competition_mode") as string
    const maxTeams = Number.parseInt(formData.get("max_teams") as string)

    const { data, error } = await supabase
      .from("tournaments")
      .insert({
        name,
        competition_mode: competitionMode,
        max_teams: maxTeams,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error("[v0] Error creating tournament:", error)
      return
    }

    redirect(`/torneios/${data.id}`)
  }

  return (
    <div className="min-h-svh bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Criar Novo Torneio</CardTitle>
          <CardDescription>Configure um torneio em formato de chaveamento</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createTournament} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Torneio</Label>
              <Input id="name" name="name" placeholder="Ex: Campeonato Bíblico 2024" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="competition_mode">Modo de Competição</Label>
              <Select name="competition_mode" required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o modo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1v1">1 vs 1</SelectItem>
                  <SelectItem value="2v2">2 vs 2</SelectItem>
                  <SelectItem value="3v3">3 vs 3</SelectItem>
                  <SelectItem value="4v4">4 vs 4</SelectItem>
                  <SelectItem value="5v5">5 vs 5</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_teams">Número Máximo de Equipes</Label>
              <Select name="max_teams" required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a quantidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4">4 equipes (Semifinal)</SelectItem>
                  <SelectItem value="8">8 equipes (Quartas)</SelectItem>
                  <SelectItem value="16">16 equipes (Oitavas)</SelectItem>
                  <SelectItem value="32">32 equipes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">
                Criar Torneio
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/torneios">Cancelar</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
