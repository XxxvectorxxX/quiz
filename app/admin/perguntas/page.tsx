import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default async function PerguntasAdminPage() {
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

  const { data: questions } = await supabase.from("questions").select("*").order("created_at", { ascending: false })

  const difficultyColors: Record<string, string> = {
    criancas: "bg-blue-100 text-blue-800",
    adolescentes: "bg-green-100 text-green-800",
    jovens: "bg-yellow-100 text-yellow-800",
    adultos: "bg-orange-100 text-orange-800",
    casais: "bg-purple-100 text-purple-800",
  }

  const difficultyLabels: Record<string, string> = {
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
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold">Gerenciar Perguntas</h2>
          <Button asChild>
            <Link href="/admin/gerar-perguntas">Gerar com IA</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Todas as Perguntas ({questions?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {questions?.map((question: any) => (
                <div key={question.id} className="p-4 bg-muted rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-medium flex-1">{question.question_text}</p>
                    <Badge className={difficultyColors[question.difficulty_level]}>
                      {difficultyLabels[question.difficulty_level]}
                    </Badge>
                  </div>
                  <p className="text-sm text-green-700 font-medium mb-1">Resposta: {question.correct_answer}</p>
                  <p className="text-xs text-muted-foreground">{question.bible_reference}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
