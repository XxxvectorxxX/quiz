"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Sparkles, Loader2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function GerarPerguntasPage() {
  const [difficultyLevel, setDifficultyLevel] = useState("criancas")
  const [count, setCount] = useState(5)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/gerar-perguntas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ difficulty_level: difficultyLevel, count }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Erro ao gerar perguntas")
      }

      const data = await response.json()
      setResult(data)
    } catch (error: any) {
      console.error("[v0] Error:", error)
      setError(error.message || "Erro ao gerar perguntas")
    } finally {
      setIsLoading(false)
    }
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

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-6 w-6 text-purple-600" />
              <CardTitle className="text-2xl">Gerar Perguntas com IA</CardTitle>
            </div>
            <CardDescription>Use inteligência artificial para criar perguntas bíblicas automaticamente</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerate} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="difficulty">Nível de Dificuldade</Label>
                <Select value={difficultyLevel} onValueChange={setDifficultyLevel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="criancas">Crianças</SelectItem>
                    <SelectItem value="adolescentes">Adolescentes</SelectItem>
                    <SelectItem value="jovens">Jovens</SelectItem>
                    <SelectItem value="adultos">Adultos</SelectItem>
                    <SelectItem value="casais">Casais</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="count">Quantidade de Perguntas</Label>
                <Input
                  id="count"
                  type="number"
                  min={1}
                  max={20}
                  value={count}
                  onChange={(e) => setCount(Number.parseInt(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">Mínimo: 1, Máximo: 20</p>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {result && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800 font-medium">
                    Sucesso! {result.count} perguntas geradas e adicionadas ao banco de dados.
                  </p>
                </div>
              )}

              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Gerando perguntas...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Gerar Perguntas
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
