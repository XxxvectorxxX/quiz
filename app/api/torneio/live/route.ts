import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

// Get live match data
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(req.url)
    const matchId = searchParams.get("matchId")

    if (!matchId) {
      return NextResponse.json({ error: "matchId é obrigatório" }, { status: 400 })
    }

    // Get match with teams
    const { data: match, error } = await supabase
      .from("tournament_matches")
      .select(
        `
        *,
        team1:teams!tournament_matches_team1_id_fkey (
          id,
          name,
          color
        ),
        team2:teams!tournament_matches_team2_id_fkey (
          id,
          name,
          color
        ),
        winner:teams!tournament_matches_winner_team_id_fkey (
          id,
          name,
          color
        ),
        tournaments (
          id,
          name,
          competition_mode
        )
      `
      )
      .eq("id", matchId)
      .single()

    if (error || !match) {
      return NextResponse.json({ error: "Partida não encontrada" }, { status: 404 })
    }

    // Get current question if match is in progress
    let currentQuestion = null
    if (match.status === "in_progress" && match.questions && match.questions.length > 0) {
      const questionId = match.questions[match.current_question_index || 0]
      const { data: question } = await supabase
        .from("questions")
        .select("id, question_text, wrong_answers, bible_reference, correct_answer")
        .eq("id", questionId)
        .single()

      if (question) {
        // Shuffle answers
        const allAnswers = [question.correct_answer, ...question.wrong_answers].sort(() => Math.random() - 0.5)
        currentQuestion = {
          id: question.id,
          text: question.question_text,
          options: allAnswers,
          bibleReference: question.bible_reference,
        }
      }
    }

    // Get answers for current question
    let answers = []
    if (match.status === "in_progress" && match.questions) {
      const questionId = match.questions[match.current_question_index || 0]
      const { data: matchAnswers } = await supabase
        .from("tournament_match_answers")
        .select("team_id, is_correct, response_time")
        .eq("match_id", matchId)
        .eq("question_id", questionId)

      answers = matchAnswers || []
    }

    // Get spectator count
    const { count: spectatorCount } = await supabase
      .from("tournament_spectators")
      .select("*", { count: "exact", head: true })
      .eq("match_id", matchId)

    return NextResponse.json({
      match,
      currentQuestion,
      answers,
      spectatorCount: spectatorCount || 0,
      currentQuestionIndex: match.current_question_index || 0,
      totalQuestions: match.questions?.length || 0,
    })
  } catch (error) {
    console.error("[v0] Error getting live match:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

// Add spectator
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const body = await req.json()
    const { matchId } = body

    // Add spectator (upsert to handle duplicates)
    await supabase.from("tournament_spectators").upsert(
      {
        match_id: matchId,
        user_id: user?.id || null,
        session_id: !user ? crypto.randomUUID() : null,
        joined_at: new Date().toISOString(),
      },
      {
        onConflict: user ? "match_id,user_id" : "match_id,session_id",
      }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error adding spectator:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

// Remove spectator
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { searchParams } = new URL(req.url)
    const matchId = searchParams.get("matchId")

    if (user) {
      await supabase
        .from("tournament_spectators")
        .delete()
        .eq("match_id", matchId)
        .eq("user_id", user.id)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error removing spectator:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
