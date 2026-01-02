"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Crown, UserPlus, UserMinus, Trophy, Target, Edit } from "lucide-react"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

interface Team {
  id: string
  name: string
  color: string
  leader_id: string
  competition_mode: string
}

interface Member {
  id: string
  user_id: string
  profiles: {
    full_name: string
    email: string
  }
}

export default function EquipePage() {
  const params = useParams()
  const teamId = params.teamId as string
  const [team, setTeam] = useState<Team | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [ranking, setRanking] = useState<any>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isLeader, setIsLeader] = useState(false)
  const [emailToAdd, setEmailToAdd] = useState("")
  const [newTeamName, setNewTeamName] = useState("")
  const [newTeamColor, setNewTeamColor] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadTeamData()
  }, [teamId])

  const loadTeamData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth/login")
        return
      }
      setCurrentUserId(user.id)

      const { data: teamData } = await supabase.from("teams").select("*").eq("id", teamId).single()

      if (!teamData) {
        router.push("/competicoes")
        return
      }

      setTeam(teamData)
      setNewTeamName(teamData.name)
      setNewTeamColor(teamData.color)
      setIsLeader(teamData.leader_id === user.id)

      const { data: membersData } = await supabase
        .from("team_members")
        .select(
          `
          id,
          user_id,
          profiles (
            full_name,
            email
          )
        `,
        )
        .eq("team_id", teamId)

      setMembers(membersData || [])

      const { data: rankingData } = await supabase.from("team_rankings").select("*").eq("team_id", teamId).single()

      setRanking(rankingData)
    } catch (error) {
      console.error("[v0] Error loading team:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!emailToAdd) return

    try {
      const { data: profileData } = await supabase.from("profiles").select("id").eq("email", emailToAdd).single()

      if (!profileData) {
        alert("Usuário não encontrado")
        return
      }

      const { error } = await supabase.from("team_members").insert({
        team_id: teamId,
        user_id: profileData.id,
      })

      if (error) throw error

      setEmailToAdd("")
      await loadTeamData()
      alert("Membro adicionado com sucesso!")
    } catch (error: any) {
      console.error("[v0] Error adding member:", error)
      alert(error.message || "Erro ao adicionar membro")
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!confirm("Deseja realmente remover este membro?")) return

    try {
      const { error } = await supabase.from("team_members").delete().eq("team_id", teamId).eq("user_id", userId)

      if (error) throw error

      await loadTeamData()
      alert("Membro removido com sucesso!")
    } catch (error: any) {
      console.error("[v0] Error removing member:", error)
      alert(error.message || "Erro ao remover membro")
    }
  }

  const handleUpdateTeam = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const { error } = await supabase
        .from("teams")
        .update({
          name: newTeamName,
          color: newTeamColor,
        })
        .eq("id", teamId)

      if (error) throw error

      await loadTeamData()
      alert("Equipe atualizada com sucesso!")
    } catch (error: any) {
      console.error("[v0] Error updating team:", error)
      alert(error.message || "Erro ao atualizar equipe")
    }
  }

  const handleLeaveTeam = async () => {
    if (!confirm("Deseja realmente sair desta equipe?")) return

    try {
      const { error } = await supabase.from("team_members").delete().eq("team_id", teamId).eq("user_id", currentUserId)

      if (error) throw error

      router.push("/competicoes")
    } catch (error: any) {
      console.error("[v0] Error leaving team:", error)
      alert(error.message || "Erro ao sair da equipe")
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <p>Carregando...</p>
      </div>
    )
  }

  if (!team) return null

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

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-4 mb-8">
          <div className="h-16 w-16 rounded-full" style={{ backgroundColor: team.color }} />
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{team.name}</h1>
            <p className="text-muted-foreground">{team.competition_mode.toUpperCase()}</p>
          </div>
          {isLeader && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Editar Equipe</DialogTitle>
                  <DialogDescription>Altere o nome e a cor da equipe</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleUpdateTeam} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="teamName">Nome da Equipe</Label>
                    <Input
                      id="teamName"
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cor da Equipe</Label>
                    <div className="grid grid-cols-4 gap-3">
                      {colors.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => setNewTeamColor(color.value)}
                          className={`h-12 rounded-lg transition-all ${
                            newTeamColor === color.value
                              ? "ring-2 ring-offset-2 ring-blue-500 scale-110"
                              : "hover:scale-105"
                          }`}
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </div>
                  <Button type="submit" className="w-full">
                    Salvar Alterações
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center gap-2">
                <Trophy className="h-8 w-8 text-yellow-600" />
                <p className="text-3xl font-bold">{ranking?.total_points || 0}</p>
                <p className="text-sm text-muted-foreground">Pontos Totais</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center gap-2">
                <Target className="h-8 w-8 text-green-600" />
                <p className="text-3xl font-bold">{ranking?.total_wins || 0}</p>
                <p className="text-sm text-muted-foreground">Vitórias</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center gap-2">
                <Trophy className="h-8 w-8 text-blue-600" />
                <p className="text-3xl font-bold">{ranking?.total_matches || 0}</p>
                <p className="text-sm text-muted-foreground">Partidas</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Membros da Equipe</CardTitle>
              {isLeader && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Adicionar
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Adicionar Membro</DialogTitle>
                      <DialogDescription>Digite o email do usuário para adicionar à equipe</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddMember} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email do Usuário</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="usuario@email.com"
                          value={emailToAdd}
                          onChange={(e) => setEmailToAdd(e.target.value)}
                          required
                        />
                      </div>
                      <Button type="submit" className="w-full">
                        Adicionar Membro
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    {member.user_id === team.leader_id && <Crown className="h-5 w-5 text-yellow-600" />}
                    <div>
                      <p className="font-medium">{member.profiles.full_name}</p>
                      <p className="text-sm text-muted-foreground">{member.profiles.email}</p>
                    </div>
                  </div>
                  {isLeader && member.user_id !== team.leader_id && (
                    <Button variant="ghost" size="sm" onClick={() => handleRemoveMember(member.user_id)}>
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {!isLeader && (
          <Button variant="destructive" className="w-full" onClick={handleLeaveTeam}>
            Sair da Equipe
          </Button>
        )}
      </div>
    </div>
  )
}
