"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Smile } from "lucide-react"

export default function CadastroPage() {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [repeatPassword, setRepeatPassword] = useState("")
  const [age, setAge] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    if (password !== repeatPassword) {
      setError("As senhas não correspondem")
      setIsLoading(false)
      return
    }

    if (!age || Number.parseInt(age) < 5 || Number.parseInt(age) > 120) {
      setError("Por favor, informe uma idade válida (entre 5 e 120 anos)")
      setIsLoading(false)
      return
    }

    try {
      const currentYear = new Date().getFullYear()
      const birthYear = currentYear - Number.parseInt(age)
      const birthDate = `${birthYear}-01-01` // Data aproximada

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/quiz`,
          data: {
            full_name: fullName,
            birth_date: birthDate,
          },
        },
      })
      if (error) throw error
      router.push("/auth/confirmar-email")
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Erro ao cadastrar")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 kid-friendly-bg">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <div className="text-center mb-4">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="p-3 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full shadow-lg">
                <Smile className="h-10 w-10 text-white" />
              </div>
              <h1 className="text-5xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Quiz Bíblico
              </h1>
            </div>
            <p className="text-lg text-purple-700 font-semibold">Vamos começar a aventura!</p>
          </div>
          <Card className="kid-card border-4 border-purple-200">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl text-purple-700">Criar Conta</CardTitle>
              <CardDescription className="text-base">Preencha os dados para começar a jogar</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignUp}>
                <div className="flex flex-col gap-5">
                  <div className="grid gap-3">
                    <Label htmlFor="fullName" className="text-lg font-bold text-purple-700">
                      Qual é o seu nome?
                    </Label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="Digite seu nome completo"
                      className="text-lg p-6 border-2 border-purple-300 focus:border-purple-500"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="age" className="text-lg font-bold text-purple-700">
                      Quantos anos você tem?
                    </Label>
                    <Input
                      id="age"
                      type="number"
                      placeholder="Digite sua idade"
                      className="text-lg p-6 border-2 border-purple-300 focus:border-purple-500"
                      required
                      min={5}
                      max={120}
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="email" className="text-lg font-bold text-purple-700">
                      Seu email (ou dos seus pais)
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      className="text-lg p-6 border-2 border-purple-300 focus:border-purple-500"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="password" className="text-lg font-bold text-purple-700">
                      Crie uma senha
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      className="text-lg p-6 border-2 border-purple-300 focus:border-purple-500"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="repeat-password" className="text-lg font-bold text-purple-700">
                      Digite a senha novamente
                    </Label>
                    <Input
                      id="repeat-password"
                      type="password"
                      placeholder="Repita sua senha"
                      className="text-lg p-6 border-2 border-purple-300 focus:border-purple-500"
                      required
                      value={repeatPassword}
                      onChange={(e) => setRepeatPassword(e.target.value)}
                    />
                  </div>
                  {error && (
                    <div className="bg-red-100 border-2 border-red-400 text-red-700 px-4 py-3 rounded-2xl">
                      <p className="font-semibold">{error}</p>
                    </div>
                  )}
                  <Button
                    type="submit"
                    className="w-full kid-button bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    disabled={isLoading}
                  >
                    {isLoading ? "Criando sua conta..." : "Começar a Jogar! 🎮"}
                  </Button>
                </div>
                <div className="mt-6 text-center text-base">
                  Já tem uma conta?{" "}
                  <Link
                    href="/auth/login"
                    className="underline underline-offset-4 text-purple-600 font-bold hover:text-pink-600"
                  >
                    Entrar aqui
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
