"use client"

import type React from "react"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function CriarEquipePage() {
  const [teamName, setTeamName] = useState("")
  const [teamColor, setTeamColor] = useState("#3B82F6")
  const [competitionMode, setCompetitionMode] = useState("1v1")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth/login")
        return
      }

      const { data: team, error: teamError } = await supabase
        .from("teams")
        .insert({
          name: teamName,
          color: teamColor,
          leader_id: user.id,
          competition_mode: competitionMode,
        })
        .select()
        .single()

      if (teamError) throw teamError

      const { error: memberError } = await supabase.from("team_members").insert({
        team_id: team.id,
        user_id: user.id,
      })

      if (memberError) throw memberError

      const { error: rankingError } = await supabase.from("team_rankings").insert({
        team_id: team.id,
      })

      if (rankingError) throw rankingError

      router.push(`/competicoes/equipe/${team.id}`)
    } catch (error: any) {
      console.error("[v0] Error creating team:", error)
      setError(error.message || "Erro ao criar equipe")
    } finally {
      setIsLoading(false)
    }
  }

  const colors = [
    { name: "Azul", value: "#3B82F6" },
    { name: "Verde", value: "#10B981" },
    { name: "Vermelho", value: "#EF4444" },
    { name: "Amarelo", value: "#F59E0B" },
    { name: "Roxo", value: "#8B5CF6" },
    { name: "Rosa", value: "#EC4899" },
    { name: "Laranja", value: "#F97316" },
    { name: "Ciano", value: "#06B6D4" },
  ]

  return (
    <div className="min-h-svh bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <header className="border-b bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/competicoes">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Link>
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Criar Nova Equipe</CardTitle>
            <CardDescription>Crie uma equipe e convide amigos para competir</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateTeam} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="teamName">Nome da Equipe</Label>
                <Input
                  id="teamName"
                  placeholder="Digite o nome da equipe"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="competitionMode">Modo de Competição</Label>
                <Select value={competitionMode} onValueChange={setCompetitionMode}>
                  <SelectTrigger>
                    <SelectValue />
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
                <Label>Cor da Equipe</Label>
                <div className="grid grid-cols-4 gap-3">
                  {colors.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setTeamColor(color.value)}
                      className={`h-12 rounded-lg transition-all ${
                        teamColor === color.value ? "ring-2 ring-offset-2 ring-blue-500 scale-110" : "hover:scale-105"
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? "Criando Equipe..." : "Criar Equipe"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
