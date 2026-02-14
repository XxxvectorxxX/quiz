"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Settings, Save, Loader2 } from "lucide-react";

type SystemConfigState = {
  competitions_enabled: boolean;
  team_battles_enabled: boolean;
};

type SystemConfigRow = {
  config_key: string;
  // pode ser boolean ou string dependendo do seu schema atual
  config_value: boolean | string | null;
};

export default function ConfiguracoesPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const [config, setConfig] = useState<SystemConfigState>({
    competitions_enabled: true,
    team_battles_enabled: true,
  });

  useEffect(() => {
    void bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function bootstrap() {
    try {
      setIsLoading(true);

      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr) throw userErr;

      if (!user) {
        router.replace("/auth/login");
        return;
      }

      // ✅ Fonte de verdade: RPC admin (evita depender de select em profiles com RLS)
      const { data: admin, error: adminErr } = await supabase.rpc("current_user_is_admin");
      if (adminErr) throw adminErr;

      if (!admin) {
        setIsAdmin(false);
        return;
      }

      setIsAdmin(true);

      // Carrega configs atuais
      const { data: configs, error: cfgErr } = await supabase
        .from("system_config")
        .select("config_key,config_value");

      if (cfgErr) throw cfgErr;

      if (configs && configs.length > 0) {
        const map: Partial<SystemConfigState> = {};
        for (const c of configs as SystemConfigRow[]) {
          const val =
            c.config_value === true ||
            c.config_value === "true" ||
            c.config_value === "1" ||
            c.config_value === 1;

          if (c.config_key === "competitions_enabled") map.competitions_enabled = val;
          if (c.config_key === "team_battles_enabled") map.team_battles_enabled = val;
        }

        setConfig((prev) => ({
          ...prev,
          ...map,
        }));
      }
    } catch (err) {
      console.error("[config] bootstrap error:", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      if (!user) {
        router.replace("/auth/login");
        return;
      }

      // ✅ salva em lote com upsert
      const payload = Object.entries(config).map(([key, value]) => ({
        config_key: key,
        // se sua coluna for boolean, isso é ok. Se for text, também ok (Postgres faz cast se permitido).
        config_value: value,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      }));

      const { error: upsertErr } = await supabase
        .from("system_config")
        .upsert(payload, { onConflict: "config_key" });

      if (upsertErr) throw upsertErr;

      // Log action (se existir tabela admin_logs)
      const { error: logErr } = await supabase.from("admin_logs").insert({
        admin_id: user.id,
        action_type: "config_update",
        description: "Atualizou configurações do sistema",
        metadata: config,
      });

      // Se não existir admin_logs ou policy bloquear, não derruba o save
      if (logErr) console.warn("[config] admin_logs insert failed:", logErr.message);

      // UX simples sem alert (você pode trocar por toast se já tiver)
      // eslint-disable-next-line no-console
      console.log("Configurações salvas com sucesso!");
    } catch (err) {
      console.error("[config] save error:", err);
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Acesso negado</CardTitle>
            <CardDescription>Você precisa ser administrador para ver esta página.</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button asChild variant="secondary">
              <Link href="/quiz">Ir para o Quiz</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/auth/login">Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-svh bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <header className="sticky top-0 z-10 border-b bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <h1 className="text-2xl font-bold text-slate-900">Configurações do Sistema</h1>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin">Voltar</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-3xl px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              <CardTitle>Funcionalidades do Sistema</CardTitle>
            </div>
            <CardDescription>Habilite ou desabilite funcionalidades do quiz</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="flex items-center justify-between gap-6">
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
                onCheckedChange={(checked) =>
                  setConfig((prev) => ({ ...prev, competitions_enabled: checked }))
                }
              />
            </div>

            <div className="h-px bg-border" />

            <div className="flex items-center justify-between gap-6">
              <div className="space-y-0.5">
                <Label htmlFor="battles" className="text-base font-medium">
                  Batalhas em Grupo
                </Label>
                <p className="text-sm text-muted-foreground">
                  Permite batalhas 1v1, 2v2, 3v3, 4v4 e 5v5 entre equipes
                </p>
              </div>

              <Switch
                id="battles"
                checked={config.team_battles_enabled}
                onCheckedChange={(checked) =>
                  setConfig((prev) => ({ ...prev, team_battles_enabled: checked }))
                }
              />
            </div>

            <div className="h-px bg-border" />

            <Button onClick={handleSave} disabled={isSaving} className="w-full" size="lg">
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
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
            <div className="rounded-lg bg-muted p-4">
              <p className="mb-2 text-sm font-medium">Configure no arquivo .env.local:</p>
              <pre className="overflow-x-auto rounded bg-slate-900 p-3 text-xs text-slate-50">
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
  );
}
