"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Ticket } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface TournamentInviteCodeEntryProps {
  trigger?: React.ReactNode
  variant?: "default" | "outline" | "secondary" | "ghost" | "link"
}

export function TournamentInviteCodeEntry({ trigger, variant = "outline" }: TournamentInviteCodeEntryProps) {
  const [inviteCode, setInviteCode] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const supabase = createClient()

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSearching(true)
    setError("")

    try {
      const { data: tournament } = await supabase
        .from("tournaments")
        .select("id, name, status")
        .eq("invite_code", inviteCode.toUpperCase().trim())
        .single()

      if (!tournament) {
        setError("Torneio não encontrado. Verifique o código.")
        return
      }

      if (tournament.status !== "registration") {
        setError("Este torneio não está aceitando inscrições.")
        return
      }

      router.push(`/torneios/${tournament.id}`)
    } catch {
      setError("Torneio não encontrado. Verifique o código.")
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant={variant}>
            <Ticket className="h-4 w-4 mr-2" />
            Entrar com código de convite
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Entrar no Torneio</DialogTitle>
          <DialogDescription>
            Digite o código de convite que o organizador compartilhou. Depois você escolherá sua equipe na página do torneio.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleJoinByCode} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="inviteCode">Código do Torneio</Label>
            <Input
              id="inviteCode"
              placeholder="Ex: ABC12345"
              value={inviteCode}
              onChange={(e) => {
                setInviteCode(e.target.value.toUpperCase())
                setError("")
              }}
              className="text-center text-xl font-mono tracking-widest h-12"
              maxLength={8}
              minLength={4}
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button
            type="submit"
            disabled={isSearching || inviteCode.length < 4}
            className="w-full"
          >
            {isSearching ? "Buscando..." : "Ir para o torneio"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
