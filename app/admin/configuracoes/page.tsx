"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Settings, Save, Loader2 } from "lucide-react"

export default function ConfiguracoesPage() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [config, setConfig] = useState({
    competitions_enabled: true,
    team_battles_enabled: true,
  })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAdmin()
  }, [])

  const checkAdmin = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth/login")
        return
      }

      const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single()

      if (!profile?.is_admin) {
        router.push("/quiz")
        return
      }

      setIsAdmin(true)

      // Load current configuration
      const { data: configs } = await supabase.from("system_config").select("*")

      if (configs) {
        const newConfig: any = {}
        configs.forEach((c) => {
          newConfig[c.config_key] = c.config_value === "true" || c.config_value === true
        })
        setConfig(newConfig)
      }
    } catch (error) {
      console.error("[v0] Error checking admin:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      // Update each config
      for (const [key, value] of Object.entries(config)) {
        await supabase
          .from("system_config")
          .update({
            config_value: value,
            updated_at: new Date().toISOString(),
            updated_by: user?.id,
          })
          .eq("config_key", key)
      }

      // Log action
      await supabase.from("admin_logs").insert({
        admin_id: user?.id,
        action_type: "config_update",
        description: "Atualizou configurações do sistema",
        metadata: config,
      })

      alert("Configurações salvas com sucesso!")
    } catch (error) {
      console.error("[v0] Error saving config:", error)
      alert("Erro ao salvar configurações")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="min-h-svh bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <header className="border-b bg-white/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-900">Configurações do Sistema</h1>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin">Voltar</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              <CardTitle>Funcionalidades do Sistema</CardTitle>
            </div>
            <CardDescription>Habilite ou desabilite funcionalidades do quiz</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="competitions" className="text-base font-medium">
                  Sistema de Competições
                </Label>
                <p className="text-sm text-muted-foreground">
                  Permite que usuários acessem a página de competições e criem equipes
                </p>
              </div>
              <Switch
                id="competitions"
                checked={config.competitions_enabled}
                onCheckedChange={(checked) => setConfig({ ...config, competitions_enabled: checked })}
              />
            </div>

            <div className="h-px bg-border" />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="battles" className="text-base font-medium">
                  Batalhas em Grupo
                </Label>
                <p className="text-sm text-muted-foreground">Permite batalhas 1v1, 2v2, 3v3, 4v4 e 5v5 entre equipes</p>
              </div>
              <Switch
                id="battles"
                checked={config.team_battles_enabled}
                onCheckedChange={(checked) => setConfig({ ...config, team_battles_enabled: checked })}
              />
            </div>

            <div className="h-px bg-border" />

            <Button onClick={handleSave} disabled={isSaving} className="w-full" size="lg">
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Configurações
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Configuração de IA</CardTitle>
            <CardDescription>Configure o provedor de IA para geração de perguntas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm mb-2 font-medium">Configure no arquivo .env.local:</p>
              <pre className="text-xs bg-slate-900 text-slate-50 p-3 rounded overflow-x-auto">
                {`# Escolha seu provedor de IA:
AI_PROVIDER=groq
AI_API_KEY=sua_chave_aqui
AI_MODEL=llama-3.3-70b-versatile

# Opções disponíveis:
# - openai (gpt-4o-mini)
# - groq (llama-3.3-70b-versatile)
# - anthropic (claude-3-5-sonnet)
# - google (gemini-2.0-flash-exp)
# - custom (sua API customizada)`}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
