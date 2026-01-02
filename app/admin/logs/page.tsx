import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default async function LogsAdminPage() {
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

  const { data: logs } = await supabase
    .from("admin_logs")
    .select(
      `
      *,
      profiles!admin_logs_admin_id_fkey (full_name)
    `,
    )
    .order("created_at", { ascending: false })
    .limit(100)

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
        <h2 className="text-3xl font-bold mb-6">Logs do Sistema</h2>

        <Card>
          <CardHeader>
            <CardTitle>Últimas 100 Atividades</CardTitle>
          </CardHeader>
          <CardContent>
            {logs && logs.length > 0 ? (
              <div className="space-y-3">
                {logs.map((log: any) => (
                  <div key={log.id} className="p-4 bg-muted rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-medium">{log.description}</p>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{log.profiles?.full_name || "Admin"}</span>
                      <span>•</span>
                      <span>{log.action_type}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-8 text-muted-foreground">Nenhum log encontrado</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
