import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

/**
 * POST /api/torneios/match/respond
 * Validação server-side da resposta - o cliente NÃO decide o vencedor.
 * Registra timestamp exato da resposta e determina o vencedor.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { matchId, teamId, selectedAnswer } = body as {
      matchId: string
      teamId: string
      selectedAnswer: string
    }

    if (!matchId || !teamId || !selectedAnswer) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 })
    }

    // Buscar partida e torneio (question_time_seconds)
    const { data: match, error: matchError } = await supabase
      .from("tournament_matches")
      .select(`
        *,
        team1:teams!tournament_matches_team1_id_fkey(id, name, leader_id),
        team2:teams!tournament_matches_team2_id_fkey(id, name, leader_id)
      `)
      .eq("id", matchId)
      .single()

    const { data: tournament } = await supabase
      .from("tournaments")
      .select("question_time_seconds")
      .eq("id", match?.tournament_id)
      .single()

    if (matchError || !match) {
      return NextResponse.json({ error: "Partida não encontrada" }, { status: 404 })
    }

    // Verificar se o usuário é líder de uma das equipes
    const team1Leader = (match.team1 as any)?.leader_id
    const team2Leader = (match.team2 as any)?.leader_id
    if (teamId !== match.team1_id && teamId !== match.team2_id) {
      return NextResponse.json({ error: "Você não participa desta partida" }, { status: 403 })
    }
    if (teamId === match.team1_id && team1Leader !== user.id) {
      return NextResponse.json({ error: "Apenas o líder da equipe pode responder" }, { status: 403 })
    }
    if (teamId === match.team2_id && team2Leader !== user.id) {
      return NextResponse.json({ error: "Apenas o líder da equipe pode responder" }, { status: 403 })
    }

    // Verificar se partida está em andamento
    if (match.status !== "in_progress") {
      return NextResponse.json({ error: "Partida não está em andamento" }, { status: 400 })
    }

    // Verificar se já existe resposta desta equipe (cada equipe responde só uma vez)
    const { data: myResponse } = await supabase
      .from("tournament_match_responses")
      .select("id")
      .eq("match_id", matchId)
      .eq("team_id", teamId)
      .maybeSingle()

    if (myResponse) {
      return NextResponse.json({ error: "Você já respondeu nesta partida" }, { status: 400 })
    }

    // Verificar se alguém já acertou (primeiro correto vence)
    const { data: correctResponse } = await supabase
      .from("tournament_match_responses")
      .select("team_id")
      .eq("match_id", matchId)
      .eq("is_correct", true)
      .limit(1)
      .maybeSingle()

    if (correctResponse) {
      return NextResponse.json({
        error: "Outro jogador respondeu corretamente primeiro",
        status: "completed",
      }, { status: 409 })
    }

    // Buscar pergunta e validar resposta
    const { data: question } = await supabase
      .from("questions")
      .select("id, correct_answer")
      .eq("id", match.current_question_id)
      .single()

    if (!question) {
      return NextResponse.json({ error: "Pergunta não encontrada" }, { status: 404 })
    }

    const isCorrect = selectedAnswer.trim().toLowerCase() === question.correct_answer.trim().toLowerCase()
    const questionTimeSeconds = tournament?.question_time_seconds ?? 15

    // Verificar timeout (se passou do tempo limite, considerar errado)
    const startedAt = match.question_started_at ? new Date(match.question_started_at) : new Date()
    const elapsedMs = Date.now() - startedAt.getTime()
    const timedOut = elapsedMs > questionTimeSeconds * 1000

    const finalIsCorrect = isCorrect && !timedOut

    // Registrar resposta com timestamp do servidor
    const { error: insertError } = await supabase
      .from("tournament_match_responses")
      .insert({
        match_id: matchId,
        team_id: teamId,
        question_id: question.id,
        selected_answer: selectedAnswer,
        is_correct: finalIsCorrect,
        responded_at: new Date().toISOString(),
      })

    if (insertError) {
      // Pode ser violação de UNIQUE (race condition - outro jogador respondeu primeiro)
      if (insertError.code === "23505") {
        return NextResponse.json({
          error: "Outro jogador respondeu primeiro",
          status: "completed",
        }, { status: 409 })
      }
      throw insertError
    }

    // Determinar vencedor: primeiro correto vence, ou ambos eliminados
    let winnerTeamId: string | null = null

    if (finalIsCorrect) {
      winnerTeamId = teamId // Este jogador acertou primeiro
    }
    // Se errou ou timeout, não há vencedor (ainda) - o outro pode responder
    // Mas precisamos checar: se ambos responderam, quem vence?
    // Na nossa lógica: primeiro correto vence. Se este errou, aguardamos o outro ou timeout.

    const { data: responses } = await supabase
      .from("tournament_match_responses")
      .select("team_id, is_correct, responded_at")
      .eq("match_id", matchId)
      .order("responded_at", { ascending: true })

    const responsesList = responses || []
    const firstCorrect = responsesList.find((r: any) => r.is_correct)
    const bothResponded = responsesList.length >= 2

    if (firstCorrect) {
      winnerTeamId = firstCorrect.team_id
    } else if (bothResponded) {
      winnerTeamId = null // Ambos erram = ambos eliminados
    }

    // Atualizar partida
    const matchCompleted = bothResponded || !!firstCorrect
    await supabase
      .from("tournament_matches")
      .update({
        winner_team_id: winnerTeamId,
        status: matchCompleted ? "completed" : "in_progress",
        first_responder_team_id: teamId,
      })
      .eq("id", matchId)

    // Avançar vencedor para próxima rodada (se houver next_match)
    if (matchCompleted && winnerTeamId) {
      const { data: nextMatch } = await supabase
        .from("tournament_matches")
        .select("id, next_match_id, next_match_slot")
        .eq("id", matchId)
        .single()

      if (nextMatch?.next_match_id && nextMatch?.next_match_slot) {
        const nextUpdate: Record<string, unknown> = {}
        if (nextMatch.next_match_slot === "team1") nextUpdate.team1_id = winnerTeamId
        else if (nextMatch.next_match_slot === "team2") nextUpdate.team2_id = winnerTeamId
        if (Object.keys(nextUpdate).length > 0) {
          await supabase
            .from("tournament_matches")
            .update(nextUpdate)
            .eq("id", nextMatch.next_match_id)
        }
      }
    }

    return NextResponse.json({
      success: true,
      isCorrect: finalIsCorrect,
      timedOut,
      winnerTeamId,
      matchCompleted,
    })
  } catch (error) {
    console.error("[API] Error responding to match:", error)
    return NextResponse.json({ error: "Erro ao processar resposta" }, { status: 500 })
  }
}
