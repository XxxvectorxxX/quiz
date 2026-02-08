import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

/**
 * POST /api/torneios/match/start
 * Admin inicia uma partida: sorteia pergunta e exibe para os jogadores.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Apenas admins podem iniciar partidas" }, { status: 403 })
    }

    const body = await request.json()
    const { matchId } = body as { matchId: string }

    if (!matchId) {
      return NextResponse.json({ error: "matchId obrigatório" }, { status: 400 })
    }

    const { data: match } = await supabase
      .from("tournament_matches")
      .select("id, status, tournament_id")
      .eq("id", matchId)
      .single()

    if (!match) {
      return NextResponse.json({ error: "Partida não encontrada" }, { status: 404 })
    }

    if (match.status !== "pending") {
      return NextResponse.json({ error: "Partida já iniciada ou finalizada" }, { status: 400 })
    }

    // Buscar torneio para nível de dificuldade
    const { data: tournament } = await supabase
      .from("tournaments")
      .select("id")
      .eq("id", match.tournament_id)
      .single()

    // Sortear pergunta aleatória
    const { data: questions } = await supabase
      .from("questions")
      .select("id, question_text, correct_answer, wrong_answers")
      .limit(20)

    if (!questions || questions.length === 0) {
      return NextResponse.json({ error: "Nenhuma pergunta disponível" }, { status: 404 })
    }

    const question = questions[Math.floor(Math.random() * questions.length)]

    // Atualizar partida com pergunta e timestamp
    const { error: updateError } = await supabase
      .from("tournament_matches")
      .update({
        status: "in_progress",
        current_question_id: question.id,
        question_started_at: new Date().toISOString(),
      })
      .eq("id", matchId)

    if (updateError) throw updateError

    // Montar opções (embaralhar correct + wrong)
    const options = [question.correct_answer, ...(question.wrong_answers || [])]
      .sort(() => Math.random() - 0.5)

    return NextResponse.json({
      success: true,
      question: {
        id: question.id,
        question_text: question.question_text,
        options,
        correct_answer: question.correct_answer,
      },
      startedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[API] Error starting match:", error)
    return NextResponse.json({ error: "Erro ao iniciar partida" }, { status: 500 })
  }
}
