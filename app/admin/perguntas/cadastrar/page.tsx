"use client"

import type React from "react"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Plus, Trash2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function CadastrarPerguntaPage() {
  const [questionText, setQuestionText] = useState("")
  const [correctAnswer, setCorrectAnswer] = useState("")
  const [wrongAnswers, setWrongAnswers] = useState(["", "", ""])
  const [difficulty, setDifficulty] = useState("criancas")
  const [bibleReference, setBibleReference] = useState("")
  const [topic, setTopic] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleWrongAnswerChange = (index: number, value: string) => {
    const newWrongAnswers = [...wrongAnswers]
    newWrongAnswers[index] = value
    setWrongAnswers(newWrongAnswers)
  }

  const addWrongAnswer = () => {
    setWrongAnswers([...wrongAnswers, ""])
  }

  const removeWrongAnswer = (index: number) => {
    if (wrongAnswers.length > 1) {
      setWrongAnswers(wrongAnswers.filter((_, i) => i !== index))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const filteredWrongAnswers = wrongAnswers.filter((answer) => answer.trim() !== "")

      if (filteredWrongAnswers.length < 1) {
        alert("Adicione pelo menos 1 resposta incorreta")
        setIsSubmitting(false)
        return
      }

      const { error } = await supabase.from("questions").insert({
        question_text: questionText,
        correct_answer: correctAnswer,
        wrong_answers: filteredWrongAnswers,
        difficulty_level: difficulty,
        bible_reference: bibleReference,
        topic: topic,
      })

      if (error) throw error

      alert("Pergunta cadastrada com sucesso!")

      // Limpar formulário
      setQuestionText("")
      setCorrectAnswer("")
      setWrongAnswers(["", "", ""])
      setBibleReference("")
      setTopic("")

      router.push("/admin/perguntas")
    } catch (error: any) {
      console.error("Error creating question:", error)
      alert(error.message || "Erro ao cadastrar pergunta")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-svh bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/perguntas">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Link>
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-4xl font-bold mb-8 text-center bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Cadastrar Nova Pergunta
        </h1>

        <Card className="shadow-xl border-2">
          <CardHeader>
            <CardTitle>Preencha os dados da pergunta</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="question" className="text-base font-semibold">
                  Pergunta
                </Label>
                <Textarea
                  id="question"
                  placeholder="Digite a pergunta bíblica..."
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  required
                  rows={3}
                  className="text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="correctAnswer" className="text-base font-semibold text-green-700">
                  Resposta Correta
                </Label>
                <Input
                  id="correctAnswer"
                  placeholder="Digite a resposta correta"
                  value={correctAnswer}
                  onChange={(e) => setCorrectAnswer(e.target.value)}
                  required
                  className="text-base border-green-300 focus:border-green-500"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-base font-semibold text-red-700">Respostas Incorretas</Label>
                {wrongAnswers.map((answer, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder={`Resposta incorreta ${index + 1}`}
                      value={answer}
                      onChange={(e) => handleWrongAnswerChange(index, e.target.value)}
                      className="text-base border-red-200 focus:border-red-400"
                    />
                    {wrongAnswers.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeWrongAnswer(index)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addWrongAnswer}
                  className="w-full bg-transparent"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar mais uma resposta incorreta
                </Button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="difficulty" className="text-base font-semibold">
                    Nível de Dificuldade
                  </Label>
                  <Select value={difficulty} onValueChange={setDifficulty}>
                    <SelectTrigger id="difficulty" className="text-base">
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
                  <Label htmlFor="topic" className="text-base font-semibold">
                    Tópico
                  </Label>
                  <Input
                    id="topic"
                    placeholder="Ex: Novo Testamento"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="text-base"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reference" className="text-base font-semibold">
                  Referência Bíblica
                </Label>
                <Input
                  id="reference"
                  placeholder="Ex: João 3:16"
                  value={bibleReference}
                  onChange={(e) => setBibleReference(e.target.value)}
                  className="text-base"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" className="flex-1 bg-transparent" asChild>
                  <Link href="/admin/perguntas">Cancelar</Link>
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-lg py-6"
                >
                  {isSubmitting ? "Cadastrando..." : "Cadastrar Pergunta"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
