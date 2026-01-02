import { generateObject } from "ai"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"
import { getModelString } from "@/lib/ai-config"

const questionSchema = z.object({
  questions: z.array(
    z.object({
      question_text: z.string(),
      correct_answer: z.string(),
      wrong_answers: z.array(z.string()).length(3),
      bible_reference: z.string(),
      topic: z.string(),
    }),
  ),
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

    // Get user profile and progress
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

    const { data: progress } = await supabase.from("user_progress").select("*").eq("user_id", user.id).single()

    if (!profile) {
      return NextResponse.json({ error: "Perfil não encontrado" }, { status: 404 })
    }

    const { data: answeredQuestions } = await supabase
      .from("answered_questions")
      .select("question_id")
      .eq("user_id", user.id)

    const answeredIds = answeredQuestions?.map((q) => q.question_id) || []

    // Calculate difficulty based on user level and accuracy
    const totalQuestions = progress?.total_questions_answered || 1
    const correctAnswers = progress?.correct_answers || 0
    const accuracyRate = (correctAnswers / totalQuestions) * 100
    const userLevel = progress?.current_level || 1

    let difficultyAdjustment = ""
    if (accuracyRate >= 90) {
      difficultyAdjustment =
        "Use perguntas MUITO mais desafiadoras, com detalhes específicos e interpretações teológicas profundas."
    } else if (accuracyRate >= 80) {
      difficultyAdjustment = "Use perguntas desafiadoras com detalhes específicos da Bíblia."
    } else if (accuracyRate >= 70) {
      difficultyAdjustment = "Use perguntas de dificuldade média, balanceadas."
    } else if (accuracyRate >= 60) {
      difficultyAdjustment = "Use perguntas um pouco mais simples, focando em conceitos fundamentais."
    } else {
      difficultyAdjustment =
        "Use perguntas simples e fundamentais para reforçar o conhecimento básico e aumentar a confiança."
    }

    const difficultyPrompts: Record<string, string> = {
      criancas: "crianças de 6 a 12 anos. Use linguagem muito simples e perguntas sobre histórias bíblicas famosas.",
      adolescentes: "adolescentes de 13 a 17 anos. Use perguntas sobre eventos bíblicos e ensinamentos básicos.",
      jovens: "jovens de 18 a 29 anos. Use perguntas sobre teologia e contextos bíblicos.",
      adultos: "adultos. Use perguntas teológicas complexas e detalhes específicos.",
      casais: "casais. Foque em casamento, família e relacionamentos bíblicos.",
    }

    const basePrompt = difficultyPrompts[profile.age_category] || difficultyPrompts.adultos

    const { object } = await generateObject({
      model: getModelString(),
      schema: questionSchema,
      prompt: `Você é um especialista em Bíblia evangélica pentecostal. Gere 10 perguntas bíblicas para ${basePrompt}

Nível do usuário: ${userLevel}
Taxa de acerto atual: ${accuracyRate.toFixed(1)}%
Ajuste de dificuldade: ${difficultyAdjustment}

IMPORTANTE: A dificuldade deve aumentar progressivamente. À medida que o usuário acerta mais, as perguntas devem se tornar mais específicas e desafiadoras.

Requisitos:
- Adapte a dificuldade baseado na taxa de acerto do usuário
- Varie os tópicos para manter o interesse
- Inclua referências bíblicas precisas
- 3 respostas erradas plausíveis por pergunta
- Baseado na Bíblia evangélica pentecostal

Retorne exatamente 10 perguntas no formato JSON.`,
    })

    // Return questions without saving (for immediate use)
    const formattedQuestions = object.questions.map((q) => ({
      id: crypto.randomUUID(),
      question_text: q.question_text,
      correct_answer: q.correct_answer,
      wrong_answers: q.wrong_answers,
      difficulty_level: profile.age_category,
      bible_reference: q.bible_reference,
      topic: q.topic,
    }))

    return NextResponse.json({
      success: true,
      questions: formattedQuestions,
    })
  } catch (error) {
    console.error("[v0] Error generating dynamic questions:", error)
    return NextResponse.json({ error: "Erro ao gerar perguntas dinâmicas" }, { status: 500 })
  }
}
