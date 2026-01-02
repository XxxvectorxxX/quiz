"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Play } from "lucide-react"
import Link from "next/link"
import { useRouter, useParams } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

interface Question {
  id: string
  question_text: string
  correct_answer: string
  difficulty_level: string
  bible_reference: string
  topic: string
}

export default function SelecionarPerguntasPage() {
  const params = useParams()
  const teamId = params.teamId as string
  const [questions, setQuestions] = useState<Question[]>([])
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([])
  const [filterDifficulty, setFilterDifficulty] = useState<string>("all")
  const [filterTopic, setFilterTopic] = useState<string>("all")
  const [team, setTeam] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [filterDifficulty, filterTopic])

  const loadData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth/login")
        return
      }

      const { data: teamData } = await supabase.from("teams").select("*").eq("id", teamId).single()

      if (!teamData || teamData.leader_id !== user.id) {
        router.push("/competicoes")
        return
      }

      setTeam(teamData)

      let query = supabase.from("questions").select("*").order("created_at", { ascending: false })

      if (filterDifficulty !== "all") {
        query = query.eq("difficulty_level", filterDifficulty)
      }

      if (filterTopic !== "all") {
        query = query.eq("topic", filterTopic)
      }

      const { data: questionsData } = await query

      setQuestions(questionsData || [])
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleQuestion = (questionId: string) => {
    setSelectedQuestions((prev) =>
      prev.includes(questionId) ? prev.filter((id) => id !== questionId) : [...prev, questionId],
    )
  }

  const handleStartCompetition = async () => {
    if (selectedQuestions.length === 0) {
      alert("Selecione pelo menos 1 pergunta para iniciar a competição")
      return
    }

    setIsSaving(true)

    try {
      const { error } = await supabase.from("competition_questions").insert({
        team_id: teamId,
        question_ids: selectedQuestions,
        created_by: (await supabase.auth.getUser()).data.user?.id,
      })

      if (error) throw error

      router.push(`/competicoes/jogar/${teamId}`)
    } catch (error: any) {
      console.error("Error saving questions:", error)
      alert(error.message || "Erro ao iniciar competição")
    } finally {
      setIsSaving(false)
    }
  }

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

  const topics = [...new Set(questions.map((q) => q.topic).filter(Boolean))]

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <p className="text-xl">Carregando perguntas...</p>
      </div>
    )
  }

  return (
    <div className="min-h-svh bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/competicoes/equipe/${teamId}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Link>
          </Button>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Equipe</p>
            <p className="font-bold">{team?.name}</p>
          </div>
          <div className="w-20" />
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <h1 className="text-4xl font-bold mb-2 text-center bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Selecione as Perguntas
        </h1>
        <p className="text-center text-muted-foreground mb-8">Escolha as perguntas que farão parte desta competição</p>

        <Card className="mb-6 shadow-lg">
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Label>Dificuldade</Label>
              <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="criancas">Crianças</SelectItem>
                  <SelectItem value="adolescentes">Adolescentes</SelectItem>
                  <SelectItem value="jovens">Jovens</SelectItem>
                  <SelectItem value="adultos">Adultos</SelectItem>
                  <SelectItem value="casais">Casais</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {topics.length > 0 && (
              <div className="flex-1 min-w-[200px]">
                <Label>Tópico</Label>
                <Select value={filterTopic} onValueChange={setFilterTopic}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {topics.map((topic) => (
                      <SelectItem key={topic} value={topic}>
                        {topic}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mb-6 p-4 bg-white rounded-lg shadow-md flex justify-between items-center">
          <p className="text-lg font-semibold">
            Perguntas selecionadas: <span className="text-blue-600">{selectedQuestions.length}</span>
          </p>
          <Button
            onClick={handleStartCompetition}
            disabled={selectedQuestions.length === 0 || isSaving}
            size="lg"
            className="bg-gradient-to-r from-blue-600 to-purple-600"
          >
            <Play className="h-5 w-5 mr-2" />
            {isSaving ? "Iniciando..." : "Iniciar Competição"}
          </Button>
        </div>

        <div className="space-y-3">
          {questions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Nenhuma pergunta encontrada com os filtros selecionados</p>
              </CardContent>
            </Card>
          ) : (
            questions.map((question) => (
              <Card
                key={question.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedQuestions.includes(question.id) ? "ring-2 ring-blue-500 bg-blue-50" : ""
                }`}
                onClick={() => toggleQuestion(question.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Checkbox
                      checked={selectedQuestions.includes(question.id)}
                      onCheckedChange={() => toggleQuestion(question.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <p className="font-medium text-base">{question.question_text}</p>
                        <Badge className={difficultyColors[question.difficulty_level]}>
                          {difficultyLabels[question.difficulty_level]}
                        </Badge>
                      </div>
                      <p className="text-sm text-green-700 font-medium mb-1">Resposta: {question.correct_answer}</p>
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        {question.bible_reference && <span>{question.bible_reference}</span>}
                        {question.topic && <span>• {question.topic}</span>}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
