import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Users, Mail, UserCircle, Save } from "lucide-react"
import Link from "next/link"
import { adminUpdateProfile } from "./actions"

export const dynamic = "force-dynamic"

export default async function AdminUsuariosPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single()
  if (!profile?.is_admin) redirect("/quiz")

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, age_category, is_admin, created_at")
    .order("created_at", { ascending: false })

  const ageCategoryLabels: Record<string, string> = {
    criancas: "Crianças",
    adolescentes: "Adolescentes",
    jovens: "Jovens",
    adultos: "Adultos",
    casais: "Casais",
  }

  if (error) {
    return (
      <div className="min-h-svh bg-gradient-to-br from-slate-50 via-white to-blue-50 p-6">
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle>Erro ao carregar usuários</CardTitle>
            <CardDescription>{error.message}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-svh bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <header className="border-b bg-white/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Link>
            </Button>
            <h1 className="text-2xl font-bold text-slate-900">Gerenciar Usuários</h1>
          </div>

          {/* Botão "Criar usuário" vamos ligar no passo 4 (Auth Admin) */}
          <Button size="sm" variant="outline" asChild>
            <Link href="/admin/usuarios/criar">Criar Usuário</Link>
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-6 w-6 text-blue-600" />
              <CardTitle>Todos os Usuários ({profiles?.length || 0})</CardTitle>
            </div>
            <CardDescription>Visualize e gerencie os usuários do sistema</CardDescription>
          </CardHeader>

          <CardContent>
            {!profiles || profiles.length === 0 ? (
              <p className="text-center py-12 text-muted-foreground">Nenhum usuário cadastrado</p>
            ) : (
              <div className="space-y-3">
                {profiles.map((p: any) => (
                  <div key={p.id} className="p-4 bg-muted rounded-lg border space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="p-2 rounded-full bg-blue-100 shrink-0">
                          <UserCircle className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{p.full_name || "Sem nome"}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1 truncate">
                            <Mail className="h-3 w-3 shrink-0" />
                            {p.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary">{ageCategoryLabels[p.age_category] || p.age_category}</Badge>
                        {p.is_admin && <Badge variant="default" className="bg-amber-600">Admin</Badge>}
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(p.created_at).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    </div>

                    {/* Editor */}
                    <form action={adminUpdateProfile} className="grid md:grid-cols-4 gap-2 items-end">
                      <input type="hidden" name="id" value={p.id} />

                      <div className="md:col-span-2">
                        <label className="text-xs text-muted-foreground">Nome</label>
                        <input
                          name="full_name"
                          defaultValue={p.full_name ?? ""}
                          className="w-full h-9 rounded-md border bg-white px-3 text-sm"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-muted-foreground">Categoria</label>
                        <select
                          name="age_category"
                          defaultValue={p.age_category ?? "adultos"}
                          className="w-full h-9 rounded-md border bg-white px-3 text-sm"
                        >
                          <option value="criancas">Crianças</option>
                          <option value="adolescentes">Adolescentes</option>
                          <option value="jovens">Jovens</option>
                          <option value="adultos">Adultos</option>
                          <option value="casais">Casais</option>
                        </select>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" name="is_admin" defaultChecked={!!p.is_admin} />
                          Admin
                        </label>

                        <Button type="submit" size="sm">
                          <Save className="h-4 w-4 mr-2" />
                          Salvar
                        </Button>
                      </div>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
