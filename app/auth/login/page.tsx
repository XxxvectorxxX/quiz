"use client"

import type React from "react"
import { Suspense, useState } from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirect") || "/quiz"

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error

      // ✅ hard redirect (evita loop do middleware)
      const target = redirectTo.startsWith("/") ? redirectTo : "/quiz"
      window.location.href = target
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Erro ao fazer login")
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <div className="text-center mb-4">
            <h1 className="text-4xl font-bold text-blue-600 mb-2">Quiz Bíblico</h1>
            <p className="text-muted-foreground">Teste seus conhecimentos sobre a Palavra</p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Entrar</CardTitle>
              <CardDescription>Entre com seu email e senha para acessar</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin}>
                <div className="flex flex-col gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">Senha</Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Entrando..." : "Entrar"}
                  </Button>
                </div>
                <div className="mt-4 text-center text-sm">
                  Não tem uma conta?{" "}
                  <Link href="/auth/cadastro" className="underline underline-offset-4 text-blue-600 font-medium">
                    Cadastre-se
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

export default function LoginPage() {
  return (
    <Suspense:
      fallback={
        <div className="flex min-h-svh w-full items-center justify-center p-6 bg-gradient-to-br from-blue-50 via-white to-purple-50">
          <div className="w-full max-w-sm">
            <div className="flex flex-col gap-6">
              <div className="text-center mb-4">
                <h1 className="text-4xl font-bold text-blue-600 mb-2">Quiz Bíblico</h1>
                <p className="text-muted-foreground">Carregando...</p>
              </div>
              <Card>
                <CardContent className="py-8">
                  <p className="text-center text-muted-foreground">Carregando...</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
