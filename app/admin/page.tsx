import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, BookOpen, Trophy, ScrollText, Sparkles } from "lucide-react"
import Link from "next/link"

export default async function AdminPage() {
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

  // Get statistics
  const { count: usersCount } = await supabase.from("profiles").select("*", { count: "exact", head: true })

  const { count: questionsCount } = await supabase.from("questions").select("*", { count: "exact", head: true })

  const { count: teamsCount } = await supabase.from("teams").select("*", { count: "exact", head: true })

  const { count: sessionsCount } = await supabase
    .from("quiz_sessions")
    .select("*", { count: "exact", head: true })
    .eq("completed", true)

  // Get recent logs
  const { data: recentLogs } = await supabase
    .from("admin_logs")
    .select(
      `
      *,
      profiles!admin_logs_admin_id_fkey (full_name)
    `,
    )
    .order("created_at", { ascending: false })
    .limit(10)

  return (
    <div className="min-h-svh bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <header className="border-b bg-white/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-900">Dashboard Administrativo</h1>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" asChild>
              <Link href="/quiz">Voltar ao Quiz</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Statistics Overview */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-blue-100">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold">{usersCount || 0}</p>
                  <p className="text-sm text-muted-foreground">Usuários</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-green-100">
                  <BookOpen className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold">{questionsCount || 0}</p>
                  <p className="text-sm text-muted-foreground">Perguntas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-purple-100">
                  <Trophy className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold">{teamsCount || 0}</p>
                  <p className="text-sm text-muted-foreground">Equipes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-orange-100">
                  <ScrollText className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold">{sessionsCount || 0}</p>
                  <p className="text-sm text-muted-foreground">Sessões</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Actions */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card className="border-2 hover:border-blue-300 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Gerenciar Usuários
              </CardTitle>
              <CardDescription>Visualize e gerencie todos os usuários do sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" asChild>
                <Link href="/admin/usuarios">Gerenciar Usuários</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-green-300 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Gerenciar Perguntas
              </CardTitle>
              <CardDescription>Adicione, edite ou remova perguntas do banco</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" asChild>
                <Link href="/admin/perguntas">Gerenciar Perguntas</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-purple-300 transition-colors bg-gradient-to-br from-purple-50 to-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                Gerar com IA
              </CardTitle>
              <CardDescription>Use IA para gerar novas perguntas bíblicas</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full bg-purple-600 hover:bg-purple-700" asChild>
                <Link href="/admin/gerar-perguntas">Gerar Perguntas</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-orange-300 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Gerenciar Equipes
              </CardTitle>
              <CardDescription>Visualize e modere equipes e competições</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" asChild>
                <Link href="/admin/equipes">Gerenciar Equipes</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-red-300 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ScrollText className="h-5 w-5" />
                Logs do Sistema
              </CardTitle>
              <CardDescription>Visualize logs de ações administrativas</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full bg-transparent" variant="outline" asChild>
                <Link href="/admin/logs">Ver Logs</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-slate-300 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ScrollText className="h-5 w-5" />
                Configurações
              </CardTitle>
              <CardDescription>Configure funcionalidades e integrações do sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full bg-slate-600 hover:bg-slate-700" asChild>
                <Link href="/admin/configuracoes">Configurar Sistema</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity Logs */}
        <Card>
          <CardHeader>
            <CardTitle>Atividades Recentes</CardTitle>
            <CardDescription>Últimas 10 ações administrativas</CardDescription>
          </CardHeader>
          <CardContent>
            {recentLogs && recentLogs.length > 0 ? (
              <div className="space-y-3">
                {recentLogs.map((log: any) => (
                  <div key={log.id} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{log.description}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <span>{log.profiles?.full_name || "Admin"}</span>
                        <span>•</span>
                        <span>{new Date(log.created_at).toLocaleString("pt-BR")}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma atividade recente</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
