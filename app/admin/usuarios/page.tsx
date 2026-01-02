import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Crown } from "lucide-react"
import Link from "next/link"

export default async function UsuariosAdminPage() {
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

  const { data: users } = await supabase
    .from("profiles")
    .select(
      `
      *,
      user_progress (
        total_questions_answered,
        correct_answers,
        current_level
      )
    `,
    )
    .order("created_at", { ascending: false })

  const ageCategoryLabels: Record<string, string> = {
    criancas: "Crianças",
    adolescentes: "Adolescentes",
    jovens: "Jovens",
    adultos: "Adultos",
    casais: "Casais",
  }

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
        <h2 className="text-3xl font-bold mb-6">Gerenciar Usuários</h2>

        <Card>
          <CardHeader>
            <CardTitle>Todos os Usuários</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {users?.map((usr: any) => {
                const progress = usr.user_progress?.[0]
                const accuracy = progress
                  ? ((progress.correct_answers / progress.total_questions_answered) * 100).toFixed(1)
                  : "0"

                return (
                  <div key={usr.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-4">
                      {usr.is_admin && <Crown className="h-5 w-5 text-yellow-600" />}
                      <div>
                        <p className="font-medium">{usr.full_name || "Sem nome"}</p>
                        <p className="text-sm text-muted-foreground">{usr.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <Badge variant="outline">{ageCategoryLabels[usr.age_category]}</Badge>
                        {progress && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Nível {progress.current_level} • {accuracy}% acertos
                          </p>
                        )}
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
