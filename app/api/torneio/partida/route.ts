import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

// Iniciar partida
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Apenas administradores podem iniciar partidas" }, { status: 403 })
    }

    const body = await req.json()
    const { matchId, timePerQuestion = 30 } = body

    // Get match info
    const { data: match, error: matchError } = await supabase
      .from("tournament_matches")
      .select(
        `
        *,
        tournaments (
          id,
          name,
          competition_mode
        )
      `
      )
      .eq("id", matchId)
      .single()

    if (matchError || !match) {
      return NextResponse.json({ error: "Partida não encontrada" }, { status: 404 })
    }

    if (match.status !== "pending") {
      return NextResponse.json({ error: "Partida já foi iniciada ou finalizada" }, { status: 400 })
    }

    // Get random questions for the match
    const { data: questions } = await supabase
      .from("questions")
      .select("id, question_text, correct_answer, wrong_answers, bible_reference")
      .limit(10)
      .order("RANDOM()")

    if (!questions || questions.length === 0) {
      return NextResponse.json({ error: "Não há perguntas disponíveis" }, { status: 400 })
    }

    // Update match to in_progress
    const { error: updateError } = await supabase
      .from("tournament_matches")
      .update({
        status: "in_progress",
        started_at: new Date().toISOString(),
        time_per_question: timePerQuestion,
        questions: questions.map((q) => q.id),
        current_question_index: 0,
        team1_score: 0,
        team2_score: 0,
      })
      .eq("id", matchId)

    if (updateError) {
      return NextResponse.json({ error: "Erro ao iniciar partida" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      match: {
        ...match,
        status: "in_progress",
        questions,
        timePerQuestion,
      },
    })
  } catch (error) {
    console.error("[v0] Error starting match:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

// Responder pergunta
export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await req.json()
    const { matchId, teamId, questionId, answer, responseTime } = body

    // Verify user belongs to the team
    const { data: teamMember } = await supabase
      .from("team_members")
      .select("*")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .single()

    if (!teamMember) {
      return NextResponse.json({ error: "Você não pertence a esta equipe" }, { status: 403 })
    }

    // Get match
    const { data: match } = await supabase
      .from("tournament_matches")
      .select("*")
      .eq("id", matchId)
      .single()

    if (!match || match.status !== "in_progress") {
      return NextResponse.json({ error: "Partida não está em andamento" }, { status: 400 })
    }

    // Get question
    const { data: question } = await supabase
      .from("questions")
      .select("*")
      .eq("id", questionId)
      .single()

    if (!question) {
      return NextResponse.json({ error: "Pergunta não encontrada" }, { status: 404 })
    }

    const isCorrect = answer === question.correct_answer

    // Record the answer
    const { error: answerError } = await supabase.from("tournament_match_answers").insert({
      match_id: matchId,
      team_id: teamId,
      question_id: questionId,
      answer,
      is_correct: isCorrect,
      response_time: responseTime,
      answered_by: user.id,
    })

    if (answerError) {
      // Check if already answered (duplicate)
      if (answerError.code === "23505") {
        return NextResponse.json({ error: "Esta equipe já respondeu esta pergunta" }, { status: 400 })
      }
      return NextResponse.json({ error: "Erro ao registrar resposta" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      isCorrect,
      correctAnswer: question.correct_answer,
    })
  } catch (error) {
    console.error("[v0] Error answering question:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

// Finalizar pergunta e determinar vencedor da rodada
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Apenas administradores podem avançar perguntas" }, { status: 403 })
    }

    const body = await req.json()
    const { matchId, action } = body

    if (action === "next_question") {
      // Get match
      const { data: match } = await supabase
        .from("tournament_matches")
        .select("*")
        .eq("id", matchId)
        .single()

      if (!match || match.status !== "in_progress") {
        return NextResponse.json({ error: "Partida não está em andamento" }, { status: 400 })
      }

      const nextIndex = (match.current_question_index || 0) + 1

      if (nextIndex >= match.questions.length) {
        // Match ended - determine winner
        return NextResponse.json({ 
          success: true, 
          matchEnded: true,
          message: "Todas as perguntas foram respondidas" 
        })
      }

      await supabase
        .from("tournament_matches")
        .update({
          current_question_index: nextIndex,
          question_started_at: new Date().toISOString(),
        })
        .eq("id", matchId)

      return NextResponse.json({ success: true, nextIndex })
    }

    if (action === "end_match") {
      const { winnerId, team1Score, team2Score } = body

      // Update match
      await supabase
        .from("tournament_matches")
        .update({
          status: "completed",
          winner_team_id: winnerId,
          team1_score: team1Score,
          team2_score: team2Score,
          completed_at: new Date().toISOString(),
        })
        .eq("id", matchId)

      // Get match to find tournament and next match
      const { data: match } = await supabase
        .from("tournament_matches")
        .select("*")
        .eq("id", matchId)
        .single()

      if (match?.next_match_id && winnerId) {
        // Update next match with the winner
        const { data: nextMatch } = await supabase
          .from("tournament_matches")
          .select("*")
          .eq("id", match.next_match_id)
          .single()

        if (nextMatch) {
          const updateField = nextMatch.team1_id ? "team2_id" : "team1_id"
          await supabase
            .from("tournament_matches")
            .update({ [updateField]: winnerId })
            .eq("id", match.next_match_id)
        }
      }

      // Check if tournament is complete (final match)
      if (match && !match.next_match_id && winnerId) {
        await supabase
          .from("tournaments")
          .update({
            status: "completed",
            winner_team_id: winnerId,
          })
          .eq("id", match.tournament_id)
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 })
  } catch (error) {
    console.error("[v0] Error updating match:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
