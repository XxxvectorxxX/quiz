import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { BookOpen, Users, Trophy, Zap, Star, Heart, Sparkles } from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  return (
    <div className="min-h-svh kid-friendly-bg">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-12 text-center">
        <div className="mb-6 flex items-center justify-center gap-4">
          <Star className="h-12 w-12 text-yellow-500 animate-pulse" />
          <h1 className="text-6xl md:text-7xl font-black bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 bg-clip-text text-transparent text-balance">
            Quiz Bíblico
          </h1>
          <Heart className="h-12 w-12 text-pink-500 animate-pulse" />
        </div>
         <p className="text-2xl md:text-3xl font-bold text-purple-700 mb-4">ieadpe vitoria setor 4</p>
        <p className="text-2xl md:text-3xl font-bold text-purple-700 mb-4">Uma Aventura pela Bíblia!</p>
        <p className="text-xl text-purple-600 mb-10 max-w-3xl mx-auto text-pretty font-medium">
          Descubra histórias incríveis, aprenda sobre Jesus e seus ensinamentos, e divirta-se respondendo perguntas
          bíblicas com seus amigos!
        </p>
        <div className="flex flex-col sm:flex-row gap-6 justify-center">
          <Button
            size="lg"
            asChild
            className="kid-button bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
          >
            <Link href="/auth/cadastro">
              <Sparkles className="h-6 w-6 mr-2" />
              Começar Aventura! 🚀
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            asChild
            className="kid-button border-4 border-purple-400 text-purple-700 hover:bg-purple-100 bg-transparent"
          >
            <Link href="/auth/login">Já tenho conta 😊</Link>
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-12">
        <h2 className="text-4xl font-black text-center text-purple-700 mb-10">O que você vai encontrar:</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <Card className="kid-card border-4 border-blue-300 bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="pt-8">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="p-4 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg">
                  <BookOpen className="h-10 w-10 text-white" />
                </div>
                <h3 className="font-black text-2xl text-blue-700">Para Todas as Idades</h3>
                <p className="text-base text-blue-600 font-medium leading-relaxed">
                  Perguntas especiais para crianças, adolescentes, jovens, adultos e até casais!
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="kid-card border-4 border-purple-300 bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="pt-8">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="p-4 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 shadow-lg">
                  <Zap className="h-10 w-10 text-white" />
                </div>
                <h3 className="font-black text-2xl text-purple-700">Inteligência Artificial</h3>
                <p className="text-base text-purple-600 font-medium leading-relaxed">
                  Perguntas novas toda hora, feitas por uma IA inteligente que se adapta ao seu nível!
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="kid-card border-4 border-green-300 bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="pt-8">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="p-4 rounded-full bg-gradient-to-br from-green-400 to-green-600 shadow-lg">
                  <Users className="h-10 w-10 text-white" />
                </div>
                <h3 className="font-black text-2xl text-green-700">Jogue com Amigos</h3>
                <p className="text-base text-green-600 font-medium leading-relaxed">
                  Crie times e desafie seus amigos em competições super divertidas de 1v1 até 5v5!
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="kid-card border-4 border-orange-300 bg-gradient-to-br from-orange-50 to-orange-100">
            <CardContent className="pt-8">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="p-4 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg">
                  <Trophy className="h-10 w-10 text-white" />
                </div>
                <h3 className="font-black text-2xl text-orange-700">Rankings e Troféus</h3>
                <p className="text-base text-orange-600 font-medium leading-relaxed">
                  Suba de nível, ganhe troféus e veja sua posição nos rankings globais!
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16">
        <Card className="kid-card bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white border-0 shadow-2xl">
          <CardContent className="py-16 text-center">
            <h2 className="text-4xl md:text-5xl font-black mb-6 text-balance">Pronto para a Aventura Bíblica? 🌟</h2>
            <p className="text-xl md:text-2xl mb-8 font-bold">É grátis e super fácil de começar!</p>
            <Button
              size="lg"
              className="kid-button bg-white text-purple-700 hover:bg-yellow-300 hover:scale-110"
              asChild
            >
              <Link href="/auth/cadastro">
                Criar Minha Conta Agora! 🎮
                <Sparkles className="h-6 w-6 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
