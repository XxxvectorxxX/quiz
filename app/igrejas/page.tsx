import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Church } from "lucide-react"
import Link from "next/link"

export default async function IgrejasPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect("/auth/login")
  }

  return (
    <div className="min-h-svh bg-gradient-to-br from-teal-50 via-white to-cyan-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-2 border-teal-200">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-teal-100">
            <Church className="h-10 w-10 text-teal-600" />
          </div>
          <CardTitle className="text-2xl text-teal-800">Minha Igreja</CardTitle>
          <CardDescription>Associe-se a uma igreja ou grupo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Em breve você poderá associar sua conta a uma igreja ou grupo e participar de competições locais.
          </p>
          <Button variant="outline" className="w-full" asChild>
            <Link href="/quiz">Voltar ao Quiz</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
