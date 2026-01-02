import { generateObject } from "ai"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"
import { getModelString } from "@/lib/ai-config"

const questionSchema = z.object({
  questions: z.array(
    z.object({
      question_text: z.string().describe("A pergunta bíblica"),
      correct_answer: z.string().describe("A resposta correta"),
      wrong_answers: z.array(z.string()).length(3).describe("Três respostas incorretas mas plausíveis"),
      bible_reference: z.string().describe("Referência bíblica (livro, capítulo e versículo)"),
      topic: z.string().describe("Tópico da pergunta (ex: Antigo Testamento, Novo Testamento, etc)"),
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

    // Check if user is admin
    const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Apenas administradores podem gerar perguntas" }, { status: 403 })
    }

    const { difficulty_level, count = 5 } = await request.json()

    if (!difficulty_level) {
      return NextResponse.json({ error: "Nível de dificuldade é obrigatório" }, { status: 400 })
    }

    const difficultyPrompts: Record<string, string> = {
      criancas:
        "crianças de 6 a 12 anos. Use linguagem simples, perguntas sobre histórias bíblicas famosas, personagens conhecidos e conceitos básicos. Exemplos: Quem construiu a arca? Quantos discípulos Jesus tinha?",
      adolescentes:
        "adolescentes de 13 a 17 anos. Use perguntas sobre eventos bíblicos importantes, ensinamentos de Jesus, e contextos históricos básicos. Exemplos: Qual foi o primeiro milagre de Jesus? Quem traiu Jesus?",
      jovens:
        "jovens de 18 a 29 anos. Use perguntas sobre teologia básica, livros da Bíblia, autores, e contextos mais profundos. Exemplos: Quantos livros há no Novo Testamento? Quem escreveu mais epístolas?",
      adultos:
        "adultos acima de 30 anos. Use perguntas teológicas mais complexas, detalhes específicos, profecias e interpretações. Exemplos: Qual o significado de Emanuel? Quantas pragas foram enviadas ao Egito?",
      casais:
        "casais. Foque em perguntas sobre casamento, família, relacionamentos bíblicos e ensinamentos sobre amor e união. Exemplos: Qual casal foi o primeiro da criação? Complete: O que Deus uniu...",
    }

    const prompt = difficultyPrompts[difficulty_level] || difficultyPrompts.adultos

    console.log("[v0] Generating questions with AI for difficulty:", difficulty_level)

    const { object } = await generateObject({
      model: getModelString(),
      schema: questionSchema,
      prompt: `Você é um especialista em Bíblia evangélica pentecostal. Gere exatamente ${count} perguntas bíblicas para ${prompt}

Requisitos importantes:
- As perguntas devem ser baseadas na Bíblia Sagrada (versão evangélica pentecostal)
- Cada pergunta deve ter exatamente 3 respostas erradas plausíveis (que pareçam corretas mas não são)
- Inclua sempre a referência bíblica completa (livro, capítulo e versículo)
- As respostas erradas devem ser relacionadas ao tema mas incorretas
- Varie os tópicos: Antigo Testamento, Novo Testamento, vida de Jesus, apóstolos, etc
- As perguntas devem testar conhecimento bíblico real, não trivialidades

Formato de resposta esperado:
{
  "questions": [
    {
      "question_text": "Pergunta aqui?",
      "correct_answer": "Resposta correta",
      "wrong_answers": ["Errada 1", "Errada 2", "Errada 3"],
      "bible_reference": "João 3:16",
      "topic": "Novo Testamento"
    }
  ]
}`,
    })

    console.log("[v0] AI generated questions:", object.questions.length)

    // Insert questions into database
    const questionsToInsert = object.questions.map((q) => ({
      question_text: q.question_text,
      correct_answer: q.correct_answer,
      wrong_answers: q.wrong_answers,
      difficulty_level,
      bible_reference: q.bible_reference,
      topic: q.topic,
    }))

    const { data: insertedQuestions, error } = await supabase.from("questions").insert(questionsToInsert).select()

    if (error) {
      console.error("[v0] Error inserting questions:", error)
      throw error
    }

    console.log("[v0] Questions inserted successfully:", insertedQuestions?.length)

    return NextResponse.json({
      success: true,
      questions: insertedQuestions,
      count: insertedQuestions?.length || 0,
    })
  } catch (error) {
    console.error("[v0] Error generating questions:", error)
    return NextResponse.json({ error: "Erro ao gerar perguntas" }, { status: 500 })
  }
}
