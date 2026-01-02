import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { generateObject } from "ai"
import { z } from "zod"
import { getAIModel } from "@/lib/ai-config"

const questionSchema = z.object({
  question_text: z.string(),
  correct_answer: z.string(),
  wrong_answers: z.array(z.string()).length(3),
  bible_reference: z.string(),
  topic: z.string(),
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { sessionId, useAI } = await request.json()

    // Perfil do usuário
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()

    // Progresso do usuário
    const { data: progress } = await supabase
      .from("user_progress")
      .select("*")
      .eq("user_id", user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: "Perfil não encontrado" }, { status: 404 })
    }

    // Perguntas já respondidas
    const { data: answeredQuestions } = await supabase
      .from("answered_questions")
      .select("question_id")
      .eq("user_id", user.id)

    const answeredIds = answeredQuestions?.map((q) => q.question_id) || []

    // Sessão atual
    const { data: session } = await supabase
      .from("quiz_sessions")
      .select("*")
      .eq("id", sessionId)
      .single()

    let nextQuestion

    if (useAI) {
      // Últimas 5 respostas
      const recentAnswers = (session?.answers || []).slice(-5)
      const recentCorrect = recentAnswers.filter((a: any) => a.is_correct).length
      const recentAccuracy =
        recentAnswers.length > 0
          ? (recentCorrect / recentAnswers.length) * 100
          : 70

      // Ajuste progressivo de dificuldade
      let difficultyLevel = "média"
      if (recentAccuracy >= 90) difficultyLevel = "muito difícil"
      else if (recentAccuracy >= 80) difficultyLevel = "difícil"
      else if (recentAccuracy >= 70) difficultyLevel = "média"
      else if (recentAccuracy >= 60) difficultyLevel = "fácil"
      else difficultyLevel = "muito fácil"

      const difficultyPrompts: Record<string, string> = {
        criancas: "crianças. Use linguagem simples e histórias bíblicas conhecidas.",
        adolescentes: "adolescentes. Perguntas sobre eventos e ensinamentos bíblicos.",
        jovens: "jovens. Perguntas teológicas com contexto histórico.",
        adultos: "adultos. Perguntas complexas com interpretação teológica.",
        casais: "casais. Perguntas sobre família e relacionamentos bíblicos.",
      }

      const { object } = await generateObject({
        model: getAIModel(), // ✅ CORRETO
        schema: questionSchema,
        prompt: `Gere UMA pergunta bíblica para ${
          difficultyPrompts[profile.age_category] || difficultyPrompts.adultos
        }

Dificuldade requerida: ${difficultyLevel} (baseado em ${recentAccuracy.toFixed(
          0,
        )}% de acertos recentes)

A pergunta deve ser:
- Baseada na Bíblia evangélica pentecostal
- Com 3 respostas erradas plausíveis
- Com referência bíblica precisa
- ${
          difficultyLevel === "muito difícil"
            ? "Extremamente específica e desafiadora"
            : difficultyLevel === "difícil"
            ? "Desafiadora com detalhes"
            : difficultyLevel === "média"
            ? "Balanceada"
            : "Fundamental e clara"
        }`,
      })

      nextQuestion = {
        id: crypto.randomUUID(),
        ...object,
        difficulty_level: profile.age_category,
      }
    } else {
      // Perguntas do banco
      const { data: questions } = await supabase
        .from("questions")
        .select("*")
        .eq("difficulty_level", profile.age_category)
        .not("id", "in", `(${answeredIds.join(",") || "''"})`)
        .limit(10)

      if (!questions || questions.length === 0) {
        await supabase.from("answered_questions").delete().eq("user_id", user.id)

        const { data: freshQuestions } = await supabase
          .from("questions")
          .select("*")
          .eq("difficulty_level", profile.age_category)
          .limit(10)

        nextQuestion =
          freshQuestions?.[
            Math.floor(Math.random() * (freshQuestions?.length || 1))
          ]
      } else {
        nextQuestion = questions[Math.floor(Math.random() * questions.length)]
      }
    }

    return NextResponse.json({
      success: true,
      question: nextQuestion,
    })
  } catch (error) {
    console.error("[API] Error getting next question:", error)
    return NextResponse.json(
      { error: "Erro ao buscar próxima pergunta" },
      { status: 500 },
    )
  }
}
