import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateAIText } from "@/lib/ai-config"

const MINIMUM_QUESTIONS_PER_CATEGORY = 50 // Mínimo de perguntas por categoria
const QUESTIONS_TO_GENERATE = 20 // Quantas gerar quando precisar

export async function GET(request: Request) {
  try {
    // Verificar autorização do cron (opcional, para segurança)
    const authHeader = request.headers.get("authorization")
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createClient()

    // Verificar quantas perguntas existem por categoria
    const { data: countData, error: countError } = await supabase.from("questions").select("difficulty_level")

    if (countError) throw countError

    // Contar perguntas por categoria
    const categoryCounts = {
      criancas: 0,
      adolescentes: 0,
      jovens: 0,
      adultos: 0,
      casais: 0,
    }

    countData?.forEach((q) => {
      if (categoryCounts.hasOwnProperty(q.difficulty_level)) {
        categoryCounts[q.difficulty_level as keyof typeof categoryCounts]++
      }
    })

    console.log("[v0] Contagem de perguntas por categoria:", categoryCounts)

    const results = []

    // Para cada categoria com menos do que o mínimo, gerar perguntas
    for (const [category, count] of Object.entries(categoryCounts)) {
      if (count < MINIMUM_QUESTIONS_PER_CATEGORY) {
        console.log(
          `[v0] Categoria ${category} tem apenas ${count} perguntas. Gerando ${QUESTIONS_TO_GENERATE} novas...`,
        )

        try {
          const result = await generateQuestionsForCategory(category, QUESTIONS_TO_GENERATE)
          results.push({
            category,
            before: count,
            generated: result.questionsGenerated,
            status: "success",
          })
        } catch (error) {
          console.error(`[v0] Erro ao gerar perguntas para ${category}:`, error)
          results.push({
            category,
            before: count,
            generated: 0,
            status: "error",
            error: error instanceof Error ? error.message : "Unknown error",
          })
        }
      } else {
        results.push({
          category,
          count,
          status: "ok",
          message: "Perguntas suficientes",
        })
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    })
  } catch (error) {
    console.error("[v0] Erro no cron de geração automática:", error)
    return NextResponse.json({ error: "Erro ao gerar perguntas automaticamente" }, { status: 500 })
  }
}

async function generateQuestionsForCategory(category: string, quantity: number) {
  const categoryPrompts: Record<string, string> = {
    criancas: `perguntas muito simples e educativas sobre histórias bíblicas famosas como Noé, Davi e Golias, José, Moisés e Jesus. Use linguagem infantil e divertida.`,
    adolescentes: `perguntas sobre personagens bíblicos, milagres de Jesus, parábolas e valores cristãos. Use linguagem jovem mas respeitosa.`,
    jovens: `perguntas sobre ensinamentos de Jesus, cartas de Paulo, Salmos, Provérbios e aplicações práticas da fé no dia a dia.`,
    adultos: `perguntas aprofundadas sobre teologia, contexto histórico bíblico, interpretações de passagens complexas e doutrina evangélica pentecostal.`,
    casais: `perguntas sobre casamento na Bíblia, relacionamento conjugal segundo princípios cristãos, família e compromisso mútuo.`,
  }

  const prompt = `Você é um especialista em Bíblia evangélica pentecostal. Gere ${quantity} perguntas bíblicas originais e criativas para a categoria "${category}".

Contexto: ${categoryPrompts[category]}

IMPORTANTE:
- Cada pergunta deve ter 1 resposta correta e 3 alternativas incorretas
- Baseie-se em passagens reais da Bíblia (Antigo e Novo Testamento)
- Inclua a referência bíblica de onde a resposta pode ser encontrada
- Varie os tópicos: personagens, eventos, livros, ensinamentos, profecias, etc

Retorne no formato JSON:
[
  {
    "question": "texto da pergunta",
    "correct_answer": "resposta correta",
    "wrong_answers": ["errada 1", "errada 2", "errada 3"],
    "category": "${category}",
    "reference": "Livro Capítulo:Versículo",
    "topic": "tema da pergunta"
  }
]

Gere exatamente ${quantity} perguntas únicas e interessantes:`

  const { text } = await generateAIText(prompt)

  // Extrair JSON da resposta
  let questions
  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      questions = JSON.parse(jsonMatch[0])
    } else {
      questions = JSON.parse(text)
    }
  } catch (e) {
    console.error("[v0] Erro ao parsear JSON da IA:", text)
    throw new Error("IA não retornou JSON válido")
  }

  // Inserir no banco de dados
  const supabase = await createClient()

  const questionsToInsert = questions.map((q: any) => ({
    question: q.question,
    correct_answer: q.correct_answer,
    wrong_answers: q.wrong_answers,
    difficulty_level: category,
    reference: q.reference,
    topic: q.topic,
  }))

  const { error } = await supabase.from("questions").insert(questionsToInsert)

  if (error) throw error

  return {
    questionsGenerated: questions.length,
  }
}
