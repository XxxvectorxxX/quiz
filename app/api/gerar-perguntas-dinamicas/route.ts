import { generateObject } from "ai"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"

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

    // Calculate difficulty based on user level and accuracy
    const totalQuestions = progress?.total_questions_answered || 1
    const correctAnswers = progress?.correct_answers || 0
    const accuracyRate = (correctAnswers / totalQuestions) * 100
    const userLevel = progress?.current_level || 1

    // Determine AI difficulty adjustment
    let difficultyAdjustment = ""
    if (accuracyRate >= 90) {
      difficultyAdjustment = "Use perguntas mais desafiadoras e detalhes mais específicos da Bíblia."
    } else if (accuracyRate >= 70) {
      difficultyAdjustment = "Use perguntas de dificuldade média, balanceadas."
    } else {
      difficultyAdjustment = "Use perguntas mais simples e fundamentais para reforçar o conhecimento básico."
    }

    const difficultyPrompts: Record<string, string> = {
      criancas: "crianças de 6 a 12 anos. Use linguagem muito simples e perguntas sobre histórias bíblicas famosas.",
      adolescentes: "adolescentes de 13 a 17 anos. Use perguntas sobre eventos bíblicos e ensinamentos básicos.",
      jovens: "jovens de 18 a 29 anos. Use perguntas sobre teologia e contextos bíblicos.",
      adultos: "adultos. Use perguntas teológicas complexas e detalhes específicos.",
      casais: "casais. Foque em casamento, família e relacionamentos bíblicos.",
    }

    const basePrompt = difficultyPrompts[profile.age_category] || difficultyPrompts.adultos

    console.log("[v0] Generating dynamic questions for user:", user.id, "Level:", userLevel, "Accuracy:", accuracyRate)

    const { object } = await generateObject({
      model: "openai/gpt-4o-mini",
      schema: questionSchema,
      prompt: `Você é um especialista em Bíblia evangélica pentecostal. Gere 10 perguntas bíblicas para ${basePrompt}

Nível do usuário: ${userLevel}
Taxa de acerto: ${accuracyRate.toFixed(1)}%
Ajuste de dificuldade: ${difficultyAdjustment}

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

    console.log("[v0] Dynamic questions generated:", formattedQuestions.length)

    return NextResponse.json({
      success: true,
      questions: formattedQuestions,
    })
  } catch (error) {
    console.error("[v0] Error generating dynamic questions:", error)
    return NextResponse.json({ error: "Erro ao gerar perguntas dinâmicas" }, { status: 500 })
  }
}
