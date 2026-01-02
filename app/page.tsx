import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { BookOpen, Users, Trophy, Zap } from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  return (
    <div className="min-h-svh bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-blue-600 mb-6 text-balance">Quiz Bíblico</h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto text-pretty">
          Teste seus conhecimentos sobre a Palavra de Deus e desafie seus amigos em competições bíblicas emocionantes
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" asChild className="text-lg">
            <Link href="/auth/cadastro">Começar Agora</Link>
          </Button>
          <Button size="lg" variant="outline" asChild className="text-lg bg-transparent">
            <Link href="/auth/login">Entrar</Link>
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="p-3 rounded-full bg-blue-100">
                  <BookOpen className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="font-semibold text-lg">Níveis por Idade</h3>
                <p className="text-sm text-muted-foreground">
                  Perguntas adaptadas para crianças, adolescentes, jovens, adultos e casais
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="p-3 rounded-full bg-purple-100">
                  <Zap className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="font-semibold text-lg">IA Inteligente</h3>
                <p className="text-sm text-muted-foreground">
                  Perguntas geradas por IA com dificuldade progressiva baseada no seu desempenho
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="p-3 rounded-full bg-green-100">
                  <Users className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="font-semibold text-lg">Competições</h3>
                <p className="text-sm text-muted-foreground">
                  Jogue sozinho ou em equipes de 1v1 até 5v5 e desafie seus amigos
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="p-3 rounded-full bg-orange-100">
                  <Trophy className="h-8 w-8 text-orange-600" />
                </div>
                <h3 className="font-semibold text-lg">Rankings</h3>
                <p className="text-sm text-muted-foreground">
                  Acompanhe seu progresso e veja sua posição nos rankings globais
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16">
        <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <CardContent className="py-12 text-center">
            <h2 className="text-3xl font-bold mb-4">Pronto para testar seus conhecimentos?</h2>
            <p className="text-lg mb-6 text-blue-50">Cadastre-se agora e comece sua jornada bíblica</p>
            <Button size="lg" variant="secondary" asChild>
              <Link href="/auth/cadastro">Criar Conta Grátis</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
